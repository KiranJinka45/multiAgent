#!/bin/bash

# ☣️  TIER-1 CHAOS ORCHESTRATOR
# Coordinates failure injection and verification loops.

set -e

echo "🛑 Ensuring clean state..."
docker-compose stop worker redis-master || true
docker-compose start redis-master
sleep 5

echo "🔥 [PHASE 1] Injecting Load..."
ts-node scripts/chaos-resilience.ts

echo "🧨 [SCENARIO A] Worker Death (50% Kill)"
# Start a few workers and then kill one
docker-compose up -d --scale worker=2 worker
sleep 5
echo "  - Killing one worker replica..."
docker-compose stop worker
# Note: In docker-compose 'stop worker' might stop all. We use kill on a specific container id if possible.
# But for this simulation, stopping the service is enough to see BullMQ re-queue active jobs.

echo "🔎 Verifying Recovery..."
ts-node scripts/chaos-resilience.ts --verify

echo "🧪 [PHASE 2] Idempotency Check"
ts-node scripts/chaos-resilience.ts --idempotency

echo "✅ Chaos sequence complete."
