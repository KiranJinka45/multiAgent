export interface QuotaLimits {
    maxConcurrentJobs: number;
    maxQueueDepth: number;
    rateLimitPoints: number;
    rateLimitDuration: number;
    monthlyTokenBudget: number;
    dailyExecutionLimit: number;
}
export declare class QuotaEngine {
    /**
     * Fetch tenant limits based on their subscription plan.
     */
    getTenantLimits(tenantId: string): Promise<QuotaLimits>;
    /**
     * Atomically check and increment active job count for a tenant.
     * Prevents race conditions during high-concurrency bursts.
     */
    reserveExecutionSlot(tenantId: string): Promise<{
        allowed: boolean;
        reason?: string;
        current?: number;
        limit?: number;
    }>;
    /**
     * Decrement active job count for a tenant.
     */
    decrementActiveJobs(tenantId: string): Promise<void>;
    /**
     * Compatibility shim for CostGovernanceService
     */
    isKillSwitchActive(): Promise<boolean>;
    checkAndIncrementExecutionLimit(userId: string): Promise<{
        allowed: boolean;
        currentCount: number;
    }>;
    /**
     * Simple window-based rate limiting
     */
    checkRateLimit(tenantId: string): Promise<{
        allowed: boolean;
        retryAfter?: number;
    }>;
    checkTokenLimit(userId: string): Promise<{
        allowed: boolean;
    }>;
    /**
     * Per-user rate limiting to prevent account-level abuse.
     */
    checkUserRateLimit(userId: string): Promise<{
        allowed: boolean;
        retryAfter?: number;
    }>;
    trackUsage(tenantId: string, tokens: number): Promise<void>;
    /**
     * SYSTEM-WIDE LOAD SHEDDING (Phase 5.3)
     * Calculates total system pressure based on active concurrent jobs across all tenants.
     */
    getSystemLoad(): Promise<{
        score: number;
        isOverloaded: boolean;
    }>;
    checkSystemLoad(options?: {
        priority?: 'high' | 'low';
    }): Promise<{
        allowed: boolean;
        reason?: string;
    }>;
    getMetrics(): Promise<{
        totalActiveJobs: any;
        isKillSwitchActive: boolean;
    }>;
}
export declare enum RegionalStatus {
    HEALTHY = "HEALTHY",
    DEGRADED = "DEGRADED",
    FAILING = "FAILING",
    OFFLINE = "OFFLINE"
}
export declare class RegionalGovernanceService {
    private currentRegion;
    constructor();
    /**
     * Determines if a request should be processed locally or routed to another region.
     * Aligns with GTM (Global Traffic Manager) logic.
     */
    getRouteAffinity(missionId: string): Promise<{
        targetRegion: string;
        isLocal: boolean;
    }>;
    /**
     * Heartbeat for the current region.
     * Updates regional health state in Redis for cluster-wide visibility.
     */
    reportHeartbeat(metrics: {
        cpu: number;
        memory: number;
        queueDepth: number;
    }): Promise<void>;
    /**
     * Checks if a target region is available.
     */
    isRegionHealthy(region: string): Promise<boolean>;
    /**
     * Finds the next best region if the current one is failing.
     */
    getFailoverRegion(): Promise<string | null>;
    getCurrentRegion(): string;
}
export declare const regionalGovernance: RegionalGovernanceService;
export declare const quotaEngine: QuotaEngine;
export declare const CostGovernanceService: QuotaEngine;
//# sourceMappingURL=governance.d.ts.map