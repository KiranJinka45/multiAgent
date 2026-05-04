# 🚀 Final Go-Live Sweep (Phase 22-23)

This checklist must be finalized immediately following a successful 6-hour soak test.

## 1. Pre-Launch Verification (T-Minus 1 Hour)
- [ ] **Secrets Audit**: `multiagent-prod-secrets` is populated with live JWT/RSA/Stripe keys.
- [ ] **Infrastructure Health**: `kubectl get pods -n multi-agent` shows 0 restarts in the last 6 hours.
- [ ] **Circuit Breaker Check**: Graph shows P99 of all "CLOSED" states across the mesh.
- [ ] **Backups**: Manually trigger `kubectl create job --from=cronjob/db-backup pre-launch-backup` to ensure a clean state.

## 2. Canary Rollout Initiation (T-Plus 0)
- [ ] **Traffic Split**: Initiate Istio-Canary at **5%**.
- [ ] **Manual Observation (15m)**:
    - Watch for any `4xx/5xx` spikes in Gateway logs.
    - Monitor `X-Retry-Count` trending; if it exceeds 1% of traffic, abort.
- [ ] **Automated Analysis**: Ensure Argo Rollouts is tracking the `success-rate` metric.

## 3. Post-Launch Stability Rituals (Phases 23)
### Daily Checks
- [ ] **Memory Drift**: Verify flat memory trends in Grafana.
- [ ] **Slow Query Audit**: Scrape Pino logs for `[DATABASE] Slow Query Detected` markers.

### Weekly Health
- [ ] **Circuit Breaker Tuning**: Review reset timeouts if any flakiness was detected during load.
- [ ] **Alert Sensitivity**: Silence noisy alerts; add new triggers for late-onset degradation targets.

### Monthly Maintenance
- [ ] **DR Drill**: Restore an S3 backup to a sandbox environment to prove restorability.
- [ ] **Key Rotation**: Monitor RSA key age; rotate yearly.
