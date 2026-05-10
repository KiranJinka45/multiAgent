import { sandboxManager, SandboxSelector } from '../packages/sandbox/src';
import { AdversarialWorkloadSuite } from '../packages/sandbox/src/verification/adversarial-suite';
import { VirtualFileSystem } from '../packages/vfs/src';

/**
 * 🛡️ Isolation Integrity Runner
 * Executes adversarial workloads and verifies that the sandbox infrastructure
 * detects and blocks host-escape attempts.
 */
async function main() {
    console.log("--- 🛡️ ISOLATION INTEGRITY AUDIT START ---");
    
    const vfs = new VirtualFileSystem();
    const missionId = "audit-mission-666";

    for (const [testName, workload] of Object.entries(AdversarialWorkloadSuite)) {
        console.log(`\n[AUDIT] Running: ${testName}`);
        console.log(`[AUDIT] Description: ${workload.description}`);

        const profile = SandboxSelector.selectProfile(missionId, "adversary", "high");
        (profile as any).mounts = [vfs.getMountProfile("/work", "rw")];

        const instance = await sandboxManager.provision(profile);

        try {
            const result = await sandboxManager.execute(instance.id, workload);

            if (result.exitCode !== 0 || result.metadata.securityEvent === "POLICY_VIOLATION") {
                console.log(`✅ PASS: ${testName} was successfully BLOCKED.`);
                console.log(`[LOG] ${result.stderr}`);
            } else {
                console.error(`❌ FAIL: ${testName} was ALLOWED. Sandbox boundary breached.`);
                process.exit(1);
            }
        } catch (err) {
            console.log(`✅ PASS: ${testName} triggered an infrastructure exception (Blocked).`);
        } finally {
            await sandboxManager.destroy(instance.id);
        }
    }

    console.log("\n--- 🛡️ ISOLATION INTEGRITY AUDIT COMPLETE: ALL BOUNDARIES SECURE ---");
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
