# Playbook: SLO Burn Rate High
**Alert ID**: `SLO_Availability_BurnRate_High` | **Severity**: CRITICAL

## Description
This alert triggers when the 5-minute success rate of the Auth Service drops below the 99.9% SLO threshold.

## Impact
Degradation of user experience. Potential data loss or authentication failures. The "Error Budget" is rapidly depleting.

## Steps to Diagnose
1. **Check Dashboard**:
   Open the **MultiAgent SRE: Golden Signals** dashboard. Identify if the burn is global or scoped to a specific endpoint.
2. **Identify Error Type**:
   Check for 5xx errors in the Gateway logs:
   ```bash
   kubectl logs deployment/gateway | grep " 50[0-4] "
   ```
3. **Verify Dependencies**:
   Check Redis and Postgres health:
   ```bash
   kubectl get pods -l app=redis
   kubectl get pods -l app=postgres
   ```

## Mitigation
- If a specific pod is failing, manually recycle it: `kubectl delete pod <pod-name>`.
- If the database is saturated, check for slow queries in the Core API.
- If the error budget exhaustion is imminent, trigger the "SRE Freeze" (Cease all new deployments).
