import { db } from '@packages/db';
import { logger } from '@packages/observability';

export interface IntelligencePolicy {
  costWeight: number;
  performanceWeight: number;
  reliabilityWeight: number;
}

export class PolicyManager {
  private static defaultPolicy: IntelligencePolicy = {
    costWeight: 0.33,
    performanceWeight: 0.33,
    reliabilityWeight: 0.34
  };

  /**
   * Retrieves the active policy for a tenant.
   */
  static async getPolicy(tenantId: string): Promise<IntelligencePolicy> {
    try {
      const policy = await db.intelligencePolicy.findFirst({
        where: { 
          OR: [
            { tenantId },
            { name: 'default' }
          ],
          isActive: true 
        },
        orderBy: { tenantId: 'desc' } // Prefer tenant-specific over default
      });

      if (!policy) return this.defaultPolicy;

      return {
        costWeight: policy.costWeight,
        performanceWeight: policy.performanceWeight,
        reliabilityWeight: policy.reliabilityWeight
      };
    } catch (err) {
      logger.error({ err, tenantId }, '[Policy] Failed to retrieve policy');
      return this.defaultPolicy;
    }
  }

  /**
   * Updates or creates a policy for a tenant.
   */
  static async updatePolicy(tenantId: string, updates: Partial<IntelligencePolicy>) {
    const current = await this.getPolicy(tenantId);
    const updated = { ...current, ...updates };

    // Validate weights sum to ~1.0
    const total = updated.costWeight + updated.performanceWeight + updated.reliabilityWeight;
    if (Math.abs(total - 1.0) > 0.01) {
      throw new Error('Policy weights must sum to 1.0');
    }

    await db.intelligencePolicy.upsert({
      where: { name: `policy-${tenantId}` },
      create: {
        name: `policy-${tenantId}`,
        tenantId,
        ...updated
      },
      update: updated
    });

    logger.info({ tenantId, updated }, '[Policy] Intelligence policy updated');
    return updated;
  }
}
