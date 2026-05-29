# Nexus ZTAN: KVM Lab Bring-Up & Hypervisor Validation Playbook

This document is a step-by-step systems operations guide for configuring, auditing, and executing ZTAN's native hypervisor isolation layer on a native Linux KVM host.

---

## 1. Prerequisites & Nested Virtualization

### 1.1 Host Validation
Verify that the host CPU supports hardware virtualization and that the KVM module is loaded correctly:

```bash
# Check nested virtualization support
egrep -c '(vmx|svm)' /proc/cpuinfo

# Verify KVM device nodes
ls -l /dev/kvm
# Expected: crw-rw---- 1 root kvm 10, 232 ...

# Grant permissions to user-space ZTAN process
sudo usermod -aG kvm $USER
sudo usermod -aG docker $USER
newgrp kvm
```

---

## 2. Unprivileged Jailer & Sandboxing Setup

To prevent a compromise of the Firecracker process from escalating to host takeover, ZTAN uses the Firecracker `jailer` binary to enforce severe constraints.

### 2.1 File System Structure
The jailer requires a strict chroot filesystem structure:

```bash
# Create target jailer workspace
sudo mkdir -p /srv/jailer/firecracker
sudo mkdir -p /srv/jailer/firecracker/rootfs
sudo mkdir -p /srv/jailer/firecracker/run

# Copy ZTAN unprivileged execution kernel and rootfs
sudo cp /var/lib/ztan/kernels/vmlinux-5.10.bin /srv/jailer/firecracker/
sudo cp /var/lib/ztan/images/ztan-rootfs.ext4 /srv/jailer/firecracker/rootfs/

# Set ownership to unprivileged user (UID 100 / GID 100)
sudo chown -R 100:100 /srv/jailer/firecracker
```

### 2.2 TAP Network Namespace Configuration
Configure host networking interfaces to completely isolate microVM guest traffic using Linux namespaces:

```bash
# Create TAP interface
sudo ip tuntap add dev ztan-tap0 mode tap
sudo ip addr add 172.16.0.1/24 dev ztan-tap0
sudo ip link set ztan-tap0 up

# Enable NAT/masquerading on host for outbound guest traffic
sudo iptables -t nat -A POSTROUTING -o eth0 -j MASQUERADE
sudo iptables -A FORWARD -m conntrack --ctstate RELATED,ESTABLISHED -j ACCEPT
sudo iptables -A FORWARD -i ztan-tap0 -o eth0 -j ACCEPT
```

---

## 3. Host-Level seccomp Auditing via `auditd`

To monitor blocked system calls without introducing active runtime latency, ZTAN delegates auditing to the Linux Kernel Audit framework.

### 3.1 Auditing Rules Setup
Write the following rules to `/etc/audit/rules.d/ztan.rules` to audit `sys_bpf`, `sys_mount`, `pivot_root`, and any seccomp rejections:

```ini
# Audit all occurrences of eBPF system call (syscall 321 on x86_64)
-a always,exit -F arch=b64 -S bpf -F key=ztan_ebpf_block

# Audit filesystem traversal/isolation breakouts
-a always,exit -F arch=b64 -S mount -S pivot_root -F key=ztan_escape_block

# Audit all seccomp system call filter blocks (action SECCOMP_RET_ERRNO)
-a always,exit -F arch=b64 -S all -F exit=-EPERM -F key=ztan_seccomp_hit
```

Apply rules and reload the audit daemon:
```bash
sudo augenrules --load
sudo systemctl restart auditd
```

### 3.2 Real-Time Auditing Parser
To trace blocked calls during adversarial testing runs, operators can tail the audit log:

```bash
sudo ausearch -i -k ztan_seccomp_hit
# or trace real-time audit files:
sudo tail -f /var/log/audit/audit.log | grep -E "ztan_ebpf_block|ztan_escape_block"
```

---

## 4. Hypervisor Escape & virtiofs Auditing Playbook

Verify the empirical containment boundary by running escape payloads inside the guest microVM:

### 4.1 guest eBPF Escape Simulation
1. Shell into the guest microVM.
2. Compile and run a mock kernel exploitation program targeting `bpf(2)` structure mutation:
   ```c
   #include <unistd.h>
   #include <sys/syscall.h>
   int main() {
       syscall(321, 0, 0, 0); // sys_bpf
       return 0;
   }
   ```
