"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaymentService = void 0;
const client_1 = require("@prisma/client");
const audit_service_1 = require("./audit.service");
const subscription_service_1 = require("./subscription.service");
const axios_1 = __importDefault(require("axios"));
const crypto_1 = __importDefault(require("crypto"));
const prisma = new client_1.PrismaClient();
class PaymentService {
    /**
     * Initialize payment gateway configurations
     */
    static async initializeGateways() {
        const configs = await prisma.gatewayConfig.findMany({
            where: { isActive: true }
        });
        for (const config of configs) {
            this.gatewayConfigs.set(config.gateway, {
                gateway: config.gateway,
                ...config.config,
                testMode: config.testMode
            });
        }
    }
    /**
     * Get gateway configuration
     */
    static getGatewayConfig(gateway) {
        return this.gatewayConfigs.get(gateway) || null;
    }
    /**
     * Create a payment record
     */
    static async createPayment(paymentData) {
        const payment = await prisma.payment.create({
            data: {
                subscriptionId: paymentData.subscriptionId,
                userId: paymentData.userId,
                amount: paymentData.amount,
                currency: paymentData.currency || 'INR',
                paymentMethod: paymentData.paymentMethod,
                description: paymentData.description,
                dueDate: paymentData.dueDate,
                metadata: paymentData.metadata
            }
        });
        await audit_service_1.AuditService.log({
            userId: paymentData.userId,
            action: 'create',
            resource: 'payment',
            resourceId: payment.id,
            details: {
                amount: paymentData.amount,
                paymentMethod: paymentData.paymentMethod
            },
            success: true
        });
        return payment;
    }
    /**
     * Process payment through gateway
     */
    static async processPayment(paymentId, gatewayData) {
        const payment = await prisma.payment.findUnique({
            where: { id: paymentId },
            include: { user: true, subscription: true }
        });
        if (!payment) {
            throw new Error('Payment not found');
        }
        const gateway = this.getGatewayConfig(payment.paymentMethod);
        if (!gateway) {
            throw new Error(`Payment gateway ${payment.paymentMethod} not configured`);
        }
        try {
            let gatewayResponse = null;
            let gatewayId = null;
            // Process based on gateway
            switch (payment.paymentMethod) {
                case 'razorpay':
                    const razorpayResponse = await this.processRazorpayPayment(payment, gateway);
                    gatewayResponse = razorpayResponse;
                    gatewayId = razorpayResponse.id;
                    break;
                case 'phonepe':
                    const phonepeResponse = await this.processPhonePePayment(payment, gateway);
                    gatewayResponse = phonepeResponse;
                    gatewayId = phonepeResponse.transactionId;
                    break;
                default:
                    throw new Error(`Unsupported payment method: ${payment.paymentMethod}`);
            }
            // Update payment with gateway response
            const updatedPayment = await prisma.payment.update({
                where: { id: paymentId },
                data: {
                    gatewayId,
                    gatewayResponse,
                    status: 'completed',
                    paidAt: new Date()
                }
            });
            // If this is a subscription payment, update subscription
            if (payment.subscriptionId) {
                await subscription_service_1.SubscriptionService.renewSubscription(payment.subscriptionId);
            }
            // Calculate and create commissions
            await this.calculateCommissions(paymentId, payment);
            await audit_service_1.AuditService.log({
                userId: payment.userId,
                action: 'process',
                resource: 'payment',
                resourceId: paymentId,
                details: {
                    gateway: payment.paymentMethod,
                    amount: payment.amount,
                    status: 'completed'
                },
                success: true
            });
            return updatedPayment;
        }
        catch (error) {
            // Update payment status to failed
            await prisma.payment.update({
                where: { id: paymentId },
                data: {
                    status: 'failed',
                    gatewayResponse: { error: error.message }
                }
            });
            await audit_service_1.AuditService.log({
                userId: payment.userId,
                action: 'process',
                resource: 'payment',
                resourceId: paymentId,
                details: { error: error.message },
                success: false
            });
            throw error;
        }
    }
    /**
     * Process Razorpay payment
     */
    static async processRazorpayPayment(payment, gateway) {
        const orderData = {
            amount: Math.round(payment.amount * 100), // Razorpay expects amount in paisa
            currency: payment.currency,
            receipt: `rcpt_${payment.id}`,
            notes: {
                userId: payment.userId,
                subscriptionId: payment.subscriptionId
            }
        };
        const auth = Buffer.from(`${gateway.apiKey}:${gateway.apiSecret}`).toString('base64');
        const response = await axios_1.default.post(gateway.testMode
            ? 'https://api.razorpay.com/v1/orders'
            : 'https://api.razorpay.com/v1/orders', orderData, {
            headers: {
                'Authorization': `Basic ${auth}`,
                'Content-Type': 'application/json'
            }
        });
        return response.data;
    }
    /**
     * Process PhonePe payment
     */
    static async processPhonePePayment(payment, gateway) {
        const transactionId = `TXN_${Date.now()}_${payment.id}`;
        const payload = {
            merchantId: gateway.apiKey,
            merchantTransactionId: transactionId,
            merchantUserId: payment.userId,
            amount: Math.round(payment.amount * 100), // PhonePe expects amount in paisa
            redirectUrl: `${process.env.FRONTEND_URL}/payment/callback`,
            redirectMode: 'REDIRECT',
            callbackUrl: `${process.env.API_URL}/api/payment/webhook/phonepe`,
            mobileNumber: payment.user?.phone || '',
            paymentInstrument: {
                type: 'PAY_PAGE'
            }
        };
        const base64Payload = Buffer.from(JSON.stringify(payload)).toString('base64');
        const checksum = crypto_1.default.createHash('sha256')
            .update(base64Payload + '/pg/v1/pay' + gateway.apiSecret)
            .digest('hex') + '###1';
        const response = await axios_1.default.post(gateway.testMode
            ? 'https://api-preprod.phonepe.com/apis/hermes/pg/v1/pay'
            : 'https://api.phonepe.com/apis/hermes/pg/v1/pay', { request: base64Payload }, {
            headers: {
                'Content-Type': 'application/json',
                'X-VERIFY': checksum
            }
        });
        return {
            ...response.data,
            transactionId
        };
    }
    /**
     * Calculate and create commissions
     */
    static async calculateCommissions(paymentId, payment) {
        const commissions = [];
        // UPI fee commission (0.5-1% based on amount)
        const upiFeeRate = payment.amount > 1000 ? 0.005 : 0.01; // 0.5% for > ₹1000, 1% for smaller
        const upiFee = payment.amount * upiFeeRate;
        commissions.push({
            paymentId,
            type: 'upi_fee',
            amount: upiFee,
            percentage: upiFeeRate * 100,
            description: 'UPI transaction fee'
        });
        // Payout commission (if applicable)
        if (payment.metadata?.isPayout) {
            const payoutCommission = payment.amount * 0.002; // 0.2% payout commission
            commissions.push({
                paymentId,
                type: 'payout_commission',
                amount: payoutCommission,
                percentage: 0.2,
                description: 'Payout processing commission'
            });
        }
        // Subscription referral commission (if applicable)
        if (payment.subscriptionId && payment.metadata?.referrerId) {
            const referralCommission = payment.amount * 0.05; // 5% referral commission
            commissions.push({
                paymentId,
                type: 'subscription_referral',
                amount: referralCommission,
                percentage: 5,
                description: 'Subscription referral commission',
                metadata: { referrerId: payment.metadata.referrerId }
            });
        }
        // Reseller margin (if applicable)
        if (payment.metadata?.resellerId) {
            const resellerMargin = payment.amount * 0.20; // 20% reseller margin
            commissions.push({
                paymentId,
                type: 'reseller_margin',
                amount: resellerMargin,
                percentage: 20,
                description: 'Reseller margin',
                metadata: { resellerId: payment.metadata.resellerId }
            });
        }
        // Create commission records
        for (const commission of commissions) {
            await prisma.commission.create({
                data: commission
            });
        }
    }
    /**
     * Handle payment webhook
     */
    static async handleWebhook(gateway, webhookData, signature) {
        const config = this.getGatewayConfig(gateway);
        if (!config) {
            throw new Error(`Gateway ${gateway} not configured`);
        }
        // Verify webhook signature
        if (signature && !this.verifyWebhookSignature(gateway, webhookData, signature, config)) {
            throw new Error('Invalid webhook signature');
        }
        let paymentId = null;
        let status = 'unknown';
        switch (gateway) {
            case 'razorpay':
                paymentId = webhookData.payload?.payment?.entity?.notes?.paymentId;
                status = webhookData.event === 'payment.captured' ? 'completed' : 'failed';
                break;
            case 'phonepe':
                // PhonePe webhook handling
                paymentId = webhookData.data?.merchantTransactionId?.split('_')[2];
                status = webhookData.code === 'PAYMENT_SUCCESS' ? 'completed' : 'failed';
                break;
        }
        if (paymentId && status) {
            await prisma.payment.update({
                where: { id: paymentId },
                data: {
                    status,
                    paidAt: status === 'completed' ? new Date() : undefined,
                    gatewayResponse: webhookData
                }
            });
            if (status === 'completed') {
                const payment = await prisma.payment.findUnique({
                    where: { id: paymentId },
                    include: { subscription: true }
                });
                if (payment?.subscriptionId) {
                    await subscription_service_1.SubscriptionService.renewSubscription(payment.subscriptionId);
                }
                await this.calculateCommissions(paymentId, payment);
            }
        }
    }
    /**
     * Verify webhook signature
     */
    static verifyWebhookSignature(gateway, data, signature, config) {
        switch (gateway) {
            case 'razorpay':
                const expectedSignature = crypto_1.default
                    .createHmac('sha256', config.webhookSecret)
                    .update(JSON.stringify(data))
                    .digest('hex');
                return signature === expectedSignature;
            case 'phonepe':
                // PhonePe signature verification
                const payload = JSON.stringify(data);
                const expectedChecksum = crypto_1.default
                    .createHash('sha256')
                    .update(payload + config.apiSecret)
                    .digest('hex');
                return signature === expectedChecksum;
            default:
                return false;
        }
    }
    /**
     * Get payment history for user
     */
    static async getUserPayments(userId, limit = 50) {
        return prisma.payment.findMany({
            where: { userId },
            include: {
                subscription: {
                    include: { plan: true }
                },
                commissions: true
            },
            orderBy: { createdAt: 'desc' },
            take: limit
        });
    }
    /**
     * Get commission summary
     */
    static async getCommissionSummary(userId) {
        const where = userId ? { payment: { userId } } : {};
        const commissions = await prisma.commission.findMany({
            where,
            include: {
                payment: {
                    include: {
                        user: { select: { id: true, email: true, name: true } }
                    }
                }
            }
        });
        const summary = {
            total: commissions.reduce((sum, c) => sum + c.amount, 0),
            byType: {},
            pending: 0,
            paid: 0
        };
        for (const commission of commissions) {
            summary.byType[commission.type] = (summary.byType[commission.type] || 0) + commission.amount;
            if (commission.status === 'pending') {
                summary.pending += commission.amount;
            }
            else if (commission.status === 'paid') {
                summary.paid += commission.amount;
            }
        }
        return summary;
    }
    /**
     * Process refunds
     */
    static async processRefund(paymentId, amount, reason) {
        const payment = await prisma.payment.findUnique({
            where: { id: paymentId },
            include: { user: true }
        });
        if (!payment) {
            throw new Error('Payment not found');
        }
        if (payment.status !== 'completed') {
            throw new Error('Can only refund completed payments');
        }
        const refundAmount = amount || payment.amount;
        // Update payment with refund info
        const updatedPayment = await prisma.payment.update({
            where: { id: paymentId },
            data: {
                refundedAt: new Date(),
                refundAmount
            }
        });
        await audit_service_1.AuditService.log({
            userId: payment.userId,
            action: 'refund',
            resource: 'payment',
            resourceId: paymentId,
            details: { amount: refundAmount, reason },
            success: true
        });
        return updatedPayment;
    }
}
exports.PaymentService = PaymentService;
PaymentService.gatewayConfigs = new Map();
//# sourceMappingURL=payment.service.js.map