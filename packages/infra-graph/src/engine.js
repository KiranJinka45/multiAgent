import { InfraNode, InfraEdge, TopologyEvent, BlastRadiusReport, RecoverySequence } from './types.js';
/**
 * Infrastructure Knowledge Graph Engine
 *
 * Provides a deterministic, replayable cognition substrate for
 * infrastructure topology and dependency analysis.
 */
export class InfraGraphEngine {
    nodes = new Map();
    edges = new Map();
    adjacencyList = new Map(); // from -> [to]
    inverseAdjacencyList = new Map(); // to -> [from] (for blast radius)
    /**
     * Process a signed topology event to update the graph state.
     */
    applyEvent(event) {
        switch (event.type) {
            case 'ENTITY_CREATE':
                const node = event.payload;
                this.nodes.set(node.id, node);
                break;
            case 'LINK_CREATE':
                const edge = event.payload;
                this.edges.set(edge.id, edge);
                this.addAdjacency(edge.from, edge.to);
                break;
            case 'UNLINK':
                const edgeId = event.payload.id;
                const e = this.edges.get(edgeId);
                if (e) {
                    this.removeAdjacency(e.from, e.to);
                    this.edges.delete(edgeId);
                }
                break;
            case 'METADATA_PATCH':
                const targetNode = this.nodes.get(event.payload.id);
                if (targetNode) {
                    targetNode.metadata = { ...targetNode.metadata, ...event.payload.metadata };
                }
                break;
            case 'ENTITY_DELETE':
                const id = event.payload.id;
                this.nodes.delete(id);
                // In a real system, we'd also cleanup orphaned edges
                break;
        }
    }
    addAdjacency(from, to) {
        if (!this.adjacencyList.has(from))
            this.adjacencyList.set(from, []);
        this.adjacencyList.get(from).push(to);
        if (!this.inverseAdjacencyList.has(to))
            this.inverseAdjacencyList.set(to, []);
        this.inverseAdjacencyList.get(to).push(from);
    }
    removeAdjacency(from, to) {
        const list = this.adjacencyList.get(from);
        if (list) {
            this.adjacencyList.set(from, list.filter(id => id !== to));
        }
        const invList = this.inverseAdjacencyList.get(to);
        if (invList) {
            this.inverseAdjacencyList.set(to, invList.filter(id => id !== from));
        }
    }
    /**
     * Computes the Blast Radius of a failed node.
     * Identifies all downstream entities that 'DEPEND_ON' or 'RUN_ON' the target.
     */
    computeBlastRadius(nodeId) {
        const affected = new Set();
        const queue = [nodeId];
        const visited = new Set();
        while (queue.length > 0) {
            const current = queue.shift();
            if (visited.has(current))
                continue;
            visited.add(current);
            // Downstream nodes (nodes that depend on current)
            // This is found in the inverseAdjacencyList
            const downstream = this.inverseAdjacencyList.get(current) || [];
            for (const neighbor of downstream) {
                affected.add(neighbor);
                queue.push(neighbor);
            }
        }
        return {
            targetId: nodeId,
            totalImpactCount: affected.size,
            recursiveNodes: Array.from(affected),
            criticalPaths: [], // Placeholder for path analysis
            resourceStarvationRisk: []
        };
    }
    /**
     * Generates a deterministic recovery sequence via topological sort.
     * Higher tiers and lower dependency counts are prioritized.
     */
    generateRecoverySequence() {
        const layers = [];
        const inDegree = new Map();
        // Initialize in-degrees for all nodes
        for (const nodeId of this.nodes.keys()) {
            inDegree.set(nodeId, 0);
        }
        // Calculate in-degrees based on 'DEPENDS_ON' edges
        for (const edge of this.edges.values()) {
            if (edge.type === 'DEPENDS_ON') {
                inDegree.set(edge.to, (inDegree.get(edge.to) || 0) + 1);
            }
        }
        // Standard Kahn's algorithm for topological sort
        let currentQueue = Array.from(inDegree.entries())
            .filter(([_, degree]) => degree === 0)
            .map(([id, _]) => id);
        while (currentQueue.length > 0) {
            layers.push([...currentQueue]);
            const nextQueue = [];
            for (const node of currentQueue) {
                const neighbors = this.adjacencyList.get(node) || [];
                for (const neighbor of neighbors) {
                    // Only count DEPENDS_ON edges for sorting
                    const relevantEdge = Array.from(this.edges.values())
                        .find(e => e.from === node && e.to === neighbor && e.type === 'DEPENDS_ON');
                    if (relevantEdge) {
                        const newDegree = inDegree.get(neighbor) - 1;
                        inDegree.set(neighbor, newDegree);
                        if (newDegree === 0) {
                            nextQueue.push(neighbor);
                        }
                    }
                }
            }
            currentQueue = nextQueue;
        }
        return {
            layers,
            circularDependencies: [], // Placeholder
            estimatedRestorationTime: layers.length * 300 // Heuristic: 5 mins per layer
        };
    }
    getNodes() {
        return Array.from(this.nodes.values());
    }
    getEdges() {
        return Array.from(this.edges.values());
    }
}
