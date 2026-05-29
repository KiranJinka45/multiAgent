#!/usr/bin/env bash
set -euo pipefail

# ==============================================================================
# ZTAN Firecracker Integration CI Runner
# Prerequisites: Linux host with KVM enabled (e.g., AWS c5.metal / i3.metal, 
# or GCP n1-standard with nested virtualization enabled).
# ==============================================================================

echo "=== ZTAN Firecracker CI Integration Script ==="

# 1. Verify KVM is available
if [ ! -c "/dev/kvm" ]; then
    echo "ERROR: /dev/kvm does not exist or is not a character device."
    echo "Firecracker requires KVM to be enabled on the host machine."
    echo "Please run this script on a bare-metal instance (e.g., AWS .metal) or a VM with nested virtualization enabled."
    exit 1
fi

if [ ! -w "/dev/kvm" ] && [ ! -w "$(readlink -f /dev/kvm)" ]; then
    echo "WARNING: /dev/kvm is not writable by the current user."
    echo "Adding current user to the 'kvm' group..."
    sudo usermod -aG kvm $USER
    echo "Please log out and log back in, or run: newgrp kvm"
    exit 1
fi

echo "[✔] KVM is available and accessible."

# 2. Download Firecracker Binaries
echo "Installing Firecracker..."
bash ./scripts/download-firecracker.sh
export PATH="$PWD/bin:$PATH"

# 3. Provision Test Guest Kernel and RootFS
# Firecracker needs a statically linked kernel and an ext4 root filesystem.
ZTAN_DATA_DIR="/var/lib/ztan"
sudo mkdir -p ${ZTAN_DATA_DIR}/rootfs
sudo chown -R $USER:$USER ${ZTAN_DATA_DIR}

echo "Provisioning guest kernel and rootfs..."
if [ ! -f "${ZTAN_DATA_DIR}/vmlinux" ]; then
    echo "Downloading hello-world kernel from Firecracker repo..."
    curl -L -s https://s3.amazonaws.com/spec.ccfc.min/img/quickstart_guide/x86_64/kernels/vmlinux.bin -o ${ZTAN_DATA_DIR}/vmlinux
fi

if [ ! -f "${ZTAN_DATA_DIR}/rootfs/test.ext4" ]; then
    echo "Downloading hello-world rootfs from Firecracker repo..."
    curl -L -s https://s3.amazonaws.com/spec.ccfc.min/img/quickstart_guide/x86_64/rootfs/bionic.rootfs.ext4 -o ${ZTAN_DATA_DIR}/rootfs/test.ext4
fi

echo "[✔] Guest environment provisioned at ${ZTAN_DATA_DIR}."

# 4. Install dependencies and compile
echo "Compiling ZTAN core packages..."
pnpm install --frozen-lockfile
pnpm --filter @packages/governance-core build

# 5. Execute Firecracker Integration Test
echo "Running Real Firecracker Integration Test..."
# ZTAN_TEST_NO_EXIT ensures invariant failures don't kill the test runner unexpectedly,
# though we expect these to pass.
export ZTAN_TEST_NO_EXIT="true"

# Run the specific integration test
cd packages/governance-core
npx vitest run test/integration/e8-real-firecracker.test.ts

echo "=== Firecracker CI Execution Complete ==="
