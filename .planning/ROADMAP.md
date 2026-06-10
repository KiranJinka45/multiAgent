# Roadmap: Nexus ZTAN

## Overview

Following the successful validation of live cryptographic trust-chains and multi-host portability in v1.9.0, this milestone establishes rigorous operational validation to certify the reproducibility, deployability, and survivability of Nexus ZTAN. The core focus is to ensure any third-party operator or auditor can successfully deploy, operate, recover, and verify the system from scratch.

## Milestones

- 🚧 **v1.14.0 Qualification Removal & Physical Certification** - Phases 21-24 (In Progress)
- ✅ **v1.13.0 Operational Hardening & Long-Term Stewardship** - Phases 19-20 (Shipped: 2026-07-11)
- ✅ **v1.12.0 Physical Runtime & Operational Verification** - Phases 13-18 (Shipped: 2026-07-10)
- ✅ **v1.11.0 Maintenance, Debt Reduction & Portability Validation** - Phases 8-12 (Shipped: 2026-06-08)
- ✅ **v1.10.0 Operational Certification & Reproducibility Validation** - Phases 3-7 (Shipped: 2026-06-08)
- ✅ **v1.9.0 Real Rekor Interoperability & Portability Validation** - Phases A-B, 1-2 (Shipped: 2026-06-04)
- ✅ **v1.8.0 Trust-Chain Operationalization** - Phases 5-7 (Shipped: 2026-06-03)
- ✅ **v1.7.0 Platform Stabilization & CI Integrity** - (Shipped: 2026-06-03)
- ✅ **v1.6.0 Stewardship Engineering Era** - (Shipped: 2026-05-26)

## Phases

> [!NOTE]
> Phases are ordered logically by phase number. Historical completion dates of phases may differ based on operational scheduling and validation dependencies.

### 🚧 v1.14.0 Qualification Removal & Physical Certification (In Progress)

**Milestone Goal:** Convert qualified and simulated evidence into fully certified physical evidence by replacing WSL2-dependent and simulation-assisted validation paths with bare-metal hardware verification.

#### Phase 21: Physical TPM Attestation Certification (Complete with Qualifications)
**Goal**: Certify physical TPM attestation on a non-virtualized host.
**Success Criteria**:
  1. Physical Ubuntu/RHEL/Debian host confirmed via `systemd-detect-virt`, `dmidecode`, `lscpu`.
  2. `/dev/tpm0` accessible and TPM EK chain extracted.
  3. `tpm2_quote` generated successfully and verified by auditor.
  4. Hardware attestation evidence produced.
**Deliverables**: `PHYSICAL_TPM_CERTIFICATION.md`, `physical-attestation-evidence.json`

#### Phase 22: Bare-Metal Firecracker Certification (Complete with Qualifications)
**Goal**: Certify Firecracker microVM endurance on bare-metal Linux without WSL2.
**Success Criteria**:
  1. Non-WSL2 Linux host with `/dev/kvm`.
  2. 100-launch endurance campaign with real vsock execution.
  3. Resource leak measurements (memory, CPU, file descriptors).
  4. Statistical report generated.
**Deliverables**: `FIRECRACKER_BARE_METAL_CERTIFICATION.md`, `firecracker-endurance-results.json`

#### Phase 23: Independent Reproduction Audit (Complete with Qualifications)
**Goal**: Complete genuine independent third-party reproduction audit.
**Success Criteria**:
  1. Different operator (not the original author).
  2. Fresh environment with no prior repository state.
  3. No repository write access.
  4. No author assistance during setup and run.
  5. Complete verification run producing operator attestation.
**Deliverables**: `THIRD_PARTY_CERTIFICATION_REPORT.md`, `operator-attestation.json`

#### Phase 24: Qualification Closure Review (Pending)
**Goal**: Verify all historical qualifications have been removed.
**Success Criteria**:
  1. Phase 13 qualification (physical TPM) removed.
  2. Phase 15 qualification (bare-metal Firecracker) removed.
  3. Phase 18 qualification (simulated operator) removed.
  4. Requirements updated from "Complete with Qualifications" to "Complete".
