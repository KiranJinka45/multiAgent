import { db } from '@packages/db';
import { logger } from '@packages/observability';
import { redis } from './server.js';

export interface QuotaLimits {
    maxConcurrentJobs: number;
    maxQueueDepth: number;
    rateLimitPoints: number;
    rateLimitDuration: number;
    monthlyTokenBudget: number;
    dailyExecutionLimit: number;
}

const DEFAULT_LIMITS: Record<string, QuotaLimits> = {
    free: {
        maxConcurrentJobs: 2,
        maxQueueDepth: 10,
        rateLimitPoints: 100,
        rateLimitDuration: 60,
        monthlyTokenBudget: 100000,
        dailyExecutionLimit: 5,
    },
    pro: {
        maxConcurrentJobs: 10,
        maxQueueDepth: 50,
        rateLimitPoints: 500,
        rateLimitDuration: 60,
        monthlyTokenBudget: 1000000,
        dailyExecutionLimit: 50,
    },
    enterprise: {
        maxConcurrentJobs: 50,
        maxQueueDepth: 200,
        rateLimitPoints: 2000,
        rateLimitDuration: 60,
        monthlyTokenBudget: 10000000,
        dailyExecutionLimit: 500,
    }
};

export class OperationalQuotaEngine {
    /**
     * Fetch tenant limits based on their subscription plan.
     */
    async getTenantLimits(tenantId: string): Promise<QuotaLimits> {
        try {
            const subscription = await db.subscription.findFirst({
                where: { tenantId },
                select: { plan: true }
            });

            const plan = subscription?.plan || 'free';
            return DEFAULT_LIMITS[plan] || DEFAULT_LIMITS.free;
        } catch (err) {
            logger.error({ err, tenantId }, '[QuotaEngine] Failed to fetch tenant limits');
            return DEFAULT_LIMITS.free;
        }
    }


    /**
     * Atomically check and increment active job count for a tenant.
     * Prevents race conditions during high-concurrency bursts.
     */
    async reserveExecutionSlot(tenantId: string): Promise<{ allowed: boolean; reason?: string; current?: number; limit?: number }> {
        const limits = await this.getTenantLimits(tenantId);
        const activeJobsKey = `control:active_jobs:${tenantId}`;
        const dailyLimitKey = `control:daily_executions:${tenantId}:${new Date().toISOString().split('T')[0]}`;

        // Lua script for atomic check and increment
        // 1. Check concurrent limit
        // 2. Check daily limit
        // 3. If both pass, increment both and return status
        const luaScript = `
            local activeCount = tonumber(redis.call('GET', KEYS[1]) or '0')
            local dailyCount = tonumber(redis.call('GET', KEYS[2]) or '0')
            local activeLimit = tonumber(ARGV[1])
            local dailyLimit = tonumber(ARGV[2])

            if activeCount >= activeLimit then
                return {0, 'Maximum concurrent jobs reached', activeCount}
            end

            if dailyCount >= dailyLimit then
                return {0, 'Daily execution limit reached', dailyCount}
            end

            redis.call('INCR', KEYS[1])
            redis.call('INCR', KEYS[2])
            redis.call('INCR', 'control:total_active_jobs')
            redis.call('EXPIRE', KEYS[2], 172800) -- 48h
            
            return {1, '', activeCount + 1}
        `;


        const result = await redis.eval(luaScript, 2, activeJobsKey, dailyLimitKey, limits.maxConcurrentJobs, limits.dailyExecutionLimit);
        
        return {
            allowed: result[0] === 1,
            reason: result[1] !== '' ? result[1] : undefined,
            current: result[2],
            limit: result[0] === 1 ? limits.maxConcurrentJobs : (result[1] === 'Maximum concurrent jobs reached' ? limits.maxConcurrentJobs : limits.dailyExecutionLimit)
        };
    }

    /**
     * Decrement active job count for a tenant.
     */
    async decrementActiveJobs(tenantId: string) {
        const activeJobsKey = `control:active_jobs:${tenantId}`;
        const current = await redis.get(activeJobsKey);
        if (current && parseInt(current, 10) > 0) {
            await redis.decr(activeJobsKey);
            await redis.decr('control:total_active_jobs');
        }
    }


    /**
     * Compatibility shim for CostControlService
     */
    async isKillSwitchActive() {
        const val = await redis.get('control:kill_switch');
        return val === 'true';
    }

    async checkAndIncrementExecutionLimit(userId: string) {
        // For now, mapping userId to tenantId if available, or using userId as tenantId for single-user scenarios
        const user = await db.user.findUnique({
            where: { id: userId },
            select: { tenantId: true }
        });

        const tenantId = user?.tenantId || userId;
        const result = await this.reserveExecutionSlot(tenantId);
        
        return { allowed: result.allowed, currentCount: result.current || 0 };
    }

    /**
     * Simple window-based rate limiting
     */
    async checkRateLimit(tenantId: string): Promise<{ allowed: boolean; retryAfter?: number }> {
        const limits = await this.getTenantLimits(tenantId);
        const windowSize = limits.rateLimitDuration; // seconds
        const windowKey = Math.floor(Date.now() / 1000 / windowSize);
        const key = `control:rate_limit:${tenantId}:${windowKey}`;
        
        const count = await redis.incr(key);
        if (count === 1) {
            await redis.expire(key, windowSize + 10); // add 10s buffer for safety
        }

        if (count > limits.rateLimitPoints) {
            return { allowed: false, retryAfter: windowSize };
        }

        return { allowed: true };
    }

