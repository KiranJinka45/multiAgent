# Region Failover Runbook

**Severity:** Critical
**Component:** Gateway / Global Proxy
**Symptom:** Regional outage, traffic routing to fallback region.

## 1. Verify Active Failover
Check if requests are being proxied to the fallback region:
```bash
grep "Proxying to fallback region" /var/log/multiagent/gateway.log
```

## 2. Check Idempotency Rejections
During failover, all `POST/PUT/DELETE` requests MUST have an `Idempotency-Key` header. Requests lacking this are rejected with `400 Bad Request`.
If users report write failures during an incident:
- Advise them to include the `Idempotency-Key` header in their API calls.
- The Gateway drops unsafe writes to prevent Split-Brain Double Execution.

## 3. Monitor Fallback Region Capacity
The fallback region will absorb 2x its normal traffic. Monitor its Control Plane mode:
```bash
redis-cli -h <fallback-redis>
> GET system:control_plane:mode:fallback_region_id
```
If the fallback region enters `DEGRADED` or `PROTECT`, it means it cannot handle the combined load. You must provision more capacity immediately.

## 4. Region Restoration
When the primary region recovers:
1. Ensure the DB is fully synced (read replicas caught up).
2. The global load balancer should automatically route traffic back.
3. The Gateway's `system:control_plane:mode:${REGION_ID}` will stabilize back to `NORMAL`.
