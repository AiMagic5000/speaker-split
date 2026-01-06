# Speaker Split - Coolify Deployment Guide

## Quick Setup in Coolify

### Option 1: Deploy as Docker Compose (Recommended)

1. **Log into Coolify Dashboard**

2. **Create New Project**
   - Click "New Project"
   - Name: `speaker-split`
   - Description: "AI Speaker Diarization App"

3. **Add New Resource → Docker Compose**
   - Source: GitHub Repository
   - Repository: `https://github.com/AiMagic5000/speaker-split`
   - Branch: `main`
   - Docker Compose File: `coolify-compose.yml`

4. **Configure Environment Variables**
   ```
   ANTHROPIC_API_KEY=<your_anthropic_api_key>
   HF_TOKEN=<your_huggingface_token>
   N8N_WEBHOOK_URL=<your_n8n_webhook_url>
   WHISPER_MODEL=large-v2
   DEVICE=cuda
   ```

5. **Configure Domain**
   - Add domain: `speaker-split.yourdomain.com`
   - Enable HTTPS

6. **Deploy**

---

### Option 2: Frontend Only (No GPU Required)

If your Coolify server doesn't have GPU, deploy just the frontend:

1. **Add New Resource → Docker**
   - Source: GitHub Repository
   - Repository: `https://github.com/AiMagic5000/speaker-split`
   - Branch: `main`
   - Dockerfile: `Dockerfile`

2. **Environment Variables**
   ```
   NODE_ENV=production
   ANTHROPIC_API_KEY=<your_anthropic_api_key>
   N8N_WEBHOOK_URL=<your_n8n_webhook_url>
   ```

3. **Port Mapping**
   - Internal: 3000
   - External: 3100 (or auto-assign)

4. **Note**: Audio processing will be limited without the Python backend.

---

## Isolation Features

The deployment uses:

| Feature | Value | Purpose |
|---------|-------|---------|
| Network | `speaker-split-network` | Isolated from other apps |
| Frontend Port | `3100` | Avoids conflict with port 3000 |
| Backend Port | `8100` | Avoids conflict with port 8000 |
| Volume | `speaker-split-uploads` | Isolated file storage |
| Containers | `speaker-split-frontend`, `speaker-split-backend` | Unique names |

---

## GPU Requirements

For full audio processing (speaker diarization), you need:

- NVIDIA GPU with CUDA support
- nvidia-docker2 installed
- At least 10GB VRAM for `large-v2` model (or use `small` model for ~2GB)

To use a smaller model, set:
```
WHISPER_MODEL=small
```

---

## Verify Deployment

After deployment, visit:
- Frontend: `https://your-domain.com`
- Health Check: `https://your-domain.com:8100/health` (backend)

---

## Troubleshooting

### "Port already in use"
Change the ports in `coolify-compose.yml`:
```yaml
ports:
  - "3200:3000"  # Change 3100 to 3200
```

### "GPU not available"
Set `DEVICE=cpu` in environment variables (slower processing).

### "HuggingFace authentication error"
1. Create account at huggingface.co
2. Accept agreements for pyannote models
3. Create access token and set as `HF_TOKEN`

---

## Support

- Repository: https://github.com/AiMagic5000/speaker-split
- Website: https://startmybusiness.us
- Phone: (888) 534-4145
