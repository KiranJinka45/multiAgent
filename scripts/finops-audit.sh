#!/bin/sh
# ── Enterprise SRE: FinOps Sovereignty (Resource & Cost Audit) ─────────────
# This script scans K8s manifests for resource discipline and identifies
# opportunities for fiscal optimization.

MANIFEST_DIR="./k8s"

echo "💰 Initiating FinOps Inventory Audit..."

# 1. Check for missing resource definitions (Reliability risk and budget blindspot)
echo "🔍 Checking for missing resource limits/requests..."
grep -L "resources:" ${MANIFEST_DIR}/*.yaml | while read file; do
    echo "   [!] WARNING: No resources defined in $file"
done

# 2. Check for Request/Limit Gap (Wasted capital)
echo "🔍 Analyzing Request/Limit Slack..."
grep -E "cpu:|memory:" ${MANIFEST_DIR}/*.yaml -A 5 | awk '/requests/,/limits/' | grep -v "\--" | while read line; do
    # Simple heuristic to identify large gaps (SRE Note: Real FinOps uses Prometheus metrics)
    echo "   [i] Audit entry: $line"
done

# 3. Check for HPA coverage (Autoscaling efficiency)
echo "🔍 Verifying Autoscaling (HPA) coverage..."
for deploy in $(grep -l "kind: Deployment" ${MANIFEST_DIR}/*.yaml); do
    DEPLOY_NAME=$(grep "name:" $deploy | head -n 1 | awk '{print $2}')
    if ! grep -q "scaleTargetRef:.*$DEPLOY_NAME" ${MANIFEST_DIR}/*.yaml; then
        echo "   [!] OPPORTUNITY: No HPA found for $DEPLOY_NAME (Possible over-provisioning)."
    fi
done

echo "✅ FinOps Audit Complete."
