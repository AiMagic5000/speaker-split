#!/usr/bin/env python3
"""
Speaker Split Backend - Cloud API Version
Uses AssemblyAI for transcription + speaker diarization
Uses ffmpeg for actual audio splitting
"""

import os
import json
import asyncio
import aiohttp
import subprocess
import time
from pathlib import Path
from typing import Optional, List, Dict
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

    # Check ffmpeg is installed
    try:
        result = subprocess.run(["ffmpeg", "-version"], capture_output=True, text=True)
        logger.info("ffmpeg is installed")
    except FileNotFoundError:
        logger.error("ffmpeg is NOT installed - speaker split will fail")

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


def extract_audio_segment(input_path: str, output_path: str, start_time: float, end_time: float) -> bool:
    """Extract a segment from audio file using ffmpeg."""
    try:
        duration = end_time - start_time
        cmd = [
            "ffmpeg", "-y",
            "-i", input_path,
            "-ss", str(start_time),
            "-t", str(duration),
            "-acodec", "pcm_s16le",
            "-ar", "16000",
            "-ac", "1",
            output_path
        ]
        logger.info(f"Extracting segment: {start_time:.2f}s - {end_time:.2f}s to {output_path}")
        result = subprocess.run(cmd, capture_output=True, text=True)
        if result.returncode != 0:
            logger.error(f"ffmpeg extraction failed: {result.stderr[-500:] if result.stderr else 'No stderr'}")
        return result.returncode == 0
    except Exception as e:
        logger.error(f"Error extracting segment: {e}")
        return False


def concat_audio_files(input_files: List[str], output_path: str) -> bool:
    """Concatenate multiple audio files using ffmpeg."""
    if not input_files:
        logger.warning("No input files to concatenate")
        return False

    logger.info(f"Concatenating {len(input_files)} files to {output_path}")

    if len(input_files) == 1:
        # Just copy the single file
        import shutil
        shutil.copy(input_files[0], output_path)
        logger.info(f"Single file copied to {output_path}")
        return True

    try:
        # Create a file list for ffmpeg concat
        # Use absolute paths to avoid ffmpeg interpreting them relative to list file location
        list_file = os.path.abspath(output_path + ".txt")
        with open(list_file, "w") as f:
            for file in input_files:
                abs_path = os.path.abspath(file)
                f.write(f"file '{abs_path}'\n")

        cmd = [
            "ffmpeg", "-y",
            "-f", "concat",
            "-safe", "0",
            "-i", list_file,
            "-acodec", "pcm_s16le",
            "-ar", "16000",
            "-ac", "1",
            output_path
        ]
        result = subprocess.run(cmd, capture_output=True, text=True)

        # Clean up list file
        os.remove(list_file)

        if result.returncode != 0:
            logger.error(f"ffmpeg concat failed: {result.stderr[-500:] if result.stderr else 'No stderr'}")
        return result.returncode == 0
    except Exception as e:
        logger.error(f"Error concatenating audio: {e}")
        return False


def split_audio_by_speakers(audio_path: str, utterances: List[dict], output_dir: str, job_id: str) -> List[dict]:
    """Split audio into separate files per speaker."""
    logger.info(f"split_audio_by_speakers called: audio_path={audio_path}, output_dir={output_dir}, job_id={job_id}")
    logger.info(f"Audio file exists: {os.path.exists(audio_path)}")

    # Group utterances by speaker
    speaker_segments: Dict[str, List[dict]] = {}

    for utterance in utterances:
        speaker = utterance.get("speaker", "A")
        if speaker not in speaker_segments:
            speaker_segments[speaker] = []
        speaker_segments[speaker].append({
            "start": utterance["start"] / 1000,  # ms to seconds
            "end": utterance["end"] / 1000
        })

    logger.info(f"Found {len(speaker_segments)} speakers: {list(speaker_segments.keys())}")

    # Create output directory
    Path(output_dir).mkdir(parents=True, exist_ok=True)
    logger.info(f"Output directory created/verified: {output_dir}")

    # Extract and combine segments for each speaker
    speaker_audios = []
    temp_dir = Path(output_dir) / "temp"
    temp_dir.mkdir(exist_ok=True)
    logger.info(f"Temp directory: {temp_dir}")

    for speaker_id in sorted(speaker_segments.keys()):
        segments = speaker_segments[speaker_id]
        logger.info(f"Processing Speaker {speaker_id}: {len(segments)} segments")

        # Extract each segment
        segment_files = []
        successful_extractions = 0
        failed_extractions = 0
        for idx, seg in enumerate(segments):
            segment_file = str(temp_dir / f"speaker_{speaker_id}_seg_{idx}.wav")
            success = extract_audio_segment(
                audio_path, segment_file,
                seg["start"], seg["end"]
            )
            if success and os.path.exists(segment_file):
                segment_files.append(segment_file)
                successful_extractions += 1
            else:
                failed_extractions += 1

        logger.info(f"Speaker {speaker_id}: {successful_extractions} successful, {failed_extractions} failed extractions")

        if segment_files:
            # Concatenate all segments for this speaker
            output_file = str(Path(output_dir) / f"speaker_{speaker_id}.wav")
            success = concat_audio_files(segment_files, output_file)

            if success and os.path.exists(output_file):
                # Get file size/duration info
                file_size = os.path.getsize(output_file)
                speaker_audios.append({
                    "speaker": f"Speaker {speaker_id}",
                    "url": f"/api/files/{job_id}/output/speaker_{speaker_id}.wav",
                    "filename": f"speaker_{speaker_id}.wav"
                })
                logger.info(f"Created speaker file: {output_file} ({file_size} bytes)")

            # Clean up segment files
            for f in segment_files:
                try:
                    os.remove(f)
                except:
                    pass

    # Clean up temp directory
    try:
        temp_dir.rmdir()
    except:
        pass

    return speaker_audios


