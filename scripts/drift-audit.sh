#!/bin/sh
# ── GitOps Sovereignty: Automated Drift & Self-Healing Audit ───────────────
# This script validates the system's ability to self-heal when manually vandalized.

TARGET_DEPLOYMENT="auth-service"
NAMESPACE="production"
EXPECTED_REPLICAS=3

echo "🏁 Starting GitOps Sovereignty Audit (Self-Healing Validation)..."

# 1. Capture current state
CURRENT_REPLICAS=$(kubectl get deployment $TARGET_DEPLOYMENT -n $NAMESPACE -o jsonpath='{.spec.replicas}')
echo "📊 Current state for $TARGET_DEPLOYMENT: $CURRENT_REPLICAS replicas."

# 2. Simulate "Drift" (Manual Vandalism)
echo "🔨 Simulating Drift: Vandalizing deployment to 1 replica..."
kubectl scale deployment $TARGET_DEPLOYMENT -n $NAMESPACE --replicas=1

# 3. Wait for ArgoCD Self-Healing (Simulated loop)
echo "⏳ Waiting for GitOps Controller to detect and remediate drift..."
MAX_RETRIES=20
RETRY_COUNT=0
HEALED=false

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    RETRY_COUNT=$((RETRY_COUNT + 1))
    READY_REPLICAS=$(kubectl get deployment $TARGET_DEPLOYMENT -n $NAMESPACE -o jsonpath='{.spec.replicas}')
    
    if [ "$READY_REPLICAS" -eq "$EXPECTED_REPLICAS" ]; then
        echo "🛡️  SELF-HEALED: ArgoCD detected drift and restored $TARGET_DEPLOYMENT to $EXPECTED_REPLICAS replicas."
        HEALED=true
        break
    fi
    
    echo "   ...[Trial $RETRY_COUNT/$MAX_RETRIES]: Still drifting ($READY_REPLICAS replicas)."
    sleep 15
done

# 4. Final Verdict
if [ "$HEALED" = true ]; then
    echo "🏆 GITOPS SOVEREIGNTY PROVEN. System is self-healing."
else
    echo "❌ CRITICAL FAILURE: System failed to self-heal within timeout. Sovereignty compromised."
    exit 1
fi
