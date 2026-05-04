#!/bin/bash
# Phase 18: Helm Chart Verification Script

echo "🔍 Validating Multi-Agent Helm Chart..."

# 1. Lint the chart
echo "----------------------------------------------------"
echo "📦 Stage 1: Helm Lint"
helm lint helm/multiagent

if [ $? -eq 0 ]; then
    echo "✅ Helm Chart syntax is valid."
else
    echo "❌ Helm Chart linting failed. Please check templates."
    exit 1
fi

# 2. Template Generation (Dry-Run)
echo "----------------------------------------------------"
echo "📄 Stage 2: Helm Template (Dry-Run)"
helm template multiagent-prod helm/multiagent \
  --set global.storageClass=gp2 \
  --set gateway.replicaCount=3 > helm-test-render.yaml

if [ $? -eq 0 ]; then
    echo "✅ Helm Template rendering succeeded."
    echo "📝 Rendered output saved to helm-test-render.yaml for audit."
else
    echo "❌ Helm Template rendering failed."
    exit 1
fi

echo "----------------------------------------------------"
echo "🏁 HELM VERIFICATION COMPLETE: Ready for Environment Overrides."
