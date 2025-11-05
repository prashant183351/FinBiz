// Common utility functions

export function calculateGSTBreakup(
  amount: number,
  gstRate: number,
  placeOfSupply: string,
  companyState: string
): { cgst: number; sgst: number; igst: number; total: number } {
  const gstAmount = (amount * gstRate) / 100

  // Simple GST logic: IGST if inter-state, CGST+SGST if intra-state
  const isIntraState = placeOfSupply === companyState

  if (isIntraState) {
    const halfGST = gstAmount / 2
    return {
      cgst: halfGST,
      sgst: halfGST,
      igst: 0,
      total: gstAmount,
    }
  } else {
    return {
      cgst: 0,
      sgst: 0,
      igst: gstAmount,
      total: gstAmount,
    }
  }
}

export function generateInvoiceNumber(companyId: string, sequence: number): string {
  const year = new Date().getFullYear()
  const paddedSequence = sequence.toString().padStart(4, '0')
  return `INV-${companyId}-${year}-${paddedSequence}`
}

export function formatCurrency(amount: number, currency = 'INR'): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
  }).format(amount)
}

export function validateGSTIN(gstin: string): boolean {
  // Basic GSTIN validation (15 characters, alphanumeric)
  const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/
  return gstinRegex.test(gstin)
}

export function validatePAN(pan: string): boolean {
  // Basic PAN validation (10 characters, specific format)
  const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/
  return panRegex.test(pan)
}
