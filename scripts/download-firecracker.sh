#!/usr/bin/env bash
set -euo pipefail

VERSION="v1.7.0"
ARCH="x86_64"
TARGET_DIR="./bin"
TMP_DIR="./tmp-firecracker"

echo "=== Bootstrapping Firecracker and Jailer ${VERSION} ==="

mkdir -p "${TARGET_DIR}"
mkdir -p "${TMP_DIR}"

URL="https://github.com/firecracker-microvm/firecracker/releases/download/${VERSION}/firecracker-${VERSION}-${ARCH}.tgz"
echo "Downloading Firecracker from ${URL}..."
curl -L "${URL}" -o "${TMP_DIR}/firecracker.tgz"

echo "Verifying download..."
EXPECTED_SHA="55bd3e6d599fdd108e36e52f9aee2319f06c18a90f2fa49b64e93fdf06f5ff53"

if command -v sha256sum >/dev/null; then
    ACTUAL_SHA=$(sha256sum "${TMP_DIR}/firecracker.tgz" | awk '{print $1}')
    if [ "${ACTUAL_SHA}" != "${EXPECTED_SHA}" ]; then
        echo "ERROR: SHA256 checksum mismatch!"
        echo "Expected: ${EXPECTED_SHA}"
        echo "Actual  : ${ACTUAL_SHA}"
        exit 1
    fi
    echo "Checksum verified successfully."
else
    echo "sha256sum command not found, skipping integrity check."
fi

echo "Unpacking..."
tar -xzf "${TMP_DIR}/firecracker.tgz" -C "${TMP_DIR}"

echo "Installing binaries..."
cp ${TMP_DIR}/*/firecracker-${VERSION}-${ARCH} "${TARGET_DIR}/firecracker" || cp ${TMP_DIR}/release-*/firecracker-${VERSION}-${ARCH} "${TARGET_DIR}/firecracker"
cp ${TMP_DIR}/*/jailer-${VERSION}-${ARCH} "${TARGET_DIR}/jailer" || cp ${TMP_DIR}/release-*/jailer-${VERSION}-${ARCH} "${TARGET_DIR}/jailer"
chmod +x "${TARGET_DIR}/firecracker" "${TARGET_DIR}/jailer"

echo "Successfully installed Firecracker and Jailer to ${TARGET_DIR}"

rm -rf "${TMP_DIR}"
echo "Cleanup completed."
