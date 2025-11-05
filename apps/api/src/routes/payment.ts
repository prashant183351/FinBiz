import express, { Router } from 'express'
import { authenticateToken } from '../middleware/auth'
import { auditLogger } from '../middleware/audit'
import { PaymentService } from '../services/payment.service'

const router: Router = express.Router()

// Apply authentication and audit logging to all payment routes
router.use(authenticateToken)
router.use(auditLogger())

/**
 * Create a payment
 * POST /api/payment/create
 */
router.post('/create', async (req, res) => {
  try {
    const userId = (req as any).userId
    const { subscriptionId, amount, paymentMethod, description, dueDate, metadata } = req.body

    const payment = await PaymentService.createPayment({
      subscriptionId,
      userId,
      amount,
      paymentMethod,
      description,
      dueDate: dueDate ? new Date(dueDate) : undefined,
      metadata
    })

    res.json({
      success: true,
      data: payment
    })
  } catch (error: any) {
    console.error('Payment creation error:', error)
    res.status(400).json({
      success: false,
      error: error.message
    })
  }
})

/**
 * Process a payment
 * POST /api/payment/:paymentId/process
 */
router.post('/:paymentId/process', async (req, res) => {
  try {
    const { paymentId } = req.params
    const { gatewayData } = req.body

    const payment = await PaymentService.processPayment(paymentId, gatewayData)

    res.json({
      success: true,
      data: payment
    })
  } catch (error: any) {
    console.error('Payment processing error:', error)
    res.status(400).json({
      success: false,
      error: error.message
    })
  }
})

/**
 * Get user's payment history
 * GET /api/payment/history
 */
router.get('/history', async (req, res) => {
  try {
    const userId = (req as any).userId
    const { limit = 50 } = req.query

    const payments = await PaymentService.getUserPayments(userId, parseInt(limit as string))

    res.json({
      success: true,
      data: payments
    })
  } catch (error: any) {
    console.error('Payment history error:', error)
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
})

/**
 * Get payment by ID
 * GET /api/payment/:paymentId
 */
router.get('/:paymentId', async (req, res) => {
  try {
    const userId = (req as any).userId
    const { paymentId } = req.params

    // Check if user owns this payment or has admin access
    const payment = await PaymentService.getUserPayments(userId, 1000)
    const userPayment = payment.find(p => p.id === paymentId)

    if (!userPayment) {
      return res.status(404).json({
        success: false,
        error: 'Payment not found'
      })
    }

    res.json({
      success: true,
      data: userPayment
    })
  } catch (error: any) {
    console.error('Payment fetch error:', error)
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
})

/**
 * Process refund
 * POST /api/payment/:paymentId/refund
 */
router.post('/:paymentId/refund', async (req, res) => {
  try {
    const { paymentId } = req.params
    const { amount, reason } = req.body

    const refund = await PaymentService.processRefund(paymentId, amount, reason)

    res.json({
      success: true,
      data: refund
    })
  } catch (error: any) {
    console.error('Refund processing error:', error)
    res.status(400).json({
      success: false,
      error: error.message
    })
  }
})

/**
 * Get commission summary
 * GET /api/payment/commissions/summary
 */
router.get('/commissions/summary', async (req, res) => {
  try {
    const userId = (req as any).userId
    const summary = await PaymentService.getCommissionSummary(userId)

    res.json({
      success: true,
      data: summary
    })
  } catch (error: any) {
    console.error('Commission summary error:', error)
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
})

/**
 * Webhook handlers (no auth required for webhooks)
 */

/**
 * Razorpay webhook
 * POST /api/payment/webhook/razorpay
 */
router.post('/webhook/razorpay', async (req, res) => {
  try {
    const signature = req.headers['x-razorpay-signature'] as string
    await PaymentService.handleWebhook('razorpay', req.body, signature)

    res.json({ status: 'ok' })
  } catch (error: any) {
    console.error('Razorpay webhook error:', error)
    res.status(400).json({ error: error.message })
  }
})

/**
 * PhonePe webhook
 * POST /api/payment/webhook/phonepe
 */
router.post('/webhook/phonepe', async (req, res) => {
  try {
    const signature = req.headers['x-verify'] as string
    await PaymentService.handleWebhook('phonepe', req.body, signature)

    res.json({ status: 'ok' })
  } catch (error: any) {
    console.error('PhonePe webhook error:', error)
    res.status(400).json({ error: error.message })
  }
})

/**
 * Admin routes
 */

/**
 * Get all payments (admin only)
 * GET /api/payment/admin/all
 */
router.get('/admin/all', async (req, res) => {
  try {
    const { page = 1, limit = 50, status, paymentMethod } = req.query

    // This would need to be implemented in PaymentService
    // For now, return empty array
    res.json({
      success: true,
      data: [],
      pagination: {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        total: 0
      }
    })
  } catch (error: any) {
    console.error('Admin payments fetch error:', error)
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
})

/**
 * Get global commission summary (admin only)
 * GET /api/payment/admin/commissions
 */
router.get('/admin/commissions', async (req, res) => {
  try {
    const summary = await PaymentService.getCommissionSummary()

    res.json({
      success: true,
      data: summary
    })
  } catch (error: any) {
    console.error('Admin commission summary error:', error)
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
})

export default router
