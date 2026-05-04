// scripts/sre-global/safety-envelope-proof.js
const authority = require('./authority');
const rollout = require('./rollout-controller');
const Redis = require('ioredis');
const redis = new Redis();

async function runSafetyProof() {
  console.log("🛡️ [SAFETY-ENVELOPE] Initiating Formal Boundary Proof...");
  console.log("==========================================================================");

  const results = [];

  // --- TEST 1: Uncertainty Gating ---
  console.log("\n🧪 [TEST 1] State Uncertainty Gating");
  const uncertainAction = { type: 'REPAIR', risk: 'LOW', stateUncertainty: 0.8, blastRadius: 0.1 };
  const res1 = await authority.requestExecution('us-east-1', uncertainAction);
  
  if (!res1.allowed && res1.reason === 'STATE_UNCERTAINTY_TOO_HIGH') {
    console.log("✅ Passed: Action blocked due to high state uncertainty.");
    results.push({ test: 'Uncertainty Gating', status: 'PASSED' });
  } else {
    console.log("❌ Failed: Uncertainty gate bypassed.");
    results.push({ test: 'Uncertainty Gating', status: 'FAILED' });
  }

  // --- TEST 2: Policy Oscillation Protection ---
  console.log("\n🧪 [TEST 2] Policy Oscillation Protection");
  await redis.del('SRE_OSCILLATION:db-cluster-1');
  const repetitiveAction = { type: 'REBOOT', risk: 'LOW', targetResource: 'db-cluster-1', blastRadius: 0.05, stateUncertainty: 0 };
  
  let allowedCount = 0;
  for(let i=0; i<5; i++) {
    const res = await authority.requestExecution('us-east-1', repetitiveAction);
    if (res.allowed) allowedCount++;
  }
  
  if (allowedCount === 3) {
    console.log("✅ Passed: Oscillation detected and throttled after 3 attempts.");
    results.push({ test: 'Oscillation Protection', status: 'PASSED' });
  } else {
    console.log(`❌ Failed: Throttling incorrect (Allowed: ${allowedCount})`);
    results.push({ test: 'Oscillation Protection', status: 'FAILED' });
  }

  // --- TEST 3: Immutable Blast Radius Hard-Limit ---
  console.log("\n🧪 [TEST 3] Immutable Blast Radius Hard-Limit");
  await redis.set('SRE_QUOTA:us-east-1:BLAST_RADIUS', 0.4);
  const largeAction = { type: 'FAILOVER', risk: 'HIGH', blastRadius: 0.2, stateUncertainty: 0 };
  const res3 = await authority.requestExecution('us-east-1', largeAction);

  if (!res3.allowed && res3.reason === 'EXCEEDED_BLAST_RADIUS_QUOTA') {
    console.log("✅ Passed: Hard limit enforced (0.4 + 0.2 > 0.5).");
    results.push({ test: 'Hard-Limit Enforcement', status: 'PASSED' });
  } else {
    console.log("❌ Failed: Hard limit bypassed.");
    results.push({ test: 'Hard-Limit Enforcement', status: 'FAILED' });
  }

  console.log("\n==========================================================================");
  console.log("🏁 [SAFETY-SUMMARY]");
  results.forEach(r => console.log(`${r.status === 'PASSED' ? '✅' : '❌'} ${r.test}: ${r.status}`));

  process.exit(results.every(r => r.status === 'PASSED') ? 0 : 1);
}

runSafetyProof();
