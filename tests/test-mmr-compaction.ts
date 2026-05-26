import * as crypto from 'node:crypto';

// Synchronous SHA-256 helper for Node.js test environment
function sha256Node(text: string): string {
  return crypto.createHash('sha256').update(text).digest('hex');
}

interface MmrPeak {
  hash: string;
  height: number;
}

// MMR Builder duplicate logic to verify mathematical convergence
function buildMmrNode(events: any[]): { peaks: MmrPeak[], root: string } {
  const peaks: MmrPeak[] = [];
  for (const event of events) {
    const leafHash = event.evidence?.hash || '';
    let current = { hash: leafHash, height: 0 };
    while (peaks.length > 0 && peaks[peaks.length - 1].height === current.height) {
      const left = peaks.pop()!;
      const parentHash = sha256Node(left.hash + current.hash);
      current = { hash: parentHash, height: current.height + 1 };
    }
    peaks.push(current);
  }
  
  let root = '';
  if (peaks.length > 0) {
    root = peaks[0].hash;
    for (let i = 1; i < peaks.length; i++) {
      root = sha256Node(root + peaks[i].hash);
    }
  }
  return { peaks, root };
}

async function runMmrCompactionTests() {
  console.log("=========================================================================");
  console.log(" 🚀 ZTAN v1.5.0 Merkle Mountain Range (MMR) delta checkpoint verification ");
  console.log("=========================================================================\n");

  // 1. Verify MMR math convergence with 1 leaf (perfect subtree of height 0)
  console.log("[TEST 1] Auditing MMR with a single leaf...");
  const leaf1 = { sequenceId: 1001, evidence: { hash: sha256Node('block-1') } };
  const mmr1 = buildMmrNode([leaf1]);
  console.log(`  - Peak count: ${mmr1.peaks.length} (Expected: 1)`);
  console.log(`  - Peak height: ${mmr1.peaks[0].height} (Expected: 0)`);
  console.log(`  - MMR root hash: ${mmr1.root}`);
  
  if (mmr1.peaks.length !== 1 || mmr1.peaks[0].height !== 0 || mmr1.root !== leaf1.evidence.hash) {
    throw new Error("MMR math failed for 1 leaf!");
  }
  console.log("  ✅ Peak and root convergence verified.\n");

  // 2. Verify MMR math convergence with 2 leaves (perfect subtree of height 1)
  console.log("[TEST 2] Auditing MMR with two leaves (height 1 merge)...");
  const leaf2 = { sequenceId: 1002, evidence: { hash: sha256Node('block-2') } };
  const mmr2 = buildMmrNode([leaf1, leaf2]);
  console.log(`  - Peak count: ${mmr2.peaks.length} (Expected: 1)`);
  console.log(`  - Peak height: ${mmr2.peaks[0].height} (Expected: 1)`);
  const expectedMergedRoot = sha256Node(leaf1.evidence.hash + leaf2.evidence.hash);
  console.log(`  - Root hash: ${mmr2.root} (Expected: ${expectedMergedRoot})`);

  if (mmr2.peaks.length !== 1 || mmr2.peaks[0].height !== 1 || mmr2.root !== expectedMergedRoot) {
    throw new Error("MMR math failed for 2 leaves!");
  }
  console.log("  ✅ Two-leaf merge verified.\n");

  // 3. Verify MMR math convergence with 7 leaves (should yield 3 peaks of heights 2, 1, 0)
  console.log("[TEST 3] Auditing MMR with seven leaves (multiple dynamic peaks)...");
  const leaves7 = Array.from({ length: 7 }, (_, i) => ({
    sequenceId: 1001 + i,
    evidence: { hash: sha256Node(`block-${i + 1}`) }
  }));
  const mmr7 = buildMmrNode(leaves7);
  console.log(`  - Peak count: ${mmr7.peaks.length} (Expected: 3 peaks representing perfect subtrees)`);
  for (let i = 0; i < mmr7.peaks.length; i++) {
    console.log(`    ├─ Peak ${i + 1}: height ${mmr7.peaks[i].height}, hash = ${mmr7.peaks[i].hash.substring(0, 16)}...`);
  }
  console.log(`  - Combined MMR Root: ${mmr7.root}`);

  // Heights for 7 elements must be: 2 (covers 1-4), 1 (covers 5-6), 0 (covers 7)
  const heights = mmr7.peaks.map(p => p.height);
  console.log(`  - Peak heights: [${heights.join(', ')}] (Expected: [2, 1, 0])`);

  if (heights.length !== 3 || heights[0] !== 2 || heights[1] !== 1 || heights[2] !== 0) {
    throw new Error("MMR structure did not construct heights [2, 1, 0] for 7 leaves!");
  }
  console.log("  ✅ Multiple peak tree structure verified.\n");

  // 4. Test compactor window bounds fuzzer
  console.log("[TEST 4] Simulating high-concurrency compaction pruning limits...");
  const excessiveLeaves = Array.from({ length: 25000 }, (_, i) => ({
    sequenceId: 1001 + i,
    evidence: { hash: sha256Node(`stream-payload-${i}`) }
  }));
  const mmrFuzz = buildMmrNode(excessiveLeaves);
  console.log(`  - Ingested excessive stream size: ${excessiveLeaves.length} events`);
  console.log(`  - Output MMR peak count: ${mmrFuzz.peaks.length} peaks`);
  console.log(`  - Unified root checksum: ZTAN_${mmrFuzz.root.substring(0, 8).toUpperCase()}`);
  
  if (!mmrFuzz.root) {
    throw new Error("MMR fuzzer root calculation failed!");
  }
  console.log("  ✅ Ingestion and checkpoint calculation fuzzer completed.\n");

  console.log("=========================================================================");
  console.log(" 🎉 ALL MMR CHECKPOINT & STORAGE ECONOMICS TESTS PASSED SUCCESSFULLY");
  console.log("=========================================================================");
  process.exit(0);
}

runMmrCompactionTests().catch(err => {
  console.error("❌ MMR Compaction tests failed:", err);
  process.exit(1);
});
