// scripts/sre-rl/ope.js
const fs = require('fs');
const path = require('path');

/**
 * Off-Policy Evaluation (OPE): Estimates the performance of a new policy 
 * using historical data, before promotion.
 */
class OPE {
  /**
   * Estimates the value of targetWeights using history.
   * targetWeights: The new weights to evaluate.
   * history: Array of { state, action, reward, prob } from the behavior policy.
   */
  evaluate(targetWeights, history) {
    if (!history || history.length === 0) return 0;

    let totalValue = 0;
    let totalWeight = 0;

    for (const event of history) {
      // 1. Calculate the probability of the action under the target policy
      // (Simplified: In a Q-table, we check if target weights prefer this action)
      const targetActionValue = targetWeights[event.state]?.[event.action] || 0;
      const otherActionValues = Object.values(targetWeights[event.state] || {}).reduce((a, b) => a + b, 0);
      
      const probTarget = otherActionValues === 0 ? 0.2 : targetActionValue / otherActionValues;
      const probBehavior = event.prob || 0.5;

      // 2. Importance Sampling Weight
      const weight = probTarget / probBehavior;
      
      totalValue += event.reward * weight;
      totalWeight += weight;
    }

    // Weighted Importance Sampling (WIS) to reduce variance
    return totalWeight === 0 ? 0 : totalValue / totalWeight;
  }
}

module.exports = new OPE();
