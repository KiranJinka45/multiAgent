#!/bin/bash

# ZTAN Phase 27 Hardware Preflight Compatibility Checker
# This script verifies if the host machine meets physical TPM 2.0 and KVM virtualization requirements.

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}====================================================${NC}"
echo -e "${BLUE}   ZTAN PHASE 27 HARDWARE PREFLIGHT CHECKER        ${NC}"
echo -e "${BLUE}====================================================${NC}\n"

FAILURES=0
WARNINGS=0

# 1. Check OS Platform
echo -n "Checking OS Platform... "
OS_NAME=$(uname -s)
if [ "$OS_NAME" = "Linux" ]; then
    echo -e "${GREEN}Linux detected.${NC}"
else
    echo -e "${RED}Failed. OS is $OS_NAME (Linux required for Firecracker/TPM).${NC}"
    FAILURES=$((FAILURES + 1))
fi

# 2. Check Virtualization Detection
echo -n "Checking Virtualization Boundary... "
if command -v systemd-detect-virt >/dev/null 2>&1; then
    VIRT_TYPE=$(systemd-detect-virt)
    if [ "$VIRT_TYPE" = "none" ]; then
        echo -e "${GREEN}Pure physical bare-metal host detected.${NC}"
    else
        echo -e "${YELLOW}Warning: Virtualized host ($VIRT_TYPE) detected. Simulated fallback will trigger.${NC}"
        WARNINGS=$((WARNINGS + 1))
    fi
else
    echo -e "${YELLOW}Warning: systemd-detect-virt not found. Unable to verify virtualization status.${NC}"
    WARNINGS=$((WARNINGS + 1))
fi

# 3. Check CPU Virtualization Extensions
echo -n "Checking CPU Virtualization Features... "
if grep -E -q 'vmx|svm' /proc/cpuinfo 2>/dev/null; then
    echo -e "${GREEN}Hardware virtualization (VT-x/AMD-V) is enabled in BIOS.${NC}"
else
    if command -v lscpu >/dev/null 2>&1; then
        VIRT_SUPPORT=$(lscpu | grep -i virtualization)
        if [ -n "$VIRT_SUPPORT" ]; then
            echo -e "${GREEN}Virtualization support found ($VIRT_SUPPORT).${NC}"
        else
            echo -e "${RED}Failed. VT-x or AMD-V is missing or disabled in BIOS.${NC}"
            FAILURES=$((FAILURES + 1))
        fi
    else
        echo -e "${YELLOW}Warning: /proc/cpuinfo or lscpu not readable. Run check manually.${NC}"
        WARNINGS=$((WARNINGS + 1))
    fi
fi

# 4. Check KVM Device node
echo -n "Checking /dev/kvm... "
if [ -e "/dev/kvm" ]; then
    if [ -w "/dev/kvm" ]; then
        echo -e "${GREEN}/dev/kvm is available and writable.${NC}"
    else
        echo -e "${YELLOW}Warning: /dev/kvm exists but is not writable. sudo required.${NC}"
        WARNINGS=$((WARNINGS + 1))
    fi
else
    echo -e "${RED}Failed. /dev/kvm is missing. Hardware acceleration disabled.${NC}"
    FAILURES=$((FAILURES + 1))
fi

# 5. Check TPM 2.0 Device node
echo -n "Checking /dev/tpm0... "
if [ -e "/dev/tpm0" ]; then
    echo -e "${GREEN}/dev/tpm0 exists (Physical TPM 2.0 detected).${NC}"
else
    echo -e "${YELLOW}Warning: /dev/tpm0 is missing (No physical TPM chip found). Simulated TPM will trigger.${NC}"
    WARNINGS=$((WARNINGS + 1))
fi

# 6. Check for TPM tools and communication
echo -n "Checking tpm2-tools... "
if command -v tpm2_getcap >/dev/null 2>&1; then
    echo -e "${GREEN}tpm2-tools installed.${NC}"
    echo -n "Checking TPM 2.0 communication... "
    if sudo tpm2_getcap properties-fixed >/dev/null 2>&1; then
        echo -e "${GREEN}TPM responded successfully.${NC}"
    else
        echo -e "${RED}Failed. TPM is present but failed to respond to queries (check driver/permissions).${NC}"
        FAILURES=$((FAILURES + 1))
    fi
else
    echo -e "${YELLOW}Warning: tpm2_getcap command not found (install tpm2-tools).${NC}"
    WARNINGS=$((WARNINGS + 1))
fi

# 7. Check for Firecracker and Jailer binaries
echo -n "Checking Firecracker binary... "
if command -v firecracker >/dev/null 2>&1; then
    FC_VERSION=$(firecracker --version | head -n 1)
    echo -e "${GREEN}Found ($FC_VERSION).${NC}"
else
    echo -e "${RED}Failed. firecracker command not found in PATH.${NC}"
    FAILURES=$((FAILURES + 1))
fi

echo -n "Checking Jailer binary... "
if command -v jailer >/dev/null 2>&1; then
    echo -e "${GREEN}Found.${NC}"
else
    echo -e "${YELLOW}Warning: jailer command not found (needed for strict jail isolation).${NC}"
    WARNINGS=$((WARNINGS + 1))
fi

# 8. Check for Node.js and pnpm
echo -n "Checking Node.js version... "
if command -v node >/dev/null 2>&1; then
    NODE_VERSION=$(node -v)
    echo -e "${GREEN}Found ($NODE_VERSION).${NC}"
else
    echo -e "${RED}Failed. node command not found.${NC}"
    FAILURES=$((FAILURES + 1))
fi

echo -n "Checking pnpm... "
if command -v pnpm >/dev/null 2>&1; then
    echo -e "${GREEN}Found ($(pnpm -v)).${NC}"
else
    echo -e "${RED}Failed. pnpm command not found.${NC}"
    FAILURES=$((FAILURES + 1))
fi

echo -e "\n${BLUE}====================================================${NC}"
echo -e "SUMMARY: Failures: $FAILURES, Warnings: $WARNINGS"
echo -e "${BLUE}====================================================${NC}"

if [ $FAILURES -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    echo -e "${GREEN}✅ STATUS: Fully compatible! Environment is ready for Phase 27.${NC}"
    exit 0
elif [ $FAILURES -eq 0 ]; then
    echo -e "${YELLOW}⚠️ STATUS: Compatible with qualifications (Simulated fallbacks will trigger).${NC}"
    exit 0
else
    echo -e "${RED}❌ STATUS: Incompatible. Please resolve critical failures before executing Phase 27.${NC}"
    exit 1
fi
