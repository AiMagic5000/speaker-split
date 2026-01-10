# Backend Dockerfile - CPU Version (no GPU required)
FROM python:3.11-slim

# Install system dependencies
RUN apt-get update && apt-get install -y \
    ffmpeg \
    git \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy requirements first for caching
COPY requirements.txt .

# Install PyTorch CPU version first (pinned versions for compatibility)
RUN pip install --no-cache-dir \
    torch==2.1.2 \
    torchaudio==2.1.2 \
    --index-url https://download.pytorch.org/whl/cpu

# Install WhisperX with pinned version for stability
RUN pip install --no-cache-dir "whisperx @ git+https://github.com/m-bain/whisperx.git@v3.1.1"

# Install other requirements (skip torch since already installed)
RUN pip install --no-cache-dir --no-deps pyannote.audio==3.1.1 && \
    pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Create uploads directory
RUN mkdir -p /app/uploads

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
