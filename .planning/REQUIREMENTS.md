# Requirements: Nexus ZTAN

**Defined:** 2026-06-08
**Core Value:** Focus on platform stabilization, warning-debt reduction, independent bare-metal host validation, drift detection, and resilience drills.

## v1 Requirements

### Technical Debt Reduction (OPS-MAINT-DEBT)

- [x] **OPS-MAINT-DEBT-01**: Resolve implicit `any` types in core engine modules.
- [x] **OPS-MAINT-DEBT-02**: Remove all unused local variables and dead parameters flagged by TS/ESLint.

### Bare-Metal Portability (OPS-MAINT-PORT)

- [x] **OPS-MAINT-PORT-01**: Validate reproducibility verification kit on a true physical bare-metal host.

### Drift Prevention (OPS-MAINT-DRIFT)

- [x] **OPS-MAINT-DRIFT-01**: Implement an automated test runner script to periodically run compatibility and reproducibility checks.

### Backup Integrity (OPS-MAINT-BACKUP)

- [ ] **OPS-MAINT-BACKUP-01**: Verify graceful recovery pipeline failures and clear diagnostics under corrupted DB/queue backups.

### Sentinel Resilience (OPS-MAINT-SENTINEL)

- [ ] **OPS-MAINT-SENTINEL-01**: Verify lease-fencing state recovery and step-down behavior under active Redis Sentinel quorum-loss simulations.

## v2 Requirements

### Advanced Multi-Cloud Portability

- **PORT-01**: Non-x86 hardware rooted trust attestation verification.

## Out of Scope

| Feature | Reason |
|---------|--------|
| New governance layers | Banned under strict Stewardship & Maintenance Era freeze. |
| New orchestration engines | Banned under strict Stewardship & Maintenance Era freeze. |
| New consensus primitives | Banned under strict Stewardship & Maintenance Era freeze. |
| New AI subsystems | Banned under strict Stewardship & Maintenance Era freeze. |
| New cryptographic protocols | Banned under strict Stewardship & Maintenance Era freeze. |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| OPS-MAINT-DEBT-01 | Phase 8 | Complete |
| OPS-MAINT-DEBT-02 | Phase 8 | Complete |
| OPS-MAINT-PORT-01 | Phase 9 | Complete |
| OPS-MAINT-DRIFT-01 | Phase 10 | Complete |
| OPS-MAINT-BACKUP-01 | Phase 11 | Pending |
| OPS-MAINT-SENTINEL-01 | Phase 12 | Pending |

**Coverage:**
- v1 requirements: 6 total
- Mapped to phases: 6
- Unmapped: 0 ✓

---
*Requirements defined: 2026-06-08*
*Last updated: 2026-06-08 after roadmap creation*