3. **Expected Behavior:**
   - On KVM host running Firecracker: The guest kernel executes the call, returning `EPERM` within the VM, or completely traps the call. The host kernel remains isolated.
   - On fallback container: The host kernel blocks the call at the seccomp filter, logging a `ztan_seccomp_hit` in `audit.log` on the host side.

### 4.2 virtiofs Performance Validation
Verify that `virtiofs` file share performance delivers hypervisor-level speed while isolating directory boundaries:

```bash
# Inside guest microVM, mount host directory via virtiofs
mount -t virtiofs ztan_shared_dir /mnt/shared

# Measure write bandwidth using dd
dd if=/dev/zero of=/mnt/shared/testfile bs=1M count=500 oflag=direct
# Target: > 450 MB/s read/write bandwidth under native KVM
```

---

## 5. Host Memory Introspection & virtiofs Escape Diagnostics

To move beyond basic host configuration validation into hypervisor exploit resistance testing, operators execute memory pressure anomalies and directory boundary fuzzing.

### 5.1 Guest Memory Pressure & Swap Anomalies
Validate how the host handles memory exhaustion inside the guest under cgroup limits without causing host-level out-of-memory (OOM) cascading restarts.
1. Configure guest MicroVM with `mem_size: 512` (512MB RAM allocation).
2. Inside guest microVM, run a memory stressor allocating 520MB of RAM:
   ```bash
   stress-ng --vm 1 --vm-bytes 520M --timeout 30s
   ```
3. **Expected Behavior:**
   - The guest kernel's OOM killer fires inside the VM, terminating `stress-ng`.
   - The parent `firecracker` process on the host remains stable under its host `cgroup` container quotas, asserting that guest-level memory pressure is completely confined within the microVM boundary.

### 5.2 virtiofs Directory Escape Fuzzing
Evaluate the physical `virtiofsd` directory boundary by attempting to traverse into parent directories on the host:
1. From inside the guest microVM, attempt to compile and execute a recursive lookup payload trying to open files outside the virtiofs mount tag:
   ```c
   #include <fcntl.h>
   #include <stdio.h>
   #include <unistd.h>
   int main() {
       // Attempt to access host root by passing nested parent directory links
       int fd = open("/mnt/shared/../../../../etc/shadow", O_RDONLY);
       if (fd == -1) {
           printf("🛡️ SECURE: virtiofs jailer correctly confined directory bounds.\n");
       } else {
           printf("💥 ESCAPED: Accessed host filesystem outside share boundary!\n");
           close(fd);
       }
       return 0;
   }
   ```
2. **Expected Behavior:**
   - The file descriptor returns `-1` with `ENOENT` or `EACCES`.
   - The host's `virtiofsd` daemon logs a traversal restriction, asserting the integrity of the physical hypervisor filesystem fence.

---

## 6. Empirical Hostile-Environment & Physical Hypervisor Resilience

To establish absolute empirical defensibility, ZTAN moves beyond abstract configuration blueprints and defines the exact operations procedures for physical hypervisor introspection, stress auditing, and containment diagnostics on the KVM host.

### 6.1 Firecracker MMIO Archaeology & Trapping
To verify guest-to-host MMIO isolation under adversarial memory pressure:
1. Identify the active Firecracker process PID and inspect its physical host memory mapping:
   ```bash
   cat /proc/$(pgrep firecracker)/maps | grep -E "mmio|kvm"
   ```
2. Enable host-level KVM kernel tracing to log guest exit reasons (such as MMIO emulation traps):
   ```bash
   sudo sh -c 'echo 1 > /sys/kernel/debug/tracing/events/kvm/kvm_exit/enable'
   # Force a virtio-net or virtio-block interaction in guest, then audit exit telemetry:
   sudo cat /sys/kernel/debug/tracing/trace | grep "exit_reason"
   ```
3. **Expected Behavior:** Every guest device access triggers a highly sandboxed, out-of-context MMIO exit trapped and handled by the Firecracker process. If an emulation failure occurs, Firecracker instantly halts the unprivileged guest, triggering fail-closed containment.

### 6.2 Empirical `virtiofsd` Packet Tracing & Inode Auditing
Verify the physical boundaries of the `virtiofs` file share under rapid directory traversal fuzzing:
1. Start the unprivileged `virtiofsd` daemon on the host with explicit packet debugging logs directed to a secure audit target:
   ```bash
   /usr/libexec/virtiofsd --socket-path=/var/run/ztan-shared.sock --shared-dir=/var/lib/ztan/shared --log-level=debug > /var/log/virtiofsd.log 2>&1
   ```
