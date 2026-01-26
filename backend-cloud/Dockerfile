FROM python:3.11-slim

WORKDIR /app

# Install ffmpeg for audio processing
RUN apt-get update && apt-get install -y ffmpeg && rm -rf /var/lib/apt/lists/*

RUN pip install --no-cache-dir \
    fastapi==0.109.0 \
    uvicorn[standard]==0.27.0 \
    python-multipart==0.0.6 \
    pydantic==2.5.3 \
    python-dotenv==1.0.0 \
    aiohttp==3.9.1

COPY main.py .

RUN mkdir -p /app/uploads

EXPOSE 8000

CMD ["python", "-m", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
