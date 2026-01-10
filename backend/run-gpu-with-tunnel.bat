@echo off
echo ============================================
echo Speaker Split GPU Backend + Cloudflare Tunnel
echo ============================================
echo.

cd /d "%~dp0"

REM Check if cloudflared exists
if not exist "%USERPROFILE%\cloudflared.exe" (
    echo ERROR: cloudflared.exe not found in %USERPROFILE%
    echo Please run install-cloudflared.ps1 first
    pause
    exit /b 1
)

REM Start cloudflared tunnel in background
echo Starting Cloudflare Tunnel...
echo Tunnel ID: c1156f78-c5ce-4bc8-9a1f-dd9db15066d1
echo Public URL: https://speaker-gpu.alwaysencrypted.com
start "Cloudflare Tunnel" cmd /c "%USERPROFILE%\cloudflared.exe tunnel --config %USERPROFILE%\.cloudflared\config.yml run"

REM Wait for tunnel to initialize
echo Waiting for tunnel to connect...
timeout /t 5 /nobreak >nul

REM Check if venv exists, create if not
if not exist "venv" (
    echo Creating Python virtual environment...
    python -m venv venv
    call venv\Scripts\activate.bat

    echo Installing PyTorch with CUDA support...
    pip install torch torchaudio --index-url https://download.pytorch.org/whl/cu121

    echo Installing WhisperX...
    pip install "whisperx @ git+https://github.com/m-bain/whisperx.git@v3.1.1"

    echo Installing pyannote.audio...
    pip install pyannote.audio==3.1.1

    echo Installing FastAPI and dependencies...
    pip install fastapi==0.109.0 uvicorn[standard]==0.27.0 python-multipart==0.0.6 pydantic==2.5.3 pydub==0.25.1 pandas==2.1.4
) else (
    call venv\Scripts\activate.bat
)

REM Set environment variables
set HF_TOKEN=hf_Jl0zlTU0fIwVcUzNHQqRJaVqMEytKAZaeX
set DEVICE=cuda
set WHISPER_MODEL=large-v3

echo.
echo ============================================
echo GPU Backend Configuration:
echo   Device: %DEVICE%
echo   Whisper Model: %WHISPER_MODEL% (best quality)
echo   Local URL: http://localhost:8000
echo   Public URL: https://speaker-gpu.alwaysencrypted.com
echo ============================================
echo.
echo Backend is starting...
echo All website users will now use YOUR GPU for processing!
echo.
echo Press Ctrl+C to stop the backend
echo Close the "Cloudflare Tunnel" window to stop the tunnel
echo.

python -m uvicorn main:app --host 0.0.0.0 --port 8000
