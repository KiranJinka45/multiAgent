import { topologyManager } from './causal-topology';
import { logger } from '@packages/observability';
import { 
  ProbabilisticCausalEngine, 
  RootSelector, 
  TemporalConsistencyFilter 
} from './probabilistic-causal-engine';

export interface NodeSignal {
  nodeId: string;
  anomalyScore: number;
  timestamp: number;
}

export interface RCAResult {
  rootCause: string; // Primary root
  confidence: number;
  additionalRoots: { nodeId: string; confidence: number }[];
}

/**
 * RootCauseEngine: Identifies the topological source of an anomaly propagation using Bayesian inference.
 */
export class RootCauseEngine {
  /**
   * Identifies the most likely root cause from a set of cross-service signals.
   */
  public async attribute(signals: NodeSignal[]): Promise<RCAResult> {
    if (signals.length === 0) return { rootCause: 'NONE', confidence: 0, additionalRoots: [] };

    // 1. Get the causal graph (Cause -> Effect)
    const causalGraph = topologyManager.getCausalGraph();
    const engine = new ProbabilisticCausalEngine(causalGraph);

    // 2. Compute Probabilities
    const probabilities = engine.computeRootProbabilities(signals);

    // 3. Select Candidates
    const candidates = RootSelector.select(probabilities, 0.15);

    // 4. Apply Temporal Filter
    const validCandidates = candidates.filter(([nodeId]) => 
      TemporalConsistencyFilter.validate(nodeId, signals, causalGraph.edges)
    );

    if (validCandidates.length === 0) {
      if (candidates.length > 0) {
        return { rootCause: candidates[0][0], confidence: candidates[0][1], additionalRoots: [] };
      }
      return { rootCause: 'NONE', confidence: 0, additionalRoots: [] };
    }

    const [primaryNode, primaryConf] = validCandidates[0];
    const additionalRoots = validCandidates.slice(1).map(([nodeId, confidence]) => ({ nodeId, confidence }));

    console.log('[RCA-DEBUG] Signals:', JSON.stringify(signals));
    logger.info({ 
      primaryNode, 
      confidence: primaryConf.toFixed(2), 
      additionalRoots: additionalRoots.length,
      candidates: validCandidates.map(([id, p]) => `${id}(${(p*100).toFixed(0)}%)`).join(', ')
    }, '[RCA] Probabilistic multi-root attribution complete');

    return { 
      rootCause: primaryNode, 
      confidence: primaryConf,
      additionalRoots
    };
  }
}

export const rootCauseEngine = new RootCauseEngine();
