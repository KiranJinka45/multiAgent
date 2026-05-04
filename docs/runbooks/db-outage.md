# DB Outage Runbook

**Severity:** Critical
**Component:** Database Layer
**Symptom:** Gateway returns `503 Database maintenance / Degraded mode` for writes; high latency on DB operations; worker queues pausing unexpectedly.

## 1. Verify Global Circuit Breaker State
Check if the Control Plane has globally tripped the DB circuit breaker.

```bash
# Connect to Redis
redis-cli

# Check the DB circuit flag
> GET circuit:db:global
```
**Expected Output:** If the DB is down, it should return `"OPEN"`.

## 2. Check Database Connectivity
Run the diagnostic check from the API node to confirm DB unreachable.
```bash
# In the api/gateway container
curl http://localhost:8080/health/db
```

## 3. Immediate Actions (If DB is truly dead)
The system is already operating in `DEGRADED` mode (reads permitted, writes rejected, workers deferred).
If this is a regional DB failure and you have a Multi-Region setup:
1. **Force Cross-Region Failover:**
   Ensure the current region stops receiving external writes. Update your load balancer or DNS to point to the active region.
   Gateway will automatically proxy `POST/PUT/DELETE` requests with an `Idempotency-Key` to the `FALLBACK_REGION_URL`.

2. **Wait for Auto-Recovery:**
   The `protectedUpdateMission` and gateway middleware will automatically close the circuit (`circuit:db:global` -> deleted) once the DB responds successfully to heartbeat probes.

## 4. Remediation and Post-Mortem
- If the DB ran out of connections, increase the Prisma connection pool.
- Check CPU/Mem usage on the database host.
- Review `governance:error_budget` burn rate to ensure deployments remained blocked during the incident.
