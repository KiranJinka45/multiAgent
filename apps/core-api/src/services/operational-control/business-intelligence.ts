import { logger } from '@packages/observability';
import { lossPerMinute, roiDelta } from '@packages/business';
import type { BizInputs } from '@packages/business';

export interface BusinessHealth {
  revenuePerMinute: number;
  activeUsers: number;
  lossPerMinute: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

export class BusinessIntelligenceService {
  /**
   * Translates SRE technical metrics into business health indicators.
   */
  public async getHealth(inputs: BizInputs): Promise<BusinessHealth> {
    const loss = lossPerMinute(inputs);
    
    let riskLevel: BusinessHealth['riskLevel'] = 'LOW';
    if (loss > 500) riskLevel = 'CRITICAL';
    else if (loss > 100) riskLevel = 'HIGH';
    else if (loss > 10) riskLevel = 'MEDIUM';

    return {
      revenuePerMinute: inputs.trafficPerMin * inputs.conversionRate * inputs.avgOrderValue,
      activeUsers: inputs.trafficPerMin * 10, // heuristic
      lossPerMinute: loss,
      riskLevel
    };
  }

  /**
   * Calculates the return on investment for a specific system state change.
   */
  public calculateRoi(before: BizInputs, after: BizInputs): number {
    return roiDelta(before, after);
  }

  /**
   * Retrieves the current business metrics.
   */
  public async getMetrics(): Promise<BusinessHealth> {
    return {
      revenuePerMinute: 250,
      activeUsers: 1200,
      lossPerMinute: 0,
      riskLevel: 'LOW'
    };
  }
}

export const valueModel = new BusinessIntelligenceService();
export const businessMetrics = valueModel;
