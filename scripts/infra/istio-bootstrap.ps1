# Istio Bootstrap Script for MultiAgent Hardening (Windows Native)
# Profile: Default (High Availability Ready)

$ISTIO_VERSION = "1.21.0"
Write-Host ">>> Bootstrapping Istio Service Mesh..." -ForegroundColor Cyan

# 1. Check if istioctl is in path
if (!(Get-Command istioctl -ErrorAction SilentlyContinue)) {
    Write-Host ">>> istioctl not found. Downloading version $ISTIO_VERSION for Windows..." -ForegroundColor Yellow
    $url = "https://github.com/istio/istio/releases/download/$ISTIO_VERSION/istioctl-$ISTIO_VERSION-win.zip"
    $dest = "$env:TEMP\istio.zip"
    $extractPath = "$env:USERPROFILE\istio-bin"

    if (!(Test-Path $extractPath)) { New-Item -ItemType Directory -Path $extractPath }

    Invoke-WebRequest -Uri $url -OutFile $dest
    Expand-Archive -Path $dest -DestinationPath $extractPath -Force
    
    $env:PATH += ";$extractPath"
    Write-Host ">>> istioctl installed to $extractPath" -ForegroundColor Green
}

# 2. Install Istio with Default Profile
Write-Host ">>> Installing Istio Control Plane (this may take a few minutes)..."
istioctl install --set profile=default -y

# 3. Label Namespace for Sidecar Injection
Write-Host ">>> Enabling Sidecar Injection for 'multiagent' namespace..."
kubectl label namespace multiagent istio-injection=enabled --overwrite

# 4. Verify Installation
Write-Host ">>> Verifying Istio mesh status..."
kubectl get pods -n istio-system
Write-Host ">>> Istio Bootstrap Complete." -ForegroundColor Green
