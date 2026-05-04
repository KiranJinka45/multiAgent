export interface EnforcementResult {
    allowed: boolean;
    reason?: string;
    quotaRemaining?: number;
    resetInMs?: number;
    suggestedAction?: 'UPGRADE' | 'RETRY' | 'SUPPORT';
}
export declare class BillingEnforcer {
    private static readonly DEFAULT_DAILY_QUOTA;
    static readonly LIMITS: {
        free: {
            points: number;
            duration: number;
        };
        pro: {
            points: number;
            duration: number;
        };
        enterprise: {
            points: number;
            duration: number;
        };
    };
    /**
     * Checks if a tenant is allowed to submit a new mission.
     * Validates: Quota, Balance, and Kill-Switch status.
     */
    static check(tenantId: string): Promise<EnforcementResult>;
    /**
     * Resolves the current plan for a tenant.
     * Checks Subscription table first, then falls back to Tenant metadata.
     */
    static getPlan(tenantId: string): Promise<keyof typeof BillingEnforcer.LIMITS>;
}
