# Bare-Metal Firecracker Validation Runbook

This runbook outlines the steps required to execute the final unverified operational assumption in the ZTAN architecture: **Production Bare-Metal Firecracker Isolation**.

Since nested virtualization inside WSL2/Hyper-V does not provide the same security, scheduling, or NUMA-awareness guarantees as physical hardware, this validation MUST be performed on a bare-metal Linux machine.

---

## 1. Prerequisites

You must execute this runbook on a physical machine running a modern Linux distribution (e.g., Ubuntu 22.04 LTS or Debian 12) with hardware virtualization enabled.

### Hardware Check
Verify that hardware virtualization (VT-x for Intel, AMD-V for AMD) is supported and enabled:
```bash
lscpu | grep Virtualization
```

Verify that the KVM kernel module is loaded and accessible:
```bash
lsmod | grep kvm
ls -l /dev/kvm
# Expected: crw-rw----+ 1 root kvm 10, 232 ... /dev/kvm
```

---

## 2. Install Firecracker & Jailer

In production, Firecracker must be run alongside `jailer`, which provides a chroot environment, drops privileges, and uses cgroups/namespaces for strict workload isolation.

```bash
# Download Firecracker release binaries
ARCH="$(uname -m)"
RELEASE_URL="https://github.com/firecracker-microvm/firecracker/releases/download/v1.7.0/firecracker-v1.7.0-${ARCH}.tgz"

mkdir -p /tmp/firecracker
curl -L ${RELEASE_URL} | tar -xz -C /tmp/firecracker

# Install binaries to system path
sudo mv /tmp/firecracker/release-v1.7.0-${ARCH}/firecracker-v1.7.0-${ARCH} /usr/local/bin/firecracker
sudo mv /tmp/firecracker/release-v1.7.0-${ARCH}/jailer-v1.7.0-${ARCH} /usr/local/bin/jailer

sudo chmod +x /usr/local/bin/firecracker /usr/local/bin/jailer
```

---

## 3. Prepare ZTAN MicroVM Workspace

The `PhysicalFirecrackerAdapter` expects the kernel and root filesystem to be present at `/var/lib/ztan`.

```bash
sudo mkdir -p /var/lib/ztan
sudo mkdir -p /srv/jailer/firecracker  # Required by jailer

# Download the ZTAN Alpine-based RootFS and Kernel
sudo curl -fsSL https://s3.amazonaws.com/spec.ccfc.min/img/hello/ubuntu/kernel/vmlinux.bin -o /var/lib/ztan/vmlinux
sudo curl -fsSL https://s3.amazonaws.com/spec.ccfc.min/img/hello/ubuntu/fsfiles/hello-rootfs.ext4 -o /var/lib/ztan/rootfs

# Ensure correct permissions for jailer
sudo chown -R 100:100 /var/lib/ztan
```

---

## 4. Setup MicroVM Networking (Tap Devices)

Firecracker requires pre-configured TAP devices for network isolation.

```bash
# Create a tap device for the test VM
sudo ip tuntap add tap0 mode tap
sudo ip addr add 172.16.0.1/24 dev tap0
sudo ip link set tap0 up

# Optional: Enable IP forwarding if the VM needs external network access
sudo sh -c "echo 1 > /proc/sys/net/ipv4/ip_forward"
sudo iptables -t nat -A POSTROUTING -o eth0 -j MASQUERADE
sudo iptables -A FORWARD -m conntrack --ctstate RELATED,ESTABLISHED -j ACCEPT
sudo iptables -A FORWARD -i tap0 -o eth0 -j ACCEPT
```

---

## 5. Execute ZTAN Firecracker Adapter (with Jailer)

The ZTAN codebase must be configured to use `jailer` for this test to be a valid production simulation.

1. In `packages/governance-core/src/isolation/physical-firecracker.ts`, ensure `useJailer` is set to `true`:
   ```typescript
   static useJailer = true;
   ```

2. Rebuild the bundle:
   ```bash
   pnpm run build
   # Or use esbuild directly to generate run-firecracker-bundle.mjs
   ```

3. Execute the runner. **Must be run with sudo** because interacting with `/dev/kvm` and `jailer` requires elevated privileges to create cgroups and namespaces.

```bash
sudo node run-firecracker-bundle.mjs
```

### Expected Output
```text
=== Real Firecracker Execution ===
KVM Exists: true
Spawning VM...
[Jailer] Creating chroot at /srv/jailer/firecracker/wsl-real-test/root
[Jailer] Dropping privileges to UID 100, GID 100
✅ VM spawned successfully!
Executing arbitrary command via adapter executeCommand()...
✅ Command executed! Output: Physical output for command: echo "Hello from true Firecracker isolated microVM!"
Killing VM...
✅ VM hard-killed and swept.
```

---

## 6. SRE Validation Checklist

While the script runs, an SRE must verify the following properties on the host machine to certify the test:

- [ ] **KVM Execution**: Run `top -d 1` or `htop`. Verify the `firecracker` process is actively consuming CPU and is bound to a specific cgroup.
- [ ] **Jailer Chroot**: Verify that `ls -l /srv/jailer/firecracker/<vmId>/root/` shows the mounted `/dev/kvm` and socket files.
- [ ] **Process Isolation**: Verify the `firecracker` process is running as `UID 100` (or whichever unprivileged user was specified), **NOT** as root.
- [ ] **Cleanup**: After the VM is killed, verify that the `firecracker` process is completely gone and `/tmp` or `/run` socket files are cleaned up.

If all checklist items pass, ZTAN's production bare-metal microVM isolation strategy is officially **CERTIFIED**.
