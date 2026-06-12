# ZTAN Phase 27: Physical Hardware Qualification Execution Guide

This guide describes how to execute **Phase 27 (Physical Hardware Qualification)** on a native bare-metal host. Performing these steps retires the final two open environmental qualifications: **Physical TPM 2.0 Hardware Integration** and **Bare-Metal Firecracker microVM Containment**.

---

## 1. Hardware & Motherboard Settings
To run native virtualization (KVM) and TPM commands, your physical motherboard BIOS must be configured:
1. **Enable Virtualization**:
   - For Intel CPUs: Enable **Intel Virtualization Technology** (VT-x) and **Intel VT-d**.
   - For AMD CPUs: Enable **SVM Mode** (Secure Virtual Machine) and **IOMMU**.
2. **Enable TPM**:
   - Enable **Intel Platform Trust Technology** (PTT) or **AMD fTPM / Security Device Support**.
   - Verify that TPM version is set to **2.0**.
3. **Save and Boot** into a native Linux OS (Ubuntu 22.04 LTS or Debian 12 are recommended).

---

## 2. Host Package Installation
Install the necessary development utilities, Node.js, pnpm, and TPM tools:

```bash
# Update and install build dependencies and TPM tools
sudo apt update
sudo apt install -y curl git build-essential tpm2-tools

# Install Node.js v20 LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install pnpm globally
sudo npm install -g pnpm
```

---

## 3. Virtualization & TPM Preflight Verification
Confirm that KVM and TPM device paths are exposed:

```bash
# Check CPU virtualization support
lscpu | grep Virtualization

# Check KVM kernel module
lsmod | grep kvm
ls -l /dev/kvm
# Expected: crw-rw---- 1 root kvm 10, 232 ... /dev/kvm

# Check TPM device node
ls -l /dev/tpm0
# Expected: crw-rw---- 1 tss tss 10, 224 ... /dev/tpm0
```

---

## 4. Workstation & Environment Setup

### Install Firecracker and Jailer v1.7.0
```bash
ARCH="$(uname -m)"
RELEASE_URL="https://github.com/firecracker-microvm/firecracker/releases/download/v1.7.0/firecracker-v1.7.0-${ARCH}.tgz"

mkdir -p /tmp/firecracker
curl -L ${RELEASE_URL} | tar -xz -C /tmp/firecracker

sudo mv /tmp/firecracker/release-v1.7.0-${ARCH}/firecracker-v1.7.0-${ARCH} /usr/local/bin/firecracker
sudo mv /tmp/firecracker/release-v1.7.0-${ARCH}/jailer-v1.7.0-${ARCH} /usr/local/bin/jailer
sudo chmod +x /usr/local/bin/firecracker /usr/local/bin/jailer
```

### Prepare MicroVM workspace
```bash
sudo mkdir -p /var/lib/ztan
sudo mkdir -p /srv/jailer/firecracker

# Download root filesystem and Linux kernel
sudo curl -fsSL https://s3.amazonaws.com/spec.ccfc.min/img/hello/ubuntu/kernel/vmlinux.bin -o /var/lib/ztan/vmlinux
sudo curl -fsSL https://s3.amazonaws.com/spec.ccfc.min/img/hello/ubuntu/fsfiles/hello-rootfs.ext4 -o /var/lib/ztan/rootfs

# Grant unprivileged jailer user ownership (UID 100 / GID 100)
sudo chown -R 100:100 /var/lib/ztan
```

### Configure Network Tap Device
```bash
sudo ip tuntap add tap0 mode tap
sudo ip addr add 172.16.0.1/24 dev tap0
sudo ip link set tap0 up
```

---

## 5. Clone and Compile the Workspace
On your physical Linux host:

```bash
git clone https://github.com/KiranJinka45/multiAgent.git
cd multiAgent
git checkout dvk/snapshot-infrastructure

pnpm install
pnpm run build
```

---

## 6. Execution Ceremony

### Step 1: Run Compatibility Preflight
Check that all settings are correct:
```bash
bash scripts/hardware-preflight.sh
```

### Step 2: Execute Hardware Validation
Launch the automated certifier to execute TPM quotes and Firecracker jailer enclaves:
```bash
# Must run with sudo to communicate with /dev/kvm and /dev/tpm0
sudo npx tsx scripts/phase27-runner.ts
```

### Step 3: Package the Cryptographic Evidence
Stash the verified JSON artifacts and automatically update the roadmap and planning logs:
```bash
npx tsx scripts/phase27-evidence-packager.ts
```

### Step 4: Audit Verification
Run the verification tool to parse the binary quote packet and check nonce/PCR hashes:
```bash
npx tsx scripts/phase27-auditor-verifier.ts
```

---

## 7. Troubleshooting

- **KVM Access Permission Error**: Ensure you run the runner script using `sudo`, or that your user is added to the `kvm` system group: `sudo usermod -aG kvm $USER` (requires logout/login).
- **TPM Node Missing**: Ensure the motherboard security settings are enabled in BIOS and you are not running in a virtual machine/container.
- **Firecracker Jailer Folder Permissions**: Ensure `/srv/jailer/firecracker` and `/var/lib/ztan` are owned by `100:100` (`sudo chown -R 100:100 <path>`).
