# Nexus ZTAN: Forensic Governance and Replay-Coordination Substrate

> **STATUS**: **BOUNDED ADVERSARIAL DISTRIBUTED-SYSTEMS RESEARCH SUBSTRATE** 🛡️
>
> **System Identity Boundary Disclosure:**
> ZTAN is a bounded adversarial distributed-systems research platform focused on fail-closed orchestration, causal replay validation, authenticated consensus experimentation, and cryptographic trust-boundary modeling under explicitly constrained laboratory conditions.
>
> The platform combines adversarial falsification campaigns, cryptographic integrity verification, PBFT-inspired quorum coordination, and replay causality enforcement to iteratively discover and harden architectural failure modes.
>
> **Current Limitations & Unresolved Boundaries:**
> 1. **Containment Semantics:** Dependence on shared-kernel container isolation (Docker) rather than true hypervisor-level microVM execution (e.g. Firecracker/KVM), leaving the host kernel as a shared root of compromise.
> 2. **Byzantine Networking:** Absence of production-grade Byzantine networking assumptions (such as view change safety proofs, checkpoint stabilization, lock certificates, and timing asymmetry/prepare withholding scheduling).
> 3. **Attestation Infrastructure:** Reliance on modeled rather than physical TPM 2.0 attestation hardware.


---

## 🏛️ Permanent Operations Mode

**CURRENT MISSION**: Treat the platform as operational infrastructure under bounded development-stage assumptions, maintaining strict production-style operational discipline. Focus exclusively on uptime, recovery, maintenance, compatibility, security, and operator independence.

### Authorized Activities
- **Security Maintenance**: Patch CVEs, rotate credentials, maintain dependency health.
- **Ecosystem Compatibility**: Node.js LTS transitions, TypeScript compatibility, runtime updates.
- **Operational Verification**: Quarterly OCR drills, annual survivability rehearsals.
- **Documentation Maintenance**: Remove stale procedures, simplify onboarding.
- **Incident Response**: Preserve evidence, restore service, perform RCA.

### Operational Restraint
Every proposed change must justify itself using real operational evidence. The following are prohibited unless triggered by a verified production need:
- No new governance frameworks or telemetry abstractions.
- No new archaeology systems or scoring mechanisms.
- No speculative platform expansion or ceremonial complexity.

**Success Condition**: The platform becomes boring enough that nobody thinks about it.

---

## 🚀 Getting Started

Nexus ZTAN is designed for institutional operators and enterprise developers.

- **For Operators**: See the [Operator Training Playbook](file:///c:/multiagentic_project/multiAgent-main/GETTING_STARTED_OPERATORS.md) and [Maintenance Runbook](file:///c:/multiagentic_project/multiAgent-main/RUNBOOK.md).
- **For Developers**: Explore the [ZTAN SDK](file:///c:/multiagentic_project/multiAgent-main/packages/sdk/README.md) and [API Reference](file:///c:/multiagentic_project/multiAgent-main/docs/API.md).
- **For Auditors**: Review the [Finality Declaration](file:///c:/multiagentic_project/multiAgent-main/FINALITY_DECLARATION.md) and [Constitutional Freeze](file:///c:/multiagentic_project/multiAgent-main/CONSTITUTION_FREEZE.md).

## 🛠️ One-Command Recovery (OCR)

To restore the platform from a clean state (New Machine/Disaster Recovery):

1.  **Prerequisites**: Install `docker`, `pnpm`, and `node` (v20+).
2.  **Clone**: `git clone <repo-url>`
3.  **Restore**: `npx tsx scripts/one-command-recovery.ts`

This script automates environment bootstrapping, infrastructure orchestration, database migrations, and runtime smoke tests.


## 🛡️ Governance & Stability

ZTAN is protected by the **Stability Charter** and the **Stewardship Registry**. Architectural mutations are expected to undergo formal review, witness ratification, and model-validation procedures where available.

---
**Maintained under the Nexus ZTAN Stewardship Charter.**
