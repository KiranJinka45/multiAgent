# Nexus ZTAN — Production Infrastructure
> [!IMPORTANT]
> Core execution model stabilized. Bounded operational hardening and subsystem evolution continue under rigorous maintenance, security, and operational reliability objectives.

## Overview
> **"A replayable infrastructure reliability platform focused on bounded replay determinism under controlled operational assumptions, replay durability, operational clarity, and sustainable long-term maintenance."**

Nexus ZTAN is an auditable, production-oriented research platform designed for long-term operational stability. It provides a tenant-partitioned operational coordination platform with cryptographic lineage validation for secure task execution and reliable system operation.

## Core Value
**STABILITY AND SURVIVABILITY.** The system prioritizes predictable operation, reliable recovery, and maintenance simplicity.

## Requirements

### Validated Operational Baseline

- ✓ **PostgreSQL-Authoritative Coordination** — Authoritative fencing, epoch management, and transaction-locked deduplication.
- ✓ **Cryptographic Replay Lineage Validation** — NIST P-256 asymmetric cryptographic witness ledger.
- ✓ **Transactional Decoupling** — Durable outbox-based queueing for database synchronization.
- ✓ **Deterministic Invariant Modeling** — Finite state space verified by TLA+ safety proofs.
- ✓ **Physical Chaos Resilience** — 10-drill PostgreSQL pathology failover suite certified.
- ✓ **Stewardship Observability** — High-fidelity telemetry and operational telemetry dashboards.
- ✓ **SOAK-01**: Stable memory footprints and WAL bounds — v1.6.0
- ✓ **SOAK-02**: Suffix chronological lineage compaction — v1.6.0
- ✓ **SOAK-03**: Zero false-positives under network partition — v1.6.0
- ✓ **OBS-01**: Real-time lease timeline and replica lag tracking — v1.6.0
- ✓ **OBS-02**: Lost-ACK and outbox-to-DB convergence timelines — v1.6.0
- ✓ **GOV-01**: Invariant CI checking and unauthorized state-machine reject — v1.6.0
- ✓ **GOV-02**: HSM Override ceremonies with non-repudiable audit logs — v1.6.0
- ✓ **DB-01**: Instant step-down on WAL corruption or replica rewind — v1.6.0
- ✓ **DB-02**: Zombie write prevention under autovacuum freeze or disk saturation — v1.6.0
- ✓ **PERF-01**: Recovery replay throughput performance mapping — v1.6.0
- ✓ **PERF-02**: Lease acquisition contention latency limits — v1.6.0
- ✓ **SEC-01**: Poisoned log and desynchronized replay history quarantine — v1.6.0

## Current Post-Milestone Posture: Long-Term Maintenance Epoch

Following the completion of **Milestone 36: Stewardship Engineering Era (v1.6.0)**, the platform is in a long-term maintenance posture with an absolute freeze on new feature development or active architectural expansion.

### Key accomplishments for v1.6.0:
1. **Operational Soak Validation**: Confirmed memory stability (peak RSS 47.28 MB) and WAL growth bounds.
2. **Observability Hardening**: Integrated high-fidelity causal lineage tracking and replica lag instrumentation.
3. **PostgreSQL Pathology Hardening**: Validated fencing and fail-closed lease states under WAL corruption.
4. **Complexity Budgeting Gates**: Enforced strict rules in PROJECT.md and CI checkers.

### Out of Scope

- **New Architectural Expansion** — Core primitives and substrates are frozen.
- **Recursive Orchestration** — Avoids violation of boundedness and complexity cascades.
- **Autonomous Expansion Systems** — Mitigates "operational drama" and preserves containment.
- **New Cognition Engines** — Prevents reintroduction of instability.

### Operational Failure Taxonomy

To maintain operational discipline, failures inside the ZTAN runtime are categorized into six explicit classes:
1. **Recoverable**: Auto-remedied via local retry policies or TCP connection backoffs (e.g. transient socket loss).
2. **Operator-Required**: Schema mismatches, package hash verification failures, or cryptographic key revocations requiring direct administrator action.
3. **Replay-Divergent**: Mismatching state transitions detected during log playback, indicating impurity leaks or version divergence.
4. **Degraded-Mode**: Read-only workflows allowed but state changes fenced (e.g., active cluster membership below required quorum).
5. **Quorum-Loss**: Total replication path failure resulting in write path fencing to protect data integrity.
6. **Partial-Data-Loss**: Dynamic disk/media failure requiring cold-cluster disaster recovery restoration from active shipped backups.

### Complexity Budgeting & Scope Control

To mitigate maintenance collapse and operational fragmentation, the platform enforces strict architectural budgets:
- **Zero Additional Subsystems**: The core architectural boundary is capped. No new modules, frameworks, or service adapters are permitted without explicit governance review and empirical justification under active codeowner gate approval.
- **Dependency Growth Restraint**: Dynamic external npm and system libraries are locked under codeowner approval gates and validated mechanically via dependency audit checks in CI.
- **Observability Cardinality Bounds**: Metrics collection is strictly restricted to prevent metrics server exhaustion or log volume inflation, enforced via automated CI cardinality threshold alerts.
- **Bundle & Package Size Gates**: Core package footprints are verified mechanically in CI to block regressions or dynamic require expansions.

### Bounded Pilot Program Governance

Any temporary operational pilot deployed on ZTAN must define explicit, strict boundaries to prevent it from mutating into an accidental, unmanaged production dependency:
1. **Success Criteria**: Clear, pre-defined target metrics (e.g., 99.9% uptime over a 14-day window under nominal load).
2. **Rollback Triggers**: Immediate, automated fallback conditions if the error rate exceeds 1% or if a `Replay-Divergent` event is detected.
3. **Operational Freeze Thresholds**: Freezing pilot modifications if telemetry volume spikes or if any unexpected memory leak slope is observed.
4. **Data Retention Limits**: Strict lifetime boundaries on dynamic logs and historical replay databases to prevent storage saturation.
5. **Termination & Exit Criteria**: Mandatory program sunset deadlines (e.g., 30 days maximum duration) followed by a postmortem and total cleanup.

## Context
The platform has reached **Core Architectural Stability**. The focus has shifted from technical invention to operational stewardship. Success is now defined by the measurable history of reliable operation and stable infrastructure. ZTAN is an operationally hardened orchestration prototype for the long-term execution of governed infrastructure coordination tasks.

## Constraints

- **Strategic**: NO ARCHITECTURAL EXPANSION. Only operational stewardship.
- **Safety**: Bounded replay determinism and workflow convergence under controlled operational timing variance, treated as empirical baselines rather than mathematical proofs.
- **Audit**: Bounded, tamper-evident operational lineage and long-horizon forensic auditability.
- **Tech Stack**: Frozen monorepo architecture with stable, versioned APIs.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Core Architectural Stability | Ensure long-term stability and prevent complexity drift. | ✓ Finalized |
| Operational Stewardship | Prioritize reliability, adoption, and supportability. | ✓ Active |
| Primitive Freeze | Stabilize foundational building blocks for the ecosystem. | ✓ Effective |
| Forensic Resilience Baseline | Mandate cryptographic evidence and safety invariants for recovery. | ✓ Mandatory |
| Complete Freeze on Governance Primitives | Avoid governance self-reference saturation and recursion pressure. | ✓ Enforced |
| Single Oracle Distributed Coordination | PostgreSQL acts as the existential coordination oracle for leases. | ✓ Confirmed |

---
*Last updated: 2026-05-26 after v1.6.0 milestone completion*
