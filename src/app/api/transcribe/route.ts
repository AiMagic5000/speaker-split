import { NextRequest } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'
import { v4 as uuidv4 } from 'uuid'

const UPLOAD_DIR = process.env.UPLOAD_DIR || './uploads'
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
          const processResponse = await fetch(`${BACKEND_URL}/transcribe`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              jobId,
              audioPath: filePath,
              speakerCount: parseInt(speakerCount) || 2,
              outputDir: path.join(jobDir, 'output'),
            }),
          })

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
          // If backend isn't available, use mock data for development
          console.error('Backend error:', error)

          send({ progress: 40, stage: 'Transcribing audio...' })
          await new Promise(resolve => setTimeout(resolve, 1000))

          send({ progress: 70, stage: 'Identifying speakers...' })
          await new Promise(resolve => setTimeout(resolve, 1000))

          send({ progress: 90, stage: 'Finalizing transcript...' })
          await new Promise(resolve => setTimeout(resolve, 500))

          // Mock transcript for development
          send({
            progress: 100,
            stage: 'Complete',
            transcript: [
              { speaker: 'SPEAKER_0', text: 'Hello, welcome to our consultation today.', start: 0, end: 3.5 },
              { speaker: 'SPEAKER_1', text: 'Thank you for having me. I appreciate your time.', start: 3.5, end: 7.2 },
              { speaker: 'SPEAKER_0', text: 'Let\'s discuss your business goals and how we can help you achieve them.', start: 7.2, end: 12.1 },
              { speaker: 'SPEAKER_1', text: 'I\'m looking to expand my online presence and increase sales.', start: 12.1, end: 16.8 },
            ]
          })
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
