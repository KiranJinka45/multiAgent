import { AutonomousOpsEngine } from '@packages/autonomous-ops';
import { getMockInfraGraph } from './graph-bridge.js';

/**
 * Bridge between ztanctl and the Safe Autonomous Operations Engine.
 */
export function getAutonomousOps(): AutonomousOpsEngine {
    const graph = getMockInfraGraph();
    return new AutonomousOpsEngine(graph);
}
