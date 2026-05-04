# Redis Failure Runbook

**Severity:** High
**Component:** Redis / In-Memory Store
**Symptom:** Logs show `[ControlPlane] Redis unreachable, falling back to local PROTECT mode`. Control plane modes freeze. Rate limiting fails open/closed.

## 1. Confirm Local Fallback Mode
When Redis fails, the system safely falls back to local memory isolation.
Check the worker and gateway logs:
```bash
grep "Redis unreachable" /var/log/multiagent/*.log
```
**Expected Behavior during Outage:**
- Workers will locally set `currentRetryRate = Infinity` to drop failing jobs rather than burn nonexistent retry budgets.
- Gateway will operate in `PROTECT` mode, shedding non-critical traffic.

## 2. Diagnose Redis Connection
From the application host, check connectivity:
```bash
ping <redis-host>
telnet <redis-host> 6379
```

## 3. Resolving Split-Brain or OOM
If Redis is running but unreachable, it might be OOM (Out of Memory) or evicting keys:
```bash
redis-cli info memory
# Look for used_memory and maxmemory limits
```
If OOM:
- Flush non-critical keys or restart the Redis instance. The control plane will automatically rebuild state (`governance:total_active_jobs`, `system:retry:rate`) via heartbeats within 5-10 seconds of reconnection.

## 4. Draining Stuck Jobs
Because BullMQ relies on Redis, jobs may remain stuck in `active` state if the connection drops mid-processing. Once Redis is restored, BullMQ's `lockDuration` (default 5 min) will expire and jobs will transition back to `wait` or `failed`.
No manual intervention is required for job recovery.
