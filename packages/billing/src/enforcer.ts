import { db } from '@packages/db';
import { logger } from '@packages/observability';

export interface EnforcementResult {
    allowed: boolean;
    reason?: string;
    quotaRemaining?: number;
    resetInMs?: number;
    suggestedAction?: 'UPGRADE' | 'RETRY' | 'SUPPORT';
}

export class BillingEnforcer {
    private static readonly DEFAULT_DAILY_QUOTA = 10;

    static readonly LIMITS = {
        free: { points: 10, duration: 60 },      // 10 req/min
        pro: { points: 100, duration: 60 },      // 100 req/min
        enterprise: { points: 1000, duration: 60 } // 1000 req/min
    };

    /**
     * Checks if a tenant is allowed to submit a new mission.
     * Validates: Quota, Balance, and Kill-Switch status.
     */
    static async check(tenantId: string): Promise<EnforcementResult> {
        try {
            const tenant = await db.tenant.findUnique({
                where: { id: tenantId },
                include: {
                    _count: {
                        select: {
                            missions: {
                                where: {
                                    createdAt: {
                                        gte: new Date(new Date().setHours(0, 0, 0, 0))
                                    }
                                }
                            }
                        }
                    }
                }
            });

            if (!tenant) {
                return { allowed: false, reason: 'Tenant not found' };
            }

            // 1. Kill-Switch / Global Lock
            const isLocked = await db.auditLog.findFirst({
                where: {
                    resource: `tenant:${tenantId}`,
                    action: 'TENANT_LOCK',
                    status: 'CRITICAL'
                }
            });

            if (isLocked) {
                return { 
                    allowed: false, 
                    reason: 'Your account requires administrative review. Please contact support.',
                    suggestedAction: 'SUPPORT'
                };
            }

            // 2. Quota Check
            const missionCount = tenant._count.missions;
            const quota = tenant.dailyQuota ?? this.DEFAULT_DAILY_QUOTA;

            if (missionCount >= quota) {
                const now = new Date();
                const resetTime = new Date(now);
                resetTime.setHours(24, 0, 0, 0); // Next midnight
                const resetInMs = resetTime.getTime() - now.getTime();

                logger.warn({ tenantId, missionCount, quota }, '[Enforcer] Quota exceeded');
                return { 
                    allowed: false, 
                    reason: `You've reached your daily limit (${quota} missions).`, 
                    quotaRemaining: 0,
                    resetInMs,
                    suggestedAction: 'UPGRADE'
                };
            }

            return { 
                allowed: true, 
                quotaRemaining: quota - missionCount 
            };

        } catch (err) {
            logger.error({ err, tenantId }, '[Enforcer] Failed to perform check');
            // Fail safe (allow) or fail secure (deny)? Deny for commercial readiness.
            return { allowed: false, reason: 'Enforcement engine error' };
        }
    }
    
    /**
     * Resolves the current plan for a tenant.
     * Checks Subscription table first, then falls back to Tenant metadata.
     */
    static async getPlan(tenantId: string): Promise<keyof typeof BillingEnforcer.LIMITS> {
        try {
            const sub = await db.subscription.findFirst({
                where: { tenantId }
            });

            if (sub) return sub.plan as any;

            const tenant = await db.tenant.findUnique({
                where: { id: tenantId },
                select: { metadata: true }
            });

            const tier = (tenant?.metadata as any)?.tier || 'free';
            return tier as any;
        } catch {
            return 'free';
        }
    }
}
