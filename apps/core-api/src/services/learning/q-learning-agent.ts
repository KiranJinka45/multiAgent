import { redis } from '@packages/utils';
import { logger } from '@packages/observability';

export interface RLState {
  anomalyScore: number;
  burnRate: number;
  latencyP95: number;
  errorRate: number;
  trustScore: number;
}

export class QLearningAgent {
  private static Q_TABLE_KEY = 'sre:q-table';
  private qTable: Record<string, Record<string, number>> = {};
  
  private learningRate = 0.1;
  private discountFactor = 0.9;
  private epsilon = 0.1; // Exploration rate

  constructor() {
    this.load().catch(err => logger.error({ err }, '[RL] Failed to load Q-Table'));
  }

  private async load() {
    const saved = await redis.get(QLearningAgent.Q_TABLE_KEY);
    if (saved) {
      this.qTable = JSON.parse(saved);
    }
  }

  private async save() {
    await redis.set(QLearningAgent.Q_TABLE_KEY, JSON.stringify(this.qTable));
  }

  /**
   * Discretizes the continuous state into a string key for the Q-table.
   */
  private getStateKey(state: RLState): string {
    const anomalyIdx = Math.floor(state.anomalyScore * 5); // 0-4
    const burnIdx = Math.floor(Math.min(state.burnRate, 10) / 2); // 0-5
    const latencyIdx = Math.floor(Math.min(state.latencyP95, 2000) / 400); // 0-5
    const trustIdx = Math.floor(state.trustScore * 4); // 0-3 (Low, Med, High, Critical)
    
    return `a${anomalyIdx}:b${burnIdx}:l${latencyIdx}:t${trustIdx}`;
  }

  public chooseAction(state: RLState, actions: string[]): string {
    const stateKey = this.getStateKey(state);

    // Epsilon-greedy exploration
    if (Math.random() < this.epsilon) {
      return actions[Math.floor(Math.random() * actions.length)];
    }

    const stateActions = this.qTable[stateKey] || {};
    
    // Find action with highest Q-value
    let bestAction = actions[0];
    let maxQ = -Infinity;

    for (const action of actions) {
      const q = stateActions[action] || 0;
      if (q > maxQ) {
        maxQ = q;
        bestAction = action;
      }
    }

    return bestAction;
  }

  public async update(
    state: RLState, 
    action: string, 
    reward: number, 
    nextState: RLState
  ) {
    const stateKey = this.getStateKey(state);
    const nextStateKey = this.getStateKey(nextState);

    if (!this.qTable[stateKey]) this.qTable[stateKey] = {};
    const currentQ = this.qTable[stateKey][action] || 0;

    // Find max Q for next state
    const nextStateActions = this.qTable[nextStateKey] || {};
    const maxNextQ = Object.values(nextStateActions).length > 0 
      ? Math.max(...Object.values(nextStateActions)) 
      : 0;

    // Q-Learning update rule
    const updatedQ = currentQ + this.learningRate * (reward + this.discountFactor * maxNextQ - currentQ);
    
    this.qTable[stateKey][action] = updatedQ;
    
    // Save periodically (or on every update for small scale)
    await this.save();
  }

  /**
   * Reward function: Optimizes for SLO compliance while penalizing instability and cost.
   */
  public computeReward(params: {
    errorRate: number;
    latency: number;
    actionPerformed: boolean;
    improvement: number;
    humanFeedback?: 'APPROVED' | 'REJECTED';
    roiAccuracy?: number;
  }): number {
    let reward = 0;

    // 1. SLO Penalty (Strongest signal)
    reward -= params.errorRate * 10;
    
    // 2. Latency Penalty
    reward -= (params.latency / 1000) * 2;

    // 3. Action Penalty (Avoid unnecessary interventions)
    if (params.actionPerformed) {
      reward -= 0.5;
      
      // 4. Improvement Bonus
      if (params.improvement > 0) {
        reward += params.improvement * 5;
      } else {
        reward -= 2.0; // Failed intervention penalty
      }
    } else {
      reward += 0.2; // Reward for stability when nominal
    }

    // 5. Human Feedback (Strongest policy shaper)
    if (params.humanFeedback === 'APPROVED') {
      reward += 10.0;
    } else if (params.humanFeedback === 'REJECTED') {
      reward -= 20.0;
    }

    // 6. ROI Accuracy (Policy Calibration)
    if (params.roiAccuracy !== undefined) {
      if (params.roiAccuracy < 0.5) {
        reward -= 20.0; // Critical penalty for uncalibrated business logic
      } else {
        reward += params.roiAccuracy * 10;
      }
    }

    return reward;
  }
}

export const qLearningAgent = new QLearningAgent();
