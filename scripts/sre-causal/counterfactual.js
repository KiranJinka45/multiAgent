// scripts/sre-causal/counterfactual.js
const { step } = require("../sre-twin/environment");
const { calculateReward } = require("../sre-rl/reward");

/**
 * Counterfactual Engine: Evaluates the delta between taking an action vs doing nothing.
 * Prevents "Over-Actuarial" SRE behavior where the AI fixes things that would have healed themselves.
 */
function evaluateCounterfactual(state, action) {
  // 1. Simulate Action Path
  const actionNextState = step(state, action);
  const actionReward = calculateReward(state, actionNextState, action);

  // 2. Simulate "Do Nothing" Path (Baseline)
  const baselineNextState = step(state, "MONITOR");
  const baselineReward = calculateReward(state, baselineNextState, "MONITOR");

  // 3. Calculate Lift
  const lift = actionReward - baselineReward;

  return {
    action,
    actionReward,
    baselineReward,
    lift,
    isWorthwhile: lift > 0.1 || (action === "MONITOR")
  };
}

module.exports = { evaluateCounterfactual };
