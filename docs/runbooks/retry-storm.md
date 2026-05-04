# Retry Storm Runbook

**Severity:** Medium/High
**Component:** Worker Layer / BullMQ
**Symptom:** Gateway reports `[Gateway] Fast Path Guard: Rejecting request (Retry Storm)`. Specific tenants experiencing 100% drop rates.

## 1. Identify Runaway Tenants
The system drops jobs instantly when `system:retry:rate:${tenantId}:${tier}` exceeds the tier budget (10/sec Free, 50/sec Pro).
Check logs to find the tenant:
```bash
grep "Scoped Retry budget exceeded" /var/log/multiagent/*.log
```

## 2. Evaluate the Root Cause
A retry storm occurs when a worker repeatedly fails a job, requeues it, and fails again instantly (often due to bad code, infinite loops in sandbox, or third-party API outage).
- If the error is `DB unavailable`, the system *does not burn the budget*.
- If the error is a user-code exception, the budget is burned.

## 3. Manual Intervention (If needed)
If the system is blocking a tenant incorrectly or you need to reset the budget:
```bash
redis-cli
# Reset retry budget for the tenant
> DEL system:retry:rate:user_123:pro
```

## 4. Pause the Queue
If an entire queue is poisoned and the Control Plane hasn't automatically paused it (e.g., if error budget is still under threshold), manually override the mode:
```bash
> SET system:control_plane:mode:local '"PROTECT"'
```
This forces the free tier queue to pause. To pause all queues, set it to `EMERGENCY`.