**Deliverables**: `QUALIFICATION_CLOSURE_REVIEW.md`

<details>
<summary>✅ v1.13.0 Operational Hardening & Long-Term Stewardship (Phases 19-20) - SHIPPED 2026-07-11</summary>

**Milestone Goal:** Transition the platform to post-campaign maintenance mode, establish long-term operational health telemetry checkpoints, and review and refine virtualization boundaries.

#### Phase 19: Long-Term Telemetry Checkpoints (Complete)
**Goal**: Define and monitor long-term operational health telemetry checkpoints.
**Success Criteria**:
  1. Define core operational health indicators (WAL growth, lease renewal latency, backup success rates).
  2. Implement an automated telemetry checking/reporting script that periodically validates these checkpoints.
  3. Verify alerts trigger correctly upon threshold breach.

#### Phase 20: Virtualization Boundaries Review (Complete)
**Goal**: Establish virtualization boundaries review and report.
**Success Criteria**:
  1. Audit KVM, Firecracker, and TPM isolation configurations.
  2. Map namespace and privilege containment boundaries.
  3. Produce a formal Virtualization Boundaries Review Report detailing security posture and isolation limits.

</details>

### ✅ v1.12.0 Physical Runtime & Operational Verification (Completed)

**Milestone Goal:** Address environment-dependent and simulation-assisted validation paths by certifying physical host execution, multi-node Redis Sentinel chaos, real Firecracker VM execution, security posture audits, 30-day continuous reliability, and independent third-party reproduction.

#### Phase 13: Physical Runtime Certification (Complete with Qualifications)
**Goal**: Validate execution on a confirmed physical non-virtualized Linux host with active TPM quote verification.
**Success Criteria**:
  1. Host OS: Confirmed physical non-virtualized Ubuntu/RHEL/Debian install (verified via `systemd-detect-virt`, `dmidecode`, `lscpu`).
  2. `/dev/kvm` and `/dev/tpm0` exist and are accessible.
  3. TPM quote is successfully generated via real TPM 2.0 command `tpm2_quote` and verified.
  4. Structured hardware attestation file generated.

#### Phase 14: Real Sentinel Chaos Testing (Complete)
**Goal**: Validate active lease-fencing state recovery and fail-closed posture under actual multi-node Sentinel quorum loss.
**Success Criteria**:
  1. Runs with 3 Sentinel and 3 Redis nodes.
  2. Verifies failover, leader election, and lease fencing under real network partition/outage, without proxy simulation or mock fallbacks.

#### Phase 15: Physical Firecracker Runtime Certification (Complete with Qualifications)
**Goal**: Verify Firecracker microVM launching, guest command execution, vsock connectivity, and teardown under 100 consecutive iterations.
**Success Criteria**:
  1. VM executes commands and returns output via vsock.
  2. 100 consecutive launches execute successfully without process or VM leaks.
  3. Outputs statistical metrics: `success_rate`, `mean_launch_ms`, `p95_launch_ms`, `mean_teardown_ms`, and `resource_leaks` (memory, CPU, and file descriptor growth).

#### Phase 17: Security Posture Audit (Complete)
**Goal**: Perform comprehensive threat model and privilege containment audit.
**Success Criteria**:
  1. Reviews privileged containers, host mounts, KVM/TPM access, and mock bypass paths.
  2. Audit covers supply chain security, dependency trust, container escape paths, secret management, SBOM review, and container image signing verification.
  3. Produces `THREAT_MODEL.md` and `SECURITY_REVIEW.md`.

#### Phase 18: Independent Reproducibility Audit (Complete — Simulated Operator)
**Goal**: Demonstrate third-party operators can reproduce deployment and verification using the verification kit.
**Success Criteria**:
  1. Independent operator runs verify-kit and validates release evidence.
  2. Audited under strict constraints: fresh machine/environment, no repository write access, and zero author assistance.
  3. Produces `THIRD_PARTY_REPRODUCTION_REPORT.md`.

