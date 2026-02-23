# MultiAgent Quick Fix Script
echo "Stopping stale processes..."
Stop-Process -Name "node" -ErrorAction SilentlyContinue

echo "Cleaning Next.js cache..."
if (Test-Path ".next") {
    Remove-Item -Path ".next" -Recurse -Force
}

echo "Updating environment check..."
$envFile = ".env.local"
if (Test-Path $envFile) {
    $content = Get-Content $envFile
    if ($content -match "sb_publishable_") {
        Write-Warning "CRITICAL: Your .env.local contains a Stripe key instead of a Supabase key."
        Write-Host "Supabase keys MUST start with 'eyJ'." -ForegroundColor Yellow
    }
}

echo "Starting fresh development server..."
npm run dev
