# Nexus ZTAN — Production Infrastructure
> [!IMPORTANT]
> This platform is in **Architecture Freeze**. No new subsystems, governance layers, or frameworks are permitted. Focus is exclusively on maintenance, security, and operational reliability.

## Overview
> **"A replayable infrastructure reliability platform focused on deterministic recovery, replay durability, operational clarity, and sustainable long-term maintenance."**

Nexus ZTAN is an auditable production platform designed for long-term operational stability. It provides a tenant-partitioned operational coordination platform with cryptographic lineage validation for secure task execution and reliable system operation.

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

## Current Milestone: Milestone 36 — Stewardship Engineering Era (v1.6.0-LTS)

**Goal:** Establish and validate longitudinal production durability, telemetry fidelity, invariant correctness, and threat resilience of the frozen coordination protocol.

**Target Waves:**
* **Wave 1 — Operational Soak & Stewardship Validation**: Long-duration stability, memory patterns, WAL growth, replica lag, autovacuum containment, and compaction correctness.
* **Wave 2 — Observability & Operational Intelligence**: Forensic-grade event lineage tracing, replay causality graphs, lease timelines, and partition dashboards.
* **Wave 3 — Governance Hardening**: Invariant CI validation (TLA+ checkpoints), structural freeze via `CODEOWNERS`, and institutional consensus bypass controls.
* **Wave 4 — Real PostgreSQL Pathology Testing**: Resiliency under WAL corruption, replica rewind, autovacuum freeze, checkpoint starvation, and disk saturation.
* **Wave 5 — Performance Envelope Mapping**: Mapping empirical curves for replay throughput, recovery latencies, and fencing contention.
* **Wave 6 — Threat Modeling & Adversarial Review**: Simulating HSM override abuse, replay poisoning, stale replica recovery, and epoch desynchronization.

### Status: Transitioning to Phase 50 (Active)

We have successfully completed **Phase 49: Longitudinal Evidence Science**, which established a mathematically disciplined, statistically sound, and deterministic verification framework. Key accomplishments include `--canonical` run alignment, three-tier statistical drift envelopes ($\mu \pm 3\sigma$), noise-floor suppressed cross-run reproducibility analysis ($CV = 5.25\%$), and rate-limited Express dashboard integration.

We are now initiating **Phase 50: Advanced Pathology Operations (Wave 4 — Real PostgreSQL Pathology Testing)**. This next phase transitions the hardened evidence platform into active failure stress scenarios (WAL corruption, replica rewind, autovacuum freeze, fsync stalls, and disk/pool saturation) to certify absolute survivability under disastrous database events.

The platform operates on its current bounded architectural baseline. All future modifications are governed by the [INVARIANT_GOVERNANCE_CHARTER.md](../INVARIANT_GOVERNANCE_CHARTER.md) constraints.


### Out of Scope

- **New Architectural Expansion** — Core primitives and substrates are frozen.
- **Recursive Orchestration** — Avoids violation of boundedness and complexity cascades.
- **Autonomous Expansion Systems** — Mitigates "operational drama" and preserves containment.
- **New Cognition Engines** — Prevents reintroduction of instability.

## Context
The platform has reached **Core Architectural Stability**. The focus has shifted from technical invention to operational stewardship. Success is now defined by the measurable history of reliable operation and stable infrastructure. ZTAN is a stable production platform for the long-term execution of governed infrastructure coordination tasks.

## Constraints

- **Strategic**: NO ARCHITECTURAL EXPANSION. Only operational stewardship.
- **Safety**: High-confidence replay determinism and workflow convergence.
- **Audit**: High-confidence forensic non-repudiability across decadal timelines.
- **Tech Stack**: Frozen monorepo architecture with stable, versioned APIs.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Core Architectural Stability | Ensure long-term stability and prevent complexity drift. | ✓ Finalized |
| Operational Stewardship | Prioritize reliability, adoption, and supportability. | ✓ Active |
| Primitive Freeze | Stabilize foundational building blocks for the ecosystem. | ✓ Effective |
| Forensic Resilience Baseline | Mandate cryptographic evidence and safety invariants for recovery. | ✓ Mandatory |

---
*Last updated: 2026-05-16 — Long-Term Reliability Stewardship Active*
