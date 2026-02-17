import { NextRequest, NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'

export const maxDuration = 600
export const dynamic = 'force-dynamic'

const MINIMAX_API_KEY = process.env.MINIMAX_AUDIO_API_KEY || ''
const API_SECRET = process.env.VOICE_CLONE_API_SECRET || ''
const MINIMAX_API_URL = 'https://api.minimax.io/v1'

interface VoiceCloneRequest {
  reference_audio_base64: string
  reference_audio_filename?: string
  text: string
  speed?: number
  format?: 'mp3' | 'wav' | 'flac'
  sample_rate?: number
}

function validateApiKey(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization')
  if (!authHeader) return false
  const token = authHeader.replace('Bearer ', '')
  return token === API_SECRET && token.length > 0
}

export async function POST(request: NextRequest) {
  if (!validateApiKey(request)) {
    return NextResponse.json(
      { error: 'Unauthorized. Provide a valid Bearer token in the Authorization header.' },
      { status: 401 }
    )
  }

  if (!MINIMAX_API_KEY) {
    return NextResponse.json(
      { error: 'Voice cloning service not configured.' },
      { status: 503 }
    )
  }

  try {
    const body = await request.json() as VoiceCloneRequest

    if (!body.reference_audio_base64) {
      return NextResponse.json(
        { error: 'reference_audio_base64 is required (base64-encoded audio file, 10-60 seconds of clear speech)' },
        { status: 400 }
      )
    }

    if (!body.text?.trim()) {
      return NextResponse.json(
        { error: 'text is required (max 10,000 characters)' },
        { status: 400 }
      )
    }

    if (body.text.trim().length > 10000) {
      return NextResponse.json(
        { error: 'text exceeds 10,000 character limit' },
        { status: 400 }
      )
    }

    const speed = Math.max(0.5, Math.min(2.0, body.speed || 1.0))
    const format = body.format || 'mp3'
    const sampleRate = body.sample_rate || 32000
    const filename = body.reference_audio_filename || 'reference.wav'
    const jobId = uuidv4()

    // Decode base64 audio to a File-like Blob
    const audioBuffer = Buffer.from(body.reference_audio_base64, 'base64')
    const audioBlob = new Blob([audioBuffer])
    const audioFile = new File([audioBlob], filename, { type: 'audio/wav' })

    // Step 1: Upload reference audio to MiniMax
    const uploadForm = new FormData()
    uploadForm.append('purpose', 'voice_clone')
    uploadForm.append('file', audioFile)

    const uploadResponse = await fetch(`${MINIMAX_API_URL}/files/upload`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${MINIMAX_API_KEY}` },
      body: uploadForm,
    })

    if (!uploadResponse.ok) {
      const errText = await uploadResponse.text().catch(() => '')
      return NextResponse.json(
        { error: `Audio upload failed: ${uploadResponse.status}`, details: errText },
        { status: 502 }
      )
    }

    const uploadResult = await uploadResponse.json()
    if (uploadResult.base_resp?.status_code !== 0) {
      return NextResponse.json(
        { error: uploadResult.base_resp?.status_msg || 'Audio upload failed' },
        { status: 502 }
      )
    }

    const fileId = uploadResult.file?.file_id
    if (!fileId) {
      return NextResponse.json(
        { error: 'No file ID returned from upload' },
        { status: 502 }
      )
    }

    // Step 2: Clone the voice
    const voiceId = `clone${jobId.replace(/-/g, '').substring(0, 16)}`

    const cloneResponse = await fetch(`${MINIMAX_API_URL}/voice_clone`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${MINIMAX_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ file_id: fileId, voice_id: voiceId }),
    })

    if (!cloneResponse.ok) {
      const errText = await cloneResponse.text().catch(() => '')
      return NextResponse.json(
        { error: `Voice cloning failed: ${cloneResponse.status}`, details: errText },
        { status: 502 }
      )
    }

    const cloneResult = await cloneResponse.json()
    if (cloneResult.base_resp?.status_code !== 0) {
      const msg = cloneResult.base_resp?.status_msg || 'Voice cloning failed'
      return NextResponse.json(
        { error: msg.includes('duration too short')
            ? 'Reference audio too short. Provide at least 10 seconds of clear speech.'
            : msg },
        { status: 422 }
      )
    }

    // Step 3: Generate speech via T2A v2
    const t2aResponse = await fetch(`${MINIMAX_API_URL}/t2a_v2`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${MINIMAX_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'speech-2.8-hd',
        text: body.text.trim(),
        stream: false,
        voice_setting: { voice_id: voiceId, speed },
        audio_setting: { format, sample_rate: sampleRate },
      }),
    })

    if (!t2aResponse.ok) {
      const errText = await t2aResponse.text().catch(() => '')
      return NextResponse.json(
        { error: `Speech generation failed: ${t2aResponse.status}`, details: errText },
        { status: 502 }
      )
    }

    const t2aResult = await t2aResponse.json()
    if (t2aResult.base_resp?.status_code !== 0) {
      return NextResponse.json(
        { error: t2aResult.base_resp?.status_msg || 'Speech generation failed' },
        { status: 502 }
      )
    }

    const hexAudio = t2aResult.data?.audio
    if (!hexAudio) {
      return NextResponse.json(
        { error: 'No audio data received' },
        { status: 502 }
      )
    }

    const outputBuffer = Buffer.from(hexAudio, 'hex')
    const outputBase64 = outputBuffer.toString('base64')
    const mimeType = format === 'wav' ? 'audio/wav' : format === 'flac' ? 'audio/flac' : 'audio/mpeg'

    return NextResponse.json({
      success: true,
      job_id: jobId,
      audio_base64: outputBase64,
      audio_data_url: `data:${mimeType};base64,${outputBase64}`,
      format,
      sample_rate: sampleRate,
      text_length: body.text.trim().length,
      speed,
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json({
    service: 'Voice Clone API',
    version: '1.0',
    endpoints: {
      'POST /api/v1/voice-clone': {
        description: 'Clone a voice from reference audio and generate speech from text',
        authentication: 'Bearer token in Authorization header',
        request_body: {
          reference_audio_base64: 'string (required) - Base64-encoded audio file, 10-60 seconds of clear speech',
          reference_audio_filename: 'string (optional) - Filename with extension, default: reference.wav',
          text: 'string (required) - Text to generate speech for, max 10,000 characters (~3 min audio)',
          speed: 'number (optional) - Speech speed 0.5 to 2.0, default: 1.0',
          format: 'string (optional) - Output format: mp3, wav, flac. Default: mp3',
          sample_rate: 'number (optional) - Sample rate in Hz. Default: 32000',
        },
        response: {
          success: 'boolean',
          job_id: 'string - Unique job identifier',
          audio_base64: 'string - Base64-encoded output audio',
          audio_data_url: 'string - Data URL ready for <audio> src or download',
          format: 'string - Output format used',
          sample_rate: 'number - Sample rate used',
          text_length: 'number - Characters processed',
          speed: 'number - Speed used',
        },
        limits: {
          max_text_length: '10,000 characters (~1,500-2,000 words, ~3-5 minutes of speech)',
          reference_audio: '10-60 seconds of clear speech, any common audio format',
          max_request_size: '~10MB for the base64 audio payload',
        },
      },
    },
  })
}
