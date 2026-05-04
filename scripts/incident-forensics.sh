#!/bin/sh
# ── Enterprise SRE: Automated Incident Forensics (The Sovereign Archive) ─────
# This script bundles critical system state into a forensic archive when
# an SLO violation or critical incident occurs.

ARCHIVE_DIR="./archives/forensics_$(date +%Y%m%d_%H%M%S)"
TARGET_NAMESPACE="${1:-production}"

mkdir -p "$ARCHIVE_DIR"

echo "🕵️ Starting Forensic Capture for $TARGET_NAMESPACE..."

# 1. K8s Events (The what and when)
echo "   ...[1/4] Capturing Cluster Events"
kubectl get events -n "$TARGET_NAMESPACE" --sort-by='.lastTimestamp' > "$ARCHIVE_DIR/k8s_events.txt"

# 2. Resource State (The where)
echo "   ...[2/4] Capturing Resource Snapshots"
kubectl get all -n "$TARGET_NAMESPACE" -o wide > "$ARCHIVE_DIR/resource_inventory.txt"
kubectl describe pods -n "$TARGET_NAMESPACE" > "$ARCHIVE_DIR/pod_descriptions.txt"

# 3. Log Extraction (The why)
echo "   ...[3/4] Dumping Logs for failing components"
for pod in $(kubectl get pods -n $TARGET_NAMESPACE --no-headers | awk '{print $1}'); do
    echo "      -> Logging $pod"
    kubectl logs "$pod" -n "$TARGET_NAMESPACE" --all-containers --tail=1000 > "$ARCHIVE_DIR/logs_$pod.log"
done

# 4. Mesh Telemetry (The how)
echo "   ...[4/4] Finalizing Archive"
# Optional: Curl Prometheus for raw SLI values if reachable
# curl -s "http://prometheus:9090/api/v1/query?query=sli:availability" > "$ARCHIVE_DIR/sli_snapshot.json"

tar -czf "${ARCHIVE_DIR}.tar.gz" -C "$ARCHIVE_DIR" .
rm -rf "$ARCHIVE_DIR"

echo "✅ FORENSIC BUNDLE SECURED: ${ARCHIVE_DIR}.tar.gz"
