"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_1 = require("../middleware/auth");
const audit_1 = require("../middleware/audit");
const payment_service_1 = require("../services/payment.service");
const router = express_1.default.Router();
// Apply authentication and audit logging to all payment routes
router.use(auth_1.authenticateToken);
router.use((0, audit_1.auditLogger)());
/**
 * Create a payment
 * POST /api/payment/create
 */
router.post('/create', async (req, res) => {
    try {
        const userId = req.userId;
        const { subscriptionId, amount, paymentMethod, description, dueDate, metadata } = req.body;
        const payment = await payment_service_1.PaymentService.createPayment({
            subscriptionId,
            userId,
            amount,
            paymentMethod,
            description,
            dueDate: dueDate ? new Date(dueDate) : undefined,
            metadata
        });
        res.json({
            success: true,
            data: payment
        });
    }
    catch (error) {
        console.error('Payment creation error:', error);
        res.status(400).json({
            success: false,
            error: error.message
        });
    }
});
/**
 * Process a payment
 * POST /api/payment/:paymentId/process
 */
router.post('/:paymentId/process', async (req, res) => {
    try {
        const { paymentId } = req.params;
        const { gatewayData } = req.body;
        const payment = await payment_service_1.PaymentService.processPayment(paymentId, gatewayData);
        res.json({
            success: true,
            data: payment
        });
    }
    catch (error) {
        console.error('Payment processing error:', error);
        res.status(400).json({
            success: false,
            error: error.message
        });
    }
});
/**
 * Get user's payment history
 * GET /api/payment/history
 */
router.get('/history', async (req, res) => {
    try {
        const userId = req.userId;
        const { limit = 50 } = req.query;
        const payments = await payment_service_1.PaymentService.getUserPayments(userId, parseInt(limit));
        res.json({
            success: true,
            data: payments
        });
    }
    catch (error) {
        console.error('Payment history error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});
/**
 * Get payment by ID
 * GET /api/payment/:paymentId
 */
router.get('/:paymentId', async (req, res) => {
    try {
        const userId = req.userId;
        const { paymentId } = req.params;
        // Check if user owns this payment or has admin access
        const payment = await payment_service_1.PaymentService.getUserPayments(userId, 1000);
        const userPayment = payment.find(p => p.id === paymentId);
        if (!userPayment) {
            return res.status(404).json({
                success: false,
                error: 'Payment not found'
            });
        }
        res.json({
            success: true,
            data: userPayment
        });
    }
    catch (error) {
        console.error('Payment fetch error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});
/**
 * Process refund
 * POST /api/payment/:paymentId/refund
 */
router.post('/:paymentId/refund', async (req, res) => {
    try {
        const { paymentId } = req.params;
        const { amount, reason } = req.body;
        const refund = await payment_service_1.PaymentService.processRefund(paymentId, amount, reason);
        res.json({
            success: true,
            data: refund
        });
    }
    catch (error) {
        console.error('Refund processing error:', error);
        res.status(400).json({
            success: false,
            error: error.message
        });
    }
});
/**
 * Get commission summary
 * GET /api/payment/commissions/summary
 */
router.get('/commissions/summary', async (req, res) => {
    try {
        const userId = req.userId;
        const summary = await payment_service_1.PaymentService.getCommissionSummary(userId);
        res.json({
            success: true,
            data: summary
        });
    }
    catch (error) {
        console.error('Commission summary error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});
/**
 * Webhook handlers (no auth required for webhooks)
 */
/**
 * Razorpay webhook
 * POST /api/payment/webhook/razorpay
 */
router.post('/webhook/razorpay', async (req, res) => {
    try {
        const signature = req.headers['x-razorpay-signature'];
        await payment_service_1.PaymentService.handleWebhook('razorpay', req.body, signature);
        res.json({ status: 'ok' });
    }
    catch (error) {
        console.error('Razorpay webhook error:', error);
        res.status(400).json({ error: error.message });
    }
});
/**
 * PhonePe webhook
 * POST /api/payment/webhook/phonepe
 */
router.post('/webhook/phonepe', async (req, res) => {
    try {
        const signature = req.headers['x-verify'];
        await payment_service_1.PaymentService.handleWebhook('phonepe', req.body, signature);
        res.json({ status: 'ok' });
    }
    catch (error) {
        console.error('PhonePe webhook error:', error);
        res.status(400).json({ error: error.message });
    }
});
/**
 * Admin routes
 */
/**
 * Get all payments (admin only)
 * GET /api/payment/admin/all
 */
router.get('/admin/all', async (req, res) => {
    try {
        const { page = 1, limit = 50, status, paymentMethod } = req.query;
        // This would need to be implemented in PaymentService
        // For now, return empty array
        res.json({
            success: true,
            data: [],
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: 0
            }
        });
    }
    catch (error) {
        console.error('Admin payments fetch error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});
/**
 * Get global commission summary (admin only)
 * GET /api/payment/admin/commissions
 */
router.get('/admin/commissions', async (req, res) => {
    try {
        const summary = await payment_service_1.PaymentService.getCommissionSummary();
        res.json({
            success: true,
            data: summary
        });
    }
    catch (error) {
        console.error('Admin commission summary error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});
exports.default = router;
//# sourceMappingURL=payment.js.map