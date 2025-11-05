import express, { Router } from 'express'
import { PrismaClient } from '@prisma/client'
import { FinancialService } from '../services/financial.service'

const router: Router = Router()
const prisma = new PrismaClient()

// GET /api/transactions - Get all transactions for a company
router.get('/', async (req, res) => {
  try {
    const { companyId } = req.query

    if (!companyId || typeof companyId !== 'string') {
      return res.status(400).json({ error: 'Company ID is required' })
    }

    const transactions = await prisma.transaction.findMany({
      where: { companyId },
      include: {
        ledgerEntries: true,
      },
      orderBy: { date: 'desc' }
    })

    res.json(transactions)
  } catch (error) {
    console.error('Error fetching transactions:', error)
    res.status(500).json({ error: 'Failed to fetch transactions' })
  }
})

// GET /api/transactions/:id - Get single transaction
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params

    const transaction = await prisma.transaction.findUnique({
      where: { id },
      include: {
        ledgerEntries: true,
      }
    })

    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' })
    }

    res.json(transaction)
  } catch (error) {
    console.error('Error fetching transaction:', error)
    res.status(500).json({ error: 'Failed to fetch transaction' })
  }
})

// POST /api/transactions - Create new transaction with auto ledger posting
router.post('/', async (req, res) => {
  try {
    const {
      companyId,
      type,
      amount,
      description,
      category,
      paymentMethod = 'cash',
      reference,
      vendor,
      date,
      source = 'manual',
      metadata
    } = req.body

    if (!companyId || !type || !amount || !description) {
      return res.status(400).json({
        error: 'Company ID, type, amount, and description are required'
      })
    }

    // Auto-categorize if not provided and it's an expense
    let finalCategory = category
    if (type === 'expense' && !category) {
      finalCategory = await FinancialService.categorizeExpense(description, amount)
    }

    const transactionData = {
      companyId,
      type,
      amount: parseFloat(amount),
      description,
      category: finalCategory,
      paymentMethod,
      reference,
      vendor,
      date: date ? new Date(date) : new Date(),
      source,
      metadata,
    }

    const { transaction, ledgerEntries } = await FinancialService.createTransactionWithLedger(transactionData)

    // Trigger background report recalculation
    const { Queue } = await import('bullmq')
    const { createClient } = await import('redis')
    const redis = createClient({ url: process.env.REDIS_URL || 'redis://localhost:6379' })
    const reportQueue = new Queue('report-calculations', { connection: redis })

    // Queue dashboard summary update
    await reportQueue.add('update-dashboard', {
      companyId,
      reportType: 'dashboard_summary',
    })

    res.status(201).json({
      transaction,
      ledgerEntries,
      message: 'Transaction created with automatic ledger entries'
    })
  } catch (error) {
    console.error('Error creating transaction:', error)
    res.status(500).json({ error: 'Failed to create transaction' })
  }
})

// PUT /api/transactions/:id - Update transaction (limited - mainly for corrections)
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const {
      description,
      category,
      paymentMethod,
      reference,
      vendor,
      metadata
    } = req.body

    const transaction = await prisma.transaction.update({
      where: { id },
      data: {
        description,
        category,
        paymentMethod,
        reference,
        vendor,
        metadata,
      }
    })

    res.json(transaction)
  } catch (error) {
    console.error('Error updating transaction:', error)
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Transaction not found' })
    }
    res.status(500).json({ error: 'Failed to update transaction' })
  }
})

// DELETE /api/transactions/:id - Delete transaction and related ledger entries
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params

    // Delete ledger entries first (cascade will handle this, but being explicit)
    await prisma.ledgerEntry.deleteMany({
      where: { transactionId: id }
    })

    // Delete transaction
    await prisma.transaction.delete({
      where: { id }
    })

    res.status(204).send()
  } catch (error) {
    console.error('Error deleting transaction:', error)
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Transaction not found' })
    }
    res.status(500).json({ error: 'Failed to delete transaction' })
  }
})

export default router
