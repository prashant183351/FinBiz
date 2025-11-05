"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_1 = require("../middleware/auth");
const audit_1 = require("../middleware/audit");
const subscription_service_1 = require("../services/subscription.service");
const router = express_1.default.Router();
// Apply authentication and audit logging to all subscription routes
router.use(auth_1.authenticateToken);
router.use((0, audit_1.auditLogger)());
// ============================================================================
// PLAN MANAGEMENT (Admin only)
// ============================================================================
// GET /api/subscription/plans - Get all active plans
router.get('/plans', async (req, res) => {
    try {
        const plans = await subscription_service_1.SubscriptionService.getActivePlans();
        res.json(plans);
    }
    catch (error) {
        console.error('Error fetching plans:', error);
        res.status(500).json({ error: 'Failed to fetch plans' });
    }
});
// ============================================================================
// SUBSCRIPTION MANAGEMENT
// ============================================================================
// GET /api/subscription/current - Get current user's subscription
router.get('/current', async (req, res) => {
    try {
        const userId = req.userId;
        const companyId = req.query.companyId;
        const subscription = await subscription_service_1.SubscriptionService.getUserSubscription(userId, companyId);
        if (!subscription) {
            return res.json({ plan: 'free', features: {}, limits: {} });
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
        });
    }
    catch (error) {
        console.error('Error fetching subscription:', error);
        res.status(500).json({ error: 'Failed to fetch subscription' });
    }
});
// POST /api/subscription - Create new subscription
router.post('/', async (req, res) => {
    try {
        const userId = req.userId;
        const { planId, companyId, trialDays, paymentMethod } = req.body;
        if (!planId) {
            return res.status(400).json({ error: 'Plan ID is required' });
        }
        // Check if user already has an active subscription
        const existingSubscription = await subscription_service_1.SubscriptionService.getUserSubscription(userId, companyId);
        if (existingSubscription) {
            return res.status(400).json({ error: 'User already has an active subscription' });
        }
        const subscription = await subscription_service_1.SubscriptionService.createSubscription({
            userId,
            planId,
            companyId,
            trialDays,
            metadata: { paymentMethod }
        });
        res.status(201).json(subscription);
    }
    catch (error) {
        console.error('Error creating subscription:', error);
        res.status(500).json({ error: 'Failed to create subscription' });
    }
});
// PUT /api/subscription/:subscriptionId/cancel - Cancel subscription
router.put('/:subscriptionId/cancel', async (req, res) => {
    try {
        const { subscriptionId } = req.params;
        const userId = req.userId;
        const { cancelAtPeriodEnd = true } = req.body;
        const subscription = await subscription_service_1.SubscriptionService.cancelSubscription(subscriptionId, userId, cancelAtPeriodEnd);
        res.json(subscription);
    }
    catch (error) {
        console.error('Error cancelling subscription:', error);
        res.status(500).json({ error: 'Failed to cancel subscription' });
    }
});
// PUT /api/subscription/:subscriptionId/plan - Change subscription plan
router.put('/:subscriptionId/plan', async (req, res) => {
    try {
        const { subscriptionId } = req.params;
        const userId = req.userId;
        const { newPlanId } = req.body;
        if (!newPlanId) {
            return res.status(400).json({ error: 'New plan ID is required' });
        }
        const subscription = await subscription_service_1.SubscriptionService.changePlan(subscriptionId, newPlanId, userId);
        res.json(subscription);
    }
    catch (error) {
        console.error('Error changing plan:', error);
        res.status(500).json({ error: 'Failed to change plan' });
    }
});
// ============================================================================
// FEATURE ACCESS CHECKS
// ============================================================================
// GET /api/subscription/check-feature/:feature - Check if user has access to feature
router.get('/check-feature/:feature', async (req, res) => {
    try {
        const { feature } = req.params;
        const userId = req.userId;
        const companyId = req.query.companyId;
        const hasAccess = await subscription_service_1.SubscriptionService.checkFeatureAccess(userId, feature, companyId);
        res.json({ hasAccess, feature });
    }
    catch (error) {
        console.error('Error checking feature access:', error);
        res.status(500).json({ error: 'Failed to check feature access' });
    }
});
// GET /api/subscription/check-limit/:resource - Check usage limit for resource
router.get('/check-limit/:resource', async (req, res) => {
    try {
        const { resource } = req.params;
        const userId = req.userId;
        const companyId = req.query.companyId;
        const limitCheck = await subscription_service_1.SubscriptionService.checkUsageLimit(userId, resource, companyId);
        res.json(limitCheck);
    }
    catch (error) {
        console.error('Error checking usage limit:', error);
        res.status(500).json({ error: 'Failed to check usage limit' });
    }
});
// ============================================================================
// USAGE TRACKING
// ============================================================================
// POST /api/subscription/usage - Record usage
router.post('/usage', async (req, res) => {
    try {
        const userId = req.userId;
        const { subscriptionId, action, quantity = 1, cost = 0, metadata } = req.body;
        const usage = await subscription_service_1.SubscriptionService.recordUsage(subscriptionId || null, userId, action, quantity, cost, metadata);
        res.status(201).json(usage);
    }
    catch (error) {
        console.error('Error recording usage:', error);
        res.status(500).json({ error: 'Failed to record usage' });
    }
});
// GET /api/subscription/usage - Get usage history
router.get('/usage', async (req, res) => {
    try {
        const userId = req.userId;
        const { startDate, endDate, action, limit = '50', offset = '0' } = req.query;
        const where = { userId };
        if (startDate)
            where.createdAt = { ...where.createdAt, gte: new Date(startDate) };
        if (endDate)
            where.createdAt = { ...where.createdAt, lte: new Date(endDate) };
        if (action)
            where.action = action;
        const { PrismaClient } = await Promise.resolve().then(() => __importStar(require('@prisma/client')));
        const prisma = new PrismaClient();
        const usages = await prisma.usage.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            take: parseInt(limit),
            skip: parseInt(offset)
        });
        const total = await prisma.usage.count({ where });
        res.json({
            usages,
            total,
            limit: parseInt(limit),
            offset: parseInt(offset)
        });
    }
    catch (error) {
        console.error('Error fetching usage:', error);
        res.status(500).json({ error: 'Failed to fetch usage' });
    }
});
// ============================================================================
// BILLING HISTORY
// ============================================================================
// GET /api/subscription/billing - Get billing history
router.get('/billing', async (req, res) => {
    try {
        const userId = req.userId;
        const { status, limit = '50', offset = '0' } = req.query;
        const { PrismaClient } = await Promise.resolve().then(() => __importStar(require('@prisma/client')));
        const prisma = new PrismaClient();
        const where = { userId };
        if (status)
            where.status = status;
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
            take: parseInt(limit),
            skip: parseInt(offset)
        });
        const total = await prisma.payment.count({ where });
        res.json({
            payments,
            total,
            limit: parseInt(limit),
            offset: parseInt(offset)
        });
    }
    catch (error) {
        console.error('Error fetching billing history:', error);
        res.status(500).json({ error: 'Failed to fetch billing history' });
    }
});
exports.default = router;
//# sourceMappingURL=subscription.js.map