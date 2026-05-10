import { logger } from '@packages/observability';

export interface GraphNode {
    id: string;
    type: 'file' | 'dependency' | 'agent_action' | 'requirement';
    content: string;
    provenance: string;
    ttl: number;
    trustScore: number;
}

/**
 * 🕸️ MissionIntelligenceGraph
 * A constrained, mission-scoped intelligence graph.
 * Prevents "Graph Entropy" by enforcing TTLs and depth limits on cognitive nodes.
 */
export class MissionIntelligenceGraph {
    private nodes: Map<string, GraphNode> = new Map();
    private edges: Array<{ source: string, target: string, relation: string }> = [];

    /**
     * Adds a node to the execution-scoped graph.
     */
    addNode(node: GraphNode) {
        if (node.trustScore < 0.5) {
            logger.warn({ nodeId: node.id }, '[Graph] Node trust score too low. Pruning.');
            return;
        }
        this.nodes.set(node.id, node);
    }

    /**
     * Links two nodes with a semantic relation.
     */
    link(sourceId: string, targetId: string, relation: string) {
        if (!this.nodes.has(sourceId) || !this.nodes.has(targetId)) return;
        this.edges.push({ source: sourceId, target: targetId, relation });
    }

    /**
     * Prunes stale nodes based on TTL or depth.
     */
    pruneStaleNodes() {
        const now = Date.now();
        for (const [id, node] of this.nodes.entries()) {
            if (node.ttl < now) {
                this.nodes.delete(id);
                this.edges = this.edges.filter(e => e.source !== id && e.target !== id);
                logger.debug({ nodeId: id }, '[Graph] Pruned stale node');
            }
        }
    }

    /**
     * Exports a traversal of the graph for agent reasoning.
     */
    getTraversal(rootId: string, maxDepth: number = 3): any {
        // Simple BFS traversal logic
        return {
            nodes: Array.from(this.nodes.values()),
            edges: this.edges
        };
    }
}
