import { RLState } from '../q-learning-agent';

export interface AgentDecision {
  agentId: string;
  action: string;
  confidence: number;   // 0–1
  reasoning: string;
}

export interface SREAgent {
  evaluate(state: RLState): AgentDecision;
}
