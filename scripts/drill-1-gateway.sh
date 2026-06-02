#!/usr/bin/env bash
set -euo pipefail

echo "=== Drill 1: Live Gateway Request Trace ==="

# 1. Start the Gateway in a single-process mode in the background
echo "[Drill] Starting Gateway Server..."
export NO_CLUSTER="true"
export PORT="3102"
export DATABASE_URL="postgresql://postgres:password@localhost:54399/multiagent"
export REDIS_URL="redis://localhost:6379"

# Required for LiveModelProvider
export OPENAI_API_KEY="sk-mock-key" 

# Start Gateway
npx tsx apps/gateway/src/index.ts > gateway-trace.log 2>&1 &
GATEWAY_PID=$!

echo "[Drill] Waiting for Gateway to boot..."
sleep 8

echo "[Drill] Dispatching POST /api/admin/intelligence/coordinate"
curl -s -X POST http://localhost:3102/api/admin/intelligence/coordinate?tenantId=test-tenant-123 \
  -H "Content-Type: application/json" \
  -d '{"objective": "Scan database for unused indexes and drop them."}' > response.log

echo "[Drill] Request complete. Stopping Gateway..."
kill -9 $GATEWAY_PID || true

echo ""
echo "=== Response ==="
cat response.log | jq || cat response.log
echo ""
echo "=== Gateway Logs (Trace Evidence) ==="
cat gateway-trace.log | grep -E "(AgentCoordinator|ModelProvider|SemanticInspector|CommandFilter|OPA|Temporal|Governance)" || true
echo "=== End Drill 1 ==="
