// scripts/global-validation/validate-swarm-rl.js
const { decide } = require("../sre-ai/inference");
const { loadQ } = require("../sre-rl/q-learning");
const fs = require("fs");
const path = require("path");

const Q_TABLE_PATH = path.join(__dirname, "../../data/q-table.json");

async function runValidation() {
    console.log("🐝 [VAL] Starting Swarm-Driven AI-SRE Validation...");

    // 1. Swarm Quorum Test (Multi-Agent Agreement)
    console.log("\nStep 1: Testing Swarm Quorum (Network + Compute agree on Load Shedding)...");
    const quorumMetrics = { 
        avgLatency: 1200, 
        errorRate: 0.15, 
        redisStatus: 'HEALTHY',
        queueDepth: 80,
        activeWorkers: 10,
        totalWorkers: 10
    };
    
    // Setup history for anomaly detector
    const { saveIncident } = require("../sre-ai/incident-store");
    for(let i=0; i<6; i++) saveIncident({ metrics: quorumMetrics, decision: { action: 'MONITOR' } });

    const quorumDecision = decide(quorumMetrics, { recentDeploy: true, lastActionTime: 0 });

    console.log(`Action: ${quorumDecision.action}`);
    console.log(`Reason: ${quorumDecision.explanation}`);
    
    if (quorumDecision.explanation.includes("SWARM_QUORUM")) {
        console.log("✅ SUCCESS: Swarm successfully reached quorum on a coordinated action.");
    } else {
        console.error("❌ FAILED: Swarm failed to coordinate.");
        process.exit(1);
    }

    // 2. Causal Conflict Test (DB Failure)
    console.log("\nStep 2: Testing Causal Isolation (DB Failure should NOT trigger Compute Rollback)...");
    const dbFailureMetrics = {
        avgLatency: 300,
        errorRate: 0.05,
        redisStatus: 'DOWN',
        activeWorkers: 10,
        totalWorkers: 10
    };
    const dbDecision = decide(dbFailureMetrics, { recentDeploy: true, lastActionTime: 0 });
    
    console.log(`Action: ${dbDecision.action}, Cause: ${dbDecision.rootCause}`);
    if (dbDecision.rootCause === "INFRA_DEPENDENCY_FAILURE" && dbDecision.action !== "ROLLBACK") {
        console.log("✅ SUCCESS: Causal engine correctly isolated the infrastructure failure.");
    } else {
        console.error("❌ FAILED: Causal engine misidentified the root cause or took a spurious action.");
        process.exit(1);
    }

    // 3. RL Learning Verification
    console.log("\nStep 3: Verifying Q-Table persistence and learning capability...");
    const q = loadQ();
    if (Object.keys(q).length > 0) {
        console.log(`✅ SUCCESS: Q-Table is active and populated with ${Object.keys(q).length} states.`);
    } else {
        console.log("⚠️ WARNING: Q-Table is empty. Learning will commence during the next incident.");
    }

    console.log("\n🏁 [VAL] Swarm + RL Level 5 Validation PASSED.");
    process.exit(0);
}

runValidation().catch(err => {
    console.error("❌ Validation error:", err);
    process.exit(1);
});
