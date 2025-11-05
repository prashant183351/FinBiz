export interface PlanData {
    name: string;
    displayName: string;
    description?: string;
    price: number;
    currency?: string;
    billingCycle?: 'monthly' | 'yearly';
    features?: any;
    limits?: any;
    isActive?: boolean;
    sortOrder?: number;
}
export interface SubscriptionData {
    userId: string;
    planId: string;
    companyId?: string;
    trialDays?: number;
    metadata?: any;
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
export declare class SubscriptionService {
    /**
     * Create or update a plan
     */
    static createOrUpdatePlan(planData: PlanData): Promise<any>;
    /**
     * Get all active plans
     */
    static getActivePlans(): Promise<any[]>;
    /**
     * Get plan by ID or name
     */
    static getPlan(planId: string): Promise<any | null>;
    /**
     * Create a subscription
     */
    static createSubscription(subscriptionData: SubscriptionData): Promise<any>;
    /**
     * Get user's active subscription
     */
    static getUserSubscription(userId: string, companyId?: string): Promise<any | null>;
    /**
     * Cancel subscription
     */
    static cancelSubscription(subscriptionId: string, userId: string, cancelAtPeriodEnd?: boolean): Promise<any>;
    /**
     * Upgrade/downgrade subscription
     */
    static changePlan(subscriptionId: string, newPlanId: string, userId: string): Promise<any>;
    /**
     * Process subscription renewal
     */
    static renewSubscription(subscriptionId: string): Promise<any>;
    /**
     * Check if user has access to a feature
     */
    static checkFeatureAccess(userId: string, feature: string, companyId?: string): Promise<boolean>;
    /**
     * Check usage limits
     */
    static checkUsageLimit(userId: string, resource: string, companyId?: string): Promise<{
        allowed: boolean;
        current: number;
        limit: number;
    }>;
    /**
     * Get current usage for a resource
     */
    private static getCurrentUsage;
    /**
     * Record usage
     */
    static recordUsage(subscriptionId: string | null, userId: string, action: string, quantity?: number, cost?: number, metadata?: any): Promise<any>;
    /**
     * Initialize default plans
     */
    static initializeDefaultPlans(): Promise<void>;
}
//# sourceMappingURL=subscription.service.d.ts.map