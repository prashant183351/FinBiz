// Common types shared across the monorepo

export interface User {
  id: string
  email: string
  name?: string
  createdAt: Date
  updatedAt: Date
}

export interface Company {
  id: string
  name: string
  gstin?: string
  pan?: string
  address?: string
  createdAt: Date
  updatedAt: Date
}

export interface Role {
  id: string
  name: string
  permissions: string[]
  createdAt: Date
  updatedAt: Date
}

export interface Membership {
  id: string
  userId: string
  companyId: string
  roleId: string
  createdAt: Date
  updatedAt: Date
}

// GST-related types
export interface GSTBreakup {
  cgst: number
  sgst: number
  igst: number
  total: number
}

export interface InvoiceItem {
  id: string
  description: string
  hsnCode?: string
  quantity: number
  rate: number
  amount: number
  gstRate: number
  gstBreakup: GSTBreakup
}

export interface Invoice {
  id: string
  companyId: string
  invoiceNumber: string
  customerName: string
  customerGSTIN?: string
  items: InvoiceItem[]
  subtotal: number
  totalGST: number
  totalAmount: number
  status: 'draft' | 'finalized' | 'paid'
  createdAt: Date
  updatedAt: Date
}
