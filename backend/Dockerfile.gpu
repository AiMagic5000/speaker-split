# Backend Dockerfile
FROM nvidia/cuda:12.1-base-ubuntu22.04

# Install Python and system dependencies
RUN apt-get update && apt-get install -y \
    python3.11 \
    python3-pip \
    python3.11-venv \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

# Set Python alias
RUN ln -sf /usr/bin/python3.11 /usr/bin/python

WORKDIR /app

# Copy requirements first for caching
COPY requirements.txt .

# Install PyTorch with CUDA
RUN pip install --no-cache-dir torch torchaudio --index-url https://download.pytorch.org/whl/cu121

# Install WhisperX
RUN pip install --no-cache-dir git+https://github.com/m-bain/whisperx.git

# Install other requirements
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Create uploads directory
RUN mkdir -p /app/uploads

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
