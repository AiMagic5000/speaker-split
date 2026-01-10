# Install Cloudflared on Windows
Write-Host "Installing Cloudflared for Windows..." -ForegroundColor Cyan

# Download cloudflared
$url = "https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe"
$output = "$env:USERPROFILE\cloudflared.exe"

Write-Host "Downloading cloudflared..."
Invoke-WebRequest -Uri $url -OutFile $output

# Add to PATH if not already there
$userPath = [Environment]::GetEnvironmentVariable("Path", "User")
if ($userPath -notlike "*$env:USERPROFILE*") {
    [Environment]::SetEnvironmentVariable("Path", "$userPath;$env:USERPROFILE", "User")
    Write-Host "Added cloudflared to PATH"
}

Write-Host ""
Write-Host "Cloudflared installed to: $output" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Open a new PowerShell window"
Write-Host "2. Run: cloudflared tunnel login"
Write-Host "3. Then run: .\setup-gpu-tunnel.ps1"
