# RELIABILITY CAMPAIGN PLAN

## Phase 16: 30-Day Continuous Reliability Campaign

**Version:** 1.0  
**Created:** 2026-06-10  
**Requirement:** OPS-MAINT-DRIFT-LONG-01  
**Status:** Planning  

---

## 1. Objective

Run a 30-day longitudinal reliability campaign that produces objective, measurable evidence of system stability, drift detection accuracy, backup integrity, and recovery capability. This plan defines the measurement framework, SLOs, daily/weekly procedures, and success criteria that determine whether Phase 16 passes or fails.

Without this framework, 30 days of logs produce data but no verdict.

---

## 2. Campaign Timeline

| Period | Duration | Activities |
|--------|----------|------------|
| Day 0 | 1 day | Baseline capture, campaign initialization |
| Days 1–7 | Week 1 | Daily drift checks, daily backup verification, first recovery drill |
| Days 8–14 | Week 2 | Daily drift checks, daily backup verification, second recovery drill |
| Days 15–21 | Week 3 | Daily drift checks, daily backup verification, third recovery drill |
| Days 22–28 | Week 4 | Daily drift checks, daily backup verification, fourth recovery drill |
| Days 29–30 | 2 days | Campaign close, final metrics aggregation, verdict determination |

---

## 3. Daily Procedures

### 3.1 Daily Drift Check

**Script:** `npx tsx scripts/periodic-drift-runner.ts`  
**Frequency:** Once per day  
**What it measures:**
- Lockfile hash stability (pnpm-lock.yaml)
- TypeScript compilation output determinism
- Test suite result consistency
- Build artifact hash stability

**Pass criteria:** Zero drift alerts across consecutive runs.  
**Failure threshold:** Failing to meet SLO-01 (i.e., <95% pass rate or >2 drift alerts over the 30-day campaign).

### 3.2 Daily Backup Verification

**Script:** `npx tsx scripts/backup-integrity-validator.ts`  
**Frequency:** Once per day  
**What it measures:**
- Backup file generation succeeds
- Backup file integrity (checksum verification)
- Backup file size within expected bounds

**Pass criteria:** 100% backup generation success rate target, with ≥99% minimum passing (allowing max 1 failure in a 30-day campaign).  
**Failure threshold:** >1 backup failure or checksum mismatch over the campaign period, or any failure without a corresponding completed root-cause analysis (RCA).

---

## 4. Weekly Procedures

### 4.1 Weekly Recovery Drill

**Script:** `npx tsx scripts/recovery-drill.ts`  
**Frequency:** Once per week (Days 7, 14, 21, 28)  
**What it measures:**
- Time-to-recovery (TTR) from simulated state destruction
- Recovery completeness (all services restored and healthy)
- Data integrity post-recovery

**Pass criteria:** All 4 weekly drills succeed with TTR < 10 minutes.  
**Failure threshold:** Any drill fails, or TTR > 15 minutes.

---

## 5. MTTR Measurement Method

**Definition:** Mean Time To Recovery (MTTR) = average TTR across all recovery drills executed during the campaign.

**Measurement procedure:**
1. Record `t_start` = timestamp when state destruction begins
2. Execute recovery procedure
3. Record `t_end` = timestamp when all health checks pass
4. TTR = `t_end` - `t_start`
5. MTTR = mean(TTR₁, TTR₂, TTR₃, TTR₄)

**Target:** MTTR < 5 minutes  
**Acceptable:** MTTR < 10 minutes  
**Failing:** MTTR ≥ 10 minutes

**Statistical Limitation Note:** Since MTTR is calculated from a small sample size (n = 4 weekly recovery drills) under simulated fault injection, it measures Recovery Drill Completion Time. It is used as an operational indicator of basic recovery capability and must not be over-interpreted as a statistically robust measure of steady-state MTTR under high-volume real-world failure conditions.

---

## 6. Failure Classification Scheme

Each observed failure during the campaign must be classified:

| Category | Code | Description | Examples |
|----------|------|-------------|----------|
| File Lock | `FL` | OS-level file locking prevents cleanup | EPERM, EBUSY, ENOTEMPTY |
| Dependency Drift | `DD` | Package resolution or lockfile mismatch | pnpm install failure, version conflict |
| Ecosystem Drift | `ED` | Node/TS/Python version incompatibility | Deprecated API usage, engine mismatch |
| Environment Mismatch | `EM` | Missing tool or capability | PATH not set, binary missing |
| Timing Race | `TR` | Startup order or async timeout | Service not ready, port conflict |
| Infrastructure | `IF` | Docker/network/container failure | Docker daemon not running, network down |
| Stale Leakage | `SL` | Residual artifacts causing failures | Shadow imports, cached modules |
| Unknown | `UN` | Unclassified failure | Requires investigation |

