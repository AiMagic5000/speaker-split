@echo off
echo ============================================
echo Speaker Split GPU Backend + Cloudflare Tunnel
echo ============================================
echo.

cd /d "%~dp0"

REM Start cloudflared tunnel in background
echo Starting Cloudflare Tunnel...
start "Cloudflare Tunnel" cmd /c "cloudflared tunnel --config %USERPROFILE%\.cloudflared\config-gpu.yml run"

REM Wait a moment for tunnel to initialize
timeout /t 3 /nobreak >nul

REM Activate virtual environment
call venv\Scripts\activate.bat

REM Set environment variables
set HF_TOKEN=hf_Jl0zlTU0fIwVcUzNHQqRJaVqMEytKAZaeX
set DEVICE=cuda
set WHISPER_MODEL=large-v3

echo.
echo ============================================
echo GPU Backend Configuration:
echo   Device: %DEVICE%
echo   Whisper Model: %WHISPER_MODEL%
echo   Local URL: http://localhost:8000
echo   Public URL: https://gpu.speakersplit.alwaysencrypted.com
echo ============================================
echo.
echo Press Ctrl+C to stop the backend
echo Close the "Cloudflare Tunnel" window to stop the tunnel
echo.

python -m uvicorn main:app --host 0.0.0.0 --port 8000
