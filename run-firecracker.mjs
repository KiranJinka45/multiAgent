import { PhysicalFirecrackerAdapter } from './packages/governance-core/dist/isolation/physical-firecracker.js';
import * as fs from 'fs';

async function run() {
    console.log("=== Real Firecracker Execution ===");
    console.log("KVM Exists: " + fs.existsSync('/dev/kvm'));
    const adapter = new PhysicalFirecrackerAdapter('/var/lib/ztan', './bin');
    try {
        console.log("Spawning VM...");
        const vm = await adapter.spawnVm('wsl-real-test', {
            memorySizeMb: 128,
            vcpuCount: 1,
            kernelImagePath: '/var/lib/ztan/vmlinux',
            rootfsPath: '/var/lib/ztan/rootfs',
            socketPath: '/tmp/wsl-real-test.sock'
        });
        console.log("✅ VM spawned successfully!");
        
        console.log("Executing arbitrary command via adapter execute()...");
        const result = await adapter.execute('wsl-real-test', 'echo "Hello from true Firecracker isolated microVM!"');
        console.log("✅ Command executed! Output:", result);
        
        console.log("Killing VM...");
        await adapter.killVm('wsl-real-test');
        console.log("✅ VM hard-killed and swept.");
    } catch (e) {
        console.error("Execution failed:", e);
    }
}

run();
