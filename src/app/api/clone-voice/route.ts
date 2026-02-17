import { NextRequest } from 'next/server'
import { v4 as uuidv4 } from 'uuid'

export const maxDuration = 600
export const dynamic = 'force-dynamic'

const MINIMAX_API_KEY = process.env.MINIMAX_AUDIO_API_KEY || ''
const MINIMAX_API_URL = 'https://api.minimax.io/v1'

export async function POST(request: NextRequest) {
  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: object) => {
        controller.enqueue(encoder.encode(JSON.stringify(data) + '\n'))
      }

      try {
        const formData = await request.formData()
        const referenceAudio = formData.get('referenceAudio') as File
        const textToGenerate = formData.get('textToGenerate') as string
        const speed = formData.get('speed') as string

        if (!referenceAudio) {
          send({ error: 'No reference audio provided' })
          controller.close()
          return
        }

        if (!textToGenerate?.trim()) {
          send({ error: 'No text to generate provided' })
          controller.close()
          return
        }

        if (!MINIMAX_API_KEY) {
          send({ error: 'Voice cloning API key not configured. Please contact support.' })
          controller.close()
          return
        }

        const jobId = uuidv4()
        send({ progress: 5, stage: 'Uploading reference audio to AI...' })

        // Step 1: Upload reference audio to MiniMax
        const uploadForm = new FormData()
        uploadForm.append('purpose', 'voice_clone')
        uploadForm.append('file', referenceAudio)

        const uploadResponse = await fetch(`${MINIMAX_API_URL}/files/upload`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${MINIMAX_API_KEY}`,
          },
          body: uploadForm,
        })

        if (!uploadResponse.ok) {
          const errText = await uploadResponse.text().catch(() => '')
          throw new Error(`Failed to upload reference audio: ${uploadResponse.status} ${errText}`)
        }

        const uploadResult = await uploadResponse.json()
        if (uploadResult.base_resp?.status_code !== 0) {
          throw new Error(uploadResult.base_resp?.status_msg || 'Audio upload failed')
        }

        const fileId = uploadResult.file?.file_id
        if (!fileId) {
          throw new Error('No file ID returned from upload')
        }

        send({ progress: 25, stage: 'Analyzing voice characteristics...' })

        // Step 2: Clone the voice
        const voiceId = `clone${jobId.replace(/-/g, '').substring(0, 16)}`

        const cloneResponse = await fetch(`${MINIMAX_API_URL}/voice_clone`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${MINIMAX_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            file_id: fileId,
            voice_id: voiceId,
          }),
        })

        if (!cloneResponse.ok) {
          const errText = await cloneResponse.text().catch(() => '')
          throw new Error(`Voice cloning failed: ${cloneResponse.status} ${errText}`)
        }

        const cloneResult = await cloneResponse.json()
        if (cloneResult.base_resp?.status_code !== 0) {
          const msg = cloneResult.base_resp?.status_msg || 'Voice cloning failed'
          if (msg.includes('duration too short')) {
            throw new Error('Reference audio is too short. Please upload at least 10 seconds of clear speech.')
          }
          throw new Error(msg)
        }

        send({ progress: 50, stage: 'Generating speech with cloned voice...' })

        // Step 3: Generate speech using cloned voice via T2A v2
        const t2aResponse = await fetch(`${MINIMAX_API_URL}/t2a_v2`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${MINIMAX_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'speech-2.8-hd',
            text: textToGenerate.trim(),
            stream: false,
            voice_setting: {
              voice_id: voiceId,
              speed: parseFloat(speed) || 1.0,
            },
            audio_setting: {
              format: 'mp3',
              sample_rate: 32000,
            },
          }),
        })

        if (!t2aResponse.ok) {
          const errText = await t2aResponse.text().catch(() => '')
          throw new Error(`Speech generation failed: ${t2aResponse.status} ${errText}`)
        }

        const t2aResult = await t2aResponse.json()
        if (t2aResult.base_resp?.status_code !== 0) {
          throw new Error(t2aResult.base_resp?.status_msg || 'Speech generation failed')
        }

        send({ progress: 80, stage: 'Encoding audio...' })

        // Step 4: Convert hex-encoded audio to base64 data URL
        const hexAudio = t2aResult.data?.audio
        if (!hexAudio) {
          throw new Error('No audio data received from speech generation')
        }

        const audioBuffer = Buffer.from(hexAudio, 'hex')
        const base64Audio = audioBuffer.toString('base64')
        const audioUrl = `data:audio/mpeg;base64,${base64Audio}`

        send({ progress: 100, stage: 'Complete!', audioUrl })
        controller.close()
      } catch (error) {
        const errMsg = error instanceof Error ? error.message : 'Processing failed'
        try {
          controller.enqueue(encoder.encode(JSON.stringify({ error: errMsg }) + '\n'))
        } catch {
          // Controller may already be closed
        }
        try {
          controller.close()
        } catch {
          // Already closed
        }
      }
    }
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  })
}
