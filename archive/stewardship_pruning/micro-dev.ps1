# MASTER HIGH-AVAILABILITY ORCHESTRATOR
# Version: 3.0 (Enterprise Resilient Edition)

$root = Get-Location

Write-Host "[STEP 1] Aggressive Process Cleanup..." -ForegroundColor Yellow
# 1. Kill all node processes forcefully via taskkill (more reliable than Stop-Process)
taskkill /F /IM node.exe /T /FI "STATUS eq RUNNING" 2>$null | Out-Null
taskkill /F /IM node.exe /T /FI "STATUS eq UNKNOWN" 2>$null | Out-Null

# 2. Specifically target the core ports to ensure no lingering bindings
$meshPorts = 4080, 3001, 8080, 3006, 3007, 4000, 4001, 4002, 4003, 4004
foreach ($port in $meshPorts) {
    Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue | ForEach-Object {
        if ($_.OwningProcess -gt 0) {
            Write-Host "  [-] Force killing process $($_.OwningProcess) holding port $($port)" -ForegroundColor Red
            taskkill /F /PID $_.OwningProcess /T 2>$null | Out-Null
        }
    }
}
Start-Sleep -Seconds 2

# LOAD ENVIRONMENT VARIABLES
if (Test-Path "$root\.env") {
    Get-Content "$root\.env" | ForEach-Object {
        $line = $_.Trim()
        if ($line -and -not $line.StartsWith("#") -and $line.Contains("=")) {
            $name, $value = $line -split "=", 2
            # Strip surrounding quotes if present
            $value = $value.Trim().Trim('"').Trim("'")
            [System.Environment]::SetEnvironmentVariable($name, $value, "Process")
        }
    }
}


Write-Host "[STEP 2] Launching Backend Mesh..." -ForegroundColor Cyan
$services = @(
    @{ Name = "API-CORE";     Path = "apps/core-api";            Cmd = "pnpm dev" },
    @{ Name = "AUTH-SERVICE";  Path = "apps/auth-service";        Cmd = "pnpm dev" },
    @{ Name = "WORKER";        Path = "apps/worker";              Cmd = "pnpm dev" },
    @{ Name = "API-MESH";      Path = "apps/api";                 Cmd = "pnpm dev" },
    @{ Name = "API-GATEWAY";    Path = "apps/gateway";             Cmd = "pnpm dev" }
)

# Ensure logs directory exists
$logDir = Join-Path $root "logs"
if (-not (Test-Path $logDir)) { New-Item -ItemType Directory $logDir }

# Build environment prefix
$envPrefix = ""
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

foreach ($service in $services) {
    Write-Host "Booting $($service.Name)..." -ForegroundColor Magenta
    
    # Path Normalization Fix
    $rawPath = Join-Path $root $service.Path.Replace("/", "\")
    if (-not (Test-Path $rawPath)) {
        Write-Host "ERROR: Path not found: $rawPath" -ForegroundColor Red
        continue
    }
    $targetPath = (Resolve-Path $rawPath).Path
    
    $logFile = Join-Path $logDir "$($service.Name).log"
    
    # Injecting environment variables directly into the command string
    $fullCmd = "$envPrefix $($service.Cmd)"
    Write-Host "Executing: $fullCmd" -ForegroundColor Gray
    
    Start-Process powershell.exe -ArgumentList "-NoProfile", "-NoExit", "-Command", "$fullCmd 2>&1 | Tee-Object -FilePath '$logFile'" -WorkingDirectory $targetPath
    Start-Sleep -Seconds 1
}

Write-Host "[STEP 3] Intelligent Mesh Handshake..." -ForegroundColor Yellow
$retries = 0
$maxRetries = 15
$systemReady = $false

$endpoints = @(
    @{ Name = "Gateway";   Url = "http://127.0.0.1:4080/health" },
    @{ Name = "Auth";      Url = "http://127.0.0.1:4005/health" },
    @{ Name = "WorkerOps"; Url = "http://127.0.0.1:8082/health" }
)

while (-not $systemReady -and $retries -lt $maxRetries) {
    $allUp = $true
    foreach ($ep in $endpoints) {
        try {
            $response = Invoke-WebRequest -Uri $ep.Url -UseBasicParsing -TimeoutSec 2 -ErrorAction SilentlyContinue
            if ($response.StatusCode -eq 200) {
                Write-Host "  [+] $($ep.Name) UP" -ForegroundColor Green
            } else {
                $allUp = $false
                Write-Host "  [-] $($ep.Name) DOWN ($($response.StatusCode))" -ForegroundColor Gray
            }
        } catch {
            $allUp = $false
            Write-Host "  [-] $($ep.Name) UNREACHABLE" -ForegroundColor Gray
        }
    }

    if ($allUp) {
        $systemReady = $true
        Write-Host "✅ Backend Mesh Handshake Successful!" -ForegroundColor Green
    } else {
        $retries++
        Write-Host "Waiting for Mesh... (Attempt $retries/$maxRetries)" -ForegroundColor DarkGray
        Start-Sleep -Seconds 3
    }
}

if (-not $systemReady) {
    Write-Host "❌ FATAL: API Gateway failed to initialize. Aborting Frontend launch." -ForegroundColor Red
    exit 1
}

Write-Host "[STEP 4] Launching Enterprise Frontend..." -ForegroundColor Green
$rawFePath = Join-Path $root "apps/frontend".Replace("/", "\")
$fePath = (Resolve-Path $rawFePath).Path
# Consolidated environment for Port 3007 Bridge
$envCmd = '$env:PORT="3007";'
$cleanCmd = 'if (Test-Path .next) { Remove-Item -Recurse -Force .next }; if (Test-Path node_modules\.cache) { Remove-Item -Recurse -Force node_modules\.cache }; if (Test-Path ..\api\dist) { Remove-Item -Recurse -Force ..\api\dist };'
Start-Process powershell.exe -ArgumentList "-NoExit", "-Command", "$envCmd $cleanCmd npm run dev" -WorkingDirectory $fePath

Write-Host "`nSYSTEM STABILIZED. Access dashboard at http://127.0.0.1:3007" -ForegroundColor White
