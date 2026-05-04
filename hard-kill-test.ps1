# Clean Hard-Kill SRE Test
# 1. Clear state
Write-Host "--- Clearing state ---"
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force
Start-Sleep -Seconds 5

# 2. Start API
Write-Host "--- Starting API ---"
Start-Process powershell.exe -ArgumentList "-NoProfile", "-Command", "cd apps/api; pnpm dev > ../../logs/API_CLEAN.log 2>&1" -WindowStyle Hidden
Start-Sleep -Seconds 15

# 3. Start Worker (Normal)
Write-Host "--- Starting Worker ---"
$envPrefix = "`$env:CHAOS_STAGE='normal';`$env:NODE_ENV='development';`$env:STRESS_DELAY='true';"
Start-Process powershell.exe -ArgumentList "-NoProfile", "-Command", "cd apps/worker; $envPrefix pnpm dev > ../../logs/WORKER_KILL_TEST.log 2>&1" -WindowStyle Hidden
Start-Sleep -Seconds 15

# 4. Submit Job
Write-Host "--- Submitting Job ---"
$missionId = [guid]::NewGuid().ToString()
pnpm --filter @packages/sdk run stress-test 1 1
Start-Sleep -Seconds 10 # Wait for it to start processing

# 5. KILL WORKER
Write-Host "--- CRITICAL FAILURE: KILLING WORKER ---"
Get-Process node | Where-Object { $_.CommandLine -like "*apps/worker*" } | Stop-Process -Force
Write-Host "--- Worker killed. Waiting for lock expiry (or manual restart) ---"
Start-Sleep -Seconds 5

# 6. Check status
Write-Host "--- Checking Queue status ---"
npx tsx -r tsconfig-paths/register packages/queue/inspect-queue.ts

# 7. Restart Worker
Write-Host "--- Restarting Worker to recover job ---"
Start-Process powershell.exe -ArgumentList "-NoProfile", "-Command", "cd apps/worker; $envPrefix pnpm dev >> ../../logs/WORKER_KILL_TEST.log 2>&1" -WindowStyle Hidden
Start-Sleep -Seconds 30

# 8. Final Check
Write-Host "--- Final check ---"
npx tsx -r tsconfig-paths/register packages/queue/inspect-queue.ts
