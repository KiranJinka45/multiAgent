import { sandboxManager, SandboxSelector } from '../packages/sandbox/src';
import { VirtualFileSystem } from '../packages/vfs/src';
import * as crypto from 'crypto';

/**
 * 🛡️ Replay Determinism Validator
 * Verifies that identical execution parameters (workload + mounts + profile)
 * always produce the exact same cryptographic hashes for lineage tracing.
 */
async function main() {
    console.log("--- 🛡️ REPLAY DETERMINISM VALIDATION START ---");

    const vfs = new VirtualFileSystem();
    const missionId = "replay-audit-999";
    
    // 1. Prepare Identical Workload
    const workload = {
        command: "npm test",
        args: ["--watchAll=false"]
    };

    // 2. Prepare Identical Mounts
    await vfs.writeFile("README.md", "# Replay Test");
    const mountProfile = vfs.getMountProfile("/workspace", "ro");

    // 3. Execution Cycle 1
    console.log("[AUDIT] Cycle 1: Provisioning and Executing...");
    const profile1 = SandboxSelector.selectProfile(missionId, "coder", "high");
    (profile1 as any).mounts = [mountProfile];
    const instance1 = await sandboxManager.provision(profile1);
    const result1 = await sandboxManager.execute(instance1.id, workload);
    await sandboxManager.destroy(instance1.id);

    // 4. Execution Cycle 2 (Exact same parameters)
    console.log("[AUDIT] Cycle 2: Provisioning and Executing...");
    const profile2 = SandboxSelector.selectProfile(missionId, "coder", "high");
    (profile2 as any).mounts = [mountProfile];
    const instance2 = await sandboxManager.provision(profile2);
    const result2 = await sandboxManager.execute(instance2.id, workload);
    await sandboxManager.destroy(instance2.id);

    // 5. Hash Comparison
    console.log(`\n[RESULT] Cycle 1 Execution Hash: ${result1.metadata.executionHash}`);
    console.log(`[RESULT] Cycle 2 Execution Hash: ${result2.metadata.executionHash}`);
    console.log(`[RESULT] Cycle 1 Mount Hash: ${result1.metadata.mountHash}`);
    console.log(`[RESULT] Cycle 2 Mount Hash: ${result2.metadata.mountHash}`);

    const hashesMatch = (
        result1.metadata.executionHash === result2.metadata.executionHash &&
        result1.metadata.mountHash === result2.metadata.mountHash
    );

    if (hashesMatch) {
        console.log("\n✅ SUCCESS: Replay hashes are deterministic. Institutional truth preserved.");
    } else {
        console.error("\n❌ FAIL: Replay hashes diverged! Determinism breach detected.");
        process.exit(1);
    }
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
