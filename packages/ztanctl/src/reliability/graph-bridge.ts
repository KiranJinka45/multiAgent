import { InfraGraphEngine } from '@packages/infra-graph';
import { TopologyEvent } from '@packages/infra-graph';

/**
 * Bridge between ztanctl and the Infrastructure Knowledge Graph.
 * For this phase, it provides a deterministic mock graph representing 
 * the core Nexus ZTAN topology.
 */
export function getMockInfraGraph(): InfraGraphEngine {
    const engine = new InfraGraphEngine();

    const events: TopologyEvent[] = [
        // Nodes
        { id: '1', type: 'ENTITY_CREATE', timestamp: Date.now(), payload: { id: 'auth-api', type: 'SERVICE', name: 'Identity Service', version: '1.2.0', metadata: { tier: 1 } } },
        { id: '2', type: 'ENTITY_CREATE', timestamp: Date.now(), payload: { id: 'core-db', type: 'RESOURCE', name: 'Primary SQL Cluster', version: 'Postgres 15', metadata: { provider: 'Internal' } } },
        { id: '3', type: 'ENTITY_CREATE', timestamp: Date.now(), payload: { id: 'gateway', type: 'SERVICE', name: 'API Ingress', version: '2.0.1', metadata: { tier: 0 } } },
        { id: '4', type: 'ENTITY_CREATE', timestamp: Date.now(), payload: { id: 'billing-api', type: 'SERVICE', name: 'Settlement Service', version: '1.0.5', metadata: { tier: 2 } } },
        
        // Edges (Dependencies)
        { id: 'e1', type: 'LINK_CREATE', timestamp: Date.now(), payload: { id: 'e1', from: 'gateway', to: 'auth-api', type: 'DEPENDS_ON', metadata: {} } },
        { id: 'e2', type: 'LINK_CREATE', timestamp: Date.now(), payload: { id: 'e2', from: 'auth-api', to: 'core-db', type: 'DEPENDS_ON', metadata: {} } },
        { id: 'e3', type: 'LINK_CREATE', timestamp: Date.now(), payload: { id: 'e3', from: 'billing-api', to: 'auth-api', type: 'DEPENDS_ON', metadata: {} } },
        { id: 'e4', type: 'LINK_CREATE', timestamp: Date.now(), payload: { id: 'e4', from: 'billing-api', to: 'core-db', type: 'DEPENDS_ON', metadata: {} } },
    ];

    for (const event of events) {
        engine.applyEvent(event);
    }

    return engine;
}
