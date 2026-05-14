#!/bin/bash

# ZTAN INCIDENT EVIDENCE PRESERVATION
# Bundles logs, state snapshots, and friction reports into a verifiable evidence package.

INCIDENT_ID=$(date +%Y%m%d-%H%M%S)
EVIDENCE_DIR="evidence/incidents/$INCIDENT_ID"

echo "🛑 PRESERVING INCIDENT EVIDENCE ($INCIDENT_ID)..."
mkdir -p "$EVIDENCE_DIR"

# 1. Capture Platform Logs
echo "   - Exporting platform logs..."
if [ -d "logs" ]; then
    cp -r logs "$EVIDENCE_DIR/"
fi

# 2. Snapshot Cluster State
echo "   - Capturing cluster state snapshot..."
pnpm exec ztanctl health > "$EVIDENCE_DIR/cluster-health.txt" 2>&1
pnpm exec ztanctl integrity-report > "$EVIDENCE_DIR/integrity-report.txt" 2>&1

# 3. Collect Recent Friction Reports
echo "   - Bundling recent friction reports..."
if [ -d "docs/friction" ]; then
    find docs/friction -mmin -60 -type f -exec cp {} "$EVIDENCE_DIR/" \;
fi

# 4. Generate Evidence Manifest
echo "   - Signing evidence bundle..."
sha256sum "$EVIDENCE_DIR"/* > "$EVIDENCE_DIR/manifest.sha256"

echo "------------------------------------"
echo "✅ EVIDENCE PRESERVED: $EVIDENCE_DIR"
echo "Next: Attach this bundle to the Post-Mortem in SRE_HANDBOOK.md"
