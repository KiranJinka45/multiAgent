# Production Backup & Restore Strategy

This document outlines the critical data protection procedures for the MultiAgent SaaS platform.

## 1. Database (Supabase / Postgres)

### Automatic Backups
Supabase provides automatic daily backups for all projects.
- **Retention**: 7 days (Free tier) to 30 days (Pro tier).
- **Format**: Point-in-time recovery (PITR) available on Pro/Enterprise plans.

### Manual Offsite Backups
For critical data sovereignty, run a nightly export job:
```bash
# Export using pg_dump
docker exec -t supabase_db pg_dumpall -c -U postgres > dump_$(date +%Y-%m-%d).sql
```
- **Storage**: Upload to a secure S3 bucket or isolated cold storage.
- **Alerting**: Failure to complete the export triggers a `[CRITICAL ALERT]` via the `alerts` utility.

## 2. Persistent Volumes (Docker / EC2)

### EBS Snapshots (AWS)
- **Policy**: Schedule daily snapshots of all EBS volumes attached to the production nodes.
- **Retention**: 14 days minimum.

### Local Data (Workers/Cache)
- **Strategy**: Assume local worker data is ephemeral. Standardize on Redis for distributed state to ensure no single node failure results in data loss.

## 3. Disaster Recovery (DR)

### Recovery Time Objective (RTO)
- **Target**: < 2 hours for full system restoration from the last successful backup.

### Recovery Point Objective (RPO)
- **Target**: < 24 hours (standard daily backup) or < 5 minutes (PITR).

## 4. Verification
- **Drill**: Perform a full "Restore from Backup" drill every 90 days in the staging environment to verify backup integrity.
