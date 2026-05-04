#!/bin/bash

# EMERGENCY ROLLBACK SCRIPT (STEP 8)
# Reverts Istio VirtualService traffic to 100% stable

NAMESPACE="multi-agent"
VS_NAME="gateway-canary"

echo "🚨 EMERGENCY ROLLBACK INITIATED: Reverting Gateway traffic to 100% stable..."

kubectl patch virtualservice $VS_NAME -n $NAMESPACE --type='json' -p='[
  {
    "op": "replace",
    "path": "/spec/http/0/route/0/weight",
    "value": 100
  },
  {
    "op": "replace",
    "path": "/spec/http/0/route/1/weight",
    "value": 0
  }
]'

if [ $? -eq 0 ]; then
  echo "✅ Success: Gateway traffic is now 100% stable."
  echo "🔍 Please check Grafana for error rate stabilization."
else
  echo "❌ Error: Failed to patch VirtualService. Check kubectl connection."
fi
