/**
 * Nexus ZTAN Infrastructure Knowledge Graph Types
 * (v2026.LTS.1)
 */

export type EntityType = 'SERVICE' | 'RESOURCE' | 'IDENTITY' | 'FLOW';
export type RelationshipType = 'DEPENDS_ON' | 'RUNS_ON' | 'OWNS' | 'COMMUNICATES';

export interface InfraNode {
    id: string;
    type: EntityType;
    name: string;
    metadata: Record<string, any>;
    version: string;
}

export interface InfraEdge {
    id: string;
    from: string;
    to: string;
    type: RelationshipType;
    metadata: Record<string, any>;
}

export interface TopologyEvent {
    id: string;
    type: 'ENTITY_CREATE' | 'LINK_CREATE' | 'UNLINK' | 'METADATA_PATCH' | 'ENTITY_DELETE';
    payload: any;
    timestamp: number;
}

export interface BlastRadiusReport {
    targetId: string;
    totalImpactCount: number;
    recursiveNodes: string[];
    criticalPaths: string[][];
    resourceStarvationRisk: string[];
}

export interface RecoverySequence {
    layers: string[][]; // Array of node IDs in execution order
    circularDependencies: string[][];
    estimatedRestorationTime: number;
}
