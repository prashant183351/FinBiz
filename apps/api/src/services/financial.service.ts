import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export interface TransactionData {
  companyId: string
  type: 'income' | 'expense' | 'transfer'
  amount: number
  description: string
  category?: string
  paymentMethod?: string
  reference?: string
  vendor?: string
  date?: Date
  source: string
  metadata?: any
}

export interface LedgerEntryData {
  companyId: string
  transactionId?: string
  account: string
  accountType: 'asset' | 'liability' | 'equity' | 'income' | 'expense'
  debit: number
  credit: number
  description: string
  refType?: string
  refId?: string
}

export class FinancialService {
  /**
   * Create a transaction and automatically post ledger entries
   */
  static async createTransactionWithLedger(data: TransactionData) {
    const transaction = await prisma.transaction.create({
      data: {
        companyId: data.companyId,
        type: data.type,
        amount: data.amount,
        description: data.description,
        category: data.category,
        paymentMethod: data.paymentMethod || 'cash',
        reference: data.reference,
        vendor: data.vendor,
        date: data.date || new Date(),
        source: data.source,
        metadata: data.metadata,
      },
    })

    // Auto-post ledger entries based on transaction type
    const ledgerEntries = await this.createLedgerEntriesForTransaction(transaction)

    return { transaction, ledgerEntries }
  }

  /**
   * Create ledger entries for a transaction based on its type
   */
  private static async createLedgerEntriesForTransaction(transaction: any) {
    const entries: LedgerEntryData[] = []

    switch (transaction.type) {
      case 'income':
        // Debit: Cash/Bank, Credit: Income
        entries.push({
          companyId: transaction.companyId,
          transactionId: transaction.id,
          account: transaction.paymentMethod === 'cash' ? 'Cash' : 'Bank Account',
          accountType: 'asset',
          debit: transaction.amount,
          credit: 0,
          description: transaction.description,
          refType: 'transaction',
          refId: transaction.id,
        })
        entries.push({
          companyId: transaction.companyId,
          transactionId: transaction.id,
          account: 'Sales Revenue',
          accountType: 'income',
          debit: 0,
          credit: transaction.amount,
          description: transaction.description,
          refType: 'transaction',
          refId: transaction.id,
        })
        break

      case 'expense':
        // Debit: Expense, Credit: Cash/Bank
        entries.push({
          companyId: transaction.companyId,
          transactionId: transaction.id,
          account: transaction.category || 'General Expense',
          accountType: 'expense',
          debit: transaction.amount,
          credit: 0,
          description: transaction.description,
          refType: 'transaction',
          refId: transaction.id,
        })
        entries.push({
          companyId: transaction.companyId,
          transactionId: transaction.id,
          account: transaction.paymentMethod === 'cash' ? 'Cash' : 'Bank Account',
          accountType: 'asset',
          debit: 0,
          credit: transaction.amount,
          description: transaction.description,
          refType: 'transaction',
          refId: transaction.id,
        })
        break

      case 'transfer':
        // For transfers between accounts (e.g., bank to cash)
        // This would need more specific logic based on transfer details
        break
    }

    // Create ledger entries with running balances
    const createdEntries = []
    for (const entry of entries) {
      const ledgerEntry = await this.createLedgerEntry(entry)
      createdEntries.push(ledgerEntry)
    }

    return createdEntries
  }

  /**
   * Create a single ledger entry with running balance calculation
   */
  private static async createLedgerEntry(data: LedgerEntryData) {
    // Calculate running balance for the account
    const lastEntry = await prisma.ledgerEntry.findFirst({
      where: {
        companyId: data.companyId,
        account: data.account,
      },
      orderBy: { createdAt: 'desc' },
    })

    const previousBalance = lastEntry?.balance || 0
    const newBalance = previousBalance + data.debit - data.credit

    return await prisma.ledgerEntry.create({
      data: {
        ...data,
        balance: newBalance,
      },
    })
  }

