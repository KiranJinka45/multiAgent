# ZTAN OPERATIONAL RUNBOOK v1.0.0 (MOC)

This document provides exact instructions for deploying and operating the ZTAN Minimum Operational Core.

## 1. Quick Start (The "Clone and Run" Experience)

```bash
# 1. Clone the repository
git clone <repository-url>
cd multiAgent-main

# 2. Bootstrap the Single-Node Runtime
docker compose -f docker/docker-compose.yml up -d

# 3. Execute the TDC Workload (Demo)
docker compose -f docker/docker-compose.yml exec ztan-core node packages/runtime-core/dist/workloads/deployment-controller.js
```

## 2. Forensic Trace Inspection

ZTAN persists every mission event to `.ztan/trace/`.

- **Location**: `/app/.ztan/trace/[missionId].trace.json`
- **Replay**: Use `scripts/replay-trace.ts` to verify bit-perfect parity.

```bash
docker compose exec ztan-core node scripts/replay-trace.ts [missionId]
```

## 3. Failure Interpretation

If a mission fails, inspect the `metadata.failureClass` field in the trace:

| Failure Class | Interpretation | Action |
| :--- | :--- | :--- |
| `RECOVERABLE` | Transient failure (e.g., network). | Retry mission. |
| `REPLAY_DIVERGENCE` | CRITICAL: Replay logic differs from execution. | Audit code for non-determinism. |
| `POLICY_VIOLATION` | Safety gate triggered. | Review mission policy manifest. |
| `PERSISTENCE_FAILURE` | State could not be committed to disk. | Check disk quotas/permissions. |

## 4. Operational Evaluation Program (OEP)

The next 90 days are dedicated to **Operational Evaluation**. No new architectural primitives will be introduced.

### Operational Evidence Review (OER)
A mandatory review must be held every 2 weeks, focusing ONLY on the following observable behaviors:
1. **Replay Divergence**: Analyze any bit-perfect parity failures.
2. **Recovery Benchmarks**: Audit MTTR and rollback success across all chaos events.
3. **Operator Friction**: Review runbook ambiguity and setup setup failures encountered by external operators.
4. **Drift Trends**: Graph longitudinal build time, startup latency, and trace inflation.

### Failure Corpus Protocol
All operational failures must be archived in `.ztan/corpus/failure/` with the following forensic evidence:
- **`mission_id`**: The unique mission identifier.
- **`trace.json`**: The complete forensic execution trace.
- **`root_cause.md`**: Technical analysis of the failure point.
- **`replay_result`**: Did the failure reproduce deterministically?
- **`remediation`**: Technical fix and regression prevention details.

---
**Core Freeze Notice**: No architectural expansions permitted for v1.0.0. Focus is strictly on operational reliability and OTM reporting.
