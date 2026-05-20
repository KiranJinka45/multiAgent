# Roadmap: Nexus ZTAN Production Infrastructure

> [!IMPORTANT]
> **ARCHITECTURE FREEZE ACTIVE (Started 2026-05-13)**
> No new subsystems or governance layers are permitted. Focus is on maintenance, reliability, and simplification.

## Current Era: Production Stewardship
The platform has transitioned from development to long-term operational infrastructure. Success is measured by uptime, predictable recovery, and maintenance simplicity.

### Operational Cadence

| Frequency | Activity | Goal |
| :--- | :--- | :--- |
| **Weekly** | Alert Review | Prune noisy telemetry and tune thresholds. |
| **Weekly** | Dependency Review | Apply security patches and dependency updates. |
| **Weekly** | Backup Validation | Verify data integrity of recent snapshots. |
| **Monthly** | Recovery Drills | Test restoration in isolated environments. |
| **Monthly** | Dashboard Audit | Remove unused or redundant visualizations. |
| **Quarterly** | Disaster Recovery | Full-scale infrastructure restoration exercise. |
| **Quarterly** | Security Audit | Complete CVE remediation and secrets rotation. |

### Active Operational Objectives

- [ ] **Maintenance Hygiene** — Consistent dependency updates and certificate rotation.
- [ ] **Recovery Hardening** — Regular restoration drills and deterministic failover testing.
- [ ] **Simplification** — Continuous removal of unused code, configs, and metrics.
- [ ] **Evidence Collection** — Tracking actual uptime, MTTR, and maintenance burden.

## Milestone 36: Stewardship Engineering Era (v1.6.0-LTS)
The platform prioritizes longitudinal operational resilience, observability, and absolute governance boundaries over feature expansion.

### Active Phases

| Phase | Description | Status |
| :--- | :--- | :--- |
| **35-44** | **Infrastructure Reliability Stewardship** | **Complete** |
| **47** | **Wave 1 — Operational Soak & Stewardship Validation** | **Active** |
| **48** | **Wave 2 — Observability & Operational Intelligence** | **Active** |
| **49** | **Wave 3 — Governance Hardening** | **Active** |
| **50** | **Wave 4 — Real PostgreSQL Pathology Testing** | **Active** |
| **51** | **Wave 5 — Performance Envelope Mapping** | **Active** |
| **52** | **Wave 6 — Threat Modeling & Adversarial Review** | **Active** |

### Stewardship Engineering Waves Details

### Phase 47: Wave 1 — Operational Soak & Stewardship Validation
* **Goal:** Verify long-duration stability under continuous heavy transaction loads. Monitor memory consumption patterns, WAL growth/pruning, read-replica lag, autovacuum constraints, and transactional outbox behavior during prolonged database partitions.
* **Status:** Active
* **Evidence:** `STEWARDSHIP_ENGINEERING_REPORT.md` (Wave 1 section), `packages/production-validation/src/stewardship-engineering-suite.ts`.

### Phase 48: Wave 2 — Observability & Operational Intelligence
* **Goal:** Realize high-fidelity event lineage tracing and replay causality graphing. Establish telemetry for lease timelines, partition health metrics, lost-ACK retries, and fencing reject events.
* **Status:** Active
* **Evidence:** `STEWARDSHIP_ENGINEERING_REPORT.md` (Wave 2 section), observability dashboard metrics.

### Phase 49: Wave 3 — Governance Hardening
* **Goal:** Harden operational and socio-technical boundaries. Set up mandatory invariant checking, reject unauthorized state machine transitions, and constitutionalize `INVARIANT_GOVERNANCE_CHARTER.md` under automated CI verification rules.
* **Status:** Active
* **Evidence:** `STEWARDSHIP_ENGINEERING_REPORT.md` (Wave 3 section), TLA+ validation checkpoints.

### Phase 50: Wave 4 — Real PostgreSQL Pathology Testing
* **Goal:** Harden ZTAN against catastrophic database level failures. Inject WAL corruption, simulated replica rewinds, failover under autovacuum freeze, checkpoint starvation, and fsync stalling.
* **Status:** Active
* **Evidence:** `STEWARDSHIP_ENGINEERING_REPORT.md` (Wave 4 section).

### Phase 51: Wave 5 — Performance Envelope Mapping
* **Goal:** Map the absolute empirical capacity boundaries. Identify throughput thresholds for recovery replay, log compaction latency under high memory saturation, and lease acquisition contention limits.
* **Status:** Active
* **Evidence:** `STEWARDSHIP_ENGINEERING_REPORT.md` (Wave 5 section).

### Phase 52: Wave 6 — Threat Modeling & Adversarial Review
* **Goal:** Simulate and prevent sophisticated security drift or credential override attacks, covering lease desynchronization, stale replica recovery, quarantine bypass, and replay poisoning.
* **Status:** Active
* **Evidence:** `STEWARDSHIP_ENGINEERING_REPORT.md` (Wave 6 section).

---
## Historical Milestones
All previous development milestones (Phases 1-34) are complete. See [ROADMAP_ARCHIVE.md](./ROADMAP_ARCHIVE.md) for details.

*Last updated: 2026-05-16 — Stewardship Observation Cycle Active.*
