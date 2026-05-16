import { EconomicIntelligenceEngine } from '@packages/economic-intelligence';
import { getMockInfraGraph } from './graph-bridge.js';

/**
 * Bridge between ztanctl and the Economic Reliability Intelligence Engine.
 */
export function getEconomicIntelligence(): EconomicIntelligenceEngine {
    const graph = getMockInfraGraph();
    return new EconomicIntelligenceEngine(graph);
}
