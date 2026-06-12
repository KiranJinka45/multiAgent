# ZTAN Evidence Accumulation Runbook

**Purpose:** Retire the remaining open qualifications by generating **external evidence** (real operators, real hardware, real pilot environments).  
**Date Created:** 2026-06-12  
**Milestone:** v1.15.0 — Evidence Accumulation Campaign  

> [!IMPORTANT]
> The remaining gaps are **environmental evidence** and **independent validation**, not architecture or documentation. Additional simulations provide diminishing returns. This runbook focuses exclusively on generating real-world evidence.

---

## Qualification Status Summary

| # | Qualification | Current Status | Retirement Path |
|---|---|---|---|
| 1 | Physical TPM 2.0 | `[OPEN QUALIFICATION / SIMULATION VERIFIED]` | Path 3 below |
| 2 | Bare-Metal Firecracker | `[OPEN QUALIFICATION / SIMULATION VERIFIED]` | Path 3 below |
| 3 | Independent Operator Audit | `[OPEN QUALIFICATION / SIMULATION VERIFIED]` | Path 2 below |
| 4 | External Pilot Deployment | `[NOT YET STARTED]` | Path 1 below |

---

## Path 1 — External Pilot Deployment (v1.18B)

**Priority:** Highest — fastest path to new evidence  
**Estimated Duration:** 30 days (observation window)

### Prerequisites

- [ ] Identify 1 low-risk tenant willing to participate
- [ ] Provision isolated namespace (K8s or separate cloud project)
- [ ] Configure ZTAN control plane in `Audit/Advisory` mode initially
- [ ] Set up telemetry export pipeline (metrics → external SIEM/dashboard)

### Deployment Checklist

```bash
# 1. Deploy control plane to pilot namespace
kubectl apply -f k8s/ -n ztan-pilot

# 2. Verify health
npx tsx packages/ztanctl/src/index.ts --role sre diag health

# 3. Enable RLS for pilot tenant
# (Already verified via scripts/adversarial-tenant-escape.ts)

# 4. Begin observation window — start telemetry collection
npx tsx packages/ztanctl/src/index.ts --role sre recovery report
```

### Evidence Artifacts to Collect (30-day window)

| Day | Activity | Evidence Output |
|-----|----------|-----------------|
| 0 | Deploy + baseline health check | `pilot-deploy-baseline.json` |
| 1-7 | Passive observation, drift metrics | `pilot-week1-telemetry.json` |
| 7 | First recovery drill | `pilot-recovery-drill-1.json` |
| 14 | Second recovery drill + incident injection | `pilot-incident-1.json` |
| 21 | Third recovery drill | `pilot-recovery-drill-3.json` |
| 28-30 | Final metrics collection + postmortem | `pilot-postmortem.json` |

### Success Criteria

- [ ] Real tenant traffic processed for 30 consecutive days
- [ ] At least 3 recovery drills executed with measured RTO/RPO
- [ ] At least 1 real or injected incident handled with documented response
- [ ] Drift metrics collected daily with zero unresolved alerts
- [ ] Post-mortem package assembled: timeline, root causes, remediation log

### Exit Artifact

Generate and commit: `evidence/2026-pilot-deployment/pilot-deployment-report.json`

---

## Path 2 — Independent Operator Validation

**Priority:** High — retires Qualification #3  
**Estimated Duration:** 1-2 days

### Prerequisites

- [ ] Identify operator who is **not** a repository author or contributor
- [ ] Provision a fresh machine (clean VM, cloud instance, or separate workstation)
- [ ] Operator has **no** prior access to the repository

### Operator Instructions

Provide the operator with **only** these materials:

1. The repository URL (public clone)
2. `DUE_DILIGENCE_PACKAGE/AUDITOR_GUIDE.md`
3. `DUE_DILIGENCE_PACKAGE/OPERATOR_GUIDE.md`
4. `GETTING_STARTED_OPERATORS.md`

### Operator Checklist (for the independent operator)