#### Phase 16: Continuous Reliability Campaign (Complete)
**Goal**: Run 30-day longitudinal reliability tracking.
**Success Criteria**:
  1. Monitors daily drift, daily backup drills, and weekly recovery.
  2. Logs MTTR, failures, and false positives.

<details>
<summary>✅ v1.11.0 Maintenance, Debt Reduction & Portability Validation (Phases 8-12) - SHIPPED 2026-06-08</summary>

**Milestone Goal:** Focus on platform stabilization, warning-debt reduction, independent bare-metal host validation, drift detection, and resilience drills.

#### Phase 8: Technical Debt Reduction
**Goal**: Resolve implicit `any` compiler warnings and unused local variables.
**Success Criteria**:
  1. Compiles cleanly with zero implicit `any` warnings in core packages.
  2. Workspace lint checking reports zero unused local variable warnings.

#### Phase 9: Bare-Metal Portability Validation
**Goal**: Run the reproducibility verification kit on a physical bare-metal host.
**Success Criteria**:
  1. Verification scripts run end-to-end on non-virtualized hardware.
  2. All evidence checks yield successful validation outputs.

#### Phase 10: Drift Prevention Run Infrastructure
**Goal**: Implement an automated test runner script to periodically run compatibility and reproducibility checks.
**Success Criteria**:
  1. Cron script regularly checks generated evidence.
  2. Alerts trigger upon validation mismatch.

#### Phase 11: Backup Corruption & Recovery Integrity
**Goal**: Verify recovery behavior and diagnostics under corrupted backup imports.
**Success Criteria**:
  1. Graceful import aborts upon detecting corrupt DB/queue dumps.
  2. System raises clean diagnostic alerts without silent crashes.

#### Phase 12: Sentinel Resilience Drills
**Goal**: Verify lease-fencing state recovery and step-down under Redis Sentinel quorum-loss simulations.
**Success Criteria**:
  1. Active lease step-downs trigger during network partition.
  2. Failover operates without split-brain or data corruption.

</details>

<details>
<summary>✅ v1.10.0 Operational Certification & Reproducibility Validation (Phases 3-7) - SHIPPED 2026-06-08</summary>

### Phase 3: Infrastructure Certification
**Goal**: Prove a clean, reproducible deployment works from scratch under standard containerized and orchestrated environments.
**Success Criteria**:
  1. Detailed clean-sheet deployment documentation exists in `INFRASTRUCTURE_CERTIFICATION.md`.
  2. All primary and secondary Docker image builds complete successfully without errors.
  3. Local Kubernetes deployment succeeds, yielding healthy active pods.
  4. Core services (coordination, queues, gateways) report healthy.
  5. Deployment-level smoke tests execute and pass successfully.

### Phase 4: Disaster Recovery Replay
**Goal**: Demonstrate total recovery and deterministic replay of transactional states following state destruction.
**Success Criteria**:
  1. Stable coordination and event backups are generated successfully.
  2. Complete simulated database and queue state destruction succeeds without system hang.
  3. Coordination and transaction logs restore cleanly to identical epochs.
  4. Recovery smoke tests pass and verify that active leases and witness history are intact.

### Phase 5: Cross-Version Compatibility Matrix
**Goal**: Verify that the independent auditor parses and validates historical and modern evidence without compatibility regression.
**Success Criteria**:
  1. Matrix validation test suite executed covering versions v1.8, v1.9, and v1.10.
  2. Auditor v1.9 validates evidence produced by ZTAN runtime v1.8.
  3. Auditor v1.10 validates evidence produced by ZTAN runtime v1.8.
  4. Auditor v1.10 validates evidence produced by ZTAN runtime v1.9.

### Phase 6: Dependency Rationalization
**Goal**: Remove dead packages, unused dependencies, and prune redundant files to minimize maintenance risk.
**Success Criteria**:
  1. Unused dependencies identified by `knip` are completely removed from workspace configurations.
  2. Dead files (such as unused seeders or template scripts) are safely deleted.
  3. Active dependency configurations locked and documented in `DEPENDENCY_AUDIT.md`.

