import { sandboxManager, SandboxSelector } from '../packages/sandbox/src';
import { VirtualFileSystem } from '../packages/vfs/src';
import { logger } from '../packages/observability/src';

/**
 * 🛡️ Sandbox Telemetry Validator
 * Verifies that the SandboxManager emits consistent, replayable hashes for mounts and workloads.
 */
async function main() {
    console.log("--- 🛡️ SANDBOX TELEMETRY VALIDATION START ---");

    const missionId = "test-mission-123";
    const vfs = new VirtualFileSystem();
    
    // 1. Prepare Workspace
    await vfs.writeFile("src/index.ts", "console.log('hello isolation')");
    const mountProfile = vfs.getMountProfile("/workspace", "rw");

    // 2. Select and Provision
    const profile = SandboxSelector.selectProfile(missionId, "coder", "high");
    (profile as any).mounts = [mountProfile];

    console.log(`[VALIDATION] Provisioning ${profile.runtime} sandbox...`);
    const instance = await sandboxManager.provision(profile);

    // 3. Execute Workload
    const workload = {
        command: "npm run test",
        args: ["--coverage"]
    };

    console.log(`[VALIDATION] Executing workload...`);
    const result = await sandboxManager.execute(instance.id, workload);

    // 4. Verify Metadata
    const { mountHash, executionHash, runtimeClass } = result.metadata;
    
    console.log(`[RESULT] Runtime: ${runtimeClass}`);
    console.log(`[RESULT] Mount Hash: ${mountHash}`);
    console.log(`[RESULT] Execution Hash: ${executionHash}`);

    if (!mountHash || mountHash.length !== 64) {
        throw new Error("❌ FAILED: Invalid or missing mountHash");
    }

    if (!executionHash || executionHash.length !== 64) {
        throw new Error("❌ FAILED: Invalid or missing executionHash");
    }

    // 5. Verify Determinism
    const secondResult = await sandboxManager.execute(instance.id, workload);
    if (secondResult.metadata.executionHash !== executionHash) {
        throw new Error("❌ FAILED: Execution hash is not deterministic");
    }

    console.log("✅ SUCCESS: Sandbox telemetry is consistent and replay-ready.");

    // 6. Teardown
    await sandboxManager.destroy(instance.id);
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
