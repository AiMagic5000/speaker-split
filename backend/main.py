#!/usr/bin/env python3
"""
Speaker Split Backend - FastAPI Server
Handles audio processing with speaker diarization and transcription.
"""

import os
import json
import asyncio
from pathlib import Path

# Load environment variables from .env file
from dotenv import load_dotenv
load_dotenv()
from typing import Optional
from datetime import datetime
import logging

from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, StreamingResponse
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

# HuggingFace token validation status
hf_token_valid = False
hf_token_error = ""


def validate_hf_token():
    """Validate HuggingFace token on startup."""
    global hf_token_valid, hf_token_error

    if not HF_TOKEN:
        hf_token_error = "HF_TOKEN environment variable is not set"
        logger.error(f"HuggingFace token validation failed: {hf_token_error}")
        return False

    if not HF_TOKEN.startswith("hf_"):
        hf_token_error = "HF_TOKEN must start with 'hf_' - check your token format"
        logger.error(f"HuggingFace token validation failed: {hf_token_error}")
        return False

    # Try to validate with HuggingFace API
    # Note: Fine-grained tokens don't work with /api/whoami, so we test model access instead
    try:
        import requests

        # First try whoami (works with classic tokens)
        response = requests.get(
            "https://huggingface.co/api/whoami",
            headers={"Authorization": f"Bearer {HF_TOKEN}"},
            timeout=10
        )
        if response.status_code == 200:
            user_info = response.json()
            username = user_info.get("name", "Unknown")
            logger.info(f"HuggingFace token valid for user: {username}")
            hf_token_valid = True
            return True

        # If whoami fails, test model access (works with fine-grained tokens)
        logger.info("Testing token via model access (fine-grained token detected)...")
        model_response = requests.get(
            "https://huggingface.co/api/models/pyannote/speaker-diarization-3.1",
            headers={"Authorization": f"Bearer {HF_TOKEN}"},
            timeout=10
        )
        if model_response.status_code == 200:
            logger.info("HuggingFace token valid (fine-grained token with model access)")
            hf_token_valid = True
            return True
        elif model_response.status_code == 401:
            hf_token_error = "HuggingFace token is invalid or expired"
            logger.error(f"HuggingFace token validation failed: {hf_token_error}")
            return False
        elif model_response.status_code == 403:
            hf_token_error = "Token valid but no access to pyannote models. Accept agreements at https://huggingface.co/pyannote/speaker-diarization-3.1"
            logger.error(f"HuggingFace token validation failed: {hf_token_error}")
            return False
        else:
            hf_token_error = f"HuggingFace API returned status {model_response.status_code}"
            logger.warning(f"HuggingFace token validation warning: {hf_token_error}")
            # Allow to proceed - might still work
            hf_token_valid = True
            return True
    except Exception as e:
        hf_token_error = f"Could not validate HuggingFace token: {str(e)}"
        logger.warning(f"HuggingFace token validation warning: {hf_token_error}")
        # Allow to proceed - network might be down but token could be valid
        hf_token_valid = True
        return True


@app.on_event("startup")
async def startup_event():
    """Validate configuration on startup."""
    logger.info("=" * 50)
    logger.info("Speaker Split Backend Starting...")
    logger.info(f"WHISPER_MODEL: {WHISPER_MODEL}")
    logger.info(f"DEVICE: {DEVICE}")
    logger.info(f"UPLOAD_DIR: {UPLOAD_DIR}")
    logger.info(f"HF_TOKEN: {'Set (' + HF_TOKEN[:10] + '...)' if HF_TOKEN else 'NOT SET'}")

    # Create upload directory
    Path(UPLOAD_DIR).mkdir(parents=True, exist_ok=True)

    # Validate HuggingFace token
    validate_hf_token()

    if not hf_token_valid:
        logger.error("=" * 50)
        logger.error("CRITICAL: HuggingFace token validation failed!")
        logger.error(hf_token_error)
        logger.error("")
        logger.error("To fix this:")
        logger.error("1. Get a token from https://huggingface.co/settings/tokens")
        logger.error("2. Set HF_TOKEN environment variable")
        logger.error("3. Accept model agreements at:")
        logger.error("   - https://huggingface.co/pyannote/speaker-diarization-3.1")
        logger.error("   - https://huggingface.co/pyannote/segmentation-3.0")
        logger.error("=" * 50)
    else:
        logger.info("HuggingFace token validation: OK")

    logger.info("=" * 50)


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
        if not hf_token_valid:
            error_msg = hf_token_error or "HuggingFace token not configured"
            error_msg += "\n\nTo fix:\n1. Set HF_TOKEN environment variable\n2. Accept model agreements at:\n   - https://huggingface.co/pyannote/speaker-diarization-3.1\n   - https://huggingface.co/pyannote/segmentation-3.0"
            update_job_status(job_id, {
                "status": "error",
                "error": error_msg,
            })
            return

        # Create output directory
        Path(output_dir).mkdir(parents=True, exist_ok=True)

        # Convert audio to WAV for compatibility (libsndfile doesn't support M4A)
        update_job_status(job_id, {
            "status": "transcribing",
            "progress": 35,
            "stage": "Converting audio format...",
        })

        wav_path = os.path.join(output_dir, "audio.wav")
        import subprocess
        convert_cmd = [
            "ffmpeg", "-y", "-i", audio_path,
            "-acodec", "pcm_s16le", "-ar", "16000", "-ac", "1",
            wav_path
        ]
        subprocess.run(convert_cmd, capture_output=True, check=True)
        logger.info(f"Converted audio to WAV: {wav_path}")

        # Load audio
        update_job_status(job_id, {
            "status": "transcribing",
            "progress": 40,
            "stage": "Loading audio file...",
        })

        audio = whisperx.load_audio(wav_path)

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

        # pyannote 3.x expects file path (use WAV for compatibility)
        diarize_segments = diarize_model(wav_path, **diarize_options)
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
        import traceback
        logger.error(f"Job {job_id} failed: {str(e)}")
        logger.error(f"Full traceback:\n{traceback.format_exc()}")
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
    return {
        "status": "healthy" if hf_token_valid else "degraded",
        "hf_token_valid": hf_token_valid,
        "hf_token_error": hf_token_error if not hf_token_valid else None,
        "whisper_model": WHISPER_MODEL,
        "device": DEVICE,
    }


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


