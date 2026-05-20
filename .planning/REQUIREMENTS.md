# Requirements: Milestone 36 — Stewardship Engineering

**Defined:** 2026-05-19
**Core Value:** Operational stability, telemetry clarity, invariant governance, and threat resistance.

## Active Requirements: Stewardship Engineering Waves (1 to 6)

### 1. Operational Soak & Stability (SOAK)
* **SOAK-01**: The platform must maintain stable memory footprints and bound WAL storage volume during long-duration soak runs.
* **SOAK-02**: Compaction must correctly prune local histories without breaking suffix chronological lineage equivalence.
* **SOAK-03**: Quarantine false-positives must remain at zero during non-Byzantine network partition recovery drills.

### 2. Observability & Telemetry (OBS)
* **OBS-01**: The SRE dashboard must track and graph lease-generation timelines and replica replication lag in real time.
* **OBS-02**: The outbox queue must provide lost-ACK telemetry and show chronological outbox-to-DB convergence timelines.

### 3. Governance Hardening (GOV)
* **GOV-01**: The CI infrastructure must enforce invariant checking and reject unauthorized state-machine transition modifications.
* **GOV-02**: HSM Override ceremonies must strictly authenticate security bypasses with non-repudiable audit logs.

### 4. PostgreSQL Failover & Pathology (DB)
* **DB-01**: Node state must fail closed or step down instantly during database WAL corruption or replica rewind.
* **DB-02**: System must prevent zombie writes when recovering from failovers under autovacuum freeze or disk saturation.

### 5. Performance Envelope Mapping (PERF)
* **PERF-01**: Empirically map performance curves for recovery replay throughput under high transaction densities.
* **PERF-02**: Define the latency boundaries of lease acquisition contention.

### 6. Threat Modeling & Security (SEC)
* **SEC-01**: System must block and quarantine any attempt to poison logs or inject stale, desynchronized replay histories.

### Traceability Mapping

| Requirement | Phase | Status |
|-------------|-------|--------|
| SOAK-01 | Phase 47 (Wave 1) | Active |
| SOAK-02 | Phase 47 (Wave 1) | Active |
| SOAK-03 | Phase 47 (Wave 1) | Active |
| OBS-01  | Phase 48 (Wave 2) | Active |
| OBS-02  | Phase 48 (Wave 2) | Active |
| GOV-01  | Phase 49 (Wave 3) | Active |
| GOV-02  | Phase 49 (Wave 3) | Active |
| DB-01   | Phase 50 (Wave 4) | Active |
| DB-02   | Phase 50 (Wave 4) | Active |
| PERF-01 | Phase 51 (Wave 5) | Active |
| PERF-02 | Phase 51 (Wave 5) | Active |
| SEC-01  | Phase 52 (Wave 6) | Active |

---
*Last updated: 2026-05-19 — Stewardship Requirements Active*
