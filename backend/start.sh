#!/bin/bash
# Start the Speaker Split backend server

# Set environment variables
export HF_TOKEN="${HF_TOKEN:-}"
export UPLOAD_DIR="${UPLOAD_DIR:-./uploads}"
export WHISPER_MODEL="${WHISPER_MODEL:-large-v2}"
export DEVICE="${DEVICE:-cuda}"

# Check for HuggingFace token
if [ -z "$HF_TOKEN" ]; then
    echo "Warning: HF_TOKEN not set. Speaker diarization will not work."
    echo "Get your token at: https://huggingface.co/settings/tokens"
    echo "Also accept agreements for:"
    echo "  - https://huggingface.co/pyannote/speaker-diarization-3.1"
    echo "  - https://huggingface.co/pyannote/segmentation-3.0"
fi

# Create uploads directory
mkdir -p "$UPLOAD_DIR"

# Start server
echo "Starting Speaker Split backend on http://localhost:8000"
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
