import './env-setup.js';
import {
  ReplayEntropyAuditor,
  SemanticIntegrityScore,
  ReplayUncertaintyEnvelope
} from '../packages/runtime-core/src/index';

async function runPhase16Verification() {
  console.log('================================================================================');
  console.log('🧪  ZTAN PHASE 16 - REPLAY ENTROPY & PROBABILISTIC EQUIVALENCE RUNNER');
  console.log('================================================================================\n');

  const auditor = new ReplayEntropyAuditor();

  // Define some baseline expected blocks
  const expectedBlocks = [
    {
      sequenceId: 1000,
      hash: '0xhashG',
      prevHash: '0x000',
      payload: 'System startup initialized.',
      timestamp: '2026-05-25T12:00:00.000Z'
    },
    {
      sequenceId: 1001,
      hash: '0xhash1',
      prevHash: '0xhashG',
      payload: 'Write outbox transaction A [CorrelationTrace: requestUuid=aaaa-1111]',
      timestamp: '2026-05-25T12:00:01.000Z'
    },
    {
      sequenceId: 1002,
      hash: '0xhash2',
      prevHash: '0xhash1',
      payload: 'Write outbox transaction B [CorrelationTrace: requestUuid=bbbb-2222]',
      timestamp: '2026-05-25T12:00:02.000Z'
    },
    {
      sequenceId: 1003,
      hash: '0xhash3',
      prevHash: '0xhash2',
      payload: 'Write outbox transaction C [CorrelationTrace: requestUuid=cccc-3333]',
      timestamp: '2026-05-25T12:00:03.000Z'
    }
  ];

  // ────────────────────────────────────────────────────────────────────────
  // TEST 1: Semantic Integrity Scoring
  // ────────────────────────────────────────────────────────────────────────
  console.log('⚡ [TEST 1] Auditing Semantic Integrity Scoring...');

  // 1. Perfect Match Scenario
  const actualPristine = [
    {
      sequenceId: 1000,
      hash: '0xhashG',
      prevHash: '0x000',
      payload: 'System startup initialized.',
      timestamp: '2026-05-25T12:00:00.000Z'
    },
    {
      sequenceId: 1001,
      hash: '0xhash1',
      prevHash: '0xhashG',
      payload: 'Write outbox transaction A [CorrelationTrace: requestUuid=xxxx-8888]', // requestUuid differs
      timestamp: '2026-05-25T12:00:01.000Z'
    },
    {
      sequenceId: 1002,
      hash: '0xhash2',
      prevHash: '0xhash1',
      payload: 'Write outbox transaction B [CorrelationTrace: requestUuid=yyyy-9999]', // requestUuid differs
      timestamp: '2026-05-25T12:00:02.000Z'
    },
    {
      sequenceId: 1003,
      hash: '0xhash3',
      prevHash: '0xhash2',
      payload: 'Write outbox transaction C [CorrelationTrace: requestUuid=zzzz-0000]', // requestUuid differs
      timestamp: '2026-05-25T12:00:03.000Z'
    }
  ];

  const result1 = auditor.computeSemanticIntegrityScore(expectedBlocks, actualPristine);
  console.log(`     - Pristine Replay check: score=${result1.score.integrityScore}%, classification=${result1.score.classification}`);
  if (result1.score.integrityScore !== 100 || result1.score.classification !== 'PRISTINE') {
    throw new Error('Pristine identical logical replay failed to score 100%!');
  }

  // 2. Out of Order Scenario
  const actualOutOfOrder = [
    actualPristine[0],
    actualPristine[2], // 1002 out of order
    actualPristine[1], // 1001 out of order
    actualPristine[3]
  ];

  const result2 = auditor.computeSemanticIntegrityScore(expectedBlocks, actualOutOfOrder);
  console.log(`     - Out-of-Order Replay check: score=${result2.score.integrityScore}%, orderScore=${result2.score.orderScore}%`);
  // Out of order should reduce orderScore below 100
  if (result2.score.orderScore >= 100) {
    throw new Error('Out of order replay failed to penalize sequence order score!');
  }

  // 3. Mutated Payload / Semantic Divergence Scenario
  const actualMutated = [
    actualPristine[0],
    actualPristine[1],
    { ...actualPristine[2], payload: 'Entirely different payload logic here!' }, // mutated payload
    actualPristine[3]
  ];

  const result3 = auditor.computeSemanticIntegrityScore(expectedBlocks, actualMutated);
  console.log(`     - Mutated Payload check: score=${result3.score.integrityScore}%, mutationScore=${result3.score.mutationScore}%`);
  if (result3.score.mutationScore >= 100) {
    throw new Error('Mutated payload failed to penalize mutation score!');
  }

  console.log('  ✅ Semantic Integrity Scoring verified.\n');

  // ────────────────────────────────────────────────────────────────────────
  // TEST 2: Replay Uncertainty Envelopes
  // ────────────────────────────────────────────────────────────────────────
  console.log('⚡ [TEST 2] Auditing Replay Uncertainty Envelopes...');

  // Introduce Timing Drift (150ms delay per block step) and one skipped block
  const actualDriftAndSkip = [
    actualPristine[0],
    { ...actualPristine[1], timestamp: '2026-05-25T12:00:01.150Z' }, // 150ms drift
    { ...actualPristine[3], timestamp: '2026-05-25T12:00:03.300Z' }  // 1002 skipped, 1003 timestamp is delayed
  ];

  const resultEnv = auditor.computeSemanticIntegrityScore(expectedBlocks, actualDriftAndSkip);
  const env = resultEnv.envelope;
  console.log(`     - Drift & Skip check: avgJitter=${env.avgJitterMs}ms, skippedCount=${env.skippedTransactionCount}, addedCount=${env.addedTransactionCount}, driftRatePpm=${env.driftRatePpm} PPM`);

  if (env.skippedTransactionCount !== 1) {
    throw new Error('Failed to audit correct skipped transaction counts!');
  }
  if (env.avgJitterMs === 0 || env.driftRatePpm === 0) {
    throw new Error('Failed to audit correct timing jitter and drift PPM statistics!');
  }

  console.log('  ✅ Replay Uncertainty Envelopes verified.\n');

  // ────────────────────────────────────────────────────────────────────────
  // TEST 3: Causal Drift Graphs
  // ────────────────────────────────────────────────────────────────────────
  console.log('⚡ [TEST 3] Auditing Causal Drift Graph Construction...');

  // Create a block list containing a fork point
  const forkedBlocks = [
    { blockId: 'B_GEN', sequenceId: 1000, hash: '0xhashG', prevHash: '0x000' },
    { blockId: 'B_MAIN_1', sequenceId: 1001, hash: '0xhash1', prevHash: '0xhashG' },
    { blockId: 'B_MAIN_2', sequenceId: 1002, hash: '0xhash2', prevHash: '0xhash1' },
    // Fork point: B_MAIN_1 also parents a divergent branch
    { blockId: 'B_FORK_1', sequenceId: 1002, hash: '0xforkhashA', prevHash: '0xhash1' },
    { blockId: 'B_FORK_2', sequenceId: 1003, hash: '0xforkhashB', prevHash: '0xforkhashA' }
  ];

  const graph = auditor.buildCausalDriftGraph(forkedBlocks);
  console.log(`     - Fork points found: [${graph.forkPoints.join(', ')}]`);
  console.log(`     - Leaf nodes found: [${graph.leafNodes.join(', ')}]`);

  if (!graph.forkPoints.includes('B_MAIN_1')) {
    throw new Error('Causal Graph failed to detect root fork point block!');
  }
  if (graph.leafNodes.length !== 2 || !graph.leafNodes.includes('B_MAIN_2') || !graph.leafNodes.includes('B_FORK_2')) {
    throw new Error('Causal Graph failed to identify correct branch leaf nodes!');
  }

  console.log('  ✅ Causal Drift Graph Construction verified.\n');

  // ────────────────────────────────────────────────────────────────────────
  // TEST 4: Divergence Clustering
  // ────────────────────────────────────────────────────────────────────────
  console.log('⚡ [TEST 4] Auditing Divergence Clustering...');

  const clusters = auditor.clusterDivergences(graph);
  console.log(`     - Clusters found: ${clusters.length}`);
  for (const c of clusters) {
    console.log(`       └─ Cluster ID: ${c.clusterId}, Root Fork Point: ${c.rootForkBlockId}, Severity: ${c.severity}, Members: [${c.memberSequenceIds.join(', ')}]`);
  }

  if (clusters.length !== 1) {
    throw new Error('Divergence clustering failed to identify exactly 1 divergent branch!');
  }
  if (clusters[0].rootForkBlockId !== 'B_MAIN_1' || !clusters[0].memberSequenceIds.includes(1003)) {
    throw new Error('Divergence clustering returned incorrect cluster mappings!');
  }

  console.log('  ✅ Divergence Clustering verified.\n');

  console.log('================================================================================');
  console.log('🎉 PHASE 16 REPLAY ENTROPY & PROBABILISTIC EQUIVALENCE VERIFIED SUCCESSFULLY');
  console.log('================================================================================');
}

runPhase16Verification().catch((err) => {
  console.error('\n❌ Verification Failed:', err);
  process.exit(1);
});
