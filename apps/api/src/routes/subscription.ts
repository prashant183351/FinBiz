import express, { Router } from 'express'
import { authenticateToken } from '../middleware/auth'
import { auditLogger } from '../middleware/audit'
import { SubscriptionService } from '../services/subscription.service'

const router: Router = express.Router()

// Apply authentication and audit logging to all subscription routes
router.use(authenticateToken)
router.use(auditLogger())

// ============================================================================
// PLAN MANAGEMENT (Admin only)
// ============================================================================

// GET /api/subscription/plans - Get all active plans
router.get('/plans', async (req, res) => {
  try {
    const plans = await SubscriptionService.getActivePlans()
    res.json(plans)
  } catch (error) {
    console.error('Error fetching plans:', error)
    res.status(500).json({ error: 'Failed to fetch plans' })
  }
})

// ============================================================================
// SUBSCRIPTION MANAGEMENT
// ============================================================================

// GET /api/subscription/current - Get current user's subscription
router.get('/current', async (req, res) => {
  try {
    const userId = (req as any).userId
    const companyId = req.query.companyId as string

    const subscription = await SubscriptionService.getUserSubscription(userId, companyId)

    if (!subscription) {
      return res.json({ plan: 'free', features: {}, limits: {} })
    }

    res.json({
      subscription: {
        id: subscription.id,
        status: subscription.status,
        currentPeriodStart: subscription.currentPeriodStart,
        currentPeriodEnd: subscription.currentPeriodEnd,
        trialEnd: subscription.trialEnd,
        cancelAtPeriodEnd: subscription.cancelAtPeriodEnd
      },
      plan: subscription.plan
    })
  } catch (error) {
    console.error('Error fetching subscription:', error)
    res.status(500).json({ error: 'Failed to fetch subscription' })
  }
})

// POST /api/subscription - Create new subscription
router.post('/', async (req, res) => {
  try {
    const userId = (req as any).userId
    const { planId, companyId, trialDays, paymentMethod } = req.body

    if (!planId) {
      return res.status(400).json({ error: 'Plan ID is required' })
    }

    // Check if user already has an active subscription
    const existingSubscription = await SubscriptionService.getUserSubscription(userId, companyId)
    if (existingSubscription) {
      return res.status(400).json({ error: 'User already has an active subscription' })
    }

    const subscription = await SubscriptionService.createSubscription({
      userId,
      planId,
      companyId,
      trialDays,
      metadata: { paymentMethod }
    })

    res.status(201).json(subscription)
  } catch (error) {
    console.error('Error creating subscription:', error)
    res.status(500).json({ error: 'Failed to create subscription' })
  }
})

// PUT /api/subscription/:subscriptionId/cancel - Cancel subscription
router.put('/:subscriptionId/cancel', async (req, res) => {
  try {
    const { subscriptionId } = req.params
    const userId = (req as any).userId
    const { cancelAtPeriodEnd = true } = req.body

    const subscription = await SubscriptionService.cancelSubscription(subscriptionId, userId, cancelAtPeriodEnd)
    res.json(subscription)
  } catch (error) {
    console.error('Error cancelling subscription:', error)
    res.status(500).json({ error: 'Failed to cancel subscription' })
  }
})

// PUT /api/subscription/:subscriptionId/plan - Change subscription plan
router.put('/:subscriptionId/plan', async (req, res) => {
  try {
    const { subscriptionId } = req.params
    const userId = (req as any).userId
    const { newPlanId } = req.body

    if (!newPlanId) {
      return res.status(400).json({ error: 'New plan ID is required' })
    }

    const subscription = await SubscriptionService.changePlan(subscriptionId, newPlanId, userId)
    res.json(subscription)
  } catch (error) {
    console.error('Error changing plan:', error)
    res.status(500).json({ error: 'Failed to change plan' })
  }
})

// ============================================================================
// FEATURE ACCESS CHECKS
// ============================================================================

// GET /api/subscription/check-feature/:feature - Check if user has access to feature
router.get('/check-feature/:feature', async (req, res) => {
  try {
    const { feature } = req.params
    const userId = (req as any).userId
    const companyId = req.query.companyId as string

    const hasAccess = await SubscriptionService.checkFeatureAccess(userId, feature, companyId)
    res.json({ hasAccess, feature })
  } catch (error) {
    console.error('Error checking feature access:', error)
    res.status(500).json({ error: 'Failed to check feature access' })
  }
})

// GET /api/subscription/check-limit/:resource - Check usage limit for resource
router.get('/check-limit/:resource', async (req, res) => {
  try {
    const { resource } = req.params
    const userId = (req as any).userId
    const companyId = req.query.companyId as string

    const limitCheck = await SubscriptionService.checkUsageLimit(userId, resource, companyId)
    res.json(limitCheck)
  } catch (error) {
    console.error('Error checking usage limit:', error)
    res.status(500).json({ error: 'Failed to check usage limit' })
  }
})

// ============================================================================
// USAGE TRACKING
// ============================================================================

// POST /api/subscription/usage - Record usage
router.post('/usage', async (req, res) => {
  try {
    const userId = (req as any).userId
    const { subscriptionId, action, quantity = 1, cost = 0, metadata } = req.body

    const usage = await SubscriptionService.recordUsage(
      subscriptionId || null,
      userId,
      action,
      quantity,
      cost,
      metadata
    )

    res.status(201).json(usage)
  } catch (error) {
    console.error('Error recording usage:', error)
    res.status(500).json({ error: 'Failed to record usage' })
  }
})

// GET /api/subscription/usage - Get usage history
router.get('/usage', async (req, res) => {
  try {
    const userId = (req as any).userId
    const { startDate, endDate, action, limit = '50', offset = '0' } = req.query

    const where: any = { userId }

    if (startDate) where.createdAt = { ...where.createdAt, gte: new Date(startDate as string) }
    if (endDate) where.createdAt = { ...where.createdAt, lte: new Date(endDate as string) }
    if (action) where.action = action as string

    const { PrismaClient } = await import('@prisma/client')
    const prisma = new PrismaClient()

    const usages = await prisma.usage.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit as string),
      skip: parseInt(offset as string)
    })

    const total = await prisma.usage.count({ where })

    res.json({
      usages,
      total,
      limit: parseInt(limit as string),
      offset: parseInt(offset as string)
    })
  } catch (error) {
    console.error('Error fetching usage:', error)
    res.status(500).json({ error: 'Failed to fetch usage' })
  }
})

// ============================================================================
// BILLING HISTORY
// ============================================================================

// GET /api/subscription/billing - Get billing history
router.get('/billing', async (req, res) => {
  try {
    const userId = (req as any).userId
    const { status, limit = '50', offset = '0' } = req.query

    const { PrismaClient } = await import('@prisma/client')
    const prisma = new PrismaClient()

    const where: any = { userId }
    if (status) where.status = status as string

    const payments = await prisma.payment.findMany({
      where,
      include: {
        subscription: {
          include: {
            plan: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit as string),
      skip: parseInt(offset as string)
    })

    const total = await prisma.payment.count({ where })

    res.json({
      payments,
      total,
      limit: parseInt(limit as string),
      offset: parseInt(offset as string)
    })
  } catch (error) {
    console.error('Error fetching billing history:', error)
    res.status(500).json({ error: 'Failed to fetch billing history' })
  }
})

export default router
