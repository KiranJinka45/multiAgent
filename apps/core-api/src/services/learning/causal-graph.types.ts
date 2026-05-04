export interface NodeState {
  nodeId: string;
  anomalyScore: number; // 0–1
  timestamp: number;
}

export interface Edge {
  from: string;
  to: string;
  weight: number; // propagation probability (0–1)
}

export interface CausalGraph {
  nodes: string[];
  edges: Edge[];
}
