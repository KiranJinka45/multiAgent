// scripts/sre-plan/mcts-planner.js
const { step } = require("../sre-twin/environment");
const { calculateReward } = require("../sre-rl/reward");
const { ACTIONS } = require("../sre-rl/policy");

/**
 * Monte Carlo Planner: Simulates multiple paths in the digital twin 
 * to find the sequence with the highest cumulative reward.
 */
function searchBestPlan(initialState, depth = 3, iterations = 20) {
  let bestPlan = [];
  let maxTotalReward = -Infinity;

  for (let i = 0; i < iterations; i++) {
    const currentPlan = [];
    let currentState = JSON.parse(JSON.stringify(initialState));
    let totalReward = 0;

    for (let d = 0; d < depth; d++) {
      const action = ACTIONS[Math.floor(Math.random() * ACTIONS.length)];
      const nextState = step(currentState, action);
      
      const reward = calculateReward(currentState, nextState, action);
      totalReward += reward;

      currentPlan.push({ action, reward });
      currentState = nextState;
    }

    if (totalReward > maxTotalReward) {
      maxTotalReward = totalReward;
      bestPlan = currentPlan;
    }
  }

  return {
    steps: bestPlan,
    expectedReward: maxTotalReward
  };
}

module.exports = { searchBestPlan };
