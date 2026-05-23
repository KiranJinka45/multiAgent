import type { InfraNode, InfraEdge, TopologyEvent, BlastRadiusReport, RecoverySequence } from './types.js';
/**
 * Infrastructure Knowledge Graph Engine
 *
 * Provides a deterministic, replayable cognition substrate for
 * infrastructure topology and dependency analysis.
 */
export declare class InfraGraphEngine {
    private nodes;
    private edges;
    private adjacencyList;
    private inverseAdjacencyList;
    /**
     * Process a signed topology event to update the graph state.
     */
    applyEvent(event: TopologyEvent): void;
    private addAdjacency;
    private removeAdjacency;
    /**
     * Computes the Blast Radius of a failed node.
     * Identifies all downstream entities that 'DEPEND_ON' or 'RUN_ON' the target.
     */
    computeBlastRadius(nodeId: string): BlastRadiusReport;
    /**
     * Generates a deterministic recovery sequence via topological sort.
     * Higher tiers and lower dependency counts are prioritized.
     */
    generateRecoverySequence(): RecoverySequence;
    getNodes(): InfraNode[];
    getEdges(): InfraEdge[];
}
//# sourceMappingURL=engine.d.ts.map