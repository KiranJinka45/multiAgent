#!/bin/bash
set -e

echo "=== 1. Hardware Check ==="
lscpu | grep Virtualization || true
lsmod | grep kvm || true
ls -l /dev/kvm || true

echo "=== 2. Install Firecracker & Jailer ==="
ARCH="$(uname -m)"
RELEASE_URL="https://github.com/firecracker-microvm/firecracker/releases/download/v1.7.0/firecracker-v1.7.0-${ARCH}.tgz"
mkdir -p /tmp/firecracker
curl -L ${RELEASE_URL} | tar -xz -C /tmp/firecracker
mv /tmp/firecracker/release-v1.7.0-${ARCH}/firecracker-v1.7.0-${ARCH} /usr/local/bin/firecracker || true
mv /tmp/firecracker/release-v1.7.0-${ARCH}/jailer-v1.7.0-${ARCH} /usr/local/bin/jailer || true
chmod +x /usr/local/bin/firecracker /usr/local/bin/jailer || true

echo "=== 3. Prepare ZTAN MicroVM Workspace ==="
mkdir -p /var/lib/ztan
mkdir -p /srv/jailer/firecracker
curl -fsSL https://s3.amazonaws.com/spec.ccfc.min/img/quickstart_guide/x86_64/kernels/vmlinux.bin -o /var/lib/ztan/vmlinux
curl -fsSL https://s3.amazonaws.com/spec.ccfc.min/img/quickstart_guide/x86_64/rootfs/bionic.rootfs.ext4 -o /var/lib/ztan/rootfs
chown -R 100:100 /var/lib/ztan

echo "=== 4. Setup MicroVM Networking ==="
ip tuntap add tap0 mode tap || true
ip addr add 172.16.0.1/24 dev tap0 || true
ip link set tap0 up || true
sh -c "echo 1 > /proc/sys/net/ipv4/ip_forward" || true
iptables -t nat -A POSTROUTING -o eth0 -j MASQUERADE || true
iptables -A FORWARD -m conntrack --ctstate RELATED,ESTABLISHED -j ACCEPT || true
iptables -A FORWARD -i tap0 -o eth0 -j ACCEPT || true

echo "=== 5. Execute ZTAN Firecracker Adapter ==="
cat << 'EOF' > run-firecracker-test.ts
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
EOF

# Ensure node and npx are in path for root
export PATH=$PATH:/usr/local/bin:/usr/bin
npm install -g tsx
tsx run-firecracker-test.ts

echo "=== 6. Validation Checks ==="
echo "Top Firecracker processes (should be gone):"
pgrep -fl firecracker || echo "No firecracker processes running (Cleanup verified)"
echo "Jailer chroot structure:"
ls -l /srv/jailer/firecracker/wsl-real-test/root/run || true
