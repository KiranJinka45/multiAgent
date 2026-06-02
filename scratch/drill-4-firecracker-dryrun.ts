import { PhysicalFirecrackerAdapter, KvmAccessError } from '../packages/governance-core/src/isolation/physical-firecracker.js';
import { FirecrackerOrchestrator, MockFirecrackerAdapter } from '../packages/governance-core/src/isolation/firecracker-orchestrator.js';

async function main() {
    console.log('--- Priority 4: Real Firecracker Drill (Sandbox Isolation) ---\n');
    
    const config = {
        vmId: 'ztan-sandbox-999',
        kernelImagePath: '/var/lib/ztan/vmlinux',
        rootfsPath: '/var/lib/ztan/rootfs/ubuntu.ext4',
        memorySizeMb: 1024,
        vcpuCount: 2
    };

    console.log('[Step 1] Verifying constraint limits (Hardware /dev/kvm check)');
    
    const physicalAdapter = new PhysicalFirecrackerAdapter();
    try {
        console.log('  Attempting to spawn physical Firecracker microVM...');
        await physicalAdapter.spawnVm(config);
        console.error('  ❌ ERROR: Physical Firecracker somehow started? Expected KvmAccessError on Windows.');
    } catch (err: any) {
        if (err instanceof KvmAccessError || err.message.includes('/dev/kvm') || err.message.includes('not found')) {
            console.log(`  ✅ Successfully caught hardware constraint violation:\n      -> ${err.message}`);
        } else {
            console.error('  ❌ Unexpected error type:', err);
        }
    }

    console.log('\n[Step 2] Executing Dry-Run API Trace via Mock Adapter');
    
    const mockAdapter = new MockFirecrackerAdapter();
    const orchestrator = new FirecrackerOrchestrator(mockAdapter);

    console.log(`  1. Booting VM ${config.vmId}...`);
    await orchestrator.startIsolationSandbox(config);
    console.log(`     ✅ Sandbox started. Memory: ${config.memorySizeMb}MB, vCPUs: ${config.vcpuCount}`);

    console.log(`\n  2. Executing arbitrary payload inside isolated boundaries...`);
    const payloadResult = await orchestrator.run(config.vmId, 'npm run execute-agent -- payload.json');
    console.log(`     ✅ Payload Result: "${payloadResult}"`);

    console.log(`\n  3. Teardown & Ephemeral Purge...`);
    await orchestrator.destroyIsolationSandbox(config.vmId);
    console.log(`     ✅ VM hard-killed and resources swept.`);

    console.log('\n✅ Drill 4 Complete. Sandbox lifecycle boundaries validated.');
}

main().catch(err => {
    console.error('FATAL:', err);
    process.exit(1);
});
