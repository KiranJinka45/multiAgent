import { logger } from '@packages/observability';
import { businessMetrics, valueModel, BusinessHealth } from './business-intelligence';

export interface StrategyProposal {
  id: string;
  type: 'COST_OPTIMIZATION' | 'RELIABILITY_BOOST' | 'REVENUE_PROTECTION';
  action: string;
  expectedRoi: number;
  riskScore: number;
  description: string;
}

export class BusinessOptimizer {
  /**
   * Generates strategic infrastructure proposals based on business health.
   */
  public async generateProposals(
    currentInfra: { latency: number, cost: number, reliability: number },
    biz: BusinessHealth
  ): Promise<StrategyProposal[]> {
    const proposals: StrategyProposal[] = [];

    // 1. Check for Cost Optimization Opportunity
    if (currentInfra.reliability > 0.999 && currentInfra.cost > 50000) {
      proposals.push({
        id: `opt-${Date.now()}`,
        type: 'COST_OPTIMIZATION',
        action: 'Scale down Cluster-B non-critical nodes',
        expectedRoi: 12000, // Monthly savings
        riskScore: 0.2,
        description: 'Reliability is significantly above SLA targets. Downscaling can save $12k/mo with minimal risk.'
      });
    }

    // 2. Check for Revenue Protection (High Latency)
    if (currentInfra.latency > 350) {
      proposals.push({
        id: `rev-${Date.now()}`,
        type: 'REVENUE_PROTECTION',
        action: 'Enable Global Edge Caching',
        expectedRoi: 45000, // Recovered revenue
        riskScore: 0.1,
        description: 'Current latency is impacting conversion rates. Edge caching could recover $45k/mo in lost revenue.'
      });
    }

    return proposals;
  }

  /**
   * Multi-objective scoring function
   */
  public score(reliability: number, cost: number, revenue: number, risk: number): number {
    const weights = { rel: 0.4, cost: 0.2, rev: 0.3, risk: 0.1 };
    return (reliability * weights.rel) + (revenue * weights.rev) - (cost * weights.cost) - (risk * weights.risk);
  }
}

export const businessOptimizer = new BusinessOptimizer();
