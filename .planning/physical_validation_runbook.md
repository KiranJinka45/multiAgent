# ZTAN v1.6.0 — Physical Browser Validation & Operational Observation Runbook

Version: v1.6.0-LTS  
Mode: Manual Human-Observed Validation  
Goal: Verify operational honesty, replay continuity, and fail-closed behavior under real local browser/runtime conditions.

---

## ────────────────────────────────────────────
## SECTION 1 — ENVIRONMENT BASELINE
## ────────────────────────────────────────────

1. **Boot Infrastructure**  
   Execute:
   * `pnpm run dev`
   * `docker ps`
   * `docker stats`

2. **Confirm Runtime Stability**  
   Verify:
   * No restart loops
   * No unbounded reconnect storms
   * No `MaxListenersExceeded` warnings
   * No Prisma connection exhaustion
   * No websocket flood collapse

3. **Open Browser**  
   Open:
   * Stewardship Console (`http://localhost:4210`)
   * Replay Explorer
   * DevTools:
     * Console
     * Performance
     * Application → IndexedDB
     * Memory
     * Network
     * Rendering FPS meter

4. **Establish Initial Baselines**  
   Record:
   * Heap memory
   * RSS
   * Event loop lag
   * IndexedDB size
   * Websocket count
   * Replay chronology confidence
   * Visual replay hash

*Expected Outcome:* Stable UI, no lockups, 60 FPS nominal, clean websocket initialization, no uncontrolled memory growth.

---

## ────────────────────────────────────────────
## SECTION 2 — NORMAL INGESTION VALIDATION
## ────────────────────────────────────────────

1. **Run Standard Event Flood**  
   Execute:
   * `npx tsx scripts/generate-50k-events.ts`

2. **Observe:**
   * Timeline rendering smoothness
   * IndexedDB persistence
   * Worker responsiveness
   * UI interaction responsiveness
   * Memory slope behavior

3. **Verify:**
   * No frozen frames >15ms
   * No browser tab crash
   * No worker deadlock
   * No telemetry disconnect storm
   * Stable chronology confidence

*Expected Outcome:* Bounded memory growth, smooth zoom/pan, deterministic viewport hash, no silent event loss.

---

## ────────────────────────────────────────────
## SECTION 3 — BYZANTINE DRILLS
## ────────────────────────────────────────────

### A. CLOCK SKEW DRILL
Execute:
* `npx tsx scripts/generate-50k-events.ts --byzantine-skew`

Observe:
* Amber/orange chronology degradation
* Confidence reduction
* Explicit skew indicators

Verify:
* **NO** silent timestamp normalization
* **NO** hidden repair
* **NO** chronology rewriting

*Expected Outcome:* Entropy exposed honestly.

---

### B. HASH FRACTURE DRILL
Execute:
* `npx tsx scripts/generate-50k-events.ts --byzantine-hash`

Observe:
* Red quarantined segments
* `UNTRUSTED` verdict tags

Verify:
* Broken lineage isolated
* No hash recomputation
* No auto-healing

*Expected Outcome:* Corrupt lineage preserved honestly as evidence.

---

### C. CHRONOLOGY GAP DRILL
Execute:
* `npx tsx scripts/generate-50k-events.ts --byzantine-gaps`

Observe:
* Explicit gray voids
* `TELEMETRY GAP` banners

Verify:
* Missing events remain missing
* No interpolation
* No continuity fabrication

*Expected Outcome:* Honest chronology discontinuity.

---

### D. COLLISION DRILL
Execute:
* `npx tsx scripts/generate-50k-events.ts --byzantine-collision`

Observe:
* Collision rejection warnings

Verify:
* Original lineage preserved
* Duplicate sequences rejected
* No overwrite behavior

*Expected Outcome:* Deterministic lineage preservation.

---

## ────────────────────────────────────────────
## SECTION 4 — DATABASE FAILURE VALIDATION
## ────────────────────────────────────────────

1. **Kill PostgreSQL Container**  
   Execute:
   * `docker stop <postgres-container>`

2. **Observe:**
   * Lease fencing
   * Reconnect backoff
   * Degraded-mode transitions
   * UI telemetry behavior

3. **Verify:**
   * No uncontrolled crash loops
   * No memory explosion
   * No fake success states
   * No fabricated continuity

4. **Restore PostgreSQL**  
   Execute:
   * `docker start <postgres-container>`

5. **Observe Recovery**  
   Verify:
   * WAL replay continuity
   * Outbox reconciliation
   * Recovery latency
   * Socket restoration

*Expected Outcome:* Fail-closed degradation, controlled recovery, and preserved replay integrity.

---

## ────────────────────────────────────────────
## SECTION 5 — REDIS FAILURE VALIDATION
## ────────────────────────────────────────────

1. **Kill Redis**  
   Execute:
   * `docker stop <redis-container>`

2. **Observe:**
   * Queue degradation
   * Reconnect jitter behavior
   * Retry backoff
   * Gateway telemetry behavior

3. **Verify:**
   * No reconnect storms
   * No runaway socket growth
   * No process thrashing

4. **Restore Redis**  
   Execute:
   * `docker start <redis-container>`

*Expected Outcome:* Graceful degradation and controlled recovery.

---

## ────────────────────────────────────────────
## SECTION 6 — REPLAY ARCHAEOLOGY VALIDATION
## ────────────────────────────────────────────

1. **Export Capsule**  
   Use:
   * Stewardship Console export tools

2. **Tamper Capsule**  
   Modify:
   * `sequenceId`
   * `prevHash`
   * chronology order

3. **Re-import Capsule**

4. **Observe:**
   * Confidence degradation
   * Quarantine indicators
   * Verification verdicts

5. **Verify:**
   * Exact fracture localization
   * No silent repair
   * No replay fabrication

*Expected Outcome:* Precise forensic isolation.

---

## ────────────────────────────────────────────
## SECTION 7 — PROOF-OF-ATTENTION VALIDATION
## ────────────────────────────────────────────

1. **Trigger Poison Drill**

2. **Attempt Blind Approval**

3. **Observe:**
   * Key degradation
   * Quorum invalidation
   * Friction warnings

4. **Restore Via Alignment Ceremony**

5. **Verify:**
   * Degraded keys removed from active council
   * Manual rehabilitation required
   * No automatic trust restoration

*Expected Outcome:* Governance friction preserved.

---

## ────────────────────────────────────────────
## SECTION 8 — LONG SESSION OBSERVATION
## ────────────────────────────────────────────

Leave system operational:
* 6h minimum
* preferably 24h+

Monitor periodically:
* Heap growth
* IndexedDB growth
* Event loop lag
* Socket counts
* Replay latency
* WAL growth
* FPS stability

Verify:
* No progressive degradation slope
* No replay drift
* No uncontrolled queue buildup
* No worker starvation

*Expected Outcome:* Operational boundedness.

---

## ────────────────────────────────────────────
## SECTION 9 — FINAL VERIFICATION QUESTIONS
## ────────────────────────────────────────────

Ask:
1. Did the system ever fabricate continuity?
2. Did any chronology gaps become hidden?
3. Did any corrupt lineage silently self-heal?
4. Did degraded states remain explicit?
5. Did operator friction remain meaningful?
6. Did memory remain bounded?
7. Did replay parity remain deterministic?
8. Did recovery preserve evidence honestly?

### FINAL SUCCESS CONDITION:
The platform succeeds **ONLY** if:
* entropy remains visible,
* uncertainty remains preserved,
* replay legitimacy survives,
* and the system refuses to invent certainty during failure.
