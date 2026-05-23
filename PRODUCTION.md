# MultiAgent Production Operations Guide

This document outlines the architecture and operational procedures for the hardened MultiAgent platform.

## 🏗️ Core Infrastructure

### Kubernetes (multiagent)

- **Namespace**: `multiagent`
- **Resource Management**: Strict CPU/Memory requests/limits on all pods.
- **Resilience**: PDBs (Pod Disruption Budgets) and Rolling Updates enabled.
- **Scaling**: HPA (Horizontal Pod Autoscaler) with KEDA for Kafka-based external metrics.

### High Availability (HA) & Scaling (10k Users)

- **Unified SocketGateway**: Consolidation of multi-node WebSocket events via `@socket.io/redis-adapter`. Targets 10,000 concurrent connections per cluster.
- **Redis Sentinel**: 3-node HA cluster (Master + Replica + Sentinel). Services use Sentinel-aware connection logic to survive master failures.
- **Mission Watchdog**: Provides watchdog-assisted reconciliation of stale mission states during restart and recovery scenarios.
- **Stateful Failover**: `MissionWorker` and `Watchdog` are resilient to container restarts via Redis-backed state recovery.

---

## 🛡️ Security & Zero-Trust

### Service-to-Service Auth

- **JWT (RS256)**: All services require a short-lived `SERVICE_TOKEN`.
- **Validation**: Middleware enforcers on every private endpoint (`/health`, `/metrics`, internal APIs).

### Edge Protection

- **WAF (Ingress)**: Hardened Ingress with OWASP ModSecurity rule-set and rate limiting.
- **HTTPS Enforcement**: HTTPS enforced at ingress boundaries with optional internal TLS support depending on deployment topology.

### Authority Escalation Invariant

- **No Implicit Escalation**: No probabilistic or advisory subsystem (Tier A) may acquire mutation authority implicitly through retries, automation chaining, policy generation, or delegated execution pathways.

---

## 🛠️ Emergency Operations

### Global Kill-Switch

To instantly halt ALL AI generation tasks across the entire fleet:

```bash
redis-cli -h <SENTINEL_ADDR> -p 26379 sentinel get-master-addr-by-name mymaster
# Then on the master:
set system:kill_switch true
```

### Cryptographically Chained Audit Logs

Cryptographically chained append-oriented audit logs with integrity verification.

- **Table**: `audit_logs` (Supabase)
- **Integrity Check**: Call `AuditLogger.verifyChain()` via the `admin-cli`.

---

## 📈 Observability & Intelligence

### Metrics & Dashboards

- **URL**: `https://grafana.multiagent.app`
- **Key Counters**:
  - `cache_hits_total` (L1 vs L2)
  - `mission_recovery_total` (Autonomous healing events)
  - `tokens_total` (Real-time billing consumption)

### Trace Retrieval & Assisted Recovery

The system stores historical recovery traces and exposes them for operator-assisted heuristic retrieval during future incidents via the Watchdog.

- **Table**: `global_experience_memory` (Vector DB)
- **Watchdog Heartbeat**: Monitored via `watchdog:last_check` in Redis.
- **Function**: `memoryPlane.getRelevantContext` automatically retrieves past success patterns for current build errors.

---

## 🚀 Deployment & Rollouts (Phase 6: Ready)

### 1. Progressive Exposure (Canary)

To rollout a new version with only 1% traffic before full migration:

1. Deploy your new version in the `multiagent-canary` namespace.
2. Edit `k8s/ingress.yaml` and uncomment the Canary annotations:

```yaml
nginx.ingress.kubernetes.io/canary: "true"
nginx.ingress.kubernetes.io/canary-weight: "1"
```

3. Apply the Ingress. Monitor Prometheus `error_rate` for 10 minutes.
4. If stable, increase weight to 10% -> 50% -> 100%.

### 2. Chaos Validation

To verify the system's self-healing capabilities in production (or staging):

```bash
npx ts-node scripts/chaos-test.ts
```

This script will kill Redis/Kafka/Worker pods and verify the system's recovery time (MTTR).

---

## 📈 Observability & SLA

Available Metrics:

- `ai_token_cost_total`: Cumulative USD cost by model/provider.
- `ai_cache_savings_total`: USD savings achieved via L1/L2 hits.
- `mission_recovery_latency_seconds`: MTTR histogram (SLA Target: < 60s).
- `cache_hits_total`: L1/L2 hits (Target: > 70%).

---

## 🎖️ Final Production Certification
**Status**: 🟢 **ENTERPRISE TIER-1 (Single-Region) CERTIFIED** (2026-04-29)

The platform has been certified against **Enterprise SRE failure domains (Single-Region)**:
1. **Immutable Sandbox**: Seccomp + Read-Only + Rootless (Zero-Trust isolation).
2. **Effectively-Once**: Bounded effectively-once replay handling with atomic idempotency locks and transactional safety.
3. **Failover Resilience**: Coordinated Single-Region Failover Resilience with Redis/Kafka recovery and bounded replay restoration (<40s observed MTTR in test conditions).
4. **Endurance**: 3-Hour Sustained Load Validation (100-500 VU).
5. **Load Shedding**: Observed stable overload degradation behavior under tested stress conditions using graceful 503-based load shedding.

### Mandatory Enterprise Checklist

- [ ] Check `ai_token_cost_total` in "Operational Resilience" Dashboard.
- [ ] Verify `ai_cache_savings_total` ROI is > 0.
- [ ] Audit `global_experience_memory` for recovery trace indexing and heuristic retrieval health.
- [ ] Monitor `governance:total_active_jobs` for load shedding triggers.

---

## 🧯 Break-Glass Recovery Procedure (Catastrophic)

In the event of total Kafka state loss, unrecoverable lease synchronization drift, or duplicate coordinator execution conflicts:

1. **Flush Dead Letters**:
   `kubectl delete pods -l app=kafka -n multiagent --force`
2. **Reset Mission State**:
   `redis-cli -h sentinel.multiagent.svc -p 26379 sentinel set mymaster failover-timeout 1000`
3. **Emergency Halt**:
   `redis-cli set system:kill_switch true`
4. **Drain & Reboot**:
   Scale `mission-worker` to 0, clear Kafka PVCs, then scale back to baseline.
