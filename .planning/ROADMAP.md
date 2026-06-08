# Roadmap: Nexus ZTAN

## Overview

Following the successful validation of live cryptographic trust-chains and multi-host portability in v1.9.0, this milestone establishes rigorous operational validation to certify the reproducibility, deployability, and survivability of Nexus ZTAN. The core focus is to ensure any third-party operator or auditor can successfully deploy, operate, recover, and verify the system from scratch.

## Milestones

- ✅ **v1.11.0 Maintenance, Debt Reduction & Portability Validation** - Phases 8-12 (Shipped: 2026-06-08)
- ✅ **v1.10.0 Operational Certification & Reproducibility Validation** - Phases 3-7 (Shipped: 2026-06-08)
- ✅ **v1.9.0 Real Rekor Interoperability & Portability Validation** - Phases A-B, 1-2 (Shipped: 2026-06-04)
- ✅ **v1.8.0 Trust-Chain Operationalization** - Phases 5-7 (Shipped: 2026-06-03)
- ✅ **v1.7.0 Platform Stabilization & CI Integrity** - (Shipped: 2026-06-03)
- ✅ **v1.6.0 Stewardship Engineering Era** - (Shipped: 2026-05-26)

## Phases

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