2. Tail the daemon log on the host during a guest symlink race attack or parent directory traversal fuzzer run:
   ```bash
   tail -f /var/log/virtiofsd.log | grep -E "lookup|readlink|lo_inode"
   ```
3. **Expected Behavior:** For each traversal request (`..`), the daemon log must trace a safe inode translation that maps strictly to the host’s jailed root subdirectory inode, yielding secure rejections (e.g. `lo_lookup returned 0` or standard `ENOENT`).

### 6.3 TAP Network Interface Churn Resilience
Byzantine coordination nodes might experience rapid container failures and restarts. Trace host-level TAP interface allocation sanity under sustained lifecycle churn:
1. Execute a loop creating, binding, and dismantling 250 TAP interfaces under unprivileged namespaces:
   ```bash
   for i in {1..250}; do
       ip tuntap add dev "ztan-taps$i" mode tap
       ip link set "ztan-taps$i" up
       ip tuntap del dev "ztan-taps$i" mode tap
   done
   ```
2. Audit host network namespaces and route table leaks:
   ```bash
   ip netns list
   ip route show
   ```
3. **Expected Behavior:** Zero route pollution, virtual network card hangs, or kernel stack trace leaks. All unprivileged network resources must be reclaimed atomically by the host kernel.

### 6.4 NUMA Isolation & Host Dirty-Page Exhaustion Auditing
Ensure that a rogue, IO-intensive guest replica cannot exhaust the host's physical dirty-page buffers and stall other co-located BFT consensus participants:
1. Inspect the host's dirty-page memory limits:
   ```bash
   sysctl -a | grep dirty
   # Expected: vm.dirty_background_ratio (~10%), vm.dirty_ratio (~20%)
   ```
2. From within the guest, execute a highly aggressive, direct I/O memory write loop:
   ```bash
   stress-ng --io 4 --io-ops 50000 --timeout 60s
   ```
3. Monitor the host's memory allocation and dirty writeback spikes across NUMA nodes:
   ```bash
   numastat -p $(pgrep firecracker)
   watch -n 1 "cat /proc/meminfo | grep -E 'Dirty|Writeback'"
   ```
4. **Expected Behavior:** The host's cgroups v2 memory throttling (`memory.high` / `memory.max`) enforces a strict boundary. The physical KVM host kernel intercepts guest dirty writeback spikes without stalling adjacent microVM nodes.

### 6.5 Host Kernel Panic Forensics & Serial Console Routing
Configure Firecracker unprivileged serial lines to capture guest kernel crash events before VM exit completes:
1. Boot the Firecracker microVM with the serial console directed to a dedicated host diagnostic file:
   ```json
   {
     "boot-source": {
       "kernel_image_path": "vmlinux-5.10.bin",
       "boot_args": "console=ttyS0 reboot=k panic=1 pci=off"
     },
     "logger": {
       "log_path": "/var/log/ztan-guest-console.log",
       "level": "Warning",
       "show_level": true,
       "show_log_origin": true
     }
   }
   ```
2. Set up host-level KDUMP to automatically dump physical memory state if a hypervisor virtualization instruction triggers a host kernel panic:
   ```bash
   sudo systemctl status kdump
   # View panic telemetry targets:
   cat /etc/default/grub | grep "crashkernel"
   ```
3. **Expected Behavior:** Under guest-provoked hardware exceptions, the entire serial crash dump is atomically written to `/var/log/ztan-guest-console.log` on the host, ensuring forensic data survivability even after guest termination.

### 6.6 Live Jailer Sandbox Capability & Privilege Fuzzing
Audit and verify that the unprivileged sandbox process (`jailer`) has zero capabilities to escape its unprivileged UID/GID boundary:
1. Inspect the running Firecracker process capabilities:
   ```bash
   getpcaps $(pgrep firecracker)
   # Expected: = (empty capability set)
   ```
2. Verify jailer directory chroot jail limits by attempting to execute a raw setuid binary inside the jailer directory path:
   ```bash
   sudo jailer --id "ztan-fuzz" --node 0 --exec-file /usr/bin/firecracker --uid 100 --gid 100 --chroot /srv/jailer/firecracker/
   # Attempt to run:
   chroot /srv/jailer/firecracker/ztan-fuzz/root sudo -h
   ```
3. **Expected Behavior:** System call returns `EPERM` or `ENOENT` because the jailer sandbox holds zero host capabilities, is fully confined to UID 100, and is stripped of root-level executing privileges.


