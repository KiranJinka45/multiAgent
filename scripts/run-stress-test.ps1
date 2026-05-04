# scripts/run-stress-test.ps1

$ErrorActionPreference = "Stop"

function Write-Step {
    param([string]$Message)
    Write-Host "`n--- $Message ---" -ForegroundColor Cyan
}

try {
    Write-Step "STARTING PRODUCTION STRESS TEST"

    # 0. Health Check
    Write-Step "Checking Backend Health"
    try {
        $health = Invoke-RestMethod -Uri "http://localhost:3500/api/whoami" -TimeoutSec 5
        Write-Host "✅ Backend is alive (Region: $($health.region))" -ForegroundColor Green
    } catch {
        Write-Host "❌ Backend unreachable at http://localhost:3500/api/whoami" -ForegroundColor Red
        throw "ABORTING: Backend must be running before stress test."
    }

    # 1. Inject Chaos Scenarios
    Write-Step "Injecting Chaos: Telemetry Loss"
    try { Invoke-RestMethod -Uri "http://localhost:3500/debug/drop-telemetry" -TimeoutSec 5 } catch { Write-Host "⚠️ Telemetry loss injection timed out (expected)" -ForegroundColor Yellow }

    Write-Host "--- Injecting Chaos: Node Anomaly (api-service) ---"
    try { Invoke-RestMethod -Uri "http://localhost:3500/debug/chaos?type=NODE_ANOMALY&nodeId=api-service&score=0.9" -TimeoutSec 5 } catch { Write-Host "⚠️ Node anomaly injection timed out (expected)" -ForegroundColor Yellow }

    Write-Host "--- Injecting Chaos: Regional Failover ---"
    try { Invoke-RestMethod -Uri "http://localhost:3500/debug/failover?source=us-east-1" -TimeoutSec 5 } catch { Write-Host "⚠️ Failover injection timed out (expected)" -ForegroundColor Yellow }

    Write-Step "Injecting Chaos: Watchdog Integrity (False Negative)"
    try { Invoke-RestMethod -Uri "http://localhost:3500/debug/watchdog-test?mode=FALSE_NEGATIVE" -TimeoutSec 5 } catch { Write-Host "⚠️ Watchdog test injection timed out (expected)" -ForegroundColor Yellow }

    # 2. Wait for system state to propagate
    Write-Step "Waiting for SRE Engine to process chaos and stabilize ROI (120s)"
    Start-Sleep -Seconds 120

    # 3. Run Data-Plane Validation (k6)
    Write-Step "Running Data-Plane Validation (k6)"
    k6 run validation/k6/session-failover.js
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Load test failed. Data-plane integrity compromised." -ForegroundColor Red
        exit 1
    }

    # 4. Run Comprehensive Validation Suite
    Write-Step "Running Assertion Suite"
    # No more try/catch - we must pass all gates
    npx tsx validation/run-validation.ts
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Assertion suite failed. Certification aborted." -ForegroundColor Red
        exit 1
    }

    # 5. Generate Certification Report
    Write-Step "Generating Audit-Grade Report"
    npx tsx scripts/generate-certification-report.ts

    Write-Host "`n🎉 STRESS TEST AND CERTIFICATION COMPLETE." -ForegroundColor Green
    exit 0
} catch {
    Write-Host "`n❌ STRESS TEST FAILED: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}
