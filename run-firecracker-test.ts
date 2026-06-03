import { PhysicalFirecrackerAdapter } from './packages/governance-core/src/isolation/physical-firecracker.js';

async function main() {
    console.log("=== Real Firecracker Execution ===");
    PhysicalFirecrackerAdapter.useJailer = true;
    const adapter = new PhysicalFirecrackerAdapter();
    
    try {
        console.log("Spawning VM...");
        await adapter.spawnVm({
            vmId: "wsl-real-test",
            vcpuCount: 1,
            memorySizeMb: 256,
            kernelImagePath: "/var/lib/ztan/vmlinux",
            rootfsPath: "/var/lib/ztan/rootfs"
        });
        console.log("✅ VM spawned successfully!");
        
        console.log("Waiting 15 seconds for the guest kernel and OS to boot...");
        await new Promise((resolve) => setTimeout(resolve, 15000));
        
        console.log("Executing arbitrary command via adapter executeCommand()...");
        const output = await adapter.executeCommand("wsl-real-test", "echo \"Hello from true Firecracker isolated microVM!\"");
        console.log("✅ Command executed! Output:", output);
        
        console.log("Killing VM...");
        await adapter.killVm("wsl-real-test");
        console.log("✅ VM hard-killed and swept.");
    } catch (e) {
        console.error("Execution failed:", e);
        try {
            await adapter.killVm("wsl-real-test");
        } catch(e2) {}
    }
}
main();
