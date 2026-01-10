@echo off
echo ============================================
echo Speaker Split - Windows GPU Setup
echo ============================================
echo.

REM Check Python
python --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Python not found. Install Python 3.11 from python.org
    pause
    exit /b 1
)

REM Create virtual environment
if not exist "venv" (
    echo Creating virtual environment...
    python -m venv venv
)

echo Activating virtual environment...
call venv\Scripts\activate.bat

REM Install PyTorch with CUDA support
echo.
echo Installing PyTorch with CUDA support...
pip install torch torchaudio --index-url https://download.pytorch.org/whl/cu121

REM Install WhisperX
echo.
echo Installing WhisperX...
pip install git+https://github.com/m-bain/whisperx.git@v3.1.1

REM Install pyannote.audio
echo.
echo Installing pyannote.audio...
pip install pyannote.audio==3.1.1

REM Install other dependencies
echo.
echo Installing FastAPI and other dependencies...
pip install fastapi==0.109.0 uvicorn[standard]==0.27.0 python-multipart==0.0.6 pydantic==2.5.3 pydub==0.25.1 pandas==2.1.4

echo.
echo ============================================
echo Setup complete!
echo ============================================
echo.
echo To run the backend with GPU:
echo   1. Set your HuggingFace token: set HF_TOKEN=hf_Jl0zlTU0fIwVcUzNHQqRJaVqMEytKAZaeX
echo   2. Run: python -m uvicorn main:app --host 0.0.0.0 --port 8000
echo.
pause
