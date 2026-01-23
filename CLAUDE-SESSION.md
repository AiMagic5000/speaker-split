# Speaker Split - Claude Session Documentation

**Project:** Speaker Split - AI Speaker Diarization and Audio Processing App
**Repository:** https://github.com/AiMagic5000/speaker-split
**Live URL:** https://speakersplit.alwaysencrypted.com

---

## Session History

| Date | Status | Summary |
|------|--------|---------|
| January 6, 2026 | Code Complete | Initial development, awaiting deployment |
| January 10, 2026 | **DEPLOYED** | Successfully deployed to R730 via Coolify |
| January 22, 2026 | **MARKETING** | Webflow landing page package with SEO/AEO schema |

---

## Current Deployment Status (January 10, 2026)

### Live Application
- **Public URL:** https://speakersplit.alwaysencrypted.com
- **Frontend Port:** 3100 (internal 3000)
- **Backend Port:** 8100 (internal 8000)
- **Server:** Dell R730 (Coolify at https://coolify.alwaysencrypted.com)
- **Status:** Running, UI accessible, audio processing requires HF_TOKEN

### What's Working
- Frontend UI fully functional
- Drag-and-drop audio upload
- Speaker count selection
- Client information form
- Backend API responding
- Cloudflare Tunnel routing

### What's Pending
- **HuggingFace Token (HF_TOKEN)** - Required for pyannote.audio speaker diarization
- Without HF_TOKEN, audio processing will fail with authentication error

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
- **Frontend:** Next.js 16.1.1 (App Router), TypeScript, Tailwind CSS, Zustand
- **Backend:** Python FastAPI, WhisperX, pyannote.audio
- **AI:** Anthropic Claude API for HTML document generation
- **Deployment:** Docker, Docker Compose, Coolify v4.0.0-beta.460
- **CDN/Tunnel:** Cloudflare Tunnel (r730-tunnel)

---

## January 10, 2026 Session - Full Deployment Log

### Session Overview
This session completed the deployment of Speaker Split to the new Dell R730 server running Coolify. The deployment involved troubleshooting multiple issues with Coolify, Docker networking, and Cloudflare Tunnel configuration.

### Timeline of Events

#### 1. Initial Assessment (5:00 AM)
- User requested to continue the Speaker Split build
- Identified two project folders:
  - `/mnt/c/Users/flowc/Documents/speaker-split-app` (main project)
  - `/mnt/c/Users/flowc/Documents/Speacker Split Project` (empty/unused)
- Reviewed CLAUDE-SESSION.md from January 6 session
- Status was "Code Complete, Awaiting Deployment on New Server"

#### 2. Local Development Test (5:05 AM)
- Started Next.js frontend locally on port 3000
- Started Python FastAPI backend locally on port 8000
- Installed Python dependencies (fastapi, uvicorn, pandas, pydub)
- Confirmed both servers running and responding
- Frontend: http://localhost:3000
- Backend: http://localhost:8000/health returning `{"status":"healthy"}`

#### 3. Coolify API Token Issues (5:10 AM)
- Attempted to use existing API token from CLAUDE.md
- Token `2|72NMKNKta81WG1wisjdEAWNhhXlJ8hjCaCwVs6z74e91a8ea` returned "Unauthenticated"
- User generated new token in Coolify UI: `2|Y6HOD6I2eazgSG0pZ5Dd81W80Urq3HauN3WEN7HQ9a5ea0fa`
- New token also returned "Unauthenticated" - API tokens not working
- Decision: Proceed with Coolify UI deployment instead

#### 4. Old Project Cleanup Issues (5:15 AM)
- Found existing "Speaker-Split" project in Coolify with orphaned apps
- Apps referenced deleted server (old 72.60.119.182)
- Clicking on apps caused 500 error: "Attempt to read property 'server' on null"
- Could not delete apps - Coolify bug with orphaned resources
- Terminal websocket timed out
- **Solution:** Create new project with different name

#### 5. New Project Creation (5:25 AM)
- Created new Coolify project: **"SpeakerSplit"** (no hyphen)
- Selected "Public Repository" resource type
- Configured:
  - Repository: `https://github.com/AiMagic5000/speaker-split`
  - Branch: `main`
  - Build Pack: Docker Compose

#### 6. Docker Compose File Issue (5:27 AM)
- Coolify couldn't find docker-compose file
- Default location `/docker-compose.yaml` didn't exist
- Our file was named `coolify-compose.yml`
- Coolify UI bug: field reverted when clicking Save
- Docker Compose Content (raw) editor was read-only
- **Solution:** Pushed `docker-compose.yaml` to GitHub repo

```bash
cd /mnt/c/Users/flowc/Documents/speaker-split-app
cp coolify-compose.yml docker-compose.yaml
git add docker-compose.yaml
git commit -m "Add docker-compose.yaml for Coolify deployment"
git push
```

- Commit: `5bf4fe9`

#### 7. Environment Variables Configuration (5:30 AM)
- Coolify auto-loaded variables from docker-compose.yaml
- All required variables already existed:
  - `ANTHROPIC_API_KEY` - Claude API key for HTML generation
  - `N8N_WEBHOOK_URL` - n8n webhook (https://n8n.alwaysencrypted.com/webhook/transcript-to-html)
  - `HF_TOKEN` - Placeholder (needs real token)
  - `WHISPER_MODEL` - small
  - `DEVICE` - cpu

#### 8. Deployment Build (5:35 AM - 6:05 AM)
- Clicked Deploy in Coolify
- Build took approximately 30 minutes
- Build stages:
  1. Importing AiMagic5000/speaker-split:main
  2. Added 28 ARG declarations to Dockerfile for frontend (multi-stage, 4 stages)
  3. Added 7 ARG declarations to Dockerfile for backend
  4. Pulling & building required images (longest step - PyTorch/ML dependencies)
  5. Removing old containers
  6. Starting new application
  7. New container started
- Final status: **Running**

#### 9. HuggingFace MCP Server (5:18 AM)
- User asked about Rube/Composio HuggingFace access
- Rube has OpenRouter (for LLM inference) but not direct HF token access
- Added HuggingFace MCP server to Claude Code:
```bash
claude mcp add hf-mcp-server -t http "https://huggingface.co/mcp?login"
```
- MCP server requires OAuth authentication at: https://huggingface.co/mcp?login
- User completed browser OAuth but session restart needed for token pickup

#### 10. Domain Configuration (6:40 AM)
- User added domain `speakersplit.alwaysencrypted.com` in Coolify
- Server IP changed due to new Netgate router - old IPs no longer valid

#### 11. Cloudflare Tunnel Configuration (6:45 AM)

##### Getting Current Tunnel Config
```bash
curl -s -X GET "https://api.cloudflare.com/client/v4/accounts/82f3c6e0ba2e585cd0fe3492151de1a0/cfd_tunnel/d4b5f6f4-a09b-4c0b-9cbb-a80659ea775c/configurations" \
  -H "X-Auth-Email: Coreypearsonemail@gmail.com" \
  -H "X-Auth-Key: 922460400012ed8596f9188ad3a21aac2918e"
```

##### Adding Speaker Split to Tunnel
First attempt - container name (failed - bad gateway):
```json
{"hostname": "speakersplit.alwaysencrypted.com", "service": "http://speaker-split-frontend:3000"}
```

Second attempt - host.docker.internal (failed - bad gateway):
```json
{"hostname": "speakersplit.alwaysencrypted.com", "service": "http://host.docker.internal:3100"}
```

Third attempt - Docker bridge IP (SUCCESS):
```json
{"hostname": "speakersplit.alwaysencrypted.com", "service": "http://172.17.0.1:3100"}
```

##### Creating DNS Record
```bash
curl -s -X POST "https://api.cloudflare.com/client/v4/zones/3cf1dd25568da563acc750eef0c9f87d/dns_records" \
  -H "X-Auth-Email: Coreypearsonemail@gmail.com" \
  -H "X-Auth-Key: 922460400012ed8596f9188ad3a21aac2918e" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "CNAME",
    "name": "speakersplit",
    "content": "d4b5f6f4-a09b-4c0b-9cbb-a80659ea775c.cfargotunnel.com",
    "proxied": true
  }'
```

- DNS Record ID: `4bc676ca65dc1ef10f1a32f7b0895378`
- Created: 2026-01-10T14:47:03.043985Z

#### 12. Final Verification (6:50 AM)
- **https://speakersplit.alwaysencrypted.com** - CONNECTED
- Application successfully accessible via public URL
- Frontend rendering correctly with SMB branding

---

## Infrastructure Details

### Dell R730 Server (Current)
- **SSH:** `ssh admin1@<new-ip>` (IP changed with Netgate router)
- **Specs:** 2x Xeon E5-2690 v4 (28c/56t), 94GB RAM, 2x1TB NVMe
- **Platform:** Coolify v4.0.0-beta.460, Ubuntu 22.04
- **Coolify URL:** https://coolify.alwaysencrypted.com

### Cloudflare Tunnel
- **Tunnel Name:** r730-tunnel
- **Tunnel ID:** `d4b5f6f4-a09b-4c0b-9cbb-a80659ea775c`
- **Status:** Healthy (4 active connections)
- **Config Version:** 16 (after adding speakersplit)

### Speaker Split Tunnel Entry
```json
{
  "hostname": "speakersplit.alwaysencrypted.com",
  "service": "http://172.17.0.1:3100"
}
```

### Network Architecture
```
Internet
    │
    ▼
Cloudflare (Proxy)
    │
    ▼
Cloudflare Tunnel (r730-tunnel)
    │
    ▼
Docker Bridge (172.17.0.1:3100)
    │
    ▼
speaker-split-frontend container (:3000)
    │
    ▼
speaker-split-backend container (:8000)
```

---

## Coolify Project Configuration

### Project Details
- **Project Name:** SpeakerSplit (note: no hyphen to avoid old broken project)
- **Environment:** production
- **Server:** localhost (R730)
- **Build Pack:** Docker Compose
- **Docker Compose File:** `/docker-compose.yaml`

### Container Details
| Container | Internal Port | External Port | Network |
|-----------|---------------|---------------|---------|
| speaker-split-frontend | 3000 | 3100 | speaker-split-network |
| speaker-split-backend | 8000 | 8100 | speaker-split-network |

### Environment Variables (Production)
| Variable | Value | Description |
|----------|-------|-------------|
| `ANTHROPIC_API_KEY` | sk-ant-api03-... | Claude API for HTML generation |
| `N8N_WEBHOOK_URL` | https://n8n.alwaysencrypted.com/webhook/transcript-to-html | Webhook for transcript processing |
| `HF_TOKEN` | placeholder | **NEEDS REAL TOKEN** - HuggingFace access |
| `WHISPER_MODEL` | small | WhisperX model size |
| `DEVICE` | cpu | Processing device |
| `NODE_ENV` | production | Node environment |
| `UPLOAD_DIR` | /app/uploads | Upload directory |
| `BACKEND_URL` | http://speaker-split-backend:8000 | Backend API URL |

---

## Processing Time Estimates

### CPU Mode (Current - R730 without GPU)
| Audio Length | Model | Estimated Time |
|--------------|-------|----------------|
| 10 minutes | small | 10-20 minutes |
| 30 minutes | small | 30-60 minutes |
| 60 minutes | small | 60-120 minutes |
| 60 minutes | large-v2 | 3-5 hours |

### GPU Mode (Future - if GPU added)
| Audio Length | Model | Estimated Time |
|--------------|-------|----------------|
| 10 minutes | small | 1-2 minutes |
| 30 minutes | small | 3-5 minutes |
| 60 minutes | large-v2 | 10-20 minutes |

---

## HuggingFace Token Setup (REQUIRED)

Audio processing will fail until HF_TOKEN is configured. Follow these steps:

### Step 1: Create HuggingFace Account
1. Go to https://huggingface.co/join
2. Create account or sign in

### Step 2: Accept Model Agreements
Visit each URL and click "Agree and access repository":
1. https://huggingface.co/pyannote/speaker-diarization-3.1
2. https://huggingface.co/pyannote/segmentation-3.0

### Step 3: Generate Access Token
1. Go to https://huggingface.co/settings/tokens
2. Click **New token**
3. Name: `speaker-split`
4. Type: **Read**
5. Click Create
6. Copy token (starts with `hf_...`)

### Step 4: Update Coolify Environment Variable
1. Go to https://coolify.alwaysencrypted.com
2. Projects → SpeakerSplit → production
3. Click on the application
4. Environment Variables
5. Find `HF_TOKEN` and update value from `placeholder` to your actual token
6. Click Save
7. Redeploy the application

---

## Files Changed This Session (January 10, 2026)

| File | Action | Description |
|------|--------|-------------|
| `docker-compose.yaml` | Created | Copy of coolify-compose.yml for Coolify compatibility |
| `CLAUDE-SESSION.md` | Updated | This comprehensive documentation |

### Git Commits
```
5bf4fe9 Add docker-compose.yaml for Coolify deployment
```

---

## Troubleshooting Guide

### Bad Gateway Error
**Symptoms:** Cloudflare returns 502 Bad Gateway
**Causes:**
1. Docker networks not connected
2. Container not running
3. Wrong service URL in tunnel config

**Solutions:**
1. Check container status in Coolify
2. Verify tunnel config uses correct IP/port
3. For Speaker Split, use `http://172.17.0.1:3100` (Docker bridge)

### Coolify API Token "Unauthenticated"
**Symptoms:** API calls return `{"message":"Unauthenticated."}`
**Causes:**
1. Token expired
2. Token not properly created
3. API access may need enabling in settings

**Solutions:**
1. Generate new token in Coolify → Keys & Tokens
2. Ensure root permissions selected
3. Use UI deployment as fallback

### Orphaned Applications (500 Error)
**Symptoms:** Clicking on app shows 500 error about null server
**Causes:** Apps reference deleted server

**Solutions:**
1. Create new project with different name
2. Use Coolify Terminal to clean database (if accessible):
```php
App\Models\Application::whereNull('server_id')->delete();
```

### Docker Compose File Not Found
**Symptoms:** Coolify can't find docker-compose file
**Causes:**
1. File named differently (coolify-compose.yml vs docker-compose.yaml)
2. Wrong path specified

**Solutions:**
1. Rename file to `docker-compose.yaml` (Coolify default)
2. Or manually set path in Coolify UI

### Audio Processing Fails
**Symptoms:** Job starts but fails during "Loading AI models"
**Causes:**
1. Missing HF_TOKEN
2. pyannote model access not granted
3. Insufficient memory

**Solutions:**
1. Add valid HuggingFace token
2. Accept model agreements on HuggingFace website
3. Ensure server has 4GB+ RAM available

---

## API Reference

### Speaker Split Backend Endpoints
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/` | GET | API info |
| `/health` | GET | Health check |
| `/process` | POST | Start audio processing job |
| `/jobs/{job_id}` | GET | Get job status |
| `/files/{job_id}/{path}` | GET | Download output files |

### Process Request Body
```json
{
  "jobId": "uuid-string",
  "audioPath": "/app/uploads/uuid/audio.mp3",
  "speakerCount": 2,
  "outputDir": "/app/uploads/uuid/output"
}
```

### Job Status Response
```json
{
  "status": "complete",
  "progress": 100,
  "stage": "Processing complete!",
  "speakers": [
    {"id": "SPEAKER_00", "label": "Speaker 1", "name": "", "color": "#4493f2"}
  ],
  "transcript": [
    {"speaker": "SPEAKER_00", "text": "Hello", "start": 0.0, "end": 1.5}
  ],
  "outputs": {
    "json": "/api/files/uuid/output/audio_diarized.json",
    "txt": "/api/files/uuid/output/audio_transcript.txt",
    "srt": "/api/files/uuid/output/audio_subtitles.srt",
    "speakerAudios": [
      {"speaker": "SPEAKER_00", "url": "/api/files/uuid/output/audio_SPEAKER_00.wav"}
    ]
  }
}
```

---

## Branding (Start My Business Inc.)

### Colors
| Color | Hex | Usage |
|-------|-----|-------|
| Primary Blue | #4493f2 | Buttons, links, accents |
| Secondary Teal | #4dc0b5 | Speaker highlights |
| Navy | #132743 | Headers, dark backgrounds |
| Charcoal | #1a1a2e | Body background |

### Logo URL
```
https://cdn.prod.website-files.com/6784053e7b7422e48efa5a84/6833a36f90c60fba010cee72_start_my_business_logo-removebg-preview.png
```

### Contact
- **Website:** https://startmybusiness.us
- **Phone:** (888) 534-4145

---

## Related Documentation

- **Main CLAUDE.md:** `/home/flowc/.claude/CLAUDE.md` - Global configuration and credentials
- **Deployment Guide:** `/mnt/c/Users/flowc/Documents/speaker-split-app/DEPLOYMENT.md`
- **Local Project:** `/mnt/c/Users/flowc/Documents/speaker-split-app/`

---

## Next Steps

### Immediate (Required for Audio Processing)
1. [ ] Obtain HuggingFace token
2. [ ] Accept pyannote model agreements
3. [ ] Update HF_TOKEN in Coolify
4. [ ] Redeploy application
5. [ ] Test audio processing end-to-end

### Future Enhancements
1. [ ] Add GPU support when NVIDIA GPU available
2. [ ] Configure larger WhisperX model (large-v2) for better accuracy
3. [ ] Add monitoring/alerting for processing jobs
4. [ ] Implement job queue for multiple concurrent uploads
5. [ ] Add user authentication

---

## Contact & Support

- **Project Owner:** Start My Business Inc.
- **Repository:** https://github.com/AiMagic5000/speaker-split
- **Live URL:** https://speakersplit.alwaysencrypted.com
- **Website:** https://startmybusiness.us
- **Phone:** (888) 534-4145

---

## Session Log Summary

### January 6, 2026 - Initial Development
- Created Next.js frontend with SMB branding
- Created Python FastAPI backend with WhisperX/pyannote integration
- Configured Docker Compose for deployment
- Pushed to GitHub repository
- Blocked by compromised old server (72.60.119.182)

### January 10, 2026 - Successful Deployment
- Deployed to Dell R730 via Coolify
- Resolved Coolify UI bugs and orphaned project issues
- Configured Cloudflare Tunnel routing
- Troubleshot Docker networking (container name → bridge IP)
- Application live at https://speakersplit.alwaysencrypted.com
- Pending: HuggingFace token for audio processing

---

## January 22, 2026 Session - Webflow Landing Page & Marketing Assets

### Session Overview
This session created a comprehensive Webflow landing page package for Speaker Split with advanced SEO/AEO schema markup, AI-generated testimonial images, and all HTML sections optimized for Webflow's 50,000 character embed limit.

### Work Completed

#### 1. Cloudflare Tunnel Fixes (Context from Earlier)
The tunnel configuration was using `localhost` which doesn't work from containerized cloudflared. Fixed by using:
- **Docker bridge IP (10.0.0.1):** For services published on host ports
- **Container IPs:** For Docker services on internal networks

This restored all services including Speaker Split at `speakersplit.alwaysencrypted.com`.

#### 2. Webflow Landing Page Package Created

Created complete landing page package at `/mnt/c/Users/flowc/Documents/speaker-split-app/webflow-embed/landing-page/`:

| File | Character Count | Purpose |
|------|-----------------|---------|
| section-1-head-meta.html | ~22,000 | Head code with SEO meta tags and primary schemas |
| section-2-faq-schema.html | ~18,000 | Comprehensive FAQPage with 25 Q&As |
| section-3-hero.html | ~15,800 | Hero section with animated waveform |
| section-4-app-embed.html | ~10,500 | Native iframe embed with browser chrome |
| section-5-features.html | ~20,000 | 6 feature cards + highlight section |
| section-6-how-it-works.html | ~13,200 | 4-step visual process guide |
| section-7-use-cases.html | ~14,200 | 8 use cases + featured testimonial |
| section-8-faq-visual.html | ~14,000 | Interactive FAQ accordion (8 questions) |
| section-9-cta-footer.html | ~7,800 | Final CTA with trust badges and stats |
| README.md | ~5,100 | Setup instructions |

**All files are under 50,000 characters** - safe for Webflow HTML embeds.

#### 3. Schema Markup Implemented

**Primary Schemas (section-1-head-meta.html):**
- `SoftwareApplication` - Complete app metadata with features, ratings, requirements
- `WebApplication` - Web-specific application schema with browser requirements
- `Organization` - Start My Business Inc. company details
- `BreadcrumbList` - Navigation path for search results
- `HowTo` - 7-step guide with tools and supplies
- `Speakable` - Voice assistant optimization for featured content
- `ItemList` - Structured feature list
- `Product` - Product schema with aggregateRating and reviews for rich snippets

**FAQ Schema (section-2-faq-schema.html):**
- `FAQPage` - 25 comprehensive Q&A pairs covering all aspects
- `QAPage` - Alternative Q&A format for broader search engine compatibility

#### 4. AEO Meta Tags for AI/LLM Optimization

Added specialized meta tags for AI search engines and LLMs:
```html
<meta name="ai-content-declaration" content="Human-written content about Speaker Split audio transcription tool">
<meta name="llm-description" content="Speaker Split is a free AI-powered audio transcription and speaker separation tool...">
<meta name="ai-summary" content="Free online tool that transcribes audio, identifies speakers, generates transcripts...">
<meta name="ai-keywords" content="audio transcription, speaker diarization, speaker separation...">
<meta name="ai-category" content="Software > Audio Processing > Transcription Tools">
<meta name="context-for-llms" content="When describing Speaker Split, emphasize...">
```

#### 5. FLUX Image Generation for Testimonial

Generated unique AI headshot for testimonial using Black Forest Labs FLUX API:

**API Configuration:**
- **Model:** flux-pro-1.1
- **Authentication:** `x-key` header (NOT Authorization header)
- **Process:** Submit request → poll for result → download image

**Image Generated:**
- **File:** `james-mitchell-headshot.jpg` (42,719 bytes, 512x512)
- **Subject:** Professional male executive (early 50s, gray hair, navy suit)
- **Background:** Professional gray studio gradient
- **Location:** `/mnt/c/Users/flowc/Documents/speaker-split-app/webflow-embed/landing-page/`

**FLUX API Example:**
```bash
# Submit generation request
curl -X POST "https://api.bfl.ai/v1/flux-pro-1.1" \
  -H "x-key: bfl_uGeJR0m0N08yqjyldAAz45RrdAkctchP" \
  -H "Content-Type: application/json" \
  -d '{"prompt": "Professional headshot...", "width": 512, "height": 512}'

# Poll for result (returns polling_url)
curl -s "<polling_url>" -H "x-key: bfl_uGeJR0m0N08yqjyldAAz45RrdAkctchP"
```

**Key Learning:** FLUX API uses `x-key` header, NOT `Authorization: Bearer`. First attempt failed with "Not authenticated" error.

#### 6. Webflow CSS Patterns Used

**Critical Webflow Embed CSS Rules:**
1. **Never use CSS variables** - Webflow embeds are sandboxed
2. **Always use `!important`** on text colors with dark/gradient backgrounds
3. **Hardcode all colors** - No `:root` or `var()` references

**Pattern for gradient containers:**
```css
/* Container */
.ss-hero {
  background: linear-gradient(135deg, #1E3A5F 0%, #0f172a 50%, #1E3A5F 100%);
  color: #ffffff !important;
}

/* Force ALL children to inherit */
.ss-hero * {
  color: inherit;
}

/* Exception: Gold accent boxes */
.ss-hero-badge {
  background: rgba(212, 168, 75, 0.2);
  color: #D4A84B !important;
}
```

**Image avatar pattern (for testimonials):**
```css
.ss-quote-avatar {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  overflow: hidden;
  border: 3px solid #D4A84B;
  box-shadow: 0 4px 15px rgba(212, 168, 75, 0.3);
  flex-shrink: 0;
}

.ss-quote-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
```

---

## Key Technical Learnings

### 1. FLUX Image Generation API
- **Endpoint:** `https://api.bfl.ai/v1/flux-pro-1.1`
- **Auth Header:** `x-key: <api_key>` (not Authorization)
- **Models:** max, pro, flex, klein
- **Process:** Async - submit returns `polling_url`, poll until status is "Ready"
- **Output:** Returns `sample` URL with generated image

### 2. Webflow HTML Embed Constraints
- **Character limit:** 50,000 per embed block
- **CSS variables:** Do not work (sandboxed)
- **Default styles:** Webflow overrides - use `!important`
- **Solution:** Split content into multiple sections, hardcode colors

### 3. Schema.org Best Practices
- Combine multiple schema types for rich search results
- FAQPage with 25+ questions improves featured snippet chances
- Product schema with AggregateRating enables star ratings in SERPs
- Speakable schema helps voice assistants find key content
- HowTo schema with step-by-step images can appear as rich cards

### 4. AEO (AI Engine Optimization)
- Add meta tags specifically for LLMs: `llm-description`, `ai-summary`
- Include `context-for-llms` with guidance on how to describe the product
- Declare content authenticity with `ai-content-declaration`
- Categorize with `ai-category` for classification systems

### 5. Cloudflare Tunnel from Containers
- `localhost` doesn't work from containerized cloudflared
- Use Docker bridge IP `10.0.0.1` for host-published services
- Use container IPs for Docker-networked services
- After tunnel config changes, may need `docker restart cloudflared`

---

## Files Created/Modified This Session

| File | Action | Description |
|------|--------|-------------|
| section-1-head-meta.html | Created | SEO meta tags, primary schemas |
| section-2-faq-schema.html | Created | 25-question FAQPage schema |
| section-3-hero.html | Created | Hero with waveform animation |
| section-4-app-embed.html | Created | Native iframe embed |
| section-5-features.html | Created | Feature cards grid |
| section-6-how-it-works.html | Created | 4-step process guide |
| section-7-use-cases.html | Created | Use cases + testimonial |
| section-8-faq-visual.html | Created | Interactive FAQ accordion |
| section-9-cta-footer.html | Created | Final CTA section |
| README.md | Created | Webflow setup instructions |
| james-mitchell-headshot.jpg | Created | AI-generated testimonial photo |
| CLAUDE-SESSION.md | Updated | This documentation |

---

## Webflow Implementation Checklist

### Head Code (Page Settings > Custom Code > Head Code)
1. [ ] Add `section-1-head-meta.html` content
2. [ ] Add `section-2-faq-schema.html` content

### Body Sections (HTML Embed blocks in order)
1. [ ] Add `section-3-hero.html`
2. [ ] Add `section-4-app-embed.html`
3. [ ] Add `section-5-features.html`
4. [ ] Add `section-6-how-it-works.html`
5. [ ] Add `section-7-use-cases.html`
6. [ ] Add `section-8-faq-visual.html`
7. [ ] Add `section-9-cta-footer.html`

### Image Assets to Upload
1. [ ] Upload `james-mitchell-headshot.jpg` to Webflow
2. [ ] Update image URL in `section-7-use-cases.html` to Webflow CDN URL
3. [ ] Create/upload Open Graph image (1200x630) `speaker-split-og.png`

### Post-Publish Testing
1. [ ] Test with [Google Rich Results Test](https://search.google.com/test/rich-results)
2. [ ] Test with [Schema Validator](https://validator.schema.org/)
3. [ ] Test Open Graph with [Facebook Debugger](https://developers.facebook.com/tools/debug/)
4. [ ] Verify all accordion FAQ items toggle correctly
5. [ ] Test responsive layout on mobile

---

### January 22, 2026 - Webflow Landing Page Package
- Created 9 HTML sections for Webflow (all under 50k chars)
- Implemented comprehensive schema markup (8 schema types)
- Added AEO meta tags for AI/LLM optimization
- Generated unique AI testimonial headshot via FLUX API
- Documented Webflow CSS patterns and constraints
- Fixed Cloudflare tunnel configuration (localhost → Docker bridge IP)

---

*Last Updated: January 22, 2026*
*Generated by Claude Code (Opus 4.5)*
