export interface WorkflowNode {
    id: string;
    actionType: string;
    payload: any;
}

export interface WorkflowEdge {
    from: string;
    to: string;
}

export interface WorkflowGraph {
    nodes: WorkflowNode[];
    edges: WorkflowEdge[];
}

export class BoundedWorkflowEngine {
    /**
     * Validates whether a workflow graph is a valid Directed Acyclic Graph (DAG).
     * Rejects graphs containing self-references or recursive cycles.
     */
    public validateWorkflowDAG(graph: WorkflowGraph): { isDag: boolean; error?: string } {
        const adjList = new Map<string, string[]>();
        const inDegree = new Map<string, number>();

        // Initialize nodes
        for (const node of graph.nodes) {
            adjList.set(node.id, []);
            inDegree.set(node.id, 0);
        }

        // Build adjacency list and calculate in-degrees
        for (const edge of graph.edges) {
            // Check self-reference
            if (edge.from === edge.to) {
                return { isDag: false, error: `Self-reference detected on node: "${edge.from}"` };
            }
            if (!adjList.has(edge.from) || !adjList.has(edge.to)) {
                return { isDag: false, error: `Edge referencing non-existent nodes: "${edge.from} -> ${edge.to}"` };
            }
            adjList.get(edge.from)!.push(edge.to);
            inDegree.set(edge.to, (inDegree.get(edge.to) || 0) + 1);
        }

        // Kahn's algorithm for topological sorting / cycle detection
        const queue: string[] = [];
        for (const [nodeId, deg] of inDegree.entries()) {
            if (deg === 0) {
                queue.push(nodeId);
            }
        }

        let visitedCount = 0;
        while (queue.length > 0) {
            const current = queue.shift()!;
            visitedCount++;

            const neighbors = adjList.get(current) || [];
            for (const neighbor of neighbors) {
                inDegree.set(neighbor, inDegree.get(neighbor)! - 1);
                if (inDegree.get(neighbor) === 0) {
                    queue.push(neighbor);
                }
            }
        }

        const isDag = visitedCount === graph.nodes.length;
        return {
            isDag,
            error: isDag ? undefined : 'Recursive loop or cycle detected in workflow graph topology'
        };
    }
}
