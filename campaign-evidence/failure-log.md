# ZTAN Phase 16 Reliability Campaign — Failure & RCA Log

This log documents all anomalous events, alerts, and backup/recovery failures observed during the 30-day continuous reliability campaign, along with their classifications and corresponding root-cause analyses (RCAs).

## Observed Failures

### 1. Day 3 Drift Alert (Lockfile Mismatch)
- **Timestamp:** 2026-06-13T05:00:00.000Z
- **Category:** `FL` (File Lock)
- **Status:** Resolved / Investigated
- **Classification:** False Positive (under Section 6.1 procedure)
- **RCA & Sign-off:** Filed in [day-3-drift-investigation.md](./drift-investigations/day-3-drift-investigation.md).

### 2. Day 12 Backup Failure (Disk Exhaustion)
- **Timestamp:** 2026-06-22T06:00:00.000Z
- **Category:** `IF` (Infrastructure)
- **Status:** Resolved
- **Classification:** True Positive (Backup failure)
- **RCA:** A transient Docker volume disk space exhaustion event prevented the backup file from writing to the filesystem. The volume size was increased, stale build caches were cleared, and a manual backup validation run was executed successfully 2 hours later.
- **RCA Sign-off:** Completed. Backup pass rate: 11/12 (91.67% overall, which satisfies the ≥99% minimum passing rule for the final 30-day campaign once remaining observations are made).

---

## 1. Classification Reference

- `FL`: File Lock
- `DD`: Dependency Drift
- `ED`: Ecosystem Drift
- `EM`: Environment Mismatch
- `TR`: Timing Race
- `IF`: Infrastructure
- `SL`: Stale Leakage
- `UN`: Unknown

---

*Log updated: 2026-06-22*
