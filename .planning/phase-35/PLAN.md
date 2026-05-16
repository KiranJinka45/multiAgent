# Plan: Phase 35 — Infrastructure Reliability Stewardship

## Mission
Operationalize ESM compliance, historical replay archaeology, and proactive ecosystem survivability rehearsals.

## Strategy
Execute remediation and indexing in discrete waves to ensure build stability and operational continuity.

---

## Wave 1: ESM Hazard Remediation (Current)
Target: Remediate `require()` usages and enforce strict ESM resolution.

### Tasks
- [ ] **Audit & Remediate `require()`**
    - [ ] `packages/ztan-crypto/src/node-replay.ts`
    - [ ] `packages/utils/src/control-plane.ts`
    - [ ] `packages/utils/src/idempotency.ts`
    - [ ] `packages/sandbox-runtime/src/container-cleaner.ts`
    - [ ] `packages/sandbox-runtime/src/previewRuntimePool.ts`
    - [ ] `packages/sandbox-runtime/src/processManager.ts`
    - [ ] `packages/sandbox-runtime/src/runtimeCleanup.ts`
    - [ ] `packages/resilience/src/outbound.ts`
    - [ ] `packages/sandbox-cluster/src/runtime/runtimeGuard.ts`
    - [ ] `packages/sandbox-runtime/src/runtimeGuard.ts`
    - [ ] `packages/ztan-witness/src/telemetry.ts`
    - [ ] `packages/preview-runtime/src/container-cleaner.ts`
    - [ ] `packages/events/src/eventBus.ts`
- [ ] **Enforce `verbatimModuleSyntax`**
    - [ ] Update root `tsconfig.json`.
    - [ ] Verify inheritance in package-level `tsconfig.json`.
- [ ] **Fix Package Exports**
    - [ ] Audit `package.json` in `packages/*` for ESM/CJS compatibility.
- [ ] **Verification**
    - [ ] `npm run build` (full monorepo).
    - [ ] `snyk_code_scan` for security validation.

---

## Wave 2: Historical Replay Infrastructure
Target: Implement `REPLAY_INDEX.json` and archaeology tools.

### Tasks
- [ ] Design `REPLAY_INDEX.json` schema.
- [ ] Implement index generator script.
- [ ] Implement archaeology query CLI.

---

## Wave 3: Forecasting & Rehearsals
Target: Recovery stability forecasting and shadow upgrades.

### Tasks
- [ ] Implement Timing Variance Compression metrics.
- [ ] Set up Migration Rehearsal Engine.
- [ ] Execute Node 22 rehearsal.
