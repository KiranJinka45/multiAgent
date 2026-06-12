# Nexus ZTAN — Long-Term Maintenance & Stewardship Baseline

This document establishes the formal maintenance requirements for Nexus ZTAN post-finality. The objective is to preserve the platform's "Operational Quietness" and ensure decadal reliability through disciplined, reality-triggered stewardship.

---

## 1. Maintenance Philosophy

*   **Reality-Triggered Only**: No new feature development. All changes must be justified by real operational incidents, external audit findings, or critical security vulnerabilities.
*   **Zero-Entropy Change Management**: Every modification must prove that it does not increase the cognitive load or operational surface area for external SREs.
*   **Standardized Terminology**: All documentation and telemetry must strictly adhere to industry-standard SRE terminology.

---

## 2. Controlled Operational Evolution

The architecture freeze is permanent. Changes are only permitted when justified by:
*   **Operational Pain**: Frequent incident recurrence or high MTTR.
*   **Maintenance Burden**: Unsustainable manual toil or dependency churn.
*   **Reliability Issues**: Documented failure of existing recovery mechanisms.
*   **Replay Usability Gaps**: Inability to reconstruct incidents from ledger data.
*   **Customer/Operator Demand**: Validated institutional requirements for survivability.

**Forbidden Drivers**: Speculative architecture, conceptual elegance, AI trend alignment, or institutional mythology expansion. Every change MUST improve operational reliability more than it increases complexity.

---

## 3. Quarterly Survivability Calendar

| Month | Activity | Target |
|---|---|---|
| **Jan / Jul** | **Cold-Start Recovery (OCR)** | Operator Independence |
| **Feb / Aug** | **Friction Audit & Pruning** | Cognitive Burden Reduction |
| **Mar / Sep** | **Adversarial Stress Test** | Zero-Knowledge Survivability |
| **Apr / Oct** | **Dependency Entropy Review** | Ecosystem Stability |
| **May / Nov** | **Identity/Trust Rotation** | Cryptographic Hygiene |
| **Jun / Dec** | **Operator Certification** | Institutional Trust |

Use the automation script to schedule these tasks in your environment:
```powershell
./scripts/schedule-drills.ps1
```

## 4. Operational Rituals & Tooling

### 3.1 Forensic Evidence Preservation
After any production incident or security breach, operators must trigger the evidence preservation script to ensure undeniable auditing:
```bash
bash scripts/preserve-incident.sh <path-to-logs>
```
To verify the integrity of an evidence bundle:
```bash
pnpm tsx scripts/verify-bundle.ts <bundle-directory>
```

### 3.2 Adversarial Survivability
To validate platform determinism under resource pressure (CPU/IO), run the simulation script during monthly recovery drills:
```bash
bash scripts/simulate-adversity.sh <duration-in-seconds>
```
Log all recovery times in `docs/stewardship/RECOVERY_LOG.md` to monitor timing variance.

## 5. Incident Response Protocol

1.  **Isolation**: Use `ztanctl isolate <node-id>` to prevent contagion.
2.  **Forensics**: Run `scripts/preserve-incident.sh`.
3.  **Analysis**: Review `docs/friction/` for operator cognitive burden points.
4.  **Recovery**: Execute deterministic OCR workflow.
5.  **Audit**: Update `SRE_HANDBOOK.md` with new failure modes.

## 6. Security & Build Integrity

*   **Permanent Charter**: All maintenance must adhere to the [STEWARDSHIP_CHARTER.md](./STEWARDSHIP_CHARTER.md).
*   **Snyk Security Scanning**: Mandatory `snyk_code_scan` for every production patch.
*   **Build Determinism**: Any change that breaks `tsc -b --force` is a critical failure.
*   **Node.js Baseline**: Min Version v20.x (LTS).

---

## 7. Maintenance Backlog (Observations)

### OPS-MAINT-OBS-01: FirecrackerOrchestrator Default Constructor Behavior
*   **Observation**: `MockFirecrackerAdapter` remains the default parameter in the constructor of `FirecrackerOrchestrator`. While production entrypoints (e.g., daemon, CLI, RPC controllers) explicitly instantiate and pass the `PhysicalFirecrackerAdapter`, there is currently no runtime protection preventing a future entrypoint or configuration path from accidentally falling back to the mock.
*   **Proposed Hardening**: Require explicit adapter injection in production mode and fail startup if a mock adapter is instantiated outside approved test/simulation contexts (e.g., `VITEST === 'true'` or `ZTAN_MOCK_FIRECRACKER === 'true'`).

---

**Nexus ZTAN: Reliability through Simplicity.**
