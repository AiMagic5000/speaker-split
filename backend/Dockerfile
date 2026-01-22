# Backend Dockerfile - CPU Version (no GPU required)
FROM python:3.11-slim

# Install system dependencies
RUN apt-get update && apt-get install -y \
    ffmpeg \
    git \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy requirements and patch scripts first for caching
COPY requirements.txt .
COPY patch_whisperx.py .
COPY patch_vad.py .

# Install PyTorch CPU version first
RUN pip install --no-cache-dir \
    torch==2.1.2 \
    torchaudio==2.1.2 \
    --index-url https://download.pytorch.org/whl/cpu

# Install WhisperX and pyannote.audio
RUN pip install --no-cache-dir "whisperx @ git+https://github.com/m-bain/whisperx.git@v3.1.1"
RUN pip install --no-cache-dir pyannote.audio==3.1.1

# Install remaining requirements
RUN pip install --no-cache-dir -r requirements.txt

# CRITICAL: Fix version conflicts AFTER all installations
# - huggingface-hub <1.0 required by transformers
# - transformers 4.44.2 is compatible with huggingface-hub 0.x
# - numpy 1.26.4 required for binary compatibility with ML libraries
RUN pip install --no-cache-dir --force-reinstall \
    huggingface-hub==0.26.5 \
    transformers==4.44.2 \
    numpy==1.26.4

# CRITICAL: Patch whisperx to add missing TranscriptionOptions parameters
# newer faster-whisper versions require these additional parameters
RUN python patch_whisperx.py

# CRITICAL: Patch whisperx/vad.py to handle 301 redirects
# The VAD model download URL returns 301 which urllib doesn't follow
RUN python patch_vad.py

# Verify versions
RUN python -c "import torch; print(f'PyTorch version: {torch.__version__}')"
RUN python -c "import faster_whisper; print(f'faster-whisper version: {faster_whisper.__version__}')"
RUN python -c "import huggingface_hub; print(f'huggingface-hub version: {huggingface_hub.__version__}')"
RUN python -c "import transformers; print(f'transformers version: {transformers.__version__}')"
RUN python -c "import numpy; print(f'numpy version: {numpy.__version__}')"

# Copy application code
COPY . .

# Create uploads directory
RUN mkdir -p /app/uploads

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
