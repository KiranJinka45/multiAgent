#!/bin/bash
# Production Backup Script for MultiAgent Platform

TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_DIR="./backups/$TIMESTAMP"
mkdir -p "$BACKUP_DIR"

echo "📂 [Backup] Starting production backup for $TIMESTAMP..."

# 1. Postgres Backup
if command -v pg_dump &> /dev/null; then
  echo "🐘 [Backup] Dumping Postgres database..."
  pg_dump "$DATABASE_URL" > "$BACKUP_DIR/production_db.sql"
else
  echo "⚠️ [Backup] pg_dump not found. Skipping DB dump."
fi

# 2. Redis Snapshot
if command -v redis-cli &> /dev/null; then
  echo "📦 [Backup] Triggering Redis background save..."
  redis-cli -u "$REDIS_URL" SAVE
  # Note: Real K8s setups would copy the dump.rdb file
else
  echo "⚠️ [Backup] redis-cli not found. Skipping Redis snapshot."
fi

# 3. Archive
tar -czf "./backups/backup_$TIMESTAMP.tar.gz" "$BACKUP_DIR"
rm -rf "$BACKUP_DIR"

echo "✅ [Backup] Production backup completed: backups/backup_$TIMESTAMP.tar.gz"
