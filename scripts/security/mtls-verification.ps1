# ── Enterprise SRE: Zero-Trust mTLS Verification ──────────────────────────
# This script attempts to bypass the Istio mesh by sending plaintext traffic
# from a non-injected pod to verify that STRICT PeerAuthentication is active.

Write-Host "🛡️ Starting mTLS Enforcement Verification..." -ForegroundColor Cyan

# 1. Create a "Shadow Pod" without an Istio sidecar
Write-Host "📦 Spawning non-mesh pod..."
$podName = "attacker-plaintext-test"
kubectl run $podName --image=curlimages/curl --overrides='{"metadata":{"annotations":{"sidecar.istio.io/inject":"false"}}}' -- sleep 100

Start-Sleep -Seconds 5

# 2. Attempt to curl a mesh service (gateway) over plaintext
Write-Host "🕵️ Attempting plaintext bypass to gateway..." -ForegroundColor Yellow
$result = kubectl exec $podName -- curl -s -o /dev/null -w "%{http_code}" http://gateway:4080/health --max-time 5

if ($result -eq "000" -or $result -eq "56") {
    Write-Host "✅ PASS: Plaintext connection reset/rejected by Istio mesh." -ForegroundColor Green
} else {
    Write-Host "❌ FAIL: Plaintext bypass successful! HTTP Status: $result" -ForegroundColor Red
    Write-Host "⚠️ Security vulnerability: mTLS is not strictly enforced." -ForegroundColor Red
}

# 3. Cleanup
Write-Host "🧹 Cleaning up shadow pod..."
kubectl delete pod $podName --now
