/**
 * Usage Tracker: Reports metered usage to Stripe.
 */
export declare const usageTracker: {
    /**
     * Records usage event for an organization.
     */
    recordUsage(orgId: string, type: "ai_tokens" | "build_minutes", amount: number): Promise<void>;
    /**
     * Checks if an organization has exceeded its usage limits.
     */
    checkLimits(orgId: string): Promise<boolean>;
};
