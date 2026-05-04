# BUILD SCRIPT for v1.0.2 Images
$images = @(
    @{ Name = "auth-service"; Path = "apps/auth-service" },
    @{ Name = "gateway";      Path = "apps/gateway" },
    @{ Name = "worker";       Path = "apps/worker" },
    @{ Name = "billing-service"; Path = "apps/billing-service" },
    @{ Name = "core-api";     Path = "apps/core-api" },
    @{ Name = "api";          Path = "apps/api" },
    @{ Name = "frontend";     Path = "apps/frontend" }
)

foreach ($img in $images) {
    Write-Host "Building $($img.Name):v1.0.2..." -ForegroundColor Cyan
    docker build -t "multiagent/$($img.Name):v1.0.2" -f "$($img.Path)/Dockerfile" .
    if ($LASTEXITCODE -ne 0) {
        Write-Host "FAILED to build $($img.Name)" -ForegroundColor Red
        exit 1
    }
}

Write-Host "All images built successfully!" -ForegroundColor Green
