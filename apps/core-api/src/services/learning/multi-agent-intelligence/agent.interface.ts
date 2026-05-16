import { type RLState } from '../q-learning-agent.js';

export interface AgentDecision {
  agentId: string;
  action: string;
  confidence: number;
  reasoning: string;
}

export interface SREAgent {
  id?: string;
  evaluate(state: RLState): AgentDecision;
}
