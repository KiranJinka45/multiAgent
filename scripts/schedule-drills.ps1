# ZTAN SURVIVABILITY SCHEDULER
# Automates the setup of recurring operational drills.

$Drills = @(
    @{ Month = "January, July"; Task = "Cold-Start Recovery (OCR)"; Command = "pnpm run test:chaos" }
    @{ Month = "February, August"; Task = "Friction Audit & Pruning"; Command = "pnpm tsx scripts/process-friction.ts" }
    @{ Month = "March, September"; Task = "Adversarial Stress Test"; Command = "pnpm exec ztanctl drill breach" }
    @{ Month = "April, October"; Task = "Dependency Entropy Review"; Command = "snyk test" }
    @{ Month = "May, November"; Task = "Identity/Trust Rotation"; Command = "pnpm exec ztanctl identity register" }
    @{ Month = "June, December"; Task = "Operator Certification"; Command = "pnpm run test:certify:trust" }
)

Write-Host "`n🗓️  ZTAN QUARTERLY SURVIVABILITY CALENDAR" -ForegroundColor Cyan
Write-Host "----------------------------------------"

foreach ($Drill in $Drills) {
    Write-Host "[$($Drill.Month)]" -ForegroundColor Yellow -NoNewline
    Write-Host ": $($Drill.Task)" -ForegroundColor White
    Write-Host "   Command: $($Drill.Command)" -ForegroundColor Gray
}

Write-Host "`n✅ Automation hooks ready." -ForegroundColor Green
Write-Host "Tip: Integrate these commands into your team's project management tool (Jira/GitHub Issues)."