@app.post("/transcribe")
async def transcribe_audio(request: ProcessRequest):
    """Transcription-only endpoint with streaming response."""
    async def generate():
        try:
            job_id = request.jobId
            audio_path = request.audioPath
            speaker_count = request.speakerCount
            output_dir = request.outputDir

            yield json.dumps({"progress": 25, "stage": "Loading AI models..."}) + "\n"

            # Check if dependencies are available
            try:
                import torch
                import whisperx
            except ImportError as e:
                yield json.dumps({"error": f"Missing dependency: {str(e)}"}) + "\n"
                return

            if not hf_token_valid:
                yield json.dumps({"error": hf_token_error or "HuggingFace token not configured"}) + "\n"
                return

            # Create output directory
            Path(output_dir).mkdir(parents=True, exist_ok=True)

            # Convert audio to WAV
            yield json.dumps({"progress": 30, "stage": "Converting audio format..."}) + "\n"

            wav_path = os.path.join(output_dir, "audio.wav")
            import subprocess
            convert_cmd = [
                "ffmpeg", "-y", "-i", audio_path,
                "-acodec", "pcm_s16le", "-ar", "16000", "-ac", "1",
                wav_path
            ]
            subprocess.run(convert_cmd, capture_output=True, check=True)

            # Load audio
            yield json.dumps({"progress": 35, "stage": "Loading audio file..."}) + "\n"
            audio = whisperx.load_audio(wav_path)

            # Transcribe
            yield json.dumps({"progress": 45, "stage": "Transcribing with WhisperX..."}) + "\n"

            device = DEVICE if torch.cuda.is_available() else "cpu"
            compute_type = "float16" if device == "cuda" else "float32"

            model = whisperx.load_model(WHISPER_MODEL, device, compute_type=compute_type)
            result = model.transcribe(audio, batch_size=16)
            detected_language = result.get("language", "en")

            # Align timestamps
            yield json.dumps({"progress": 60, "stage": "Aligning word timestamps..."}) + "\n"

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
            yield json.dumps({"progress": 75, "stage": "Identifying speakers..."}) + "\n"

            diarize_model = whisperx.DiarizationPipeline(
                use_auth_token=HF_TOKEN,
                device=device
            )

            diarize_options = {}
            if speaker_count:
                diarize_options["min_speakers"] = speaker_count
                diarize_options["max_speakers"] = speaker_count

            diarize_segments = diarize_model(wav_path, **diarize_options)
            result = whisperx.assign_word_speakers(diarize_segments, result)

            # Format transcript
            yield json.dumps({"progress": 90, "stage": "Formatting transcript..."}) + "\n"

            transcript = []
            for segment in result["segments"]:
                transcript.append({
                    "speaker": segment.get("speaker", "UNKNOWN"),
                    "text": segment.get("text", "").strip(),
                    "start": segment.get("start", 0),
                    "end": segment.get("end", 0),
                })

            yield json.dumps({
                "progress": 100,
                "stage": "Complete",
                "transcript": transcript
            }) + "\n"

        except Exception as e:
            import traceback
            logger.error(f"Transcription error: {str(e)}")
            logger.error(f"Traceback: {traceback.format_exc()}")
            yield json.dumps({"error": str(e)}) + "\n"

    return StreamingResponse(generate(), media_type="text/event-stream")


