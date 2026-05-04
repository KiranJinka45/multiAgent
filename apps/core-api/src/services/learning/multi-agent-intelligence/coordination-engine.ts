import { AgentDecision } from './agent.interface';

export class CoordinationEngine {
  /**
   * Decides on the best action by aggregating agent votes and applying conflict resolution.
   */
  public decide(decisions: AgentDecision[]): AgentDecision {
    // 1. Resolve Conflicts (Rules-based overriding)
    const resolved = this.resolveConflicts(decisions);

    // 2. Weighted Consensus
    const scores: Record<string, number> = {};

    for (const d of resolved) {
      // Weight by confidence
      scores[d.action] = (scores[d.action] || 0) + d.confidence;
    }

    // 3. Select the action with the highest aggregate confidence
    const sortedActions = Object.entries(scores).sort((a, b) => b[1] - a[1]);
    const bestAction = sortedActions[0][0];

    const supportingAgents = resolved.filter(d => d.action === bestAction);

    return {
      agentId: 'consensus',
      action: bestAction,
      confidence: scores[bestAction],
      reasoning: supportingAgents.map(a => `${a.agentId}: ${a.reasoning}`).join(' | ')
    };
  }

  private resolveConflicts(decisions: AgentDecision[]): AgentDecision[] {
    const reliability = decisions.find(d => d.agentId === 'reliability');
    const cost = decisions.find(d => d.agentId === 'cost');

    // Rule: Reliability always overrides Cost optimizations during incidents
    if (reliability && reliability.action !== 'NO_ACTION' && cost && cost.action.includes('DOWN')) {
      cost.action = 'NO_ACTION';
      cost.confidence = 0.1;
      cost.reasoning += ' (OVERRIDDEN BY RELIABILITY SAFETY GATE)';
    }

    return decisions;
  }
}

export const coordinationEngine = new CoordinationEngine();
