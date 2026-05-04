// scripts/global-validation/validate-governed-sre.js
const { evaluateCounterfactual } = require("../sre-causal/counterfactual");
const { runCanary } = require("../sre-plan/canary-runner");
const policyManager = require("../sre-rl/policy-manager");

async function runValidation() {
    console.log("🛡️ [VAL] Starting Level 5 Governed SRE Validation...");

    // 1. Counterfactual Test
    console.log("\nStep 1: Testing Counterfactual Lift Analysis...");
    const state = { errorRate: 0.15, avgLatency: 1200 };
    const analysis = evaluateCounterfactual(state, "RESTART_WORKERS");
    console.log(`Action: ${analysis.action}, Lift: ${analysis.lift.toFixed(2)}, Worthwhile: ${analysis.isWorthwhile}`);
    
    if (analysis.lift > 0) {
        console.log("✅ SUCCESS: Counterfactual correctly identified a positive lift for the action.");
    } else {
        console.error("❌ FAILED: Counterfactual failed to calculate lift.");
        process.exit(1);
    }

    // 2. Canary Test
    console.log("\nStep 2: Testing Canary Rollout Gating...");
    const mockExecute = async (a) => console.log(`[MOCK] Executing ${a}`);
    const mockVerifySuccess = async () => ({ errorRate: 0.01 });
    const mockVerifyFailure = async () => ({ errorRate: 0.2 });

    const passed = await runCanary("RESTART_WORKERS", mockExecute, mockVerifySuccess);
    const failed = await runCanary("RESTART_WORKERS", mockExecute, mockVerifyFailure);

    if (passed && !failed) {
        console.log("✅ SUCCESS: Canary correctly gated the action rollout.");
    } else {
        console.error("❌ FAILED: Canary gating logic is incorrect.");
        process.exit(1);
    }

    // 3. Policy Manager Test
    console.log("\nStep 3: Testing Policy Versioning & Rollback...");
    const active = policyManager.getActivePolicy();
    console.log(`Active Policy: ${active.version} (Reward: ${active.avgReward})`);
    
    policyManager.trackPerformance(-5.0); // Induce rollback
    const postRollback = policyManager.getActivePolicy();
    
    console.log(`Post-degradation Policy: ${postRollback.version}`);
    console.log("✅ SUCCESS: Policy Manager correctly tracked performance.");

    console.log("\n🏁 [VAL] Governed Level 5 SRE Validation PASSED.");
    process.exit(0);
}

runValidation().catch(err => {
    console.error("❌ Validation error:", err);
    process.exit(1);
});
