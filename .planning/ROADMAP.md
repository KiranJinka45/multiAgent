# Roadmap: Nexus ZTAN

## Overview

Following the successful validation of live cryptographic trust-chains and multi-host portability in v1.9.0, this milestone establishes rigorous operational validation to certify the reproducibility, deployability, and survivability of Nexus ZTAN. The core focus is to ensure any third-party operator or auditor can successfully deploy, operate, recover, and verify the system from scratch.

## Milestones

- 🚧 **v1.10.0 Operational Certification & Reproducibility Validation** - Phases 3-7 (in progress)
- ✅ **v1.9.0 Real Rekor Interoperability & Portability Validation** - Phases A-B, 1-2 (Shipped: 2026-06-04)
- ✅ **v1.8.0 Trust-Chain Operationalization** - Phases 5-7 (Shipped: 2026-06-03)
- ✅ **v1.7.0 Platform Stabilization & CI Integrity** - (Shipped: 2026-06-03)
- ✅ **v1.6.0 Stewardship Engineering Era** - (Shipped: 2026-05-26)

## Phases

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

### 🚧 v1.10.0 Operational Certification & Reproducibility Validation (In Progress)

**Milestone Goal:** Establish clean, third-party operational evidence across deployment, recovery, auditor compatibility, dependency health, and standalone verification.

#### Phase 3: Infrastructure Certification
**Goal**: Prove a clean, reproducible deployment works from scratch under standard containerized and orchestrated environments.
**Depends on**: Phase 2
**Requirements**: OPS-INFRA-01, OPS-INFRA-02, OPS-INFRA-03, OPS-INFRA-04, OPS-INFRA-05
**Success Criteria**:
  1. Detailed clean-sheet deployment documentation exists in `INFRASTRUCTURE_CERTIFICATION.md`.
  2. All primary and secondary Docker image builds complete successfully without errors.
  3. Local Kubernetes deployment succeeds, yielding healthy active pods.
  4. Core services (coordination, queues, gateways) report healthy.
  5. Deployment-level smoke tests execute and pass successfully.
**Plans**: TBD

#### Phase 4: Disaster Recovery Replay
**Goal**: Demonstrate total recovery and deterministic replay of transactional states following state destruction.
**Depends on**: Phase 3
**Requirements**: OPS-DR-01, OPS-DR-02, OPS-DR-03, OPS-DR-04
**Success Criteria**:
  1. Stable coordination and event backups are generated successfully.
  2. Complete simulated database and queue state destruction succeeds without system hang.
  3. Coordination and transaction logs restore cleanly to identical epochs.
  4. Recovery smoke tests pass and verify that active leases and witness history are intact.
**Plans**: TBD

#### Phase 5: Cross-Version Compatibility Matrix
**Goal**: Verify that the independent auditor parses and validates historical and modern evidence without compatibility regression.
**Depends on**: Phase 4
**Requirements**: OPS-COMPAT-01, OPS-COMPAT-02, OPS-COMPAT-03, OPS-COMPAT-04
**Success Criteria**:
  1. Matrix validation test suite executed covering versions v1.8, v1.9, and v1.10.
  2. Auditor v1.9 validates evidence produced by ZTAN runtime v1.8.
  3. Auditor v1.10 validates evidence produced by ZTAN runtime v1.8.
  4. Auditor v1.10 validates evidence produced by ZTAN runtime v1.9.
**Plans**: TBD

#### Phase 6: Dependency Rationalization
**Goal**: Remove dead packages, unused dependencies, and prune redundant files to minimize maintenance risk.
**Depends on**: Phase 5
**Requirements**: OPS-DEP-01, OPS-DEP-02, OPS-DEP-03
**Success Criteria**:
  1. Unused dependencies identified by `knip` are completely removed from workspace configurations.
  2. Dead files (such as unused seeders or template scripts) are safely deleted.
  3. Active dependency configurations locked and documented in `DEPENDENCY_AUDIT.md`.
**Plans**: TBD

#### Phase 7: Reproducibility Bundle
**Goal**: Enable third-party validation by packaging all necessary files and scripts into a self-contained, standalone verification bundle.
**Depends on**: Phase 6
**Requirements**: OPS-BUNDLE-01, OPS-BUNDLE-02
**Success Criteria**:
  1. Self-contained verification kit created (`verify-kit/`, `evidence/`, `runbooks/`).
  2. Standalone, third-party validation run successfully executes in an isolated environment without needing access to internal repository dependencies.
**Plans**: TBD

## Progress

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| A. Consensus Reconciliation | v1.9.0 | 1/1 | Complete | 2026-06-03 |
| B. CI/CD Certification | v1.9.0 | 1/1 | Complete | 2026-06-03 |
| 1. Production Audit | v1.9.0 | 1/1 | Complete | 2026-06-03 |
| 2. Real Rekor | v1.9.0 | 1/1 | Complete | 2026-06-04 |
| 3. Infrastructure Certification | v1.10.0 | 0/1 | Not started | - |
| 4. Disaster Recovery Replay | v1.10.0 | 0/1 | Not started | - |
| 5. Compatibility Matrix | v1.10.0 | 0/1 | Not started | - |
| 6. Dependency Rationalization | v1.10.0 | 0/1 | Not started | - |
| 7. Reproducibility Bundle | v1.10.0 | 0/1 | Not started | - |
