import express, { Router } from 'express'
import { PrismaClient } from '@prisma/client'
import { FinancialService } from '../services/financial.service'

const router: Router = Router()
const prisma = new PrismaClient()

// GET /api/expenses - Get all expenses for a company
router.get('/', async (req, res) => {
  try {
    const { companyId } = req.query

    if (!companyId || typeof companyId !== 'string') {
      return res.status(400).json({ error: 'Company ID is required' })
    }

    const expenses = await prisma.expense.findMany({
      where: { companyId },
      orderBy: { date: 'desc' }
    })

    res.json(expenses)
  } catch (error) {
    console.error('Error fetching expenses:', error)
    res.status(500).json({ error: 'Failed to fetch expenses' })
  }
})

// GET /api/expenses/:id - Get single expense
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params

    const expense = await prisma.expense.findUnique({
      where: { id }
    })

    if (!expense) {
      return res.status(404).json({ error: 'Expense not found' })
    }

    res.json(expense)
  } catch (error) {
    console.error('Error fetching expense:', error)
    res.status(500).json({ error: 'Failed to fetch expense' })
  }
})

// POST /api/expenses - Create new expense
router.post('/', async (req, res) => {
  try {
    const {
      companyId,
      date,
      description,
      category,
      amount,
      gstAmount = 0,
      paymentMethod = 'cash',
      reference,
      notes
    } = req.body

    if (!companyId || !description || !category || !amount) {
      return res.status(400).json({
        error: 'Company ID, description, category, and amount are required'
      })
    }

    const totalAmount = amount + gstAmount

    const expense = await prisma.expense.create({
      data: {
        companyId,
        date: new Date(date),
        description,
        category,
        amount: parseFloat(amount),
        gstAmount: parseFloat(gstAmount),
        totalAmount: parseFloat(totalAmount),
        paymentMethod,
        reference,
        notes
      }
    })

    // Create corresponding transaction and ledger entries
    const transactionData = {
      companyId,
      type: 'expense' as const,
      amount: parseFloat(totalAmount),
      description,
      category,
      paymentMethod,
      reference,
      date: new Date(date),
      source: 'expense',
      metadata: { expenseId: expense.id }
    }

    const { transaction, ledgerEntries } = await FinancialService.createTransactionWithLedger(transactionData)

    res.status(201).json({
      expense,
      transaction,
      ledgerEntries,
      message: 'Expense created with automatic ledger entries'
    })
  } catch (error) {
    console.error('Error creating expense:', error)
    res.status(500).json({ error: 'Failed to create expense' })
  }
})

// PUT /api/expenses/:id - Update expense
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const {
      date,
      description,
      category,
      amount,
      gstAmount = 0,
      paymentMethod,
      reference,
      notes
    } = req.body

    const totalAmount = parseFloat(amount) + parseFloat(gstAmount)

    const expense = await prisma.expense.update({
      where: { id },
      data: {
        date: date ? new Date(date) : undefined,
        description,
        category,
        amount: amount ? parseFloat(amount) : undefined,
        gstAmount: gstAmount ? parseFloat(gstAmount) : undefined,
        totalAmount,
        paymentMethod,
        reference,
        notes
      }
    })

    res.json(expense)
  } catch (error) {
    console.error('Error updating expense:', error)
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Expense not found' })
    }
    res.status(500).json({ error: 'Failed to update expense' })
  }
})

// DELETE /api/expenses/:id - Delete expense
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params

    await prisma.expense.delete({
      where: { id }
    })

    res.status(204).send()
  } catch (error) {
    console.error('Error deleting expense:', error)
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Expense not found' })
    }
    res.status(500).json({ error: 'Failed to delete expense' })
  }
})

export default router
