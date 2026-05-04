#!/bin/sh
# ── Enterprise SRE: Intelligent Restore Validation (Retries + Severity) ─────
# This script proves recovery readiness with built-in fault tolerance.
# Transient failures alert as WARNING; only persistent failures trigger CRITICAL.

BACKUP_DIR="/backups"
DB_NAME="multiagent"
DB_USER="postgres"
DB_HOST="postgres"
MAX_RETRIES=3
RETRY_DELAY=30 # seconds

# SRE Note: SLACK_WEBHOOK_URL should be injected via multiagent-ops-secrets
WEBHOOK_URL="${SLACK_WEBHOOK_URL:-}"

send_alert() {
    SEVERITY="$1" # INFO, WARN, CRITICAL
    MESSAGE="$2"
    EMOJI="ℹ️"
    [ "$SEVERITY" = "WARN" ] && EMOJI="⚠️"
    [ "$SEVERITY" = "CRITICAL" ] && EMOJI="🚨"

    PAYLOAD="*[$SEVERITY]* $EMOJI *MultiAgent Durability*: $MESSAGE"
    echo "📤 Sending $SEVERITY alert: $MESSAGE"
    
    if [ -n "$WEBHOOK_URL" ]; then
        curl -s -X POST -H 'Content-type: application/json' \
            --data "{\"text\":\"$PAYLOAD\"}" "$WEBHOOK_URL" > /dev/null
    fi
}

run_validation() {
    echo "🏁 Starting SRE Restore Validation..."

    # 1. Identify most recent backup
    LATEST_BACKUP=$(ls -t ${BACKUP_DIR}/*.sql.gz 2>/dev/null | head -n 1)
    if [ -z "$LATEST_BACKUP" ]; then
        return 1
    fi

    # 2. Simulate Sandbox
    TMP_DB="restore_verify_${RANDOM}"
    psql -h $DB_HOST -U $DB_USER -c "CREATE DATABASE $TMP_DB;" > /dev/null 2>&1 || return 1

    # 3. Execute Restore
    gunzip -c "$LATEST_BACKUP" | psql -h $DB_HOST -U $DB_USER -d "$TMP_DB" > /dev/null 2>&1
    RESTORE_STATUS=$?

    if [ $RESTORE_STATUS -ne 0 ]; then
        psql -h $DB_HOST -U $DB_USER -c "DROP DATABASE $TMP_DB;" > /dev/null 2>&1
        return 1
    fi

    # 4. Verify Integrity
    USER_COUNT=$(psql -h $DB_HOST -U $DB_USER -d "$TMP_DB" -t -c "SELECT count(*) FROM \"User\";" | xargs)
    psql -h $DB_HOST -U $DB_USER -c "DROP DATABASE $TMP_DB;" > /dev/null 2>&1

    if [ "$USER_COUNT" -gt 0 ]; then
        return 0
    else
        return 1
    fi
}

# ── Main Execution Loop with Retries ────────────────────────────────────────

echo "🚀 Initiating Enterprise Restore Proof..."

ATTEMPT=1
while [ $ATTEMPT -le $MAX_RETRIES ]; do
    if run_validation; then
        echo "✅ PROVEN RECOVERY CERTIFIED (Attempt $ATTEMPT)."
        if [ $ATTEMPT -gt 1 ]; then
            send_alert "INFO" "Self-healed after $ATTEMPT attempts. Systems stable."
        fi
        exit 0
    fi

    echo "❌ Attempt $ATTEMPT failed."
    
    if [ $ATTEMPT -lt $MAX_RETRIES ]; then
        send_alert "WARN" "Transient restore failure on attempt $ATTEMPT. Retrying in ${RETRY_DELAY}s..."
        sleep $RETRY_DELAY
    fi
    
    ATTEMPT=$((ATTEMPT + 1))
done

send_alert "CRITICAL" "Data durability proof FAILED after $MAX_RETRIES attempts. Manual intervention required."
exit 1
