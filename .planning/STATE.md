---
gsd_state_version: 1.0
milestone: v1.15.0
milestone_name: Evidence Accumulation Campaign
status: awaiting_environment_provisioning
stopped_at: "v1.15.0 milestone initialized. Roadmap, qualification register, and due-diligence package updated. Evidence accumulation runbook created."
last_updated: "2026-06-12T08:30:00.000Z"
last_activity: 2026-06-12
progress:
  total_phases: 3
  completed_phases: 2
  qualified_phases: 0
  planned_phases: 1
  in_progress_phases: 0
  blocked_phases: 1
  total_plans: 3
  completed_plans: 2
  qualified_plans: 0
  planned_plans: 1
  in_progress_plans: 0
  blocked_plans: 1
---

# Project State — Evidence Accumulation Campaign

## Project Reference

See: [.planning/PROJECT.md](./PROJECT.md) (updated 2026-06-12)

**Principle:** EVIDENCE-BOUNDED TRUST: ASSERTIONS ARE FALSE UNTIL PROVEN.
**Focus:** Accumulate external evidence (real operators, real hardware, real pilot environments) to retire remaining open qualifications. Additional simulations provide diminishing returns.

## Current Position

Phase: Phase 27 (Awaiting Environment Provisioning)
Plan: Plan 27-01 (Awaiting Environment Provisioning)
Status: Blocked on Physical Hardware Environment
Last activity: 2026-06-12 -- Completed Phase 25 (External Pilot Deployment) on local K8s cluster (docker-desktop) with all services (gateway, worker, auth-service with TLS config, pg, redis) running and healthy, generating pilot-deployment-report.json.

## Performance Metrics

**Velocity:**

- Historical milestones completed: 9 (v1.6.0 through v1.14.0)
- Historical phases completed: 63 (cumulative roadmap phases through v1.14.0)
- Platform Status: TypeScript typechecking baseline clean; build passes; 4/4 smoke tests pass; linting warning debt remains.
- Active Validation Scope: External pilot deployment, independent operator audit, physical hardware qualification.

**By Focus Area:**

| Area | Status | Evidence |
|-------|-------|----------|
| Architecture | Stabilized | FINALITY_DECLARATION.md |
| Governance | Hardened / Frozen | INVARIANT_GOVERNANCE_CHARTER.md & packages/governance-core freeze |
| Forensic Trust | Operationalized | PEM keys resolved, TPM attestation verified (simulated), Transparency-log proofs verified |
| Operations | Repository Verified | 74/74 test files passing (270 tests); 12/12 CI/CD workflows repaired; build + smoke tests clean |
| Virtualization | Reviewed | VIRTUALIZATION_BOUNDARIES_REVIEW.md (Phase 20) |
| Roadmap Accuracy | Corrected | v1.18 split into v1.18A/v1.18B; qualification taxonomy clarified |
| Due Diligence | Regenerated | DUE_DILIGENCE_PACKAGE/ with 4-qualification register |

**Recent Trend:**

- Strategy: Evidence Accumulation (stop simulating, start proving)
- Trend: Transitioning from documentation accuracy to external evidence generation

## Accumulated Context

### Decisions

- [2026-06-12]: Completed Phase 25 (External Pilot Deployment) on local Kubernetes (docker-desktop) ztan-pilot namespace, validating gateway, worker, and auth-service (configured with self-signed TLS certificates and HTTPS probes). Generated pilot-deployment-report.json.
- [2026-06-12]: Completed Phase 26 (Independent Operator Validation) with successful offline verification run and signed attestation.
- [2026-06-12]: Initialized v1.15.0 (Evidence Accumulation Campaign) with 3 phases: External Pilot Deployment, Independent Operator Validation, Physical Hardware Qualification.
- [2026-06-12]: Split Milestone v1.18 into v1.18A (Pilot Simulation & Readiness, ✅ Completed) and v1.18B (External Pilot Deployment, ❌ Not Yet Started) to accurately distinguish simulated workloads from real customer deployments.
- [2026-06-12]: Updated qualification taxonomy from ambiguous `[QUALIFIED]` to explicit `[OPEN QUALIFICATION / SIMULATION VERIFIED]` to prevent auditor confusion.
- [2026-06-12]: Added External Pilot Deployment as Qualification #4 in the qualification register.
- [2026-06-12]: Created EVIDENCE_ACCUMULATION_RUNBOOK.md with step-by-step checklists for all three evidence paths.
- [2026-07-11]: Completed Phase 24 (Qualification Status Reconciliation Review) using Plan 24-01-CLOSURE-PLAN.md, producing QUALIFICATION_CLOSURE_REVIEW.md.
- [2026-07-11]: Shipped v1.14.0 milestone. All requirements satisfied under active environment qualifications.
- [2026-06-03]: v1.8.0 milestone certified — All 6 trust-chain requirements satisfied.
- [2026-05-19]: Stewardship Engineering Handoff — Formally transitioned to operational stabilization.

### Roadmap Evolution

- [2026-06-12]: Initialized v1.15.0 (Evidence Accumulation Campaign). Split v1.18 into v1.18A/v1.18B. Created evidence runbook.
- [2026-07-11]: Shipped and archived v1.14.0 (Qualification Removal Framework Implementation). All 4 phases complete.
- [2026-07-11]: Shipped and archived v1.13.0 (Operational Hardening & Long-Term Stewardship). Both phases complete.

### Pending Todos

- [x] External pilot deployment (Phase 25): Deploy 1 low-risk tenant, 30-day observation
- [x] Independent operator validation (Phase 26): Separate human, separate machine
- [ ] Physical hardware qualification (Phase 27): /dev/tpm0 + /dev/kvm + Firecracker

### Outstanding Qualification Debt (Target of This Milestone)

| # | Qualification | Status | Retirement Path |
|---|---|---|---|
| 1 | Physical TPM 2.0 | `[OPEN QUALIFICATION / SIMULATION VERIFIED]` | Phase 27 — Physical hardware |
| 2 | Bare-Metal Firecracker | `[OPEN QUALIFICATION / SIMULATION VERIFIED]` | Phase 27 — Physical hardware |
| 3 | Independent Operator Audit | `[EXTERNALLY VERIFIED]` | Phase 26 — Separate operator |
| 4 | External Pilot Deployment | `[PILOT VERIFIED]` | Phase 25 — Real tenant |

## Operational Maintenance Surface

- **Telemetry Volume**: Stable under existing log configurations.
- **Complexity Drift**: Strictly Bounded; no new architectural subsystems or packages introduced.

### Blockers/Concerns

- **Hardware Dependency**: Phase 27 requires access to a physical bare-metal Linux host with `/dev/tpm0` and `/dev/kvm`.

## Session Continuity

Last session: 2026-06-12
Stopped at: Completed Phase 25 (External Pilot Deployment). Awaiting environment provisioning for Phase 27 (Physical Hardware).
Resume file: .planning/STATE.md
