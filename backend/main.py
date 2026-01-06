#!/usr/bin/env python3
"""
Speaker Split Backend - FastAPI Server
Handles audio processing with speaker diarization and transcription.
"""

import os
import json
import asyncio
from pathlib import Path
from typing import Optional
from datetime import datetime
import logging

from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# FastAPI app
app = FastAPI(
    title="Speaker Split API",
    description="Audio processing with speaker diarization",
    version="1.0.0"
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
HF_TOKEN = os.environ.get("HF_TOKEN", "")
UPLOAD_DIR = os.environ.get("UPLOAD_DIR", "./uploads")
WHISPER_MODEL = os.environ.get("WHISPER_MODEL", "large-v2")
DEVICE = os.environ.get("DEVICE", "cuda")

# In-memory job storage
jobs = {}


class ProcessRequest(BaseModel):
    jobId: str
    audioPath: str
    speakerCount: int = 2
    outputDir: str


class JobStatus(BaseModel):
    status: str
    progress: float
    stage: str
    speakers: list = []
    transcript: list = []
    outputs: dict = {}
    error: Optional[str] = None


def update_job_status(job_id: str, updates: dict):
    """Update job status and save to file."""
    if job_id not in jobs:
        jobs[job_id] = {}

    jobs[job_id].update(updates)

    # Also save to status.json file
    job_dir = Path(UPLOAD_DIR) / job_id
    job_dir.mkdir(parents=True, exist_ok=True)
    status_file = job_dir / "status.json"

    with open(status_file, "w") as f:
        json.dump(jobs[job_id], f, indent=2)

    logger.info(f"Job {job_id}: {updates.get('stage', updates.get('status', ''))}")


async def process_audio(job_id: str, audio_path: str, speaker_count: int, output_dir: str):
    """Process audio file with speaker diarization."""
    try:
        # Import pipeline (lazy load to avoid startup delays)
        update_job_status(job_id, {
            "status": "processing",
            "progress": 35,
            "stage": "Loading AI models...",
        })

        # Check if dependencies are available
        try:
            import torch
            import whisperx
            from pydub import AudioSegment
        except ImportError as e:
            update_job_status(job_id, {
                "status": "error",
                "error": f"Missing dependency: {str(e)}. Please install required packages.",
            })
            return

        # Check for HuggingFace token
        if not HF_TOKEN:
            update_job_status(job_id, {
                "status": "error",
                "error": "HuggingFace token not configured. Set HF_TOKEN environment variable.",
            })
            return

        # Create output directory
        Path(output_dir).mkdir(parents=True, exist_ok=True)

        # Load audio
        update_job_status(job_id, {
            "status": "transcribing",
            "progress": 40,
            "stage": "Loading audio file...",
        })

        audio = whisperx.load_audio(audio_path)

        # Transcribe with Whisper
        update_job_status(job_id, {
            "progress": 45,
            "stage": "Transcribing with WhisperX...",
        })

        device = DEVICE if torch.cuda.is_available() else "cpu"
        compute_type = "float16" if device == "cuda" else "float32"

        model = whisperx.load_model(WHISPER_MODEL, device, compute_type=compute_type)
        result = model.transcribe(audio, batch_size=16)
        detected_language = result.get("language", "en")

        # Align timestamps
        update_job_status(job_id, {
            "progress": 55,
            "stage": "Aligning word timestamps...",
        })

        align_model, align_metadata = whisperx.load_align_model(
            language_code=detected_language,
            device=device
        )
        result = whisperx.align(
            result["segments"],
            align_model,
            align_metadata,
            audio,
            device,
            return_char_alignments=False
        )

        # Speaker diarization
        update_job_status(job_id, {
            "status": "diarizing",
            "progress": 65,
            "stage": "Identifying speakers...",
        })

        diarize_model = whisperx.DiarizationPipeline(
            use_auth_token=HF_TOKEN,
            device=device
        )

        diarize_options = {}
        if speaker_count:
            diarize_options["min_speakers"] = speaker_count
            diarize_options["max_speakers"] = speaker_count

        diarize_segments = diarize_model(audio, **diarize_options)
        result = whisperx.assign_word_speakers(diarize_segments, result)

        # Get unique speakers
        speakers = set()
        for segment in result["segments"]:
            if "speaker" in segment:
                speakers.add(segment["speaker"])
        speakers = sorted(list(speakers))

        # Format transcript
        transcript = []
        for segment in result["segments"]:
            transcript.append({
                "speaker": segment.get("speaker", "UNKNOWN"),
                "text": segment.get("text", "").strip(),
                "start": segment.get("start", 0),
                "end": segment.get("end", 0),
            })

        update_job_status(job_id, {
            "progress": 75,
            "stage": f"Found {len(speakers)} speakers, processing...",
            "speakers": [{"id": s, "label": f"Speaker {i+1}", "name": "", "color": get_speaker_color(i)} for i, s in enumerate(speakers)],
            "transcript": transcript,
        })

        # Export files
        update_job_status(job_id, {
            "progress": 80,
            "stage": "Exporting transcript files...",
        })

        base_name = Path(audio_path).stem

        # Export JSON
        json_path = Path(output_dir) / f"{base_name}_diarized.json"
        with open(json_path, "w", encoding="utf-8") as f:
            json.dump(result, f, indent=2, ensure_ascii=False)

        # Export TXT
        txt_path = Path(output_dir) / f"{base_name}_transcript.txt"
        export_txt(result, txt_path)

        # Export SRT
        srt_path = Path(output_dir) / f"{base_name}_subtitles.srt"
        export_srt(result, srt_path)

        # Split audio by speaker
        update_job_status(job_id, {
            "status": "splitting",
            "progress": 85,
            "stage": "Splitting audio by speaker...",
        })

        speaker_audios = split_audio_by_speaker(audio_path, result, output_dir, base_name)

        # Final status
        update_job_status(job_id, {
            "status": "complete",
            "progress": 100,
            "stage": "Processing complete!",
            "outputs": {
                "json": f"/api/files/{job_id}/output/{json_path.name}",
                "txt": f"/api/files/{job_id}/output/{txt_path.name}",
                "srt": f"/api/files/{job_id}/output/{srt_path.name}",
                "speakerAudios": [
                    {"speaker": speaker, "url": f"/api/files/{job_id}/output/{Path(path).name}"}
                    for speaker, path in speaker_audios.items()
                ],
            },
        })

        logger.info(f"Job {job_id} completed successfully")

    except Exception as e:
        logger.error(f"Job {job_id} failed: {str(e)}")
        update_job_status(job_id, {
            "status": "error",
            "error": str(e),
        })


def get_speaker_color(index: int) -> str:
    """Get color for speaker based on index."""
    colors = ['#4493f2', '#4dc0b5', '#9f7aea', '#ed8936', '#48bb78', '#f56565']
    return colors[index % len(colors)]


def export_txt(result: dict, output_path: Path):
    """Export transcript as readable text file."""
    with open(output_path, "w", encoding="utf-8") as f:
        current_speaker = None
        for segment in result["segments"]:
            speaker = segment.get("speaker", "UNKNOWN")
            text = segment.get("text", "").strip()
            start = segment.get("start", 0)

            mins = int(start // 60)
            secs = int(start % 60)
            timestamp = f"[{mins:02d}:{secs:02d}]"

            if speaker != current_speaker:
                f.write(f"\n{speaker} {timestamp}:\n")
                current_speaker = speaker

            f.write(f"{text}\n")


def export_srt(result: dict, output_path: Path):
    """Export as SRT subtitle file."""
    def format_timestamp(seconds: float) -> str:
        hours = int(seconds // 3600)
        minutes = int((seconds % 3600) // 60)
        secs = int(seconds % 60)
        millis = int((seconds % 1) * 1000)
        return f"{hours:02d}:{minutes:02d}:{secs:02d},{millis:03d}"

    with open(output_path, "w", encoding="utf-8") as f:
        for i, segment in enumerate(result["segments"], 1):
            start = segment.get("start", 0)
            end = segment.get("end", start + 1)
            speaker = segment.get("speaker", "UNKNOWN")
            text = segment.get("text", "").strip()

            f.write(f"{i}\n")
            f.write(f"{format_timestamp(start)} --> {format_timestamp(end)}\n")
            f.write(f"[{speaker}] {text}\n\n")


def split_audio_by_speaker(audio_path: str, result: dict, output_dir: str, base_name: str) -> dict:
    """Split audio into separate files per speaker."""
    from pydub import AudioSegment

    audio = AudioSegment.from_file(audio_path)
    duration_ms = len(audio)

    # Group segments by speaker
    speaker_segments = {}
    for segment in result["segments"]:
        speaker = segment.get("speaker", "UNKNOWN")
        start_ms = int(segment.get("start", 0) * 1000)
        end_ms = int(segment.get("end", 0) * 1000)

        if speaker not in speaker_segments:
            speaker_segments[speaker] = []
        speaker_segments[speaker].append((start_ms, end_ms))

    output_files = {}

    for speaker, segments in speaker_segments.items():
        # Create silent audio of same duration
        speaker_audio = AudioSegment.silent(duration=duration_ms)

        # Overlay speaker's segments
        for start_ms, end_ms in segments:
            start_ms = max(0, min(start_ms, duration_ms))
            end_ms = max(0, min(end_ms, duration_ms))

            if end_ms > start_ms:
                segment_audio = audio[start_ms:end_ms]
                speaker_audio = speaker_audio.overlay(segment_audio, position=start_ms)

        # Export
        output_path = Path(output_dir) / f"{base_name}_{speaker}.wav"
        speaker_audio.export(str(output_path), format="wav")
        output_files[speaker] = str(output_path)

    return output_files


# API Routes

@app.get("/")
async def root():
    return {"message": "Speaker Split API", "version": "1.0.0"}


@app.get("/health")
async def health():
    return {"status": "healthy"}


@app.post("/process")
async def process(request: ProcessRequest, background_tasks: BackgroundTasks):
    """Start audio processing job."""
    job_id = request.jobId

    # Initialize job status
    update_job_status(job_id, {
        "status": "processing",
        "progress": 30,
        "stage": "Starting processing...",
        "speakers": [],
        "transcript": [],
        "outputs": {},
    })

    # Run processing in background
    background_tasks.add_task(
        process_audio,
        job_id,
        request.audioPath,
        request.speakerCount,
        request.outputDir
    )

    return {"success": True, "jobId": job_id, "message": "Processing started"}


@app.get("/jobs/{job_id}")
async def get_job(job_id: str):
    """Get job status."""
    if job_id in jobs:
        return jobs[job_id]

    # Try to load from file
    status_file = Path(UPLOAD_DIR) / job_id / "status.json"
    if status_file.exists():
        with open(status_file) as f:
            return json.load(f)

    raise HTTPException(status_code=404, detail="Job not found")


@app.get("/files/{job_id}/{path:path}")
async def get_file(job_id: str, path: str):
    """Serve output files."""
    file_path = Path(UPLOAD_DIR) / job_id / path

    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found")

    return FileResponse(file_path)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
