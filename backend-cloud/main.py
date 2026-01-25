#!/usr/bin/env python3
"""
Speaker Split Backend - Cloud API Version
Uses AssemblyAI for transcription + speaker diarization
"""

import os
import json
import asyncio
import aiohttp
import time
from pathlib import Path
from typing import Optional
from datetime import datetime
import logging

from fastapi import FastAPI, HTTPException, UploadFile, File, Form, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel
from dotenv import load_dotenv

load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# FastAPI app
app = FastAPI(
    title="Speaker Split API",
    description="Audio processing with cloud-based speaker diarization",
    version="2.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configuration
ASSEMBLYAI_API_KEY = os.environ.get("ASSEMBLYAI_API_KEY", "")
UPLOAD_DIR = os.environ.get("UPLOAD_DIR", "./uploads")

# In-memory job storage
jobs = {}

# API validation status
api_valid = False
api_error = ""


def validate_api_key():
    """Validate AssemblyAI API key on startup."""
    global api_valid, api_error

    if not ASSEMBLYAI_API_KEY:
        api_error = "ASSEMBLYAI_API_KEY environment variable is not set"
        logger.error(f"API key validation failed: {api_error}")
        return False

    api_valid = True
    logger.info("AssemblyAI API key configured")
    return True


@app.on_event("startup")
async def startup_event():
    """Validate configuration on startup."""
    logger.info("=" * 50)
    logger.info("Speaker Split Backend (Cloud) Starting...")
    logger.info(f"UPLOAD_DIR: {UPLOAD_DIR}")
    logger.info(f"ASSEMBLYAI_API_KEY: {'Set' if ASSEMBLYAI_API_KEY else 'NOT SET'}")

    Path(UPLOAD_DIR).mkdir(parents=True, exist_ok=True)
    validate_api_key()

    if not api_valid:
        logger.error("CRITICAL: AssemblyAI API key not configured!")
        logger.error("Get a key from https://www.assemblyai.com/")

    logger.info("=" * 50)


@app.get("/")
async def root():
    return {"message": "Speaker Split API", "version": "2.0.0", "engine": "AssemblyAI Cloud"}


@app.get("/health")
async def health():
    return {
        "status": "healthy",
        "api_configured": api_valid,
        "api_error": api_error if not api_valid else None,
        "engine": "AssemblyAI",
        "device": "cloud"
    }


class ProcessRequest(BaseModel):
    jobId: str
    audioPath: str
    speakerCount: int = 2
    outputDir: str


def update_job_status(job_id: str, updates: dict):
    """Update job status."""
    if job_id not in jobs:
        jobs[job_id] = {}

    jobs[job_id].update(updates)

    # Save to file
    job_dir = Path(UPLOAD_DIR) / job_id
    job_dir.mkdir(parents=True, exist_ok=True)
    status_file = job_dir / "status.json"

    with open(status_file, "w") as f:
        json.dump(jobs[job_id], f, indent=2)

    logger.info(f"Job {job_id}: {updates.get('stage', updates.get('status', ''))}")


async def upload_to_assemblyai(audio_path: str) -> str:
    """Upload audio file to AssemblyAI and return URL."""
    headers = {"authorization": ASSEMBLYAI_API_KEY}

    async with aiohttp.ClientSession() as session:
        with open(audio_path, "rb") as f:
            async with session.post(
                "https://api.assemblyai.com/v2/upload",
                headers=headers,
                data=f
            ) as response:
                if response.status != 200:
                    raise Exception(f"Upload failed: {await response.text()}")
                result = await response.json()
                return result["upload_url"]


async def transcribe_with_assemblyai(audio_url: str, speaker_count: int) -> dict:
    """Submit transcription job to AssemblyAI."""
    headers = {
        "authorization": ASSEMBLYAI_API_KEY,
        "content-type": "application/json"
    }

    payload = {
        "audio_url": audio_url,
        "speaker_labels": True,
        "speakers_expected": speaker_count
    }

    async with aiohttp.ClientSession() as session:
        # Submit job
        async with session.post(
            "https://api.assemblyai.com/v2/transcript",
            headers=headers,
            json=payload
        ) as response:
            if response.status != 200:
                raise Exception(f"Transcription request failed: {await response.text()}")
            result = await response.json()
            transcript_id = result["id"]

        # Poll for completion
        while True:
            async with session.get(
                f"https://api.assemblyai.com/v2/transcript/{transcript_id}",
                headers=headers
            ) as response:
                result = await response.json()
                status = result["status"]

                if status == "completed":
                    return result
                elif status == "error":
                    raise Exception(f"Transcription failed: {result.get('error', 'Unknown error')}")

                await asyncio.sleep(3)


async def process_audio_cloud(job_id: str, audio_path: str, speaker_count: int, output_dir: str):
    """Process audio using AssemblyAI cloud API."""
    try:
        if not api_valid:
            update_job_status(job_id, {
                "status": "error",
                "error": "AssemblyAI API key not configured. Set ASSEMBLYAI_API_KEY environment variable."
            })
            return

        update_job_status(job_id, {
            "status": "processing",
            "progress": 10,
            "stage": "Uploading audio to cloud..."
        })

        # Upload audio
        audio_url = await upload_to_assemblyai(audio_path)
        logger.info(f"Audio uploaded: {audio_url[:50]}...")

        update_job_status(job_id, {
            "status": "processing",
            "progress": 30,
            "stage": "Transcribing with AI..."
        })

        # Transcribe
        result = await transcribe_with_assemblyai(audio_url, speaker_count)

        update_job_status(job_id, {
            "status": "processing",
            "progress": 70,
            "stage": "Processing speaker segments..."
        })

        # Process results
        utterances = result.get("utterances", [])
        words = result.get("words", [])

        # Build transcript with speaker labels
        transcript = []
        speakers_found = set()

        for utterance in utterances:
            speaker = utterance.get("speaker", "A")
            speakers_found.add(speaker)
            transcript.append({
                "speaker": f"Speaker {speaker}",
                "start": utterance["start"] / 1000,  # ms to seconds
                "end": utterance["end"] / 1000,
                "text": utterance["text"]
            })

        # Create speaker list
        speakers = [{"id": f"Speaker {s}", "name": f"Speaker {s}"} for s in sorted(speakers_found)]

        # Save results
        Path(output_dir).mkdir(parents=True, exist_ok=True)

        transcript_file = Path(output_dir) / "transcript.json"
        with open(transcript_file, "w") as f:
            json.dump(transcript, f, indent=2)

        # Save full result
        full_result_file = Path(output_dir) / "assemblyai_result.json"
        with open(full_result_file, "w") as f:
            json.dump(result, f, indent=2)

        update_job_status(job_id, {
            "status": "completed",
            "progress": 100,
            "stage": "Complete",
            "speakers": speakers,
            "transcript": transcript,
            "outputs": {
                "transcript": str(transcript_file)
            }
        })

        logger.info(f"Job {job_id} completed successfully")

    except Exception as e:
        logger.error(f"Job {job_id} failed: {str(e)}")
        update_job_status(job_id, {
            "status": "error",
            "error": str(e)
        })


async def stream_process(job_id: str, audio_path: str, speaker_count: int, output_dir: str):
    """Process audio and yield progress updates."""
    try:
        if not api_valid:
            yield {"error": "AssemblyAI API key not configured. Get a free key at https://www.assemblyai.com/"}
            return

        yield {"progress": 10, "stage": "Uploading audio to cloud..."}

        # Upload audio
        audio_url = await upload_to_assemblyai(audio_path)
        logger.info(f"Audio uploaded: {audio_url[:50]}...")

        yield {"progress": 30, "stage": "Transcribing with AI..."}

        # Transcribe
        result = await transcribe_with_assemblyai(audio_url, speaker_count)

        yield {"progress": 70, "stage": "Processing speaker segments..."}

        # Process results
        utterances = result.get("utterances", [])

        # Build transcript with speaker labels
        transcript = []
        speakers_found = set()

        for utterance in utterances:
            speaker = utterance.get("speaker", "A")
            speakers_found.add(speaker)
            transcript.append({
                "speaker": f"Speaker {speaker}",
                "start": utterance["start"] / 1000,
                "end": utterance["end"] / 1000,
                "text": utterance["text"]
            })

        speakers = [{"id": f"Speaker {s}", "name": f"Speaker {s}"} for s in sorted(speakers_found)]

        # Save results
        Path(output_dir).mkdir(parents=True, exist_ok=True)
        transcript_file = Path(output_dir) / "transcript.json"
        with open(transcript_file, "w") as f:
            json.dump(transcript, f, indent=2)

        yield {
            "progress": 100,
            "stage": "Complete",
            "status": "completed",
            "speakers": speakers,
            "transcript": transcript
        }

    except Exception as e:
        logger.error(f"Job {job_id} failed: {str(e)}")
        yield {"error": str(e)}


from fastapi.responses import StreamingResponse as FastAPIStreamingResponse

@app.post("/transcribe")
async def transcribe_endpoint(request: ProcessRequest):
    """Transcription endpoint - streams progress."""
    async def generate():
        async for update in stream_process(
            request.jobId,
            request.audioPath,
            request.speakerCount,
            request.outputDir
        ):
            yield json.dumps(update) + "\n"

    return FastAPIStreamingResponse(generate(), media_type="text/event-stream")


@app.post("/split")
async def split_endpoint(request: ProcessRequest):
    """Speaker split endpoint - streams progress."""
    async def generate():
        async for update in stream_process(
            request.jobId,
            request.audioPath,
            request.speakerCount,
            request.outputDir
        ):
            yield json.dumps(update) + "\n"

    return FastAPIStreamingResponse(generate(), media_type="text/event-stream")


@app.post("/process")
async def process_audio_endpoint(request: ProcessRequest, background_tasks: BackgroundTasks):
    """Start audio processing job."""
    job_id = request.jobId

    # Initialize job
    update_job_status(job_id, {
        "status": "queued",
        "progress": 0,
        "stage": "Queued for processing",
        "speakers": [],
        "transcript": [],
        "outputs": {}
    })

    # Start processing in background
    background_tasks.add_task(
        process_audio_cloud,
        job_id,
        request.audioPath,
        request.speakerCount,
        request.outputDir
    )

    return {"jobId": job_id, "status": "queued"}


@app.get("/jobs/{job_id}")
async def get_job_status(job_id: str):
    """Get job status."""
    # Check in-memory first
    if job_id in jobs:
        return jobs[job_id]

    # Check file
    status_file = Path(UPLOAD_DIR) / job_id / "status.json"
    if status_file.exists():
        with open(status_file) as f:
            return json.load(f)

    raise HTTPException(status_code=404, detail="Job not found")


@app.post("/upload")
async def upload_file(file: UploadFile = File(...), jobId: str = Form(...)):
    """Upload audio file."""
    job_dir = Path(UPLOAD_DIR) / jobId
    job_dir.mkdir(parents=True, exist_ok=True)

    file_path = job_dir / file.filename

    with open(file_path, "wb") as f:
        content = await file.read()
        f.write(content)

    return {
        "jobId": jobId,
        "filename": file.filename,
        "path": str(file_path),
        "size": len(content)
    }


@app.get("/files/{job_id}/{filename}")
async def get_file(job_id: str, filename: str):
    """Download output file."""
    file_path = Path(UPLOAD_DIR) / job_id / filename

    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found")

    return FileResponse(file_path)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
