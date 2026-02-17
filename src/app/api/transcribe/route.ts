import { NextRequest } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'
import { v4 as uuidv4 } from 'uuid'

// Route segment config (App Router)
// Note: Body size limit is handled by Next.js config, not route config
export const maxDuration = 600 // 10 minutes timeout for large audio files
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
        const file = formData.get('file') as File
        const speakerCount = formData.get('speakerCount') as string

        if (!file) {
          send({ error: 'No file provided' })
          controller.close()
          return
        }

        const jobId = uuidv4()
        send({ progress: 5, stage: 'Uploading file...' })

        // Create job directory
        const jobDir = path.join(UPLOAD_DIR, jobId)
        if (!existsSync(jobDir)) {
          await mkdir(jobDir, { recursive: true })
        }

        // Save the file
        const bytes = await file.arrayBuffer()
        const buffer = Buffer.from(bytes)
        const filePath = path.join(jobDir, file.name)
        await writeFile(filePath, buffer)

        send({ progress: 20, stage: 'Starting transcription...' })

        // Call backend for transcription only
        try {
          // Use AbortController with 10 minute timeout for large files
          const abortController = new AbortController()
          const timeoutId = setTimeout(() => abortController.abort(), 600000) // 10 minutes

          const processResponse = await fetch(`${BACKEND_URL}/transcribe`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              jobId,
              audioPath: filePath,
              speakerCount: parseInt(speakerCount) || 2,
              outputDir: path.join(jobDir, 'output'),
            }),
            signal: abortController.signal,
          })

          clearTimeout(timeoutId)

          if (!processResponse.ok) {
            const errorData = await processResponse.json().catch(() => ({}))
            throw new Error(errorData.error || 'Transcription failed')
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
          console.error('Backend error:', error)
          const errorMessage = error instanceof Error ? error.message : 'Unknown error'

          // Check if backend is not running or endpoint not found
          if (errorMessage.includes('fetch failed') || errorMessage.includes('ECONNREFUSED')) {
            send({ error: 'Backend server is not running. The transcription service is currently unavailable. Please try again later or contact support.' })
          } else if (errorMessage.includes('Transcription failed')) {
            send({ error: 'Transcription endpoint not available. Please try again later.' })
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
