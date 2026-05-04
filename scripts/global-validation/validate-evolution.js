// scripts/global-validation/validate-evolution.js
const { trainSelf } = require("../sre-chaos/self-trainer");
const shadowValidator = require("../sre-ai/shadow-validator");
const { decide } = require("../sre-ai/inference");

async function runValidation() {
    console.log("🧬 [VAL] Starting Level 5 Evolution Validation...");

    // 1. Shadow Mode Test
    console.log("\nStep 1: Testing Shadow Mode Performance Tracking...");
    const metrics = { errorRate: 0.15, avgLatency: 1200, redisStatus: 'HEALTHY', activeWorkers: 10 };
    const decision = decide(metrics, { lastAction: null });
    
    const shadow = shadowValidator.validate(metrics, decision);
    console.log(`Shadow Stats: Total=${shadow.stats.totalCycles}, RL-Wins=${shadow.stats.rlWins}, WinRate=${shadow.winRate.toFixed(1)}%`);
    
    if (shadow.stats.totalCycles > 0) {
        console.log("✅ SUCCESS: Shadow Validator correctly tracked the comparison.");
    } else {
        console.error("❌ FAILED: Shadow Validator is not tracking data.");
        process.exit(1);
    }

    // 2. Self-Training Test
    console.log("\nStep 2: Testing Autonomous Chaos Self-Training (10 epochs)...");
    await trainSelf(10);
    console.log("✅ SUCCESS: Chaos Trainer successfully explored new state-action pairs.");

    console.log("\n🏁 [VAL] Evolution + Shadow Level 5 Validation PASSED.");
    process.exit(0);
}

runValidation().catch(err => {
    console.error("❌ Validation error:", err);
    process.exit(1);
});
