import { db } from '@packages/db';
import { logger } from '@packages/observability';

export interface ROIMetrics {
  optimizations: number;
  failureRate: number;
  estimatedSavings: number;
  efficiencyGain: number;
  devHoursSaved: number;
  profitability: number;
  // Beta Engagement Tracking
  activationRate: number;
  avgTimeToFirstSuccess: number;
  churnRisk: number;
}

export class ROITracker {
  /**
   * Records a successful optimization and updates aggregate ROI.
   */
  static async recordOptimization(tenantId: string, savings: number, efficiencyGain: number) {
    try {
      await db.intelligenceROI.upsert({
        where: {
          id: `${tenantId}-all-time`
        },
        create: {
          id: `${tenantId}-all-time`,
          tenantId,
          period: 'all-time',
          optimizations: 1,
          estimatedSavings: savings,
          efficiencyGain,
        },
        update: {
          optimizations: { increment: 1 },
          estimatedSavings: { increment: savings },
          efficiencyGain: { set: efficiencyGain },
        }
      });
      
      logger.info({ tenantId, savings, efficiencyGain }, '[ROI] Optimization recorded successfully');
    } catch (err) {
      logger.error({ err, tenantId }, '[ROI] Failed to record optimization');
    }
  }

  /**
   * Retrieves ROI metrics for a tenant.
   */
  static async getMetrics(tenantId: string): Promise<ROIMetrics | null> {
    const data = await db.intelligenceROI.findFirst({
      where: { tenantId, period: 'all-time' }
    });

    const missions = await db.mission.findMany({
      where: tenantId === 'platform-admin' ? { status: 'complete' } : { tenantId, status: 'complete' },
      select: { margin: true }
    });

    const totalMissions = missions.length;
    const totalMargin = missions.reduce((sum: number, m: any) => sum + (m.margin || 0), 0);
    const devHoursSaved = totalMissions * 2.5; // Strategic Multiplier: 1 mission = 2.5 dev hours

    // --- BETA ENGAGEMENT LOGIC ---
    let activationRate = 0;
    let avgTimeToFirstSuccess = 0;
    let churnRisk = 0;

    if (tenantId === 'platform-admin') {
      const allTenants = await db.tenant.findMany({
        where: { id: { not: 'platform-admin' } },
        include: { _count: { select: { missions: { where: { status: 'complete' } } } } }
      });

      if (allTenants.length > 0) {
        const activeTenants = allTenants.filter((t: any) => t._count.missions >= 3);
        activationRate = (activeTenants.length / allTenants.length) * 100;

        // Churn Risk: No missions in 48h
        const fortyEightHoursAgo = new Date(Date.now() - 48 * 60 * 60 * 1000);
        const inactiveTenants = await db.tenant.findMany({
          where: {
            id: { not: 'platform-admin' },
            missions: {
              none: { createdAt: { gte: fortyEightHoursAgo } }
            }
          }
        });
        churnRisk = (inactiveTenants.length / allTenants.length) * 100;

        // Avg TTFS: Time to first success
        const firstMissions = await db.mission.findMany({
          where: { 
            status: 'complete',
            tenantId: { not: 'platform-admin' }
          },
          orderBy: { createdAt: 'asc' },
          distinct: ['tenantId'],
          include: { tenant: { select: { createdAt: true } } }
        });

        if (firstMissions.length > 0) {
          const totalTTFS = firstMissions.reduce((sum: number, m: any) => {
            if (!m.tenant) return sum;
            return sum + (m.createdAt.getTime() - m.tenant.createdAt.getTime());
          }, 0);
          avgTimeToFirstSuccess = (totalTTFS / firstMissions.length) / (1000 * 60); // Convert to minutes
        }
      }
    }

    return {
      optimizations: data?.optimizations || 0,
      failureRate: data?.failureRate || 0,
      estimatedSavings: data?.estimatedSavings || 0,
      efficiencyGain: data?.efficiencyGain || 0,
      devHoursSaved,
      profitability: totalMargin,
      activationRate,
      avgTimeToFirstSuccess,
      churnRisk
    };
  }
}
