import { sandboxManager, SandboxSelector } from '../packages/sandbox/src';
import { VirtualFileSystem } from '../packages/vfs/src';
import * as fs from 'fs';

/**
 * 🛡️ Execution Finality Validator
 * Verifies the formal state machine and immutable truth transition.
 */
async function main() {
    console.log("--- 🛡️ EXECUTION FINALITY AUDIT START ---");

    const vfs = new VirtualFileSystem();
    const missionId = "finality-audit-999";
    
    // 1. Provision
    const profile = SandboxSelector.selectProfile(missionId, "coder", "low");
    const instance = await sandboxManager.provision(profile);
    console.log(`[STATE] Sandbox Provisioned. State: ${instance.state}`);

    // 2. Execute
    const workload = { command: "ls", args: ["/"] };
    const result = await sandboxManager.execute(instance.id, workload);
    console.log(`[STATE] Execution Completed. Result State: ${instance.state}`);

    if (instance.state !== "COMPLETED") {
        throw new Error("FAIL: State should be COMPLETED after execution.");
    }

    // 3. Finalize
    console.log("[AUDIT] Finalizing execution truth...");
    const envelope = await (sandboxManager as any).finalizeExecution(missionId, instance.id, result);
    
    console.log(`[STATE] Finalized. State: ${instance.state}`);
    console.log(`[RESULT] Finalized Envelope: ${JSON.stringify(envelope, null, 2)}`);

    // 4. Verify Immutability
    try {
        (envelope as any).missionId = "TAMPERED";
        console.error("❌ FAIL: Finalized envelope is NOT immutable!");
        process.exit(1);
    } catch (e) {
        console.log("✅ SUCCESS: Finalized envelope is IMMUTABLE.");
    }

    if (instance.state === "FINALIZED") {
        console.log("\n✅ SUCCESS: Execution Finality Verified.");
        fs.writeFileSync('finality_audit.txt', 'PASSED');
    } else {
        console.error("\n❌ FAIL: Finality state mismatch!");
        fs.writeFileSync('finality_audit.txt', 'FAILED');
        process.exit(1);
    }
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
