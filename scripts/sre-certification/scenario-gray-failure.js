// scripts/sre-certification/scenario-gray-failure.js
const harness = require('./certification-harness');
const nemesis = require('./nemesis');
const history = require('./history-checker');
const raft = require('../sre-global/raft-authority');

async function runGrayFailureScenario() {
  await harness.runScenario("Gray Failure & Delayed Messages", async () => {
    console.log("🧪 Step 1: Simulating intermittent latency in ap-southeast-1...");
    
    // Inject high jitter to ap-southeast-1
    await nemesis.delay('ap-southeast-1', 2000);
    
    // Start workload
    const work = harness.workload(10);
    
    // Mid-flight, trigger a "Phantom" old leader action
    setTimeout(async () => {
        console.log("🧪 Step 2: Simulating delayed message from STALE Term 1 leader...");
        const staleAction = { type: 'REPAIR', risk: 'HIGH', blastRadius: 0.1, term: 1 };
        // This SHOULD be rejected by Raft because current Term is higher
        const res = await raft.requestConsensus(staleAction);
        if (!res.allowed && res.reason.includes('STALE_TERM')) {
            console.log("✅ Passed: Stale term action rejected by consensus.");
        } else {
            console.log("❌ Failed: Stale action accepted!");
            history.record('OK', 'STALE_ACTION_EXECUTED', staleAction, 'phantom-leader', 'us-east-1');
        }
    }, 1000);

    await work;
  });
}

runGrayFailureScenario();
