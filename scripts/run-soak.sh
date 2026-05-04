#!/bin/bash
# tests/p20/chaos-engine.sh
# Injects periodic volatility into the soak test

echo "🔥 Chaos Engine started. Pod kills scheduled every 2 hours."

while true
do
  sleep 7200 # 2 Hour Interval

  echo "$(date '+%Y-%m-%d %H:%M:%S') - 💥 Injecting chaos: Restarting Gateway and Core-API pods..."
  
  # Delete pods via label to trigger K8s reconciliation (deployment restart)
  kubectl delete pod -l app=gateway --namespace multiagent --grace-period=0 --force
  kubectl delete pod -l app=core-api --namespace multiagent --grace-period=0 --force
  
  echo "$(date '+%Y-%m-%d %H:%M:%S') - ✅ Chaos injected. Waiting for mesh recovery."
done
---
#!/bin/bash
# scripts/run-soak.sh
# Master Orchestrator for Phase 20 Production Soak Test

echo "🚀 INITIALIZING 24-HOUR PRODUCTION SOAK TEST..."
echo "=================================================="

# Exporting target for all sub-processes
export TARGET="http://localhost:4080"
export REDIS_URL="redis://localhost:6379"

# 1. Start Control & Monitoring
nohup ts-node tests/p20/control.ts > logs/soak-control.log 2>&1 &
nohup ts-node tests/p20/monitor.ts > logs/soak-metrics.log 2>&1 &
nohup ts-node tests/p20/integrity.ts > logs/soak-integrity.log 2>&1 &

# 2. Start Load Generation
nohup ts-node tests/p20/load-generator.ts > logs/soak-load.log 2>&1 &

# 3. Start Chaos Engine
nohup bash tests/p20/chaos-engine.sh > logs/soak-chaos.log 2>&1 &

echo "📊 Monitoring active. Logs located in ./logs/"
echo "🕒 System will automatically terminate in 24 hours."
echo "=================================================="
