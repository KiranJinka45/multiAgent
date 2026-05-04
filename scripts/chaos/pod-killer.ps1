# ── Real Chaos SRE Playbook: Pod Slaying ──────────────────────────────────
# This script targets live pods during concurrent load simulation to verify 
# the system's self-healing and zero-downtime capabilities.

param(
    [string]$Label = "app=gateway",
    [int]$IntervalSeconds = 15,
    [int]$DurationSeconds = 120
)

$StartTime = Get-Date
$EndTime = $StartTime.AddSeconds($DurationSeconds)

Write-Host "🔥 Starting Pod Slaying on label: $Label" -ForegroundColor Red
Write-Host "⏱️ Duration: $DurationSeconds seconds | Interval: $IntervalSeconds seconds"

while ((Get-Date) -lt $EndTime) {
    Write-Host "🎯 Targeting pod for eviction..." -ForegroundColor Yellow
    
    $pods = kubectl get pods -l $Label -o jsonpath='{.items[*].metadata.name}'
    if ($pods) {
        $podList = $pods.Split(" ")
        $target = $podList | Get-Random
        
        Write-Host "⚔️ Killing pod: $target" -ForegroundColor Red
        kubectl delete pod $target --grace-period=0 --force
        
        Write-Host "⏳ Waiting for pod recovery and next interval..."
    } else {
        Write-Host "⚠️ No pods found with label: $Label" -ForegroundColor Gray
    }
    
    Start-Sleep -Seconds $IntervalSeconds
}

Write-Host "✅ Pod Slaying validation window closed." -ForegroundColor Green
