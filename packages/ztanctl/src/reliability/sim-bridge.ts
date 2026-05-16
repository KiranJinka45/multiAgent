import { SurvivabilitySimEngine } from '@packages/survivability-sim';
import { getAutonomousOps } from './ops-bridge.js';
import { getMockInfraGraph } from './graph-bridge.js';

/**
 * Bridge between ztanctl and the Continuous Survivability Simulation Engine.
 */
export function getSurvivabilitySim(): SurvivabilitySimEngine {
    const ops = getAutonomousOps();
    const graph = getMockInfraGraph();
    return new SurvivabilitySimEngine(ops, graph);
}
