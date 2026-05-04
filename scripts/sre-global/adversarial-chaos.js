// scripts/sre-global/adversarial-chaos.js
const raft = require('./raft-authority');
const rollout = require('./rollout-controller');
const stateVerifier = require('./state-verifier');
const Redis = require('ioredis');

const redis = new Redis();

async function runAdversarialChaos() {
  console.log("🌪️ [ADVERSARIAL-CHAOS] Initiating Production-Level Resilience Proof...");
  console.log("==========================================================================");

  const mockMetrics = { errorRate: 0.02, avgLatency: 150 };
  const mockState = { policyCreatedAt: Date.now() - (1000 * 60 * 60 * 24 * 30) };
  
  const results = [];

  // 1. Cleanup
  await redis.flushall();

  // --- TEST 1: Leader Election Safety (Term Monotonicity) ---
  console.log("\n🧪 [TEST 1] Leader Election Safety (Term Monotonicity)");
  const term1 = await redis.get('RAFT_TERM:us-east-1') || 0;
  await raft.attemptElection();
  const term2 = await redis.get('RAFT_TERM:us-east-1');
  
  if (parseInt(term2) > parseInt(term1)) {
    console.log(`✅ Passed: Term incremented monotonically (${term1} -> ${term2})`);
    results.push({ test: 'Term Monotonicity', status: 'PASSED' });
  } else {
    results.push({ test: 'Term Monotonicity', status: 'FAILED' });
  }

  // --- TEST 2: Quorum Commit under Partition ---
  console.log("\n🧪 [TEST 2] Quorum Commit under Network Partition");
  console.log("  ➡ Partitioning eu-west-1 and ap-southeast-1...");
  process.env['PARTITION_eu-west-1'] = 'TRUE';
  process.env['PARTITION_ap-southeast-1'] = 'TRUE';
  
  const actionA = { type: 'GLOBAL_FAILOVER', risk: 'CRITICAL', blastRadius: 0.1, confidence: 0.99 };
  const res2 = await rollout.processAction(actionA, mockMetrics, mockState);
  
  if (res2.status === 'BLOCKED') {
    console.log(`✅ Passed: Consensus blocked (Reason: ${res2.reason})`);
    results.push({ test: 'Quorum Blockage', status: 'PASSED' });
  } else {
    console.error(`❌ Failed: Consensus allowed without quorum! (Status: ${res2.status})`);
    results.push({ test: 'Quorum Blockage', status: 'FAILED' });
  }


  // --- TEST 3: Recovery after Partition Healing ---
  console.log("\n🧪 [TEST 3] Recovery after Partition Healing");
  console.log("  ➡ Healing eu-west-1...");
  delete process.env['PARTITION_eu-west-1'];

  
  // Now we have us-east-1 (local) + eu-west-1 = 2/3 (Quorum!)
  const res3 = await rollout.processAction(actionA, mockMetrics, mockState);
  
  if (res3.status === 'PROCESSED' && res3.fencingToken) {
    console.log(`✅ Passed: Consensus achieved after partition healed (FencingToken: ${res3.fencingToken})`);
    results.push({ test: 'Partition Recovery', status: 'PASSED' });
  } else {
    console.error(`❌ Failed: Recovery failed. (Reason: ${res3.reason})`);
    results.push({ test: 'Partition Recovery', status: 'FAILED' });
  }

  // --- TEST 5: Resilience to Packet Loss & Jitter ---
  console.log("\n🧪 [TEST 5] Resilience to Packet Loss & Jitter");
  console.log("  ➡ Injecting 20% drop rate and 500ms jitter to ap-southeast-1...");
  
  // CLEAR PREVIOUS PARTITIONS & REDIS QUOTA
  delete process.env['PARTITION_eu-west-1'];
  delete process.env['PARTITION_ap-southeast-1'];
  await redis.del('SRE_QUOTA:us-east-1:BLAST_RADIUS');


  
  process.env['DROP_RATE_ap-southeast-1'] = '0.2';
  process.env['JITTER_ap-southeast-1'] = '500';

  
  // Try 5 replicated actions - some should retry/fail but safety must hold
  let passCount = 0;
  for(let i=0; i<5; i++) {
    const res = await rollout.processAction(actionA, mockMetrics, mockState);
    console.log(`    [RETRY-${i}] Status: ${res.status}, Reason: ${res.reason || 'NONE'}`);
    if (res.status === 'PROCESSED' || (res.reason && res.reason.includes('QUORUM_REPLICATION_FAILED'))) {
        passCount++;
    }
  }

  
  if (passCount === 5) {
    console.log("✅ Passed: Safety held under probabilistic loss/jitter.");
    results.push({ test: 'Loss/Jitter Resilience', status: 'PASSED' });
  } else {
    results.push({ test: 'Loss/Jitter Resilience', status: 'FAILED' });
  }

  // --- TEST 6: Clock Skew Safety ---
  console.log("\n🧪 [TEST 6] Clock Skew Safety");
  console.log("  ➡ Injecting +1 hour clock skew...");
  process.env.CLOCK_SKEW = (1000 * 60 * 60).toString();
  
  const audit = await stateVerifier.verify({ traffic: { weight: 1.0 } }, { traffic: { weight: 0.5 } });
  if (audit.timestamp > Date.now() + 100000) {
    console.log(`✅ Passed: Clock skew reflected in audit trail (Timestamp: ${audit.timestamp})`);
    results.push({ test: 'Clock Skew Detection', status: 'PASSED' });
  } else {
    results.push({ test: 'Clock Skew Detection', status: 'FAILED' });
  }


  console.log("\n==========================================================================");
  console.log("🏁 [ADVERSARIAL-SUMMARY]");
  results.forEach(r => console.log(`${r.status === 'PASSED' ? '✅' : '❌'} ${r.test}: ${r.status}`));
  
  const allPassed = results.every(r => r.status === 'PASSED');
  process.exit(allPassed ? 0 : 1);
}

runAdversarialChaos().catch(err => {
    console.error(err);
    process.exit(1);
});
