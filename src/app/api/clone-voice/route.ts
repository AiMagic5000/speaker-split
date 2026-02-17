import { NextRequest } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'
import { v4 as uuidv4 } from 'uuid'

export const maxDuration = 600
export const dynamic = 'force-dynamic'

const UPLOAD_DIR = process.env.UPLOAD_DIR || '/tmp/uploads'
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8000'

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
        const quality = formData.get('quality') as string

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

        const jobId = uuidv4()
        send({ progress: 5, stage: 'Uploading reference audio...' })

        // Create job directory
        const jobDir = path.join(UPLOAD_DIR, jobId)
        if (!existsSync(jobDir)) {
          await mkdir(jobDir, { recursive: true })
        }

        // Save the reference audio
        const bytes = await referenceAudio.arrayBuffer()
        const buffer = Buffer.from(bytes)
        const filePath = path.join(jobDir, referenceAudio.name)
        await writeFile(filePath, buffer)

        send({ progress: 15, stage: 'Starting voice cloning...' })

        // Call backend for voice cloning
        try {
          const abortController = new AbortController()
          const timeoutId = setTimeout(() => abortController.abort(), 600000)

          const processResponse = await fetch(`${BACKEND_URL}/clone-voice`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              jobId,
              referenceAudioPath: filePath,
              referenceText: '',
              textToGenerate: textToGenerate.trim(),
              outputDir: path.join(jobDir, 'output'),
              speed: parseFloat(speed) || 1.0,
              quality: parseInt(quality) || 32,
            }),
            signal: abortController.signal,
          })

          clearTimeout(timeoutId)

          if (!processResponse.ok) {
            const errorData = await processResponse.json().catch(() => ({}))
            throw new Error(errorData.error || 'Voice cloning failed')
          }

          // Stream progress from backend
          const reader = processResponse.body?.getReader()
          if (reader) {
            const decoder = new TextDecoder()
            while (true) {
              const { done, value } = await reader.read()
              if (done) break

              const text = decoder.decode(value)
              const lines = text.split('\n').filter(line => line.trim())

              for (const line of lines) {
                try {
                  const data = JSON.parse(line)
                  send(data)
                } catch {
                  // Ignore parse errors
                }
              }
            }
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error'

          if (errorMessage.includes('fetch failed') || errorMessage.includes('ECONNREFUSED')) {
            send({ error: 'Backend server is not running. The voice cloning service is currently unavailable. Please try again later or contact support.' })
          } else if (errorMessage.includes('Voice cloning failed')) {
            send({ error: 'Voice cloning endpoint not available. Please try again later.' })
          } else {
            send({ error: `Backend processing failed: ${errorMessage}` })
          }
        }

        controller.close()
      } catch (error) {
        const send = (data: object) => {
          controller.enqueue(encoder.encode(JSON.stringify(data) + '\n'))
        }
        send({ error: error instanceof Error ? error.message : 'Processing failed' })
        controller.close()
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
