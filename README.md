# Speaker Split

AI-powered audio transcription with speaker identification and separation. A Start My Business Inc. application.

## Features

- **Audio Upload**: Drag-and-drop any audio file (MP3, WAV, M4A, FLAC, etc.)
- **Speaker Diarization**: AI identifies up to 6 speakers automatically
- **Transcription**: Word-level timestamps with speaker labels
- **Audio Separation**: Get individual audio files for each speaker
- **Reference Documents**: Generate professional HTML summaries from consultations

## Tech Stack

- **Frontend**: Next.js 14, React, Tailwind CSS
- **Backend**: Python FastAPI
- **AI Models**: WhisperX, pyannote.audio
- **HTML Generation**: Claude AI via n8n workflow

## Quick Start

### 1. Install Frontend Dependencies

```bash
cd speaker-split-app
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env.local
```

Edit `.env.local` with your API keys:
- `HF_TOKEN`: HuggingFace token (required for speaker diarization)
- `ANTHROPIC_API_KEY`: For HTML document generation

### 3. Start Frontend

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### 4. Install Backend Dependencies

```bash
cd backend
python -m venv venv
source venv/bin/activate  # Linux/Mac
# or: venv\Scripts\activate  # Windows

# Install PyTorch with CUDA (GPU)
pip install torch torchaudio --index-url https://download.pytorch.org/whl/cu121

# Or for CPU only:
# pip install torch torchaudio

# Install WhisperX
pip install git+https://github.com/m-bain/whisperx.git

# Install other dependencies
pip install -r requirements.txt
```

### 5. Start Backend

```bash
export HF_TOKEN="your_huggingface_token"
./start.sh
# or: python main.py
```

## HuggingFace Setup

Speaker diarization requires a HuggingFace account:

1. Create account at [huggingface.co](https://huggingface.co)
2. Accept user agreements for these models:
   - [pyannote/speaker-diarization-3.1](https://huggingface.co/pyannote/speaker-diarization-3.1)
   - [pyannote/segmentation-3.0](https://huggingface.co/pyannote/segmentation-3.0)
3. Create access token at: [huggingface.co/settings/tokens](https://huggingface.co/settings/tokens)

## Model Options

| Model | VRAM | Speed | Accuracy |
|-------|------|-------|----------|
| tiny | ~1GB | Fastest | Lower |
| base | ~1GB | Fast | OK |
| small | ~2GB | Medium | Good |
| medium | ~5GB | Slower | Better |
| large-v2 | ~10GB | Slow | Best |
| large-v3 | ~10GB | Slow | Best |

Set via `WHISPER_MODEL` environment variable.

## Output Files

After processing, you get:

```
output/
├── audio_diarized.json       # Full results with timestamps & speakers
├── audio_transcript.txt      # Readable transcript by speaker
├── audio_subtitles.srt       # SRT subtitle file
├── audio_SPEAKER_00.wav      # Speaker 1's audio
├── audio_SPEAKER_01.wav      # Speaker 2's audio
└── ClientName_reference.html # Professional reference document
```

## HTML Reference Document

The app generates beautiful HTML reference documents that include:
- Executive summary
- Action items with priorities
- Topic sections with SOPs
- Financial projections
- Resource links

These are perfect for client follow-up after business consultations.

## n8n Integration

The app can integrate with an n8n workflow for HTML generation. Configure `N8N_WEBHOOK_URL` in your environment.

Workflow expects:
```json
{
  "transcript": "[Speaker A]: Hello...",
  "client_name": "John Smith",
  "business_name": "Smith LLC",
  "website": "https://example.com",
  "session_date": "January 2026"
}
```

## Deployment

### Using Docker

```bash
docker-compose up -d
```

### Using Coolify

1. Create new service from Git repository
2. Set environment variables in Coolify dashboard
3. Deploy

## Support

- Website: [startmybusiness.us](https://startmybusiness.us)
- Phone: (888) 534-4145

## License

Proprietary - Start My Business Inc.
