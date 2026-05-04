import { NodeState, Edge, CausalGraph } from './causal-graph.types';
import { logger } from '@packages/observability';

export class ProbabilisticCausalEngine {
  constructor(private graph: CausalGraph) {}

  /**
   * Computes the probability that each node is the root cause given the observed anomalies.
   * Based on Bayesian inference: P(RootCause | Observed)
   */
  public computeRootProbabilities(states: NodeState[]): Record<string, number> {
    const scores: Record<string, number> = {};

    for (const node of this.graph.nodes) {
      const prior = this.getPrior(node, states);
      const likelihood = this.computeLikelihood(node, states);

      scores[node] = prior * likelihood;
    }

    return this.normalize(scores);
  }

  private getPrior(node: string, states: NodeState[]): number {
    const state = states.find(s => s.nodeId === node);
    if (!state || state.anomalyScore < 0.2) return 0.01;

    // Penalty if parents are also anomalous (likely an effect, not root)
    let parentPenalty = 1.0;
    const parents = this.graph.edges.filter(e => e.to === node).map(e => e.from);
    
    for (const parentId of parents) {
      const parentState = states.find(s => s.nodeId === parentId);
      if (parentState && parentState.anomalyScore > 0.4) {
        parentPenalty *= 0.3; // Significant penalty for each anomalous parent
      }
    }

    return state.anomalyScore * parentPenalty;
  }

  private computeLikelihood(node: string, states: NodeState[]): number {
    let likelihood = 1.0;

    // Likelihood: How well does this node being the cause explain the downstream anomalies?
    for (const edge of this.graph.edges) {
      if (edge.from === node) {
        const downstream = states.find(s => s.nodeId === edge.to);

        if (downstream && downstream.anomalyScore > 0.2) {
          // If node is cause, downstream SHOULD be anomalous (scaled by edge weight)
          likelihood *= (edge.weight * downstream.anomalyScore);
        } else {
          // If node is cause but downstream is healthy, it's less likely (but possible due to edge weight)
          likelihood *= (1.0 - edge.weight);
        }
      }
    }

    return likelihood;
  }

  private normalize(scores: Record<string, number>): Record<string, number> {
    const total = Object.values(scores).reduce((a, b) => a + b, 0);
    
    if (total === 0) {
      // If no signal, return uniform distribution or zeros
      const uniform: Record<string, number> = {};
      this.graph.nodes.forEach(n => uniform[n] = 0);
      return uniform;
    }

    const normalized: Record<string, number> = {};
    Object.keys(scores).forEach(k => {
      normalized[k] = scores[k] / total;
    });

    return normalized;
  }
}

/**
 * RootSelector: Selects the most likely root causes based on a probability threshold.
 */
export class RootSelector {
  public static select(probabilities: Record<string, number>, threshold = 0.2): [string, number][] {
    return Object.entries(probabilities)
      .filter(([_, p]) => p > threshold)
      .sort((a, b) => b[1] - a[1]);
  }
}

/**
 * TemporalConsistencyFilter: Validates candidates against temporal precedence (Cause must happen before Effect).
 */
export class TemporalConsistencyFilter {
  public static validate(candidate: string, states: NodeState[], edges: Edge[]): boolean {
    const nodeState = states.find(s => s.nodeId === candidate);
    if (!nodeState) return false;

    const nodeTime = nodeState.timestamp;

    for (const edge of edges) {
      if (edge.from === candidate) {
        const downstream = states.find(s => s.nodeId === edge.to);
        // If downstream alert exists and it happened BEFORE the candidate, it violates causality
        if (downstream && downstream.anomalyScore > 0.4 && downstream.timestamp < nodeTime - 50) { // 50ms buffer for jitter
          return false;
        }
      }
    }

    return true;
  }
}