### Phase 7: Reproducibility Bundle
**Goal**: Enable third-party validation by packaging all necessary files and scripts into a self-contained, standalone verification bundle.
**Success Criteria**:
  1. Self-contained verification kit created (`verify-kit/`, `evidence/`, `runbooks/`).
  2. Standalone, third-party validation run successfully executes in an isolated environment without needing access to internal repository dependencies.

</details>

<details>
<summary>✅ v1.9.0 Real Rekor Interoperability & Portability Validation (Phases A-B, 1-2) - SHIPPED 2026-06-04</summary>

### Phase A: Consensus & Subsystem Reconciliation
**Goal**: Realign and stabilize ConsensusEngine interface with test suites.
**Plans**: 1 plan

### Phase B: CI/CD Certification
**Goal**: Repair and validate all repository-wide CI/CD pipelines.
**Plans**: 1 plan

### Phase 1: Production Readiness Audit
**Goal**: Identify operational risks and posture across all subsystems.
**Plans**: 1 plan

### Phase 2: Real Rekor & Portability Validation
**Goal**: Establish remote Rekor validation and multi-environment execution proof.
**Plans**: 1 plan


</details>

## Progress

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| A. Consensus Reconciliation | v1.9.0 | 1/1 | Complete | 2026-06-03 |
| B. CI/CD Certification | v1.9.0 | 1/1 | Complete | 2026-06-03 |
| 1. Production Audit | v1.9.0 | 1/1 | Complete | 2026-06-03 |
| 2. Real Rekor | v1.9.0 | 1/1 | Complete | 2026-06-04 |
| 3. Infrastructure Certification | v1.10.0 | 1/1 | Complete | 2026-06-08 |
| 4. Disaster Recovery Replay | v1.10.0 | 1/1 | Complete | 2026-06-08 |
| 5. Compatibility Matrix | v1.10.0 | 1/1 | Complete | 2026-06-08 |
| 6. Dependency Rationalization | v1.10.0 | 1/1 | Complete | 2026-06-08 |
| 7. Reproducibility Bundle | v1.10.0 | 1/1 | Complete | 2026-06-08 |
| 8. Technical Debt Reduction | v1.11.0 | 1/1 | Complete | 2026-06-08 |
| 9. Bare-Metal Portability | v1.11.0 | 1/1 | Complete | 2026-06-08 |
| 10. Drift Prevention | v1.11.0 | 1/1 | Complete | 2026-06-08 |
| 11. Backup Corruption | v1.11.0 | 1/1 | Complete | 2026-06-08 |
| 12. Sentinel Resilience | v1.11.0 | 1/1 | Complete | 2026-06-08 |
| 13. Physical Runtime | v1.12.0 | 1/1 | Complete with Qualifications | 2026-06-08 |
| 14. Sentinel Chaos | v1.12.0 | 1/1 | Complete | 2026-06-09 |
| 15. Firecracker Runtime | v1.12.0 | 1/1 | Complete with Qualifications | 2026-06-10 |
| 17. Security Audit | v1.12.0 | 1/1 | Complete | 2026-06-10 |
| 18. Independent Repro | v1.12.0 | 1/1 | Complete (Simulated Operator) | 2026-06-10 |
| 16. Reliability Campaign | v1.12.0 | 1/1 | Complete | 2026-07-10 |
| 19. Telemetry Checkpoints | v1.13.0 | 1/1 | Complete | 2026-07-10 |
| 20. Virtualization Review | v1.13.0 | 1/1 | Complete | 2026-07-11 |
| 21. Physical TPM Attestation | v1.14.0 | 1/1 | Complete with Qualifications | 2026-07-11 |
| 22. Bare-Metal Firecracker | v1.14.0 | 1/1 | Complete with Qualifications | 2026-07-11 |
| 23. Independent Reproduction | v1.14.0 | 1/1 | Complete with Qualifications | 2026-07-11 |
| 24. Qualification Closure | v1.14.0 | 0/1 | Pending | - |
