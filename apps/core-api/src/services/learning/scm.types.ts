export interface SCMNode {
  id: string;
  parents: string[];
  fn: (inputs: Record<string, number>) => number; // Causal function
}

export interface Intervention {
  nodeId: string;
  value: number;
}

export interface SimulationResult {
  state: Record<string, number>;
  systemHealth: number;
}
