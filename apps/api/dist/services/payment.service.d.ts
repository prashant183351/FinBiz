export interface PaymentGatewayConfig {
    gateway: string;
    apiKey: string;
    apiSecret: string;
    webhookSecret?: string;
    testMode: boolean;
}
export interface PaymentData {
    subscriptionId?: string;
    userId: string;
    amount: number;
    currency?: string;
    paymentMethod: string;
    description?: string;
    dueDate?: Date;
    metadata?: any;
}
export interface CommissionData {
    paymentId: string;
    type: 'upi_fee' | 'payout_commission' | 'subscription_referral' | 'reseller_margin';
    amount: number;
    percentage?: number;
    description?: string;
    metadata?: any;
}
export declare class PaymentService {
    private static gatewayConfigs;
    /**
     * Initialize payment gateway configurations
     */
    static initializeGateways(): Promise<void>;
    /**
     * Get gateway configuration
     */
    private static getGatewayConfig;
    /**
     * Create a payment record
     */
    static createPayment(paymentData: PaymentData): Promise<any>;
    /**
     * Process payment through gateway
     */
    static processPayment(paymentId: string, gatewayData?: any): Promise<any>;
    /**
     * Process Razorpay payment
     */
    private static processRazorpayPayment;
    /**
     * Process PhonePe payment
     */
    private static processPhonePePayment;
    /**
     * Calculate and create commissions
     */
    private static calculateCommissions;
    /**
     * Handle payment webhook
     */
    static handleWebhook(gateway: string, webhookData: any, signature?: string): Promise<void>;
    /**
     * Verify webhook signature
     */
    private static verifyWebhookSignature;
    /**
     * Get payment history for user
     */
    static getUserPayments(userId: string, limit?: number): Promise<any[]>;
    /**
     * Get commission summary
     */
    static getCommissionSummary(userId?: string): Promise<any>;
    /**
     * Process refunds
     */
    static processRefund(paymentId: string, amount?: number, reason?: string): Promise<any>;
}
//# sourceMappingURL=payment.service.d.ts.map