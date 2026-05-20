# Runbook: Backend Partition

## 1. Trigger Condition
The ZTAN Governance Console loses connectivity to the authoritative PostgreSQL database, either due to a network partition, API Gateway failure, or DB failover.

## 2. Operator Capability Required
* Device: Tablet (Observational) or Desktop.
* Role: Any authenticated operator.

## 3. System Semantics (Frozen Constraints)
* The UI immediately animates the **Global Warning Banner**: `AUTHORITATIVE BACKEND UNREACHABLE`.
* The Console falls back into `READ-ONLY LOCAL CACHE MODE` within $\le 500\text{ms}$.
* **ALL MUTATION ENDPOINTS ARE HARD-DISABLED.**

## 4. Execution Workflow
1. Operators are strictly forbidden from attempting "offline mutations" or speculative commands.
2. Observe the stale telemetry timestamp.
3. Await external network resolution.
4. The frontend polling agent (2.0s interval + backoff) will automatically resume authoritative synchronization once parity is restored.
5. Do NOT refresh the browser forcefully; rely on the deterministic polling agent.
