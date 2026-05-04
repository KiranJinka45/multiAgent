// scripts/global-validation/validate-ai-sre.js
const { decide } = require("../sre-ai/inference");
const { saveIncident, loadIncidents } = require("../sre-ai/incident-store");
const fs = require("fs");
const path = require("path");

const INCIDENT_FILE = path.join(__dirname, "../../data/incidents.json");

/**
 * AI-SRE Validation Suite
 * Verifies that the AI can detect drift, enforce policy, and choose correct actions.
 */
async function runValidation() {
    console.log("🤖 [VAL] Starting AI-SRE Intelligence Validation...");

    // 1. Setup: Clean/Mock Incident History
    if (fs.existsSync(INCIDENT_FILE)) fs.unlinkSync(INCIDENT_FILE);
    
    console.log("Step 1: Populating historical baseline...");
    for (let i = 0; i < 10; i++) {
        saveIncident({
            metrics: { avgLatency: 200, errorRate: 0.01, redisStatus: 'HEALTHY' },
            decision: { action: 'MONITOR' }
        });
    }

    // 2. Scenario: Predictive Anomaly Detection (Latency Drift)
    console.log("\nStep 2: Testing Predictive Anomaly Detection (Latency Drift)...");
    const driftMetrics = { avgLatency: 500, errorRate: 0.02, redisStatus: 'HEALTHY' };
    const driftDecision = decide(driftMetrics, { recentDeploy: false, lastActionTime: 0 });

    if (driftDecision.anomaly.anomaly && driftDecision.action === "LOAD_SHEDDING") {
        console.log("✅ SUCCESS: AI detected latency drift and triggered preemptive Load Shedding.");
    } else {
        console.error("❌ FAILED: AI failed to detect drift or took incorrect action.", driftDecision);
        process.exit(1);
    }

    // 3. Scenario: Policy Guardrail (Blocking Invalid Rollback)
    console.log("\nStep 3: Testing Policy Guardrail (Blocking Invalid Rollback)...");
    const highErrorMetrics = { avgLatency: 800, errorRate: 0.25, redisStatus: 'HEALTHY' };
    // Simulate scenario with NO recent deploy
    const policyDecision = decide(highErrorMetrics, { recentDeploy: false, lastActionTime: 0 });

    if (policyDecision.rawAction === "ROLLBACK" && policyDecision.action === "LOAD_SHEDDING") {
        console.log("✅ SUCCESS: Policy Engine blocked ROLLBACK (no deploy) and downgraded to LOAD_SHEDDING.");
    } else {
        console.error("❌ FAILED: Policy Engine failed to enforce guardrails.", policyDecision);
        process.exit(1);
    }

    // 4. Scenario: Critical Failure (Global Failover)
    console.log("\nStep 4: Testing Critical Failure Escalation (Global Failover)...");
    const criticalMetrics = { 
        avgLatency: 2000, 
        errorRate: 0.5, 
        redisStatus: 'DOWN', 
        operationalMode: 'EMERGENCY' 
    };
    const criticalDecision = decide(criticalMetrics, { 
        recentDeploy: true, 
        activeIncidents: 3,
        lastActionTime: 0 
    });

    if (criticalDecision.action === "GLOBAL_FAILOVER") {
        console.log("✅ SUCCESS: AI correctly escalated to GLOBAL_FAILOVER for regional collapse.");
    } else {
        console.error("❌ FAILED: AI failed to escalate critical failure.", criticalDecision);
        process.exit(1);
    }

    console.log("\n🏁 [VAL] AI-SRE Intelligence Validation PASSED.");
    process.exit(0);
}

runValidation().catch(err => {
    console.error("❌ Validation error:", err);
    process.exit(1);
});
