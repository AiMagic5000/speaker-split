# Setup Cloudflare Tunnel for GPU Backend
Write-Host "Setting up Cloudflare Tunnel for Speaker Split GPU Backend" -ForegroundColor Cyan
Write-Host ""

$tunnelName = "speaker-split-gpu"
$hostname = "gpu.speakersplit.alwaysencrypted.com"
$localService = "http://localhost:8000"

# Check if cloudflared is available
if (!(Get-Command cloudflared -ErrorAction SilentlyContinue)) {
    Write-Host "ERROR: cloudflared not found. Run install-cloudflared.ps1 first" -ForegroundColor Red
    exit 1
}

# Check if logged in
Write-Host "Checking Cloudflare authentication..."
$tunnels = cloudflared tunnel list 2>&1
if ($tunnels -like "*error*" -or $tunnels -like "*login*") {
    Write-Host "Please login to Cloudflare first:" -ForegroundColor Yellow
    Write-Host "  cloudflared tunnel login"
    exit 1
}

# Create tunnel if it doesn't exist
Write-Host "Creating tunnel: $tunnelName"
cloudflared tunnel create $tunnelName 2>$null

# Get tunnel ID
$tunnelInfo = cloudflared tunnel list | Select-String $tunnelName
if ($tunnelInfo) {
    $tunnelId = ($tunnelInfo -split '\s+')[0]
    Write-Host "Tunnel ID: $tunnelId" -ForegroundColor Green
} else {
    Write-Host "ERROR: Could not find tunnel ID" -ForegroundColor Red
    exit 1
}

# Create config file
$configDir = "$env:USERPROFILE\.cloudflared"
if (!(Test-Path $configDir)) {
    New-Item -ItemType Directory -Path $configDir | Out-Null
}

$configContent = @"
tunnel: $tunnelId
credentials-file: $configDir\$tunnelId.json

ingress:
  - hostname: $hostname
    service: $localService
  - service: http_status:404
"@

$configPath = "$configDir\config-gpu.yml"
$configContent | Out-File -FilePath $configPath -Encoding UTF8
Write-Host "Config written to: $configPath" -ForegroundColor Green

# Create DNS record
Write-Host ""
Write-Host "Creating DNS record for $hostname..."
cloudflared tunnel route dns $tunnelName $hostname 2>$null

Write-Host ""
Write-Host "============================================" -ForegroundColor Green
Write-Host "Tunnel setup complete!" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Green
Write-Host ""
Write-Host "To start the tunnel, run:" -ForegroundColor Yellow
Write-Host "  cloudflared tunnel --config $configPath run"
Write-Host ""
Write-Host "Or use the run-gpu-with-tunnel.bat script"
