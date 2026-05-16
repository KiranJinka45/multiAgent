import { ReliabilityIntelligenceEngine } from '@packages/reliability-intelligence';
import { getMockInfraGraph } from './graph-bridge.js';

/**
 * Bridge between ztanctl and the Reliability Intelligence Engine.
 */
export function getReliabilityIntelligence(): ReliabilityIntelligenceEngine {
    const graph = getMockInfraGraph();
    return new ReliabilityIntelligenceEngine(graph);
}
