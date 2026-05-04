#!/bin/sh
# ── Enterprise SRE: Post-Rollout Smoke Test (Validation Guardrail) ─────────
# This script ensures that a deployment is not just "running" but "functional"
# after a rollout (e.g., triggered by secret rotation).

DEPLOYMENT_NAME="$1"
NAMESPACE="${2:-production}"
API_ENDPOINT="${3:-http://localhost:4002/health}"

if [ -z "$DEPLOYMENT_NAME" ]; then
    echo "Usage: $0 <deployment-name> [namespace] [health-endpoint]"
    exit 1
fi

echo "🏁 Validating Rollout for $DEPLOYMENT_NAME..."

# 1. Wait for K8s Rollout to complete
echo "⏳ Waiting for deployment status..."
kubectl rollout status deployment/$DEPLOYMENT_NAME -n $NAMESPACE --timeout=120s
if [ $? -ne 0 ]; then
    echo "❌ ERROR: Rollout timed out or failed."
    exit 1
fi

# 2. Synthetic Health Check (Functional Validation)
echo "🔍 Performing synthetic health check at $API_ENDPOINT..."
MAX_ATTEMPTS=5
ATTEMPT=1

while [ $ATTEMPT -le $MAX_ATTEMPTS ]; do
    HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$API_ENDPOINT")
    
    if [ "$HTTP_STATUS" -eq 200 ]; then
        echo "✅ SUCCESS: $DEPLOYMENT_NAME is healthy and responding (HTTP 200)."
        exit 0
    fi
    
    echo "   ...[Trial $ATTEMPT/$MAX_ATTEMPTS]: Endpoint returned $HTTP_STATUS. Retrying..."
    sleep 5
    ATTEMPT=$((ATTEMPT + 1))
done

echo "❌ CRITICAL: $DEPLOYMENT_NAME failed functional validation after rollout."
# SRE Note: In a real GitOps pipeline, this exit 1 would trigger an automated rollback.
exit 1
