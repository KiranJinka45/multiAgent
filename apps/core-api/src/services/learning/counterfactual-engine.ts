import { SCMNode, SimulationResult } from './scm.types';

export class CounterfactualEngine {
  constructor(private nodes: SCMNode[]) {}

  /**
   * Simulates a "do-operator" intervention on the causal graph.
   * "What if we force node X to value V?"
   */
  public simulate(
    currentState: Record<string, number>,
    intervention: Record<string, number>
  ): Record<string, number> {
    // 1. Clone current state
    const state = { ...currentState };

    // 2. Apply interventions (do-operator)
    // Intervened nodes are "pinned" to the specific value and don't change based on parents.
    Object.keys(intervention).forEach(nodeId => {
      state[nodeId] = intervention[nodeId];
    });

    // 3. Propagate changes through the graph using a simple topological approach.
    // We sort nodes by their dependency depth to ensure parent values are computed before children.
    const sortedNodes = this.topologicalSort(this.nodes);

    for (const node of sortedNodes) {
      // Skip if this node was explicitly intervened on
      if (intervention[node.id] !== undefined) continue;

      const inputs: Record<string, number> = {};
      for (const parentId of node.parents) {
        inputs[parentId] = state[parentId] !== undefined ? state[parentId] : 0.01;
      }

      // Apply causal function
      state[node.id] = node.fn(inputs);
    }

    return state;
  }

  private topologicalSort(nodes: SCMNode[]): SCMNode[] {
    const sorted: SCMNode[] = [];
    const visited = new Set<string>();
    const visiting = new Set<string>();

    const visit = (node: SCMNode) => {
      if (visited.has(node.id)) return;
      if (visiting.has(node.id)) return; 

      visiting.add(node.id);
      for (const parentId of node.parents) {
        const parent = nodes.find(n => n.id === parentId);
        if (parent) visit(parent);
      }
      visiting.delete(node.id);
      visited.add(node.id);
      sorted.push(node);
    };

    nodes.forEach(n => visit(n));
    return sorted;
  }

  public computeSystemHealth(state: Record<string, number>): number {
    // Lower anomaly scores = Better health
    const values = Object.values(state);
    if (values.length === 0) return 1.0;
    const avgAnomaly = values.reduce((a, b) => a + b, 0) / values.length;
    return Math.max(0, 1.0 - avgAnomaly);
  }
}
