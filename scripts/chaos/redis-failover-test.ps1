# ── Real Chaos SRE Playbook: Redis Failover ────────────────────────────────
# This script induces a master failover in a Redis Sentinel cluster to 
# validate high-availability (HA) and client-side reconnection logic.

param(
    [string]$SentinelService = "redis-sentinel",
    [string]$MasterName = "mymaster"
)

Write-Host "🕵️ Identifying current Redis Master..." -ForegroundColor Cyan
$masterInfo = kubectl exec svc/$SentinelService -- redis-cli -p 26379 sentinel get-master-addr-by-name $MasterName
if (-not $masterInfo) {
    Write-Error "Could not find master for $MasterName"
    exit 1
}

$masterIP = ($masterInfo | Select-Object -First 1).Trim()
Write-Host "📍 Current Master IP: $masterIP" -ForegroundColor Yellow

# Find the pod for this IP
$masterPod = kubectl get pods -l app=redis -o json | ConvertFrom-Json | Where-Object { $_.status.podIP -eq $masterIP } | Select-Object -ExpandProperty metadata | Select-Object -ExpandProperty name

Write-Host "💥 Triggering failover by killing Master Pod: $masterPod" -ForegroundColor Red
$startTime = Get-Date
kubectl delete pod $masterPod --grace-period=0 --force

Write-Host "⏱️ Waiting for Sentinel to promote a new master..." -ForegroundColor Gray

$recovered = $false
for ($i=1; $i -le 30; $i++) {
    $newMaster = kubectl exec svc/$SentinelService -- redis-cli -p 26379 sentinel get-master-addr-by-name $MasterName
    if ($newMaster) {
        $newIP = ($newMaster | Select-Object -First 1).Trim()
        if ($newIP -ne $masterIP) {
            $duration = (Get-Date) - $startTime
            Write-Host "✅ New Master Elected: $newIP" -ForegroundColor Green
            Write-Host "⏱️ Recovery Time: $($duration.TotalSeconds) seconds" -ForegroundColor Green
            $recovered = $true
            break
        }
    }
    Write-Host "." -NoNewline
    Start-Sleep -Seconds 1
}

if (-not $recovered) {
    Write-Error "❌ Failover timed out after 30 seconds!" -ForegroundColor Red
}
