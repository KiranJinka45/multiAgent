---
wave: 1
depends_on: []
files_modified:
  - evidence/physical-hardware/physical-tpm-attestation.json
  - evidence/physical-hardware/firecracker-endurance-native.json
  - evidence/physical-hardware/host-environment-fingerprint.json
autonomous: false
requirements:
  - EVIDENCE-HARDWARE-01
---

# Plan 27-01: Physical Hardware Qualification Campaign

Execute physical hardware attestation and hypervisor endurance campaigns natively on non-virtualized Linux hardware, retiring open qualifications.

## Tasks

<task>
<action>
Verify host virtualization environment and node availability:
- Run environment check commands:
  - `systemd-detect-virt` (must return "none")
  - `ls -la /dev/tpm0` (must exist)
  - `ls -la /dev/kvm` (must exist)
  - `firecracker --version` (must run)
- Extract hardware details and compile fingerprint.
- Generate the environment fingerprint report at:
  `evidence/physical-hardware/host-environment-fingerprint.json`
</action>
<acceptance_criteria>
- Virtualization check returns "none".
- `/dev/tpm0` and `/dev/kvm` device files are accessible.
- Fingerprint file `evidence/physical-hardware/host-environment-fingerprint.json` is successfully written.
</acceptance_criteria>
</task>

<task>
<action>
Verify physical TPM Quote attestation generation:
- Run the TPM hardware validation script:
  `npx tsx scripts/validate-physical-hardware.ts`
- Confirm the script extracts the real TPM EK, creates a hardware attestation quote, and validates it.
- Save the attestation output report to:
  `evidence/physical-hardware/physical-tpm-attestation.json`
</action>
<acceptance_criteria>
- Script successfully runs and generates a real TPM quote.
- Attestation report exists and contains `Attestation Mode: PHYSICAL` showing hardware-rooted keys.
</acceptance_criteria>
</task>

<task>
<action>
Execute native Firecracker endurance launch loop:
- Run the Firecracker endurance script:
  `npx tsx scripts/firecracker-endurance-campaign.ts`
- Perform 100 consecutive microVM boots and teardowns via KVM.
- Log mean/p95 latency metrics and monitor file descriptor, CPU, and memory growth.
- Save the endurance results report to:
  `evidence/physical-hardware/firecracker-endurance-native.json`
</action>
<acceptance_criteria>
- Script completes 100/100 launches successfully.
- Leaks check reports zero file descriptor, CPU, or memory growth.
- Native endurance report `evidence/physical-hardware/firecracker-endurance-native.json` is written.
</acceptance_criteria>
</task>

## Verification
- Verify that the generated reports and exit files pass smoke tests:
  `node scripts/run-smoke-tests.js`
