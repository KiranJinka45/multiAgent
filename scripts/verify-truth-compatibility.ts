import { CanonicalReplayLayer } from '../packages/sandbox/src/canonical';
import { ExecutionFinalityEngine } from '../packages/sandbox/src/finality';
import * as fs from 'fs';

/**
 * 🛡️ Truth Compatibility Validator
 * Verifies that the implementation adheres to the FROZEN LOCAL_TRUTH_MODEL_V1.
 */
async function main() {
    console.log("--- 🛡️ TRUTH COMPATIBILITY AUDIT START ---");

    // 1. Verify JSON Canonicalization (Lexicographical Key Sorting)
    const unsorted = { z: 1, a: 2, m: 3 };
    const canonical = CanonicalReplayLayer.canonicalize(unsorted);
    const expected = '{"a":2,"m":3,"z":1}';
    
    if (canonical === expected) {
        console.log("✅ PASS: JSON Canonicalization (Key Sorting) is stable.");
    } else {
        console.error(`❌ FAIL: Canonicalization mismatch! Expected ${expected}, got ${canonical}`);
        process.exit(1);
    }

    // 2. Verify Mount Hash Normalization (Semantic Isolation)
    const mounts = [
        { source: "/tmp/host1", target: "/work", mode: "rw" as const },
        { source: "/tmp/host2", target: "/data", mode: "ro" as const }
    ];
    const hash1 = CanonicalReplayLayer.hashMounts(mounts);
    
    const differentHostMounts = [
        { source: "/different/path", target: "/work", mode: "rw" as const },
        { source: "/another/path", target: "/data", mode: "ro" as const }
    ];
    const hash2 = CanonicalReplayLayer.hashMounts(differentHostMounts);

    if (hash1 === hash2) {
        console.log("✅ PASS: Mount Hashing is host-agnostic (Semantic Truth).");
    } else {
        console.error("❌ FAIL: Mount Hash leaked host-specific paths!");
        process.exit(1);
    }

    // 3. Verify Workload Hashing (Env Normalization)
    const workload1 = { command: "ls", env: { B: "2", A: "1" } };
    const workload2 = { command: "ls", env: { A: "1", B: "2" } };
    const wHash1 = CanonicalReplayLayer.hashWorkload(workload1);
    const wHash2 = CanonicalReplayLayer.hashWorkload(workload2);

    if (wHash1 === wHash2) {
        console.log("✅ PASS: Workload Hashing is stable across env reordering.");
    } else {
        console.error("❌ FAIL: Workload Hash sensitive to env ordering!");
        process.exit(1);
    }

    // 4. Verify Finality Immutability
    const result: any = {
        executionId: "exec-123",
        exitCode: 0,
        metadata: {
            mountHash: hash1,
            executionHash: wHash1,
            timestamp: new Date().toISOString()
        }
    };
    const envelope = ExecutionFinalityEngine.finalize("mission-1", result, true);
    
    const originalMissionId = envelope.missionId;
    try {
        (envelope as any).missionId = "TAMPERED";
    } catch (e) {
        // Strict mode throw
    }
    
    if (envelope.missionId === originalMissionId) {
        console.log("✅ PASS: Execution Finality correctly enforces Immutability.");
    } else {
        console.error("❌ FAIL: Finalized envelope is NOT frozen! Mutation succeeded.");
        process.exit(1);
    }

    console.log("\n✅ SUCCESS: Local Truth Model Compatibility Verified.");
    fs.writeFileSync('truth_compatibility_audit.txt', 'PASSED');
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