async def stream_process(job_id: str, audio_path: str, speaker_count: int, output_dir: str):
    """Process audio and yield progress updates (transcription only)."""
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


async def stream_split(job_id: str, audio_path: str, speaker_count: int, output_dir: str):
    """Process audio with actual speaker audio splitting."""
    try:
        if not api_valid:
            yield {"error": "AssemblyAI API key not configured. Get a free key at https://www.assemblyai.com/"}
            return

        yield {"progress": 5, "stage": "Uploading audio to cloud..."}

        # Upload audio
        audio_url = await upload_to_assemblyai(audio_path)
        logger.info(f"Audio uploaded: {audio_url[:50]}...")

        yield {"progress": 20, "stage": "Transcribing with AI..."}

        # Transcribe with speaker diarization
        result = await transcribe_with_assemblyai(audio_url, speaker_count)

        yield {"progress": 50, "stage": "Identifying speaker segments..."}

        # Process results
        utterances = result.get("utterances", [])

        if not utterances:
            yield {"error": "No speaker segments found in audio"}
            return

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

        logger.info(f"Found {len(speakers)} speakers with {len(utterances)} utterances")

        yield {"progress": 60, "stage": f"Splitting audio for {len(speakers)} speakers..."}

        # Actually split the audio using ffmpeg
        speaker_audios = split_audio_by_speakers(
            audio_path, utterances, output_dir, job_id
        )

        if not speaker_audios:
            yield {"error": "Failed to split audio files"}
            return

        yield {"progress": 90, "stage": "Finalizing audio files..."}

        # Save transcript
        Path(output_dir).mkdir(parents=True, exist_ok=True)
        transcript_file = Path(output_dir) / "transcript.json"
        with open(transcript_file, "w") as f:
            json.dump(transcript, f, indent=2)

        logger.info(f"Split complete: {len(speaker_audios)} speaker files created")

        yield {
            "progress": 100,
            "stage": "Complete",
            "status": "completed",
            "speakers": speakers,
            "transcript": transcript,
            "speakerAudios": speaker_audios
        }

    except Exception as e:
        logger.error(f"Job {job_id} split failed: {str(e)}")
        import traceback
        traceback.print_exc()
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
    """Speaker split endpoint - streams progress and returns split audio files."""
    async def generate():
        async for update in stream_split(
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
    async def process_wrapper():
        async for update in stream_process(
            job_id,
            request.audioPath,
            request.speakerCount,
            request.outputDir
        ):
            update_job_status(job_id, update)

    background_tasks.add_task(lambda: asyncio.create_task(process_wrapper()))

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


@app.get("/files/{job_id}/{file_path:path}")
async def get_file(job_id: str, file_path: str):
    """Download output file."""
    full_path = Path(UPLOAD_DIR) / job_id / file_path

    if not full_path.exists():
        raise HTTPException(status_code=404, detail="File not found")

    # Get just the filename for the download header
    filename = full_path.name
    return FileResponse(full_path, media_type="audio/wav", filename=filename)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
