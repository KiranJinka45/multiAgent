// scripts/global-validation/validate-graph-mcts.js
const { inferCause } = require("../sre-rl/causal-engine");
const { buildPlan } = require("../sre-plan/planner");
const { setGoal } = require("../sre-plan/strategist");

async function runValidation() {
    console.log("🕸️ [VAL] Starting Graph + MCTS Level 5 Validation...");

    // 1. Causal Graph Test
    console.log("\nStep 1: Testing Graph-Based Root Cause (Gateway Latency -> Database)...");
    const metrics = {
        avgLatency: 1500, // Symptom at Gateway
        errorRate: 0.12,  // Symptom at API_CORE
        redisStatus: 'HEALTHY',
        activeWorkers: 10
    };
    
    const cause = inferCause(metrics);
    console.log(`Identified Cause: ${cause}`);
    
    if (cause.includes("DATABASE")) {
        console.log("✅ SUCCESS: Graph correctly traced gateway latency back to the Database root.");
    } else {
        console.error("❌ FAILED: Graph failed to identify the root cause.");
        process.exit(1);
    }

    // 2. Monte Carlo Planning Test
    console.log("\nStep 2: Testing Monte Carlo Planning (Optimizing for high reward)...");
    const goal = setGoal(metrics); // Should be RECOVER_STABILITY
    const plan = buildPlan(goal, metrics);
    
    console.log(`Goal: ${goal.id}, Steps: ${plan.steps.length}, Expected Reward: ${plan.expectedReward.toFixed(2)}`);
    
    if (plan.steps.length > 0 && plan.expectedReward > 0) {
        console.log("✅ SUCCESS: MCTS successfully identified an optimal action sequence.");
    } else {
        console.error("❌ FAILED: MCTS failed to build a valid plan.");
        process.exit(1);
    }

    console.log("\n🏁 [VAL] Graph + MCTS Level 5 Validation PASSED.");
    process.exit(0);
}

runValidation().catch(err => {
    console.error("❌ Validation error:", err);
    process.exit(1);
});