@app.post("/split")
async def split_audio_endpoint(request: ProcessRequest):
    """Speaker split endpoint with streaming response."""
    async def generate():
        try:
            job_id = request.jobId
            audio_path = request.audioPath
            speaker_count = request.speakerCount
            output_dir = request.outputDir

            yield json.dumps({"progress": 20, "stage": "Loading AI models..."}) + "\n"

            # Check if dependencies are available
            try:
                import torch
                import whisperx
                from pydub import AudioSegment
            except ImportError as e:
                yield json.dumps({"error": f"Missing dependency: {str(e)}"}) + "\n"
                return

            if not hf_token_valid:
                yield json.dumps({"error": hf_token_error or "HuggingFace token not configured"}) + "\n"
                return

            # Create output directory
            Path(output_dir).mkdir(parents=True, exist_ok=True)

            # Convert audio to WAV
            yield json.dumps({"progress": 25, "stage": "Converting audio format..."}) + "\n"

            wav_path = os.path.join(output_dir, "audio.wav")
            import subprocess
            convert_cmd = [
                "ffmpeg", "-y", "-i", audio_path,
                "-acodec", "pcm_s16le", "-ar", "16000", "-ac", "1",
                wav_path
            ]
            subprocess.run(convert_cmd, capture_output=True, check=True)

            # Load audio
            yield json.dumps({"progress": 30, "stage": "Loading audio file..."}) + "\n"
            audio = whisperx.load_audio(wav_path)

            # Transcribe
            yield json.dumps({"progress": 40, "stage": "Transcribing with WhisperX..."}) + "\n"

            device = DEVICE if torch.cuda.is_available() else "cpu"
            compute_type = "float16" if device == "cuda" else "float32"

            model = whisperx.load_model(WHISPER_MODEL, device, compute_type=compute_type)
            result = model.transcribe(audio, batch_size=16)
            detected_language = result.get("language", "en")

            # Align timestamps
            yield json.dumps({"progress": 50, "stage": "Aligning word timestamps..."}) + "\n"

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
            yield json.dumps({"progress": 60, "stage": "Identifying speakers..."}) + "\n"

            diarize_model = whisperx.DiarizationPipeline(
                use_auth_token=HF_TOKEN,
                device=device
            )

            diarize_options = {}
            if speaker_count:
                diarize_options["min_speakers"] = speaker_count
                diarize_options["max_speakers"] = speaker_count

            diarize_segments = diarize_model(wav_path, **diarize_options)
            result = whisperx.assign_word_speakers(diarize_segments, result)

            # Get unique speakers
            speakers = set()
            for segment in result["segments"]:
                if "speaker" in segment:
                    speakers.add(segment["speaker"])
            speakers = sorted(list(speakers))

            yield json.dumps({"progress": 70, "stage": f"Found {len(speakers)} speakers, separating audio..."}) + "\n"

            # Split audio by speaker
            yield json.dumps({"progress": 80, "stage": "Generating speaker audio files..."}) + "\n"

            pydub_audio = AudioSegment.from_file(audio_path)
            duration_ms = len(pydub_audio)

            speaker_segments = {}
            for segment in result["segments"]:
                speaker = segment.get("speaker", "UNKNOWN")
                start_ms = int(segment.get("start", 0) * 1000)
                end_ms = int(segment.get("end", 0) * 1000)
                if speaker not in speaker_segments:
                    speaker_segments[speaker] = []
                speaker_segments[speaker].append((start_ms, end_ms))

            base_name = Path(audio_path).stem
            speaker_audios = []

            for i, (speaker, segments) in enumerate(sorted(speaker_segments.items())):
                yield json.dumps({"progress": 80 + (15 * (i + 1) / len(speaker_segments)), "stage": f"Processing {speaker}..."}) + "\n"

                speaker_audio = AudioSegment.silent(duration=duration_ms)
                for start_ms, end_ms in segments:
                    start_ms = max(0, min(start_ms, duration_ms))
                    end_ms = max(0, min(end_ms, duration_ms))
                    if end_ms > start_ms:
                        segment_audio = pydub_audio[start_ms:end_ms]
                        speaker_audio = speaker_audio.overlay(segment_audio, position=start_ms)

                output_path = Path(output_dir) / f"{base_name}_{speaker}.wav"
                speaker_audio.export(str(output_path), format="wav")
                speaker_audios.append({
                    "speaker": speaker,
                    "url": f"/api/files/{job_id}/output/{output_path.name}"
                })

            yield json.dumps({
                "progress": 100,
                "stage": "Complete",
                "speakerAudios": speaker_audios
            }) + "\n"

        except Exception as e:
            import traceback
            logger.error(f"Split error: {str(e)}")
            logger.error(f"Traceback: {traceback.format_exc()}")
            yield json.dumps({"error": str(e)}) + "\n"

    return StreamingResponse(generate(), media_type="text/event-stream")


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
