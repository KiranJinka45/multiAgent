// scripts/sre-chaos/self-trainer.js
const { step } = require("../sre-twin/environment");
const { loadQ, saveQ, updateQ } = require("../sre-rl/q-learning");
const { chooseAction } = require("../sre-rl/policy");
const { calculateReward } = require("../sre-rl/reward");

/**
 * Autonomous Self-Trainer: Proactively simulates failures to evolve the RL policy.
 * This allows the system to 'learn' how to handle incidents before they ever happen in prod.
 */
async function trainSelf(epochs = 100) {
  console.log(`🌀 [CHAOS-TRAIN] Starting autonomous evolution (${epochs} epochs)...`);
  const q = loadQ();

  for (let e = 0; e < epochs; e++) {
    // 1. Generate Random Failure State
    let state = {
      latency: Math.floor(Math.random() * 1000) + 200,
      errorRate: Math.random() * 0.2,
      redis: Math.random() > 0.8 ? 0 : 1,
      mode: 'NORMAL'
    };

    // 2. Play out a 5-step incident episode
    for (let stepIdx = 0; stepIdx < 5; stepIdx++) {
      const action = chooseAction(q, state);
      const nextState = step(state, action);
      
      const reward = calculateReward(state, nextState, action);
      
      updateQ(q, state, action, reward, nextState);
      state = nextState;
    }
  }

  saveQ(q);
  console.log("✅ [CHAOS-TRAIN] Evolution complete. Policy refined.");
}

if (require.main === module) {
  trainSelf();
}

module.exports = { trainSelf };
