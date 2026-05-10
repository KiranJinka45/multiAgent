import { sandboxManager, SandboxSelector } from '../packages/sandbox/src';
import { VirtualFileSystem } from '../packages/vfs/src';
import * as fs from 'fs';

/**
 * 🛡️ Provider Equivalence Validator
 * Verifies that the same workload and policy produce IDENTICAL lineage hashes
 * across different isolation runtimes (gVisor vs Firecracker).
 */
async function main() {
    console.log("--- 🛡️ PROVIDER EQUIVALENCE AUDIT START ---");

    const vfs = new VirtualFileSystem();
    const missionId = "equiv-audit-777";
    
    const workload = {
        command: "ls -la",
        args: ["/workspace"]
    };

    await vfs.writeFile("policy.txt", "v1.0.0");
    const mountProfile = vfs.getMountProfile("/workspace", "ro");

    // 1. Execute in gVisor
    console.log("[AUDIT] Running in gVisor...");
    const profileG = SandboxSelector.selectProfile(missionId, "coder", "low");
    (profileG as any).mounts = [mountProfile];
    const instanceG = await sandboxManager.provision(profileG);
    const resultG = await sandboxManager.execute(instanceG.id, workload);
    await sandboxManager.destroy(instanceG.id);

    // 2. Execute in Firecracker
    console.log("[AUDIT] Running in Firecracker...");
    const profileF = SandboxSelector.selectProfile(missionId, "coder", "high");
    (profileF as any).mounts = [mountProfile];
    const instanceF = await sandboxManager.provision(profileF);
    const resultF = await sandboxManager.execute(instanceF.id, workload);
    await sandboxManager.destroy(instanceF.id);

    // 3. Compare Lineage
    console.log(`\n[RESULT] gVisor Execution Hash: ${resultG.metadata.executionHash}`);
    console.log(`[RESULT] Firecracker Execution Hash: ${resultF.metadata.executionHash}`);
    console.log(`[RESULT] gVisor Mount Hash: ${resultG.metadata.mountHash}`);
    console.log(`[RESULT] Firecracker Mount Hash: ${resultF.metadata.mountHash}`);

    const lineageMatches = (
        resultG.metadata.executionHash === resultF.metadata.executionHash &&
        resultG.metadata.mountHash === resultF.metadata.mountHash
    );

    if (lineageMatches) {
        console.log("\n✅ SUCCESS: Provider Equivalence Verified. Lineage is runtime-agnostic.");
        fs.writeFileSync('equivalence_audit.txt', 'PASSED');
    } else {
        console.error("\n❌ FAIL: Lineage divergence detected between providers!");
        fs.writeFileSync('equivalence_audit.txt', 'FAILED');
        process.exit(1);
    }
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
