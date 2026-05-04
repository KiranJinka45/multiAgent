# 🛠️ MultiAgent Production Maintenance Guide

This document provides guidelines for Ensuring the long-term health and stability of the MultiAgent mesh after the initial go-live.

## 1. Logs & Metrics Management
To prevent "Alert Fatigue" and disk saturation:
- **Retention**: Set Loki/Prometheus retention to **15 days** for production and **7 days** for staging.
- **Scraping**: Ensure Prometheus is scraping `/metrics` every **15s** to capture transient circuit breaker events.
- **Log Rotation**: If using Docker/File-based logs, ensure `max-size` is set to `50m` in `daemon.json`.

## 2. Database Hygiene (Postgres)
- **Vacuuming**: Postgres auto-vacuum should be active, but schedule a `VACUUM ANALYZE` weekly during low-traffic windows (e.g., Sunday 03:00 AM).
- **Index Audit**: Use Prisma's `$queryRaw` to check for unused indexes every quarter to optimize write performance.

## 3. Resilience Tuning
- **Circuit Breakers**: If you see frequent `HALF_OPEN` transitions during normal load, increase the `resetTimeout` in `@packages/resilience` to give downstream services more "cooldown" time.
- **HPA Thresholds**: If memory spikes frequently cause pod restarts, adjust the `hpa.yaml` target to **65% CPU/Memory** instead of 80% to provide more buffer.

## 4. Security Rotations
- **RSA Keys**: Rotate the `INTERNAL_PRIVATE_KEY` and `INTERNAL_PUBLIC_KEY` every **12 months** or if a security breach of the K8s secrets namespace is suspected.
- **JWT Secret**: Rotate the `JWT_SECRET` periodically to invalidate long-lived session tokens in the wild.

## 5. Backup Verification
- **Restoration Drill**: Once a month, attempt to restore a DB dump from the `multiagent-backup-pvc` to a temporary sandbox database to ensure the backup integrity.