```bash
# 1. Clone the repository on a fresh machine
git clone <repo-url>
cd multiAgent-main

# 2. Install dependencies
pnpm install

# 3. Build the project
pnpm run build

# 4. Run smoke tests
node scripts/run-smoke-tests.js

# 5. Generate verification vectors
node verify-kit/v1.5/generate-vectors.mjs

# 6. Verify with Python
python verify-kit/v1.5/verify.py --test verify-kit/v1.5/vectors.json
python verify-kit/v1.5/verify.py --bundle verify-kit/v1.5/bundle.json

# 7. Run portable auditor CLI
python verify-kit/auditor.py verify-kit/v1.5/bundle.json
```

### Constraints (must be verified post-hoc)

| Constraint | Requirement |
|---|---|
| Separate operator | Not the repository author |
| Fresh environment | No cached packages or prior repo state |
| No repo write access | Read-only clone |
| Zero author assistance | Operator follows documentation only |

### Success Criteria

- [ ] All 7 checklist steps completed without author intervention
- [ ] Operator produces signed attestation confirming independent execution
- [ ] Any documentation gaps discovered are logged as findings

### Exit Artifact

Operator produces: `operator-independent-attestation.json` with:
- Machine fingerprint (OS, CPU, memory)
- Node.js / Python versions
- Step-by-step pass/fail log
- Operator signature / attestation statement

---

## Path 3 — Physical Hardware Qualification

**Priority:** Medium — retires Qualifications #1 and #2  
**Estimated Duration:** 1-2 days (once hardware is available)

### Prerequisites

- [ ] Physical Linux host (Ubuntu 22.04+ / RHEL 9+ / Debian 12+)
- [ ] TPM 2.0 chip present and accessible at `/dev/tpm0`
- [ ] KVM enabled and accessible at `/dev/kvm`
- [ ] Firecracker binary installed (v1.5+)
- [ ] `tpm2-tools` package installed

### Environment Verification

```bash
# 1. Confirm non-virtualized host
systemd-detect-virt  # Expected: "none"

# 2. Confirm physical TPM
ls -la /dev/tpm0
tpm2_getcap properties-fixed | head -20

# 3. Confirm KVM
ls -la /dev/kvm
lscpu | grep Virtualization

# 4. Confirm Firecracker
firecracker --version
```

### TPM Qualification Retirement (Qualification #1)

```bash
# Run the existing TPM validation script
npx tsx scripts/validate-physical-hardware.ts

# Expected output includes:
#   TPM Device (/dev/tpm0): Present
#   Attestation Mode: PHYSICAL
#   Virtualization: none
```

### Firecracker Qualification Retirement (Qualification #2)

```bash
# Run the existing endurance campaign
npx tsx scripts/firecracker-endurance-campaign.ts

# Expected: 100 launches, all successful, resource leak metrics clean
```

### Success Criteria

- [ ] `systemd-detect-virt` returns `none`
- [ ] `/dev/tpm0` accessible, real `tpm2_quote` succeeds
- [ ] `/dev/kvm` accessible, Firecracker microVM boots
- [ ] 100-launch endurance run completes with zero leaks
- [ ] Hardware attestation evidence produced with real PCR values

### Exit Artifacts

- `evidence/physical-hardware/physical-tpm-attestation.json`
- `evidence/physical-hardware/firecracker-endurance-native.json`
- `evidence/physical-hardware/host-environment-fingerprint.json`

---

## Post-Qualification Status Targets

After all three paths are completed, the qualification register should read:

| # | Qualification | Target Status |
|---|---|---|
| 1 | Physical TPM 2.0 | `[VERIFIED]` |
| 2 | Bare-Metal Firecracker | `[VERIFIED]` |
| 3 | Independent Operator Audit | `[EXTERNALLY VERIFIED]` |
| 4 | External Pilot Deployment | `[PRODUCTION VERIFIED]` |

---

## Verification Checklist (Final)

After all paths complete:

- [ ] Update `PRODUCTION_PROVEN_ROADMAP.md` — all milestones marked ✅
- [ ] Update `DUE_DILIGENCE_PACKAGE/QUALIFICATION_REGISTER.md` — all statuses `[VERIFIED]`
- [ ] Regenerate due-diligence package: `npx tsx scripts/assemble-due-diligence-package.ts`
- [ ] Commit all evidence artifacts to `evidence/` directory
- [ ] Final smoke test pass: `node scripts/run-smoke-tests.js`
