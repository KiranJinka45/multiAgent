#!/bin/bash

# MultiAgent Chaos Engineering Test Shell
# Purpose: Verify system resilience by killing random pods and measuring availability.

NAMESPACE="multiagent"
GATEWAY_URL="http://localhost:3000/health" # Adjust for your ingress/port-forward

echo "🚀 Starting Chaos Engineering Resilience Test..."

# 1. Check baseline health
echo "🔍 Checking baseline health..."
STATUS=$(curl -s -o /dev/null -w "%{http_code}" $GATEWAY_URL)
if [ "$STATUS" != "200" ]; then
    echo "❌ Baseline health check failed (Status: $STATUS). Aborting."
    exit 1
fi
echo "✅ Baseline health is OK."

# 2. Pick a random pod to terminate
echo "🎲 Selecting a random pod from namespace [$NAMESPACE]..."
POD_NAME=$(kubectl get pods -n $NAMESPACE --no-headers | awk '{print $1}' | shuf -n 1)

if [ -z "$POD_NAME" ]; then
    echo "❌ No pods found in namespace $NAMESPACE. Aborting."
    exit 1
fi

echo "🔥 Terminating pod: $POD_NAME"
kubectl delete pod $POD_NAME -n $NAMESPACE --grace-period=0 --force

# 3. Measure recovery time
echo "⏱️ Monitoring recovery via Gateway..."
START_TIME=$(date +%s)
RECOVERY_TIME=0
MAX_WAIT=60

while true; do
    CURRENT_STATUS=$(curl -s -o /dev/null -w "%{http_code}" $GATEWAY_URL)
    if [ "$CURRENT_STATUS" == "200" ]; then
        END_TIME=$(date +%s)
        RECOVERY_TIME=$((END_TIME - START_TIME))
        echo "✅ System is HEALTHY (Status: 200) after $RECOVERY_TIME seconds."
        break
    fi
    
    NOW=$(date +%s)
    ELAPSED=$((NOW - START_TIME))
    if [ $ELAPSED -gt $MAX_WAIT ]; then
        echo "❌ System failed to recover within $MAX_WAIT seconds."
        exit 1
    fi
    
    echo "⏳ System status: $CURRENT_STATUS. Retrying..."
    sleep 2
done

echo "🎉 Chaos Test Completed Successfully!"
echo "Summary: Killed $POD_NAME | Recovery Time: $RECOVERY_TIME seconds."
