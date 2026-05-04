import { logger } from '@packages/observability';
import { lossPerMinute, roiDelta, BizInputs } from '@packages/business';

export interface BusinessHealth {
  revenuePerMinute: number;
  activeUsers: number;
  conversionRate: number;
  avgOrderValue: number;
  slaPenaltyRisk: number;
  churnRiskScore: number;
}

export class BusinessMetricsService {
  /**
   * Retrieves real-time business metrics.
   * In a real system, this calls Stripe, Mixpanel, or internal BI APIs.
   */
  public async getMetrics(): Promise<BusinessHealth> {
    // Mocking high-fidelity business signals
    return {
      revenuePerMinute: 4500 + (Math.random() * 500),
      activeUsers: 12500 + (Math.floor(Math.random() * 1000)),
      conversionRate: 0.032,
      avgOrderValue: 150, // Added base AOV
      slaPenaltyRisk: 0,
      churnRiskScore: 0.05
    };
  }
}

export const businessMetrics = new BusinessMetricsService();

export class ValueModelingEngine {
  /**
   * Calculates the projected financial impact of infrastructure health.
   */
  public calculateImpact(infra: { latency: number; errorRate: number }, biz: BusinessHealth) {
    const inputs: BizInputs = {
      trafficPerMin: biz.activeUsers / 10, // heuristic for sessions/min
      conversionRate: biz.conversionRate,
      avgOrderValue: biz.avgOrderValue,
      errorRate: infra.errorRate,
      p95LatencyMs: infra.latency || (infra as any).latencyMs || 0
    };

    const lossPerMin = lossPerMinute(inputs);

    return {
      revenueLossPerMin: lossPerMin,
      projectedMonthlyLoss: lossPerMin * 60 * 24 * 30,
      riskLevel: lossPerMin > 1000 ? 'CRITICAL' : 'NOMINAL'
    };
  }
}

export const valueModel = new ValueModelingEngine();

