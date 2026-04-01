# tune-os.ps1
# This script tunes Windows network parameters to support 10,000+ concurrent connections.
# REQUIRES ADMINISTRATOR PRIVILEGES.

Write-Host "🚀 Tuning Windows OS for high-concurrency (10k+ connections)..." -ForegroundColor Cyan

# 1. Expand Dynamic Port Range (TCP/UDP)
Write-Host "✅ Expanding Dynamic Port Range (10,000 - 65,535)..."
netsh int ipv4 set dynamicport tcp start=10000 num=55535
netsh int ipv4 set dynamicport udp start=10000 num=55535

# 2. Increase MaxUserPort (Registry)
$maxUserPortPath = "HKLM:\SYSTEM\CurrentControlSet\Services\Tcpip\Parameters"
$maxUserPortName = "MaxUserPort"
$maxUserPortValue = 65534

Write-Host "✅ Setting MaxUserPort to 65534..."
if (-not (Test-Path $maxUserPortPath)) {
    New-Item -Path $maxUserPortPath -Force | Out-Null
}
New-ItemProperty -Path $maxUserPortPath -Name $maxUserPortName -Value $maxUserPortValue -PropertyType DWord -Force | Out-Null

# 3. Reduce TcpTimedWaitDelay (Registry)
$tcpDelayName = "TcpTimedWaitDelay"
$tcpDelayValue = 30 # seconds

Write-Host "✅ Setting TcpTimedWaitDelay to 30s..."
New-ItemProperty -Path $maxUserPortPath -Name $tcpDelayName -Value $tcpDelayValue -PropertyType DWord -Force | Out-Null

Write-Host "`n🎉 OS Tuning Applied Successfully!" -ForegroundColor Green
Write-Host "⚠️  IMPORTANT: YOU MUST RESTART YOUR COMPUTER for these changes to take effect." -ForegroundColor Yellow
