# MultiAgent Chaos Run Script
# Sets the CHAOS_STAGE and runs a worker to test retry logic

$stage = $args[0]
if (-not $stage) {
    Write-Host "Usage: .\chaos-run.ps1 [planning|validation|kill-mid-job]" -ForegroundColor Yellow
    exit 1
}

if ($stage -eq "kill-mid-job") {
    Write-Host "💀 CRITICAL FAILURE SIMULATION: Hard-killing worker in 10 seconds..." -ForegroundColor Red
    Start-Process powershell.exe -ArgumentList "-NoProfile", "-Command", "Start-Sleep -Seconds 10; Write-Host 'Executing taskkill...'; taskkill /F /IM node.exe /T /FI 'WINDOWTITLE eq WorkerOps*'"
    $stage = "normal" # Run normally until killed
}

Write-Host "🚀 Launching Worker with CHAOS_STAGE=$stage" -ForegroundColor Cyan
$root = Get-Location
$workerPath = Join-Path $root "apps/worker"

# Set environment and run dev
$envPrefix = "`$env:CHAOS_STAGE='$stage';"

# Load .env if exists
if (Test-Path "$root\.env") {
    Get-Content "$root\.env" | ForEach-Object {
        $line = $_.Trim()
        if ($line -and -not $line.StartsWith("#") -and $line.Contains("=")) {
            $name, $value = $line -split "=", 2
            $value = $value.Trim().Trim('"').Trim("'")
            $envPrefix += "`$env:$name='$value';"
        }
    }
}

$logFile = Join-Path $root "logs\CHAOS_WORKER.log"
$fullCmd = "$envPrefix pnpm dev > `"$logFile`" 2>&1"
Start-Process powershell.exe -ArgumentList "-NoProfile", "-Command", "$fullCmd" -WorkingDirectory $workerPath

Write-Host "✅ Chaos worker launched. Logs at: $logFile" -ForegroundColor Green
