#!/bin/bash

echo "🔥 [P14] Starting Restart Storm Test..."

# 10 cycles of rapid chaos
for i in {1..5}
do
  echo "🌀 Cycle $i: Terminating and Restarting mesh..."
  
  # Partially kill and restart
  docker compose restart core-api
  docker compose restart redis
  
  echo "   -> Cooling down for 3s..."
  sleep 3
  
  # Verify Gateway is still responsive (even if core-api is initializing)
  curl -I http://127.0.0.1:4080/health
done

echo "✅ [P14] Restart Storm Completed. Mesh should be fully stabilized."
