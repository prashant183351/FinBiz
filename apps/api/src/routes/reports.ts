import express, { Router } from 'express'
import { Queue } from 'bullmq'
import { createClient as createRedisClient } from 'redis'
import { FinancialService } from '../services/financial.service'

const router: Router = Router()
const redis = createRedisClient({ url: process.env.REDIS_URL || 'redis://localhost:6379' })
const reportQueue = new Queue('report-calculations', { connection: redis })

// GET /api/reports/profit-loss - Get Profit & Loss statement
router.get('/profit-loss', async (req, res) => {
  try {
    const { companyId, startDate, endDate } = req.query

    if (!companyId || typeof companyId !== 'string') {
      return res.status(400).json({ error: 'Company ID is required' })
    }

    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'Start date and end date are required' })
    }

    const report = await FinancialService.getProfitLoss(
      companyId,
      new Date(startDate as string),
      new Date(endDate as string)
    )

    res.json(report)
  } catch (error) {
    console.error('Error generating P&L report:', error)
    res.status(500).json({ error: 'Failed to generate Profit & Loss report' })
  }
})

// GET /api/reports/balance-sheet - Get Balance Sheet
router.get('/balance-sheet', async (req, res) => {
  try {
    const { companyId, asOfDate } = req.query

    if (!companyId || typeof companyId !== 'string') {
      return res.status(400).json({ error: 'Company ID is required' })
    }

    const date = asOfDate ? new Date(asOfDate as string) : new Date()
    const report = await FinancialService.getBalanceSheet(companyId, date)

    res.json(report)
  } catch (error) {
    console.error('Error generating balance sheet:', error)
    res.status(500).json({ error: 'Failed to generate Balance Sheet' })
  }
})

// GET /api/reports/cash-flow - Get Cash Flow statement
router.get('/cash-flow', async (req, res) => {
  try {
    const { companyId, startDate, endDate } = req.query

    if (!companyId || typeof companyId !== 'string') {
      return res.status(400).json({ error: 'Company ID is required' })
    }

    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'Start date and end date are required' })
    }

    const report = await FinancialService.getCashFlow(
      companyId,
      new Date(startDate as string),
      new Date(endDate as string)
    )

    res.json(report)
  } catch (error) {
    console.error('Error generating cash flow report:', error)
    res.status(500).json({ error: 'Failed to generate Cash Flow report' })
  }
})

// GET /api/reports/dashboard-summary - Get dashboard summary with key metrics
router.get('/dashboard-summary', async (req, res) => {
  try {
    const { companyId } = req.query

    if (!companyId || typeof companyId !== 'string') {
      return res.status(400).json({ error: 'Company ID is required' })
    }

    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const startOfYear = new Date(now.getFullYear(), 0, 1)

    // Get current month P&L
    const monthlyPL = await FinancialService.getProfitLoss(companyId, startOfMonth, now)

    // Get YTD P&L
    const ytdPL = await FinancialService.getProfitLoss(companyId, startOfYear, now)

    // Get current balance sheet
    const balanceSheet = await FinancialService.getBalanceSheet(companyId, now)

    // Get monthly cash flow
    const monthlyCashFlow = await FinancialService.getCashFlow(companyId, startOfMonth, now)

    const summary = {
      currentMonth: {
        income: monthlyPL.totalIncome,
        expenses: monthlyPL.totalExpenses,
        netProfit: monthlyPL.netProfit,
        cashFlow: monthlyCashFlow.netCashFlow,
      },
      yearToDate: {
        income: ytdPL.totalIncome,
        expenses: ytdPL.totalExpenses,
        netProfit: ytdPL.netProfit,
      },
      balanceSheet: {
        totalAssets: balanceSheet.totalAssets,
        totalLiabilities: balanceSheet.totalLiabilities,
        totalEquity: balanceSheet.totalEquity,
        netWorth: balanceSheet.totalAssets - balanceSheet.totalLiabilities,
      },
      generatedAt: now,
    }

    res.json(summary)
  } catch (error) {
    console.error('Error generating dashboard summary:', error)
    res.status(500).json({ error: 'Failed to generate dashboard summary' })
  }
})

// GET /api/reports/top-expenses - Get top expense categories
router.get('/top-expenses', async (req, res) => {
  try {
    const { companyId, limit = 5 } = req.query

    if (!companyId || typeof companyId !== 'string') {
      return res.status(400).json({ error: 'Company ID is required' })
    }

    const { PrismaClient } = await import('@prisma/client')
    const prisma = new PrismaClient()

    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

    const topExpenses = await prisma.ledgerEntry.groupBy({
      by: ['account'],
      where: {
        companyId,
        accountType: 'expense',
        date: {
          gte: startOfMonth,
          lte: now,
        },
      },
      _sum: {
        debit: true,
      },
      orderBy: {
        _sum: {
          debit: 'desc',
        },
      },
      take: parseInt(limit as string),
    })

    const result = topExpenses.map(expense => ({
      category: expense.account,
      amount: expense._sum.debit || 0,
    }))

    res.json(result)
  } catch (error) {
    console.error('Error fetching top expenses:', error)
    res.status(500).json({ error: 'Failed to fetch top expenses' })
  }
})

export default router
