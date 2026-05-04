param (
    [int]$DurationMinutes = 60,
    [string]$OutputFile = "soak-audit.log"
)

$EndTime = (Get-Date).AddMinutes($DurationMinutes)
"--- Soak Audit Started at $(Get-Date) ---" | Out-File $OutputFile

while ((Get-Date) -lt $EndTime) {
    "--- Stats at $(Get-Date) ---" | Out-File $OutputFile -Append
    docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}" | Out-File $OutputFile -Append
    Start-Sleep -Seconds 60
}

"--- Soak Audit Ended at $(Get-Date) ---" | Out-File $OutputFile -Append
