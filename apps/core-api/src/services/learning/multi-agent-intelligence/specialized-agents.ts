import { SREAgent, AgentDecision } from './agent.interface';
import { RLState } from '../q-learning-agent';

/**
 * ReliabilityAgent: Protects the SLO and error budget.
 */
export class ReliabilityAgent implements SREAgent {
  evaluate(state: RLState): AgentDecision {
    if (state.burnRate > 5 || state.errorRate > 0.05) {
      return {
        agentId: 'reliability',
        action: 'RESTART_DB',
        confidence: 0.9,
        reasoning: `High burn rate (${state.burnRate.toFixed(1)}) or error rate (${(state.errorRate * 100).toFixed(1)}%) threatens SLO`
      };
    }

    return {
      agentId: 'reliability',
      action: 'NO_ACTION',
      confidence: 0.5,
      reasoning: 'SLO parameters within nominal range'
    };
  }
}

/**
 * CostAgent: Optimizes for resource efficiency.
 */
export class CostAgent implements SREAgent {
  evaluate(state: RLState): AgentDecision {
    // If anomaly score is very low, we might be over-provisioned
    if (state.anomalyScore < 0.1 && state.latencyP95 < 200) {
      return {
        agentId: 'cost',
        action: 'SCALE_API_SERVICE_DOWN',
        confidence: 0.7,
        reasoning: 'Resources significantly under-utilized; potential for cost optimization'
      };
    }

    return {
      agentId: 'cost',
      action: 'NO_ACTION',
      confidence: 0.5,
      reasoning: 'Cost efficiency acceptable for current load'
    };
  }
}

/**
 * LatencyAgent: Focuses on performance.
 */
export class LatencyAgent implements SREAgent {
  evaluate(state: RLState): AgentDecision {
    if (state.latencyP95 > 800) {
      return {
        agentId: 'latency',
        action: 'SCALE_API_SERVICE_UP',
        confidence: 0.8,
        reasoning: `P95 Latency (${state.latencyP95}ms) exceeds performance target`
      };
    }

    return {
      agentId: 'latency',
      action: 'NO_ACTION',
      confidence: 0.5,
      reasoning: 'Latency performance is nominal'
    };
  }
}
