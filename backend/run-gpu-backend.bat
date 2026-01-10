@echo off
echo Starting Speaker Split Backend with GPU...
echo.

cd /d "%~dp0"
call venv\Scripts\activate.bat

REM Set environment variables
set HF_TOKEN=hf_Jl0zlTU0fIwVcUzNHQqRJaVqMEytKAZaeX
set DEVICE=cuda
set WHISPER_MODEL=large-v3

echo HuggingFace Token: Set
echo Device: %DEVICE%
echo Whisper Model: %WHISPER_MODEL%
echo.
echo Backend starting on http://localhost:8000
echo Press Ctrl+C to stop
echo.

python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