  /**
   * Get Profit & Loss statement
   */
  static async getProfitLoss(companyId: string, startDate: Date, endDate: Date) {
    const income = await prisma.ledgerEntry.aggregate({
      _sum: { credit: true },
      where: {
        companyId,
        accountType: 'income',
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
    })

    const expenses = await prisma.ledgerEntry.aggregate({
      _sum: { debit: true },
      where: {
        companyId,
        accountType: 'expense',
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
    })

    const totalIncome = income._sum.credit || 0
    const totalExpenses = expenses._sum.debit || 0
    const netProfit = totalIncome - totalExpenses

    return {
      totalIncome,
      totalExpenses,
      netProfit,
      period: { startDate, endDate },
    }
  }

  /**
   * Get Balance Sheet
   */
  static async getBalanceSheet(companyId: string, asOfDate: Date) {
    // Assets
    const assets = await prisma.ledgerEntry.groupBy({
      by: ['account'],
      where: {
        companyId,
        accountType: 'asset',
        date: { lte: asOfDate },
      },
      _sum: {
        debit: true,
        credit: true,
      },
    })

    // Liabilities
    const liabilities = await prisma.ledgerEntry.groupBy({
      by: ['account'],
      where: {
        companyId,
        accountType: 'liability',
        date: { lte: asOfDate },
      },
      _sum: {
        debit: true,
        credit: true,
      },
    })

    // Equity
    const equity = await prisma.ledgerEntry.groupBy({
      by: ['account'],
      where: {
        companyId,
        accountType: 'equity',
        date: { lte: asOfDate },
      },
      _sum: {
        debit: true,
        credit: true,
      },
    })

    const totalAssets = assets.reduce((sum, asset) => sum + (asset._sum.debit || 0) - (asset._sum.credit || 0), 0)
    const totalLiabilities = liabilities.reduce((sum, liability) => sum + (liability._sum.credit || 0) - (liability._sum.debit || 0), 0)
    const totalEquity = equity.reduce((sum, eq) => sum + (eq._sum.credit || 0) - (eq._sum.debit || 0), 0)

    return {
      assets: assets.map(asset => ({
        account: asset.account,
        balance: (asset._sum.debit || 0) - (asset._sum.credit || 0),
      })),
      liabilities: liabilities.map(liability => ({
        account: liability.account,
        balance: (liability._sum.credit || 0) - (liability._sum.debit || 0),
      })),
      equity: equity.map(eq => ({
        account: eq.account,
        balance: (eq._sum.credit || 0) - (eq._sum.debit || 0),
      })),
      totalAssets,
      totalLiabilities,
      totalEquity,
      asOfDate,
    }
  }

  /**
   * Get Cash Flow statement
   */
  static async getCashFlow(companyId: string, startDate: Date, endDate: Date) {
    // Cash inflows (from income transactions)
    const inflows = await prisma.ledgerEntry.aggregate({
      _sum: { debit: true },
      where: {
        companyId,
        account: { in: ['Cash', 'Bank Account'] },
        accountType: 'asset',
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
    })

    // Cash outflows (to expenses)
    const outflows = await prisma.ledgerEntry.aggregate({
      _sum: { credit: true },
      where: {
        companyId,
        account: { in: ['Cash', 'Bank Account'] },
        accountType: 'asset',
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
    })

    const netCashFlow = (inflows._sum.debit || 0) - (outflows._sum.credit || 0)

    return {
      cashInflows: inflows._sum.debit || 0,
      cashOutflows: outflows._sum.credit || 0,
      netCashFlow,
      period: { startDate, endDate },
    }
  }

  /**
   * Auto-categorize expense using AI (placeholder for now)
   */
  static async categorizeExpense(description: string, amount: number): Promise<string> {
    // This would integrate with LangChain + GPT for AI categorization
    // For now, return basic categorization based on keywords

    const desc = description.toLowerCase()

    if (desc.includes('phone') || desc.includes('mobile') || desc.includes('telecom')) {
      return 'Utilities'
    }
    if (desc.includes('office') || desc.includes('stationery') || desc.includes('supplies')) {
      return 'Office Supplies'
    }
    if (desc.includes('travel') || desc.includes('taxi') || desc.includes('fuel')) {
      return 'Travel'
    }
    if (desc.includes('salary') || desc.includes('payroll')) {
      return 'Salary'
    }
    if (desc.includes('rent') || desc.includes('lease')) {
      return 'Rent'
    }

    return 'General Expense'
  }
}
