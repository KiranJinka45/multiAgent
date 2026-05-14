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

## Milestone 35: Infrastructure Reliability Stewardship
The platform prioritizes longitudinal operational resilience and ecosystem survivability.

### Active Phases

| Phase | Description | Status |
| :--- | :--- | :--- |
| **35** | **Infrastructure Reliability Stewardship** | **Complete** |
| **40** | **External Production Validation** | **Complete** |
| **41** | **Real-World Operational Exposure** | **In Progress** |

### Phase 41: Real-World Operational Exposure
**Goal:** Validate the platform against reality through external operator trials and real deployment telemetry.
**Requirements**: Recruitment of 3-10 independent operators, real deployment validation across environments.
**Depends on:** Phase 40
**Plans:** 0 plans

Plans:
- [ ] TBD (run /gsd-plan-phase 41 to break down)

---
## Historical Milestones
All previous development milestones (Phases 1-34) are complete. See [ROADMAP_ARCHIVE.md](./ROADMAP_ARCHIVE.md) for details.

*Last updated: 2026-05-13 — Phase 35 Initiated.*
