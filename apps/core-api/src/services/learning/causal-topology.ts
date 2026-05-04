import { logger } from '@packages/observability';

export interface ServiceNode {
  id: string;
  clusterId?: string;
  type: 'SERVICE' | 'DATABASE' | 'CACHE' | 'GATEWAY';
  dependencies: { nodeId: string; clusterId?: string }[]; // Upstream dependencies
}

/**
 * CausalTopologyManager: Manages the service dependency graph for root cause analysis.
 */
export class CausalTopologyManager {
  private nodes: Map<string, ServiceNode> = new Map();

  constructor() {
    // Initialize with standard topology for the environment
    this.addNode({ 
      id: 'web-frontend', 
      type: 'GATEWAY', 
      dependencies: [{ nodeId: 'api-service' }] 
    });
    this.addNode({ 
      id: 'api-service', 
      type: 'SERVICE', 
      dependencies: [
        { nodeId: 'db-primary' }, 
        { nodeId: 'redis-cache' },
        { nodeId: 'global-auth', clusterId: 'cluster-security' } // Cross-cluster dependency
      ] 
    });
    this.addNode({ id: 'db-primary', type: 'DATABASE', dependencies: [] });
    this.addNode({ id: 'redis-cache', type: 'CACHE', dependencies: [] });
  }

  public addNode(node: ServiceNode) {
    this.nodes.set(node.id, node);
    logger.info({ nodeId: node.id }, '[TOPOLOGY] Node added to causal graph');
  }

  public getDependencies(nodeId: string): { nodeId: string; clusterId?: string }[] {
    return this.nodes.get(nodeId)?.dependencies || [];
  }

  public getDependents(nodeId: string): string[] {
    return Array.from(this.nodes.values())
      .filter(n => n.dependencies.some(d => d.nodeId === nodeId))
      .map(n => n.id);
  }

  public getAllNodes(): ServiceNode[] {
    return Array.from(this.nodes.values());
  }

  /**
   * Returns the full topology for synchronization with the UI.
   */
  public getTopology() {
    return {
      nodes: this.getAllNodes().map(n => ({ id: n.id, type: n.type, clusterId: n.clusterId })),
      edges: this.getAllNodes().flatMap(n => 
        n.dependencies.map(dep => ({ 
          from: n.id, 
          to: dep.nodeId, 
          targetCluster: dep.clusterId 
        }))
      )
    };
  }

  /**
   * Returns a graph where edges represent causal propagation (Cause -> Effect).
   */
  public getCausalGraph() {
    const nodes = this.getAllNodes().map(n => n.id);
    const edges = this.getAllNodes().flatMap(n => 
      // Causal propagation is the INVERSE of dependency: Dependency -> Dependent
      n.dependencies.map(dep => ({ 
        from: dep.nodeId, 
        to: n.id, 
        weight: dep.nodeId === 'db-primary' ? 0.9 : 0.6 // Default propagation weights
      }))
    );
    return { nodes, edges };
  }

  /**
   * Finds the shortest path between two nodes in the causal graph.
   */
  public findPath(from: string, to: string): string[] | null {
    // Simple BFS for path finding
    const queue: [string, string[]][] = [[from, [from]]];
    const visited = new Set<string>();

    while (queue.length > 0) {
      const [current, path] = queue.shift()!;
      if (current === to) return path;
      
      visited.add(current);
      const neighbors = this.getDependencies(current);
      
      for (const next of neighbors) {
        if (!visited.has(next.nodeId)) {
          queue.push([next.nodeId, [...path, next.nodeId]]);
        }
      }
    }
    return null;
  }
}

export const topologyManager = new CausalTopologyManager();
