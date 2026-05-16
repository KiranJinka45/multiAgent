# 🏛️ Nexus ZTAN — Operator Training Playbook

This playbook is designed for independent operators tasked with maintaining the operational stability, recoverability, and simplicity of the Nexus ZTAN platform.

## 🏁 Phase 0: Environment Setup
**Goal**: Complete environment setup using only this documentation.

1.  **Prerequisites**:
    *   Node.js v20.x or v22.x (LTS)
    *   Docker & Docker Compose
    *   pnpm (v8+)
2.  **Clean-Room Setup**:
    *   `git clone <repository-url>`
    *   `cd multiAgent-main`
    *   `pnpm install`
3.  **Bootstrapping**:
    *   Run: `npx tsx scripts/one-command-recovery.ts`
    *   *Verification*: All health checks must pass (API, Workers, Redis, DB).

## 🛡️ Phase 1: Recovery Determinism Drill
**Goal**: Verify the platform can be restored from zero knowledge.

1.  **Simulated Total Loss**:
    *   `docker-compose down -v` (Destroy all data volumes)
    *   `rm -rf packages/utils/REPLAY_INDEX.json`
2.  **Restoration**:
    *   Execute One-Command Recovery again.
3.  **Success Condition**:
    *   Platform returns to nominal state within 5 minutes.
    *   Zero manual database intervention required.

## 🕵️ Phase 2: Operational History Audit
**Goal**: Navigate the historical record without guidance.

1.  **Access SRE Dashboard**:
    *   Navigate to the Analytics Dashboard.
2.  **Verify Stability**:
    *   Identify the most recent "Stability Index" score.
    *   Review the "Operational Audit Log" for the last 30 days.
3.  **Verify History**:
    *   Locate a specific recovery event.
    *   Identify why it was certified or why it failed.

## 📉 Phase 3: Operational Simplicity Review
**Goal**: Assess cognitive load and workflow clarity.

1.  **Metric Visibility**:
    *   Does the dashboard surface high-signal events immediately?
    *   Is the "System Health Status" clear without external explanation?
2.  **Maintenance Burden**:
    *   Identify "Manual Intervention Frequency" indicators.
    *   Evaluate if the "Operational Overhead Metrics" align with your experience.

## 🛠️ Phase 4: Maintenance Rehearsal (Real Breakage)
**Goal**: Handle a controlled but unscripted infrastructure interruption.

1.  **Interruption**: (Ask an internal facilitator to kill a specific service/container).
2.  **Response**:
    *   Use the SRE dashboard to identify the failure.
    *   Follow the [RUNBOOK.md](file:///c:/multiagentic_project/multiAgent-main/RUNBOOK.md) to restore service.
3.  **Success Condition**:
    *   MTTR < 10 minutes.
    *   Reasoning for the recovery path is captured in the system audit log.

---
**Reporting Friction**: If you encounter any confusion, hesitation, or documentation gaps, report it immediately using the CLI:
```bash
ztanctl friction "I was confused by step X because of Y"
```
This ensures your feedback is captured in the high-signal operational audit log for maintenance stewardship.
