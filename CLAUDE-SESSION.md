# Speaker Split - Claude Session Documentation

**Session Date:** January 6, 2026
**Project:** Speaker Split - AI Speaker Diarization and Audio Processing App
**Status:** Code Complete, Awaiting Deployment on New Server

---

## Project Overview

Speaker Split is a web application for Start My Business Inc. that processes audio files with AI-powered speaker diarization. It identifies individual speakers, transcribes conversations, generates separate audio tracks per speaker, and creates professional HTML reference documents.

### Features
- Drag-and-drop audio upload (MP3, WAV, M4A, FLAC, OGG, WebM, MP4)
- Speaker count selection (2-6 speakers)
- AI-powered transcription using WhisperX
- Speaker diarization using pyannote.audio
- Individual audio file extraction per speaker
- Client information form (business owner, business name, website, session date)
- Speaker naming and primary speaker selection
- HTML reference document generation via Claude API
- SMB branding (blue #4493f2, teal #4dc0b5, navy #132743)

### Tech Stack
- **Frontend:** Next.js 14 (App Router), TypeScript, Tailwind CSS, Zustand
- **Backend:** Python FastAPI, WhisperX, pyannote.audio
- **AI:** Anthropic Claude API for HTML document generation
- **Deployment:** Docker, Docker Compose, Coolify

---

## Repository

**GitHub:** https://github.com/AiMagic5000/speaker-split
**Branch:** main

---

## Project Structure

```
speaker-split-app/
├── src/
│   ├── app/
│   │   ├── page.tsx                 # Landing page with SMB branding
│   │   ├── layout.tsx               # Root layout
│   │   ├── globals.css              # Global styles with SMB colors
│   │   ├── job/[id]/page.tsx        # Job processing & results page
│   │   └── api/
│   │       ├── upload/route.ts      # File upload handler
│   │       ├── jobs/[id]/route.ts   # Job status API
│   │       └── generate-html/route.ts # HTML document generation
│   ├── components/
│   │   ├── Header.tsx               # Header with SMB logo
│   │   └── AudioUploader.tsx        # Drag-and-drop uploader
│   └── lib/
│       └── store.ts                 # Zustand state management
├── backend/
│   ├── main.py                      # FastAPI server
│   ├── requirements.txt             # Python dependencies
│   ├── Dockerfile                   # CPU version (default)
│   └── Dockerfile.gpu               # GPU version (CUDA)
├── coolify-compose.yml              # Isolated deployment config
├── Dockerfile                       # Frontend Dockerfile
├── docker-compose.yml               # Local development
├── DEPLOYMENT.md                    # Deployment guide
└── package.json                     # Node dependencies
```

---

## Configuration Files

### coolify-compose.yml (Production - CPU Mode)
```yaml
version: '3.8'

services:
  speaker-split-frontend:
    container_name: speaker-split-frontend
    build:
      context: .
      dockerfile: Dockerfile
    ports:
      - "3100:3000"
    environment:
      - NODE_ENV=production
      - UPLOAD_DIR=/app/uploads
      - BACKEND_URL=http://speaker-split-backend:8000
      - N8N_WEBHOOK_URL=${N8N_WEBHOOK_URL}
      - ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}
    volumes:
      - speaker-split-uploads:/app/uploads
    networks:
      - speaker-split-network
    depends_on:
      - speaker-split-backend
    restart: unless-stopped

  speaker-split-backend:
    container_name: speaker-split-backend
    build:
      context: ./backend
      dockerfile: Dockerfile
    ports:
      - "8100:8000"
    environment:
      - HF_TOKEN=${HF_TOKEN}
      - UPLOAD_DIR=/app/uploads
      - WHISPER_MODEL=${WHISPER_MODEL:-small}
      - DEVICE=${DEVICE:-cpu}
    volumes:
      - speaker-split-uploads:/app/uploads
    networks:
      - speaker-split-network
    restart: unless-stopped

networks:
  speaker-split-network:
    name: speaker-split-network
    driver: bridge
    ipam:
      config:
        - subnet: 172.30.0.0/16

volumes:
  speaker-split-uploads:
    name: speaker-split-uploads
```

### Environment Variables Required

| Variable | Service | Description |
|----------|---------|-------------|
| `ANTHROPIC_API_KEY` | Frontend | Claude API for HTML generation |
| `N8N_WEBHOOK_URL` | Frontend | n8n webhook for transcript processing |
| `HF_TOKEN` | Backend | HuggingFace token for pyannote models |
| `WHISPER_MODEL` | Backend | Model size: `small` (CPU) or `large-v2` (GPU) |
| `DEVICE` | Backend | `cpu` or `cuda` |

### Actual Values (from CLAUDE.md)
```
ANTHROPIC_API_KEY=<see CLAUDE.md for actual key>
N8N_WEBHOOK_URL=https://n8n.srv836017.hstgr.cloud/webhook/transcript-to-html
HF_TOKEN=<needs to be obtained from user's HuggingFace account>
WHISPER_MODEL=small
DEVICE=cpu
```

---

## Coolify Configuration (Old Server - 72.60.119.182)

### Project Created
- **Project UUID:** `m8kc88kcwogkk4skggkko00c`
- **Project Name:** Speaker-Split
- **Environment:** production (`f84ww0ow8o480okww40g40gs`)

### Applications Created
| App | UUID | Port | Status |
|-----|------|------|--------|
| speaker-split-frontend | `zwkw4w0o80s8ccskw4ckgg4k` | 3100:3000 | Pending (server issue) |
| speaker-split-backend | `vsswoscoo4wgws8s0scw4444` | 8100:8000 | Pending (server issue) |

### Environment Variables Configured (Frontend)
- `NODE_ENV=production`
- `ANTHROPIC_API_KEY=<configured in Coolify>`
- `N8N_WEBHOOK_URL=https://n8n.srv836017.hstgr.cloud/webhook/transcript-to-html`
- `BACKEND_URL=http://speaker-split-backend:8000`

### Environment Variables Configured (Backend)
- `WHISPER_MODEL=small`
- `DEVICE=cpu`
- `UPLOAD_DIR=/app/uploads`

---

## Current Deployment Issue

### Problem
The existing Coolify server (72.60.119.182) has:
1. **100% CPU usage** - causing all operations to fail
2. **Malicious files warning** - indicates potential compromise
3. **Server Status:** "Not reachable & Not usable by Coolify"

### Root Cause
- Likely infected/compromised server
- Possibly vulnerable Next.js version in existing apps
- Stuck Docker containers consuming resources

### Solution
User is getting a **new server today**. Plan is to:
1. Install Coolify fresh on new server
2. Deploy Speaker-Split first
3. Migrate other apps later
4. Clean/decommission old server

---

## Coolify API Reference

### Base URLs
- **Old Server:** `http://72.60.119.182:8000/api/v1`
- **Via Domain:** `https://coolify.cognabase.com/api/v1`

### API Tokens
- **Primary:** `3|4GHjWg0s1A9AF6IJbgj3OjrXzt3N6p1G54sZzhMu561d9a1c`
- **Secondary:** `2|72NMKNKta81WG1wisjdEAWNhhXlJ8hjCaCwVs6z74e91a8ea`

### Common API Calls
```bash
# List projects
curl -s -X GET "https://coolify.cognabase.com/api/v1/projects" \
  -H "Authorization: Bearer 3|4GHjWg0s1A9AF6IJbgj3OjrXzt3N6p1G54sZzhMu561d9a1c"

# Create project
curl -s -X POST "https://coolify.cognabase.com/api/v1/projects" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "Speaker-Split", "description": "AI Speaker Diarization App"}'

# Create application
curl -s -X POST "https://coolify.cognabase.com/api/v1/applications/public" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "project_uuid": "PROJECT_UUID",
    "environment_name": "production",
    "server_uuid": "SERVER_UUID",
    "name": "speaker-split-frontend",
    "git_repository": "https://github.com/AiMagic5000/speaker-split",
    "git_branch": "main",
    "build_pack": "dockerfile",
    "ports_exposes": "3000"
  }'

# Add environment variable
curl -s -X POST "https://coolify.cognabase.com/api/v1/applications/APP_UUID/envs" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"key": "NODE_ENV", "value": "production"}'

# Deploy application
curl -s -X GET "https://coolify.cognabase.com/api/v1/deploy?uuid=APP_UUID&force=true" \
  -H "Authorization: Bearer $TOKEN"

# Check deployment status
curl -s -X GET "https://coolify.cognabase.com/api/v1/deployments/DEPLOYMENT_UUID" \
  -H "Authorization: Bearer $TOKEN"
```

---

## CPU Mode vs GPU Mode

### CPU Mode (Current Configuration)
- **Dockerfile:** `backend/Dockerfile` (uses python:3.11-slim)
- **Whisper Model:** `small` (244M parameters)
- **Processing Time:** ~2-5x slower than GPU
- **Memory:** ~2-4GB RAM
- **Accuracy:** Good, slightly lower than large model

### GPU Mode (For Future Use)
- **Dockerfile:** `backend/Dockerfile.gpu` (uses nvidia/cuda:12.1)
- **Whisper Model:** `large-v2` (1.5B parameters)
- **Requirements:** NVIDIA GPU with 10GB+ VRAM, nvidia-docker2
- **Processing Time:** Real-time or faster
- **Accuracy:** Best available

To switch to GPU mode:
1. Rename `Dockerfile.gpu` to `Dockerfile` in backend/
2. Set `WHISPER_MODEL=large-v2`
3. Set `DEVICE=cuda`
4. Ensure server has NVIDIA GPU with drivers

---

## n8n Workflow Integration

### Webhook URL
`https://n8n.srv836017.hstgr.cloud/webhook/transcript-to-html`

### Workflow ID
`r6w8uFfpY5Gi1bY9`

### Purpose
Converts transcript JSON to formatted HTML document with:
- Client information header
- Speaker-labeled transcript
- Professional SMB styling

### Fallback
If n8n webhook fails, the app falls back to direct Claude API call in `src/app/api/generate-html/route.ts`

---

## Branding (Start My Business Inc.)

### Colors
- **Primary Blue:** #4493f2
- **Secondary Teal:** #4dc0b5
- **Navy:** #132743
- **Charcoal:** #1a1a2e

### Logo
```
https://cdn.prod.website-files.com/6784053e7b7422e48efa5a84/6833a36f90c60fba010cee72_start_my_business_logo-removebg-preview.png
```

### Contact
- **Website:** https://startmybusiness.us
- **Phone:** (888) 534-4145

---

## Next Steps (When New Server Arrives)

### User to Provide:
1. New server IP address
2. SSH root credentials
3. Desired domain for Speaker-Split

### Deployment Steps:
1. SSH into new server
2. Install Coolify:
   ```bash
   curl -fsSL https://cdn.coollabs.io/coolify/install.sh | bash
   ```
3. Access Coolify dashboard (port 8000)
4. Create Speaker-Split project
5. Add frontend application (GitHub source)
6. Add backend application (GitHub source)
7. Configure environment variables
8. Deploy both services
9. Configure domain and SSL
10. Test end-to-end functionality

### Estimated Time: 15-20 minutes

---

## Files Changed This Session

| File | Action | Description |
|------|--------|-------------|
| `src/components/Header.tsx` | Modified | Added SMB logo from CDN |
| `src/app/page.tsx` | Modified | Added SMB logo to footer |
| `next.config.ts` | Modified | Added CDN domain for images |
| `backend/Dockerfile` | Renamed | Now contains CPU version |
| `backend/Dockerfile.gpu` | Created | Original GPU version preserved |
| `coolify-compose.yml` | Modified | CPU mode, standard Dockerfile |
| `DEPLOYMENT.md` | Created | Deployment documentation |
| `CLAUDE-SESSION.md` | Created | This file |

---

## Git Commits This Session

```
c53bff4 Add SMB logo and configure CPU mode deployment
38619b6 Add Coolify deployment documentation
8bec767 Add Coolify deployment configuration
153a2ee Remove uploads from tracking
cac6f55 Initial Speaker Split application
541bab5 Initial commit from Create Next App
```

---

## Troubleshooting

### "Server not reachable" in Coolify
- Check Docker is running: `systemctl status docker`
- Restart Docker: `systemctl restart docker`
- Validate server in Coolify UI or via API

### Deployment fails with timeout
- Check server CPU/memory
- Reduce concurrent builds in Coolify settings
- Use smaller Whisper model

### Audio processing slow
- Expected on CPU mode
- Consider upgrading to GPU server
- Use `small` model instead of `large-v2`

### HuggingFace authentication error
1. Create account at huggingface.co
2. Accept pyannote model agreements
3. Generate access token
4. Set as `HF_TOKEN` environment variable

---

## Contact & Support

- **Project Owner:** Start My Business Inc.
- **Repository:** https://github.com/AiMagic5000/speaker-split
- **Website:** https://startmybusiness.us
- **Phone:** (888) 534-4145

---

*Generated by Claude Code on January 6, 2026*
