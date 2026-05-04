// scripts/sre-ai/inference.js
const { buildState } = require("../sre-rl/state-builder");
const { inferCause } = require("../sre-rl/causal-engine");
const { loadQ, updateQ } = require("../sre-rl/q-learning");
const { chooseAction } = require("../sre-rl/policy");
const { analyzeTrends } = require("./anomaly-detector");
const { enforce } = require("./policy-engine");
const { setGoal } = require("../sre-plan/strategist");
const { buildPlan } = require("../sre-plan/planner");
const scm = require("../sre-causal/scm");

/**
 * Main AI Strategist (Level 5 Maturity)
 * Coordinates RL, Planner, and Causal Counterfactuals.
 */
function decide(metrics, context) {
  // 1. Hierarchical Planning (Strategic)
  const goal = setGoal(metrics);
  const plan = buildPlan(goal, metrics);
  
  // 2. Tactical RL proposal
  const q = loadQ();
  const state = buildState(metrics);
  const rlAction = chooseAction(q, state);
  
  // 3. Causal Counterfactual Analysis (Structural do-operator)
  let rawAction = plan.steps[0]?.action || "MONITOR";
  const liftAnalysis = scm.evaluateCounterfactual(metrics, rawAction);
  
  if (!liftAnalysis.isWorthwhile && rawAction !== "MONITOR") {
    console.log(`[CAUSAL] 🛑 Action ${rawAction} blocked by Counterfactual (Lift: ${liftAnalysis.lift.toFixed(2)}). Reverting to MONITOR.`);
    rawAction = "MONITOR";
  }

  // 4. Constraint Enforcement (Does action fit strategy?)
  if (!goal.constraints.allowedActions.includes(rawAction)) {
    rawAction = "MONITOR";
  }

  // 5. Causal & Trend Analysis
  const rootCause = inferCause(metrics);
  const trend = analyzeTrends(metrics);

  // 6. Final Decision & Confidence
  let confidence = (rawAction === "MONITOR") ? 1.0 : 0.8;
  const reason = `GOAL: ${goal.id} | Plan Step: ${rawAction}`;

  const finalizedAction = enforce(rawAction, context);
  if (finalizedAction !== rawAction) confidence *= 0.5;

  return {
    action: finalizedAction,
    rawAction,
    state,
    rootCause,
    confidence: Math.round(confidence * 100),
    requiresApproval: confidence < 0.7,
    explanation: `${reason} (Cause: ${rootCause})`,
    trend,
    goal,
    plan,
    lift: liftAnalysis
  };
}

module.exports = { decide };
