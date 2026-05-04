// scripts/sre-certification/scenario-split-brain.js
const harness = require('./certification-harness');
const nemesis = require('./nemesis');
const history = require('./history-checker');

async function runSplitBrainScenario() {
  await harness.runScenario("Split-Brain & Crash Recovery", async () => {
    console.log("🧪 Step 1: Initializing election and workload...");
    
    // Simulate initial election
    history.record('OK', 'ELECTION', { term: 1 }, 'system', 'us-east-1');
    
    // Start concurrent workload
    const work = harness.workload(20);
    
    // Inject Partition mid-workload
    setTimeout(async () => {
      await nemesis.partition('us-east-1', 'eu-west-1');
      await nemesis.partition('us-east-1', 'ap-southeast-1');
      
      console.log("🧪 Step 2: Leader (us-east-1) isolated. Attempting new election in eu-west-1...");
      history.record('OK', 'ELECTION', { term: 2 }, 'system', 'eu-west-1');
    }, 500);

    // Inject Process Kill
    setTimeout(async () => {
      await nemesis.kill('us-east-1');
    }, 1000);

    await work;
  });
}

runSplitBrainScenario();
