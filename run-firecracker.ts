import { PhysicalFirecrackerAdapter } from './packages/governance-core/src/isolation/physical-firecracker.ts';
import * as fs from 'fs';

process.env.PATH = '/mnt/c/multiagentic_project/multiAgent-main/bin:' + process.env.PATH;

async function run() {
    console.log("=== Real Firecracker Execution ===");
    console.log("KVM Exists: " + fs.existsSync('/dev/kvm'));
    const adapter = new PhysicalFirecrackerAdapter('/var/lib/ztan', './bin');
    try {
        console.log("Spawning VM...");
        const vm = await adapter.spawnVm({
            vmId: 'wsl-real-test',
            memorySizeMb: 128,
            vcpuCount: 1,
            kernelImagePath: '/var/lib/ztan/vmlinux',
            rootfsPath: '/var/lib/ztan/rootfs'
        });
        console.log("✅ VM spawned successfully!");
        
        console.log("Executing arbitrary command via adapter executeCommand()...");
        const result = await adapter.executeCommand('wsl-real-test', 'echo "Hello from true Firecracker isolated microVM!"');
        console.log("✅ Command executed! Output:", result);
        
        console.log("Killing VM...");
        await adapter.killVm('wsl-real-test');
        console.log("✅ VM hard-killed and swept.");
    } catch (e) {
        console.error("Execution failed:", e);
    }
}

run();
