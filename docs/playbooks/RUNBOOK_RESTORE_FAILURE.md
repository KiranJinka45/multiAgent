# Playbook: Restore Proof Failure Escalation
**Alert ID**: `DataDurabilityProofFailed` | **Severity**: CRITICAL

## Description
This alert triggers when the `proven-restore-test.sh` script fails to restore a backup and verify data integrity after 3 automated retry attempts.

## Impact
Immediate risk to DR (Disaster Recovery) readiness. The system may be backing up corrupt data, or the backup pipeline is broken.

## Steps to Diagnose
1. **Check Script Logs**:
   ```bash
   kubectl logs job/restore-verification-job
   ```
2. **Verify Backup Storage**:
   Check if backups actually exist in `/backups`:
   ```bash
   ls -lh /backups
   ```
3. **Manual Validation**:
   Try a manual restore to the sandbox:
   ```bash
   scripts/proven-restore-test.sh --manual
   ```

## Mitigation
- If backups are missing, restart the `postgres-backup` CronJob immediately.
- If data is corrupt, investigate the Postgres master logs for WAL corruption.
- Notify the Data Reliability Engineer (DRE).