### 6.1 False Positive Classification and Investigation

A drift alert is classified as a **False Positive** if and only if:
1. The drift alert was triggered.
2. A formal investigation was conducted and documented.
3. The investigation conclusively proved that no actual repository, dependency, build, configuration, or environment drift occurred (e.g., the alert was caused by a bug in the drift-detection script itself, a transient OS filesystem locking issue during hash generation, or telemetry issues).
4. Written classification evidence is filed in `campaign-evidence/drift-investigations/` detailing:
   - Alert timestamp
   - Triggering condition
   - Root cause analysis proving no real drift
   - Validator sign-off

Any drift alert without this written classification evidence is automatically classified as a **True Positive** (actual drift).

---

## 7. SLO Definitions

| SLO ID | Metric | Target | Minimum Passing | Measurement |
|--------|--------|--------|-----------------|-------------|
| SLO-01 | Drift check pass rate | ≥ 95% | ≥ 95% (at most 2 drift alerts over 30 days) | Daily drift runner exit code |
| SLO-02 | Backup verification pass rate | 100% | ≥ 96.6% (allows max 1 failure in 30 days, with mandatory RCA) | Daily backup validator exit code |
| SLO-03 | Recovery drill success rate | 100% | 100% (4/4 drills) | Weekly drill exit code |
| SLO-04 | MTTR | < 5 minutes | < 10 minutes (n=4 confidence limitation) | Average of 4 recovery drills |
| SLO-05 | False positive rate | 0% | < 10% (under Section 6.1 classification procedure) | Drift alerts classified as false positives ÷ total alerts |
| SLO-06 | Compilation stability | 100% | 100% (Zero new TypeScript errors introduced) | Compiler exit code |

---

## 8. Success Criteria for Closing Phase 16

Phase 16 may be marked **Complete** if and only if ALL of the following are met:

1. **Campaign Duration:** ≥ 30 calendar days of logged activity
2. **SLO-01:** Drift check pass rate ≥ 95% (at most 2 drift alerts)
3. **SLO-02:** Backup verification pass rate ≥ 96.6% (at most 1 failure in 30 days) with completed RCA
4. **SLO-03:** All 4 weekly recovery drills succeed
5. **SLO-04:** MTTR < 10 minutes (n=4 confidence limitation)
6. **SLO-05:** False positive rate < 10% (under Section 6.1 procedure)
7. **SLO-06:** Zero new compilation errors

Phase 16 may be marked **Complete with Qualifications** if:
- ≥ 28 days completed
- SLO-01 ≥ 90% (max 3 drift alerts)
- SLO-03 ≥ 3/4 drills succeed
- SLO-02 ≥ 96% (allows at most 1 failure in a 28-day campaign, with RCA)
- All other SLOs met

Phase 16 **Fails** if:
- < 28 days completed
- SLO-03 < 3/4 drills
- MTTR ≥ 15 minutes
- SLO-02 < 96% (more than 1 backup failure in the campaign period)

---

## 9. Evidence Artifacts

The campaign will produce the following artifacts:

| Artifact | Format | Location |
|----------|--------|----------|
| Daily drift logs | JSON | `campaign-evidence/drift/day-{N}.json` |
| Daily backup logs | JSON | `campaign-evidence/backup/day-{N}.json` |
| Weekly recovery logs | JSON | `campaign-evidence/recovery/week-{N}.json` |
| MTTR summary | JSON | `campaign-evidence/mttr-summary.json` |
| Failure log | Markdown | `campaign-evidence/failure-log.md` |
| Campaign summary | Markdown | `RELIABILITY_CAMPAIGN_REPORT.md` |

---

## 10. Campaign Initialization Checklist

Before Day 0 begins:

- [ ] All services build successfully (`pnpm run build`)
- [ ] All smoke tests pass (`node scripts/run-smoke-tests.js`)
- [ ] Drift runner baseline established
- [ ] Backup validator operational
- [ ] Recovery drill script tested
- [ ] `campaign-evidence/` directory created
- [ ] This plan reviewed and approved

---

## 11. Campaign Termination Criteria

The campaign terminates early (without failure) only if:
- A critical infrastructure change invalidates the baseline (requires re-baselining)
- The project enters a new milestone that supersedes v1.12.0

Otherwise, the campaign runs for the full 30 days.

---

*Plan created: 2026-06-10*  
*Awaiting approval before campaign initiation*
