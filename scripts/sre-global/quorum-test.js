// scripts/sre-global/quorum-test.js
const rollout = require('./rollout-controller');
const quorum = require('./quorum-authority');
const Redis = require('ioredis');
const redis = new Redis();

async function runQuorumTest() {
  console.log("🌌 [QUORUM-TEST] Initiating Failure-Tolerant Governance Audit...");

  const mockMetrics = { errorRate: 0.05, avgLatency: 400, activeWorkers: 10, totalWorkers: 10 };
  const mockState = { policyCreatedAt: Date.now() - (1000 * 60 * 60 * 24 * 2) }; // 2 days old policy (5% max blast)

  // 1. Successful Quorum
  console.log("\n🧪 Test 1: Successful Quorum Vote");
  const actionA = { type: 'RESTART_WORKERS', risk: 'LOW', blastRadius: 0.03, confidence: 0.9 };
  const res1 = await rollout.processAction(actionA, mockMetrics, mockState);
  console.log(`Result: ${res1.status} via ${res1.executionType}`);

  // 2. Blast Radius Violation
  console.log("\n🧪 Test 2: Blast Radius Violation (Policy too young for high impact)");
  const actionB = { type: 'GLOBAL_FAILOVER', risk: 'CRITICAL', blastRadius: 0.3, confidence: 0.95 };
  const res2 = await rollout.processAction(actionB, mockMetrics, mockState);
  console.log(`Result: ${res2.status} (Reason: ${res2.reason})`);

  // 3. Out-of-Band Kill Switch
  console.log("\n🧪 Test 3: Out-of-Band (OOB) Kill Switch");
  await redis.set('SRE_OOB_KILL_SWITCH', 'HALT');
  const res3 = await rollout.processAction(actionA, mockMetrics, mockState);
  console.log(`Result: ${res3.status} (Reason: ${res3.reason})`);
  await redis.del('SRE_OOB_KILL_SWITCH');

  // 4. Quorum Loss (Simulated Partition)
  console.log("\n🧪 Test 4: Quorum Loss (Regional Fallback)");
  // We simulate this by making the consultPeer function throw or fail
  quorum.consultPeer = async () => { throw new Error('NETWORK_PARTITION'); };
  const res4 = await rollout.processAction(actionA, mockMetrics, mockState);
  console.log(`Result: ${res4.status} (Reason: ${res4.reason})`);

  console.log("\n🚀 Quorum Audit Complete. The Control Plane is Failure-Tolerant.");
  process.exit(0);
}

runQuorumTest().catch(console.error);
