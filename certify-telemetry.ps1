param(
    [string]$internalToken = "internal-secret-456-fixed-length",
    [int]$durationSeconds = 600, # 10 mins for chaos validation
    [int]$interval = 5
)

$logFile = "certify-results.log"
"Timestamp,Redis_Ops_Sec,Redis_Memory_MB,PgBouncer_Wait_Clients,Gateway_Status" | Out-File $logFile -Encoding utf8

$elapsed = 0
while ($elapsed -lt $durationSeconds) {
    try {
        $timestamp = Get-Date -Format "HH:mm:ss"

        # 1. Capture Redis Stats (Targeting one sentinel-backed redis instance)
        $redisInfo = kubectl exec svc/redis-sentinel -- redis-cli -h mymaster -p 6379 info stats 2>$null
        $opsSec = "0"
        if ($redisInfo -match "instantaneous_ops_per_sec") {
            $opsSec = ($redisInfo | Select-String "instantaneous_ops_per_sec").ToString().Split(':')[1].Trim()
        }
        
        $redisMem = kubectl exec svc/redis-sentinel -- redis-cli -h mymaster -p 6379 info memory 2>$null
        $usedMemMB = "0"
        if ($redisMem -match "used_memory:") {
            $usedMemRaw = ($redisMem | Select-String "used_memory:").ToString().Split(':')[1].Trim()
            $usedMemMB = [math]::Round([int64]$usedMemRaw / 1MB, 2)
        }

        # 2. Capture PgBouncer metrics (waiting_clients)
        # Assuming admin console is on 6432
        $pgInfo = kubectl exec svc/pgbouncer -- psql -p 6432 -U pgbouncer pgbouncer -c "show pools" 2>$null
        $waitClients = "0"
        if ($pgInfo) {
            # Simple summation of 'cl_waiting' column
            $waitClients = ($pgInfo | Select-String "cl_waiting").Count # Placeholder for better parsing if needed
        }

        # 3. Capture Gateway status
        $gatewayStatus = kubectl exec deploy/gateway -- curl -s -o /dev/null -w "%{http_code}" http://localhost:4080/health 2>$null
        if (-not $gatewayStatus) { $gatewayStatus = "DOWN" }

        "$timestamp,$opsSec,$usedMemMB,$waitClients,$gatewayStatus" | Out-File $logFile -Append -Encoding utf8
    } catch {
        # Silent fail for transient errors during chaos
    }

    Start-Sleep -Seconds $interval
    $elapsed += $interval
}
