// scripts/sre-rl/policy.js

const ACTIONS = [
  "RESTART_WORKERS",
  "ROLLBACK",
  "LOAD_SHEDDING",
  "GLOBAL_FAILOVER",
  "MONITOR" // "No Action"
];

/**
 * Epsilon-Greedy Policy: Balanced exploration of new strategies vs exploiting known successful ones.
 */
function chooseAction(q, state) {
  const epsilon = 0.1; // 10% chance to explore

  if (Math.random() < epsilon) {
    const randomAction = ACTIONS[Math.floor(Math.random() * ACTIONS.length)];
    console.log(`[RL-POLICY] 🎲 Exploring: ${randomAction}`);
    return randomAction;
  }

  const key = JSON.stringify(state);
  const actions = q[key] || {};

  // Find best action based on Q-values
  let bestAction = "MONITOR";
  let maxQ = -Infinity;

  for (const action of ACTIONS) {
    const val = actions[action] || 0;
    if (val > maxQ) {
      maxQ = val;
      bestAction = action;
    }
  }

  console.log(`[RL-POLICY] 🧠 Exploiting: ${bestAction} (Q=${maxQ.toFixed(2)})`);
  return bestAction;
}

module.exports = { chooseAction, ACTIONS };