    /**
     * Check if a tenant has enough monthly token budget remaining.
     */
    async checkTokenLimit(tenantId: string): Promise<{ allowed: boolean; remaining?: number }> {
        const limits = await this.getTenantLimits(tenantId);
        const usageKey = `control:token_usage:${tenantId}:${new Date().toISOString().substring(0, 7)}`; // Monthly key: YYYY-MM
        
        const currentUsage = parseInt(await redis.get(usageKey) || '0', 10);
        const remaining = limits.monthlyTokenBudget - currentUsage;

        if (remaining <= 0) {
            logger.error({ tenantId, currentUsage, limit: limits.monthlyTokenBudget }, '[CONTROL] Monthly token budget exhausted');
            return { allowed: false, remaining: 0 };
        }

        return { allowed: true, remaining };
    }

    /**
     * Per-user rate limiting to prevent account-level abuse.
     */
    async checkUserRateLimit(userId: string): Promise<{ allowed: boolean; retryAfter?: number }> {
        const windowSize = 60; // 1 minute window
        const windowKey = Math.floor(Date.now() / 1000 / windowSize);
        const key = `control:user_rate_limit:${userId}:${windowKey}`;
        
        const userLimit = 20; // 20 requests per minute for any user
        
        const count = await redis.incr(key);
        if (count === 1) {
            await redis.expire(key, windowSize + 10);
        }

        if (count > userLimit) {
            logger.warn({ userId, count }, '[CONTROL] User rate limit exceeded');
            return { allowed: false, retryAfter: windowSize };
        }

        return { allowed: true };
    }

    async trackUsage(tenantId: string, tokens: number) {
        const key = `control:token_usage:${tenantId}:${new Date().getMonth()}`;
        await redis.incrby(key, tokens);
    }

    /**
     * SYSTEM-WIDE LOAD SHEDDING (Phase 5.3)
     * Calculates total system pressure based on active concurrent jobs across all tenants.
     */
    async getSystemLoad(): Promise<{ score: number; isOverloaded: boolean }> {
        // In a real system, this would sum up all active_jobs keys or check CPU/Memory metrics
        // For now, we use a global counter
        const totalActive = await redis.get('control:total_active_jobs');
        const score = parseInt(totalActive || '0', 10);
        const threshold = 500; // Global cap before load shedding kicks in
        
        return { 
            score, 
            isOverloaded: score > threshold 
        };
    }

    async checkSystemLoad(options: { priority?: 'high' | 'low' } = {}): Promise<{ allowed: boolean; reason?: string }> {
        const { isOverloaded, score } = await this.getSystemLoad();
        const priority = options.priority || 'low';

        // Hard Threshold: Reject everything
        if (score > 1000) {
            logger.error({ score }, '[CONTROL] CRITICAL_OVERLOAD: Rejecting all requests');
            return { allowed: false, reason: 'System is under extreme maintenance load. Please try later.' };
        }

        // Soft Threshold: Reject low-priority requests
        if (isOverloaded && priority === 'low') {
            logger.warn({ score }, '[CONTROL] LoadShedding: Rejecting low-priority request');
            return { allowed: false, reason: 'System is currently prioritizing critical tasks. Please try again in 5 minutes.' };
        }

        return { allowed: true };
    }

    async getMetrics() {
        return {
            totalActiveJobs: await redis.get('control:total_active_jobs'),
            isKillSwitchActive: await this.isKillSwitchActive()
        };
    }
}


export enum RegionalStatus {
    HEALTHY = 'HEALTHY',
    DEGRADED = 'DEGRADED',
    FAILING = 'FAILING',
    OFFLINE = 'OFFLINE'
}

export class RegionalControlService {
    private currentRegion: string;

    constructor() {
        this.currentRegion = process.env.CURRENT_REGION || 'us-east-1';
    }

    /**
     * Determines if a request should be processed locally or routed to another region.
     * Aligns with GTM (Global Traffic Manager) logic.
     */
    async getRouteAffinity(missionId: string): Promise<{ targetRegion: string; isLocal: boolean }> {
        const mission = await db.mission.findUnique({
            where: { id: missionId },
            select: { assignedRegion: true }
        });

        const targetRegion = mission?.assignedRegion || this.currentRegion;
        return {
            targetRegion,
            isLocal: targetRegion === this.currentRegion
        };
    }

    /**
     * Heartbeat for the current region.
     * Updates regional health state in Redis for cluster-wide visibility.
     */
    async reportHeartbeat(metrics: { cpu: number; memory: number; queueDepth: number }) {
        const key = `control:region_health:${this.currentRegion}`;
        const status = metrics.cpu > 90 || metrics.queueDepth > 1000 ? RegionalStatus.DEGRADED : RegionalStatus.HEALTHY;
        
        const payload = {
            region: this.currentRegion,
            status,
            metrics,
            lastSeen: new Date().toISOString()
        };

        await redis.set(key, JSON.stringify(payload), 'EX', 30); // 30s TTL
        await redis.hset('control:global_topology', this.currentRegion, status);
    }

    /**
     * Checks if a target region is available.
     */
    async isRegionHealthy(region: string): Promise<boolean> {
        const status = await redis.hget('control:global_topology', region);
        return status === RegionalStatus.HEALTHY || status === RegionalStatus.DEGRADED;
    }

    /**
     * Finds the next best region if the current one is failing.
     */
    async getFailoverRegion(): Promise<string | null> {
        const topology = await redis.hgetall('control:global_topology');
        const candidates = Object.entries(topology)
            .filter(([region, status]) => region !== this.currentRegion && status === RegionalStatus.HEALTHY)
            .map(([region]) => region);

        return candidates.length > 0 ? candidates[0] : null; // Simple first-available failover
    }

    getCurrentRegion() {
        return this.currentRegion;
    }
}

export const regionalControl = new RegionalControlService();
export const operationalQuotaEngine = new OperationalQuotaEngine();
export const CostControlService = operationalQuotaEngine;
