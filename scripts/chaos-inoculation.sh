#!/bin/bash
# MultiAgent Mesh - Chaos Inoculation execution script

set -euo pipefail

echo "🔥 Initiating MultiAgent Chaos Inoculation Campaign"
echo "Targeting Gateway and Auth Service under latency, jitter, and packet loss..."

# Ensure k6 is installed
if ! command -v k6 &> /dev/null; then
    echo "❌ k6 could not be found. Please install k6 (https://k6.io/docs/getting-started/installation/)."
    exit 1
fi

echo ""
echo "📊 Test Phase 1: Warming up the mesh..."
k6 run --vus 50 --duration 10s scripts/k6/chaos-test.js

echo ""
echo "💥 Test Phase 2: Simulating Spikes & High Concurrency (Chaos Simulation)..."
# The script natively introduces connection drops via error injection if chaos flag is passed.
K6_CHAOS_MODE=true k6 run scripts/k6/chaos-test.js

echo ""
echo "✅ Chaos Campaign Complete."
echo "Check Grafana to ensure p95 latency recovered and connection pools did not exhaust."
