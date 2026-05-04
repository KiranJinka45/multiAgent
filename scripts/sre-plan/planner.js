const { searchBestPlan } = require("./mcts-planner");

/**
 * Hierarchical Planner: Assembles a sequence of actions.
 * Upgraded to use Monte Carlo Search for optimal sequence selection.
 */
function buildPlan(goal, currentState) {
  const plan = {
    goalId: goal.id,
    steps: [],
    estimatedTime: 0,
    expectedReward: 0
  };

  if (goal.priority === "CRITICAL" || goal.priority === "HIGH") {
    console.log(`[PLANNER] 🎲 Running Monte Carlo Search for goal: ${goal.id}`);
    const simulated = searchBestPlan(currentState, 3, 50); // 50 iterations
    plan.steps = simulated.steps;
    plan.expectedReward = simulated.expectedReward;
    plan.estimatedTime = plan.steps.length * 15;
    return plan;
  }

  // Fallback for low-priority goals
  switch (goal.id) {
    case "RESTORE_INFRA":
      plan.steps = [{ action: "RESTART_WORKERS", reason: "Reset downstream consumers" }];
      plan.estimatedTime = 15;
      break;
    default:
      plan.steps = [{ action: "MONITOR", reason: "No active plan required" }];
  }

  return plan;
}

module.exports = { buildPlan };
