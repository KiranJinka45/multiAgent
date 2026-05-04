# 🛠️ Incident Response Playbook: MultiAgent Mesh

This document outlines the triage and mitigation steps for the "Final Risks" identified during the Production Hardening sprint.

## 🚨 P0: Critical System Failure
**Indicator**: Gateway Error Rate > 10% or P99 Latency > 2s.

### 1. Immediate Mitigation: Rollback (5 min)
If a recent deployment occurred:
```bash
./scripts/rollback.sh
```
This forces all Istio traffic to the `stable` version immediately.

### 2. Triage: Golden Signals Search
Open the **Grafana Mesh Dashboard** and check:
- **Circuit Breaker State**: Are breakers `OPEN` for a specific service?
- **Redis Health**: Is `redis_aof_delayed_fsync` high? (Indicates disk IO pressure).
- **Postgres Connections**: Are we hitting `max_connections`?

---

## 🌩️ Scenario A: Memory Leak detected
**Symptom**: Pod restarts with `OOMKilled` or slow sawtooth memory growth.
- **Action**: Check `gateway_runtime_active_total` metrics.
- **Temporary Fix**: Increase replica count in `hpa.yaml` or manually:
  ```bash
  kubectl scale deployment gateway --replicas=4
  ```

---

## ⛈️ Scenario B: Retry Storm / Cascading Failure
**Symptom**: Downstream service is healthy but Gateway is timing out due to volume.
- **Action**: Check `observability_resilience_circuit_breaker_state`.
- **Tuning**: Increase the `errorThreshold` in `@packages/resilience` config to trip the breaker earlier until the system stabilizes.

---

## 🌧️ Scenario C: Database Performance Degraded
**Symptom**: High latency on all stateful routes.
- **Action**: 
  - Check the `staging-values.yaml` to ensure resource limits aren't being throttled.
  - Verify if the `postgres-backup` CronJob is running (backups can cause temp IO spikes).

---

## 📋 Post-Mortem Requirements
For every P0/P1 incident:
1. **Trace ID**: Attach at least 3 example `X-Request-ID`s from different logs.
2. **Breaker Status**: Document if the Circuit Breaker successfully protected the system.
3. **Audit Log**: Review `AuditLogger` security events during the outage.
