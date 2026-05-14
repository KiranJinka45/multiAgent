# Nexus ZTAN — Long-Term Maintenance & Stewardship Baseline

This document establishes the formal maintenance requirements for Nexus ZTAN post-finality. The objective is to preserve the platform's "Operational Quietness" and ensure decadal reliability through disciplined, reality-triggered stewardship.

---

## 1. Maintenance Philosophy

*   **Reality-Triggered Only**: No new feature development. All changes must be justified by real operational incidents, external audit findings, or critical security vulnerabilities.
*   **Zero-Entropy Change Management**: Every modification must prove that it does not increase the cognitive load or operational surface area for external SREs.
*   **Standardized Terminology**: All documentation and telemetry must strictly adhere to industry-standard SRE terminology.

---

---

## 2. Quarterly Survivability Calendar

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

## 3. Incident Response Protocol

1.  **Detection**: All alerts are routed to the `Stability Index` dashboard.
2.  **Isolation**: Use `ztanctl isolate <node-id>` to prevent contagion.
3.  **Analysis**: Use `ztanctl audit-log <mission-id>` to identify the root cause.
4.  **Recovery**: Follow the guided workflow in `ztanctl recover`.
5.  **Forensics**: After every incident, a post-mortem must be added to `docs/incidents/` and any documentation friction points must be remediated.

---

## 4. Operator Certification

External operators must be "Certified" every 12 months.
*   **Certification Process**: Successful completion of a supervised `Cold-Start Recovery` drill.
*   **Audit Readiness**: The environment must pass `scripts/clean-room-audit.ts` with 100% compliance.

---

## 5. Security & Build Integrity

*   **Snyk Security Scanning**: Mandatory `snyk_code_scan` for every production patch.
*   **Build Determinism**: Any change that breaks `tsc -b --force` is a critical failure.
*   **Node.js Baseline**: Min Version v20.x (LTS).

---

**Nexus ZTAN: Reliability through Simplicity.**
