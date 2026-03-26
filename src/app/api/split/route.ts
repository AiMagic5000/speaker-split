import { NextRequest } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'
import { v4 as uuidv4 } from 'uuid'

export const maxDuration = 300
export const dynamic = 'force-dynamic'

const DEEPGRAM_API_KEY = process.env.DEEPGRAM_API_KEY || ''
const UPLOAD_DIR = process.env.UPLOAD_DIR || '/tmp/uploads'

// Create a WAV file header
function createWavHeader(dataLength: number, sampleRate: number, channels: number, bitsPerSample: number): Buffer {
  const headerSize = 44
  const header = Buffer.alloc(headerSize)
  const byteRate = sampleRate * channels * (bitsPerSample / 8)
  const blockAlign = channels * (bitsPerSample / 8)

  header.write('RIFF', 0)
  header.writeUInt32LE(36 + dataLength, 4)
  header.write('WAVE', 8)
  header.write('fmt ', 12)
  header.writeUInt32LE(16, 16) // fmt chunk size
  header.writeUInt16LE(1, 20)  // PCM format
  header.writeUInt16LE(channels, 22)
  header.writeUInt32LE(sampleRate, 24)
  header.writeUInt32LE(byteRate, 28)
  header.writeUInt16LE(blockAlign, 32)
  header.writeUInt16LE(bitsPerSample, 34)
  header.write('data', 36)
  header.writeUInt32LE(dataLength, 40)

  return header
}

// Parse WAV file to get audio data and format info
function parseWav(buffer: Buffer): { sampleRate: number; channels: number; bitsPerSample: number; data: Buffer } | null {
  if (buffer.toString('ascii', 0, 4) !== 'RIFF' || buffer.toString('ascii', 8, 12) !== 'WAVE') {
    return null
  }

  let offset = 12
  let sampleRate = 44100
  let channels = 1
  let bitsPerSample = 16
  let dataBuffer = Buffer.alloc(0)

  while (offset < buffer.length) {
    const chunkId = buffer.toString('ascii', offset, offset + 4)
    const chunkSize = buffer.readUInt32LE(offset + 4)

    if (chunkId === 'fmt ') {
      channels = buffer.readUInt16LE(offset + 10)
      sampleRate = buffer.readUInt32LE(offset + 12)
      bitsPerSample = buffer.readUInt16LE(offset + 22)
    } else if (chunkId === 'data') {
      dataBuffer = buffer.subarray(offset + 8, offset + 8 + chunkSize)
    }

    offset += 8 + chunkSize
    if (chunkSize % 2 !== 0) offset++ // padding byte
  }

  return { sampleRate, channels, bitsPerSample, data: dataBuffer }
}

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

        if (!DEEPGRAM_API_KEY) {
          send({ error: 'Transcription service not configured. Please contact support.' })
          controller.close()
          return
        }

        const jobId = uuidv4()
        send({ progress: 5, stage: 'Uploading audio...' })

        // Read file into buffer
        const bytes = await file.arrayBuffer()
        const audioBuffer = Buffer.from(bytes)

        // Save original file (needed for audio splitting)
        const jobDir = path.join(UPLOAD_DIR, jobId)
        const outputDir = path.join(jobDir, 'output')
        if (!existsSync(jobDir)) {
          await mkdir(jobDir, { recursive: true })
        }
        if (!existsSync(outputDir)) {
          await mkdir(outputDir, { recursive: true })
        }

        const filePath = path.join(jobDir, file.name)
        await writeFile(filePath, audioBuffer)

        send({ progress: 15, stage: 'Analyzing speakers...' })

        const mimeType = file.type || 'audio/mpeg'

        // Call Deepgram with diarization for speaker timestamps
        const dgResponse = await fetch(
          `https://api.deepgram.com/v1/listen?model=nova-3&smart_format=true&diarize=true&punctuate=true&utterances=true`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Token ${DEEPGRAM_API_KEY}`,
              'Content-Type': mimeType,
            },
            body: audioBuffer,
          }
        )

        if (!dgResponse.ok) {
          const errText = await dgResponse.text().catch(() => '')
          throw new Error(`Speaker analysis failed: ${dgResponse.status} ${errText}`)
        }

        send({ progress: 50, stage: 'Identifying speaker segments...' })

        const result = await dgResponse.json()

        // Get word-level speaker data for precise splitting
        const words = result.results?.channels?.[0]?.alternatives?.[0]?.words || []

        if (words.length === 0) {
          send({ error: 'No speech detected in the audio file.' })
          controller.close()
          return
        }

        // Group consecutive words by speaker into segments
        const speakerSegments: { [speaker: string]: { start: number; end: number }[] } = {}

        let currentSpeaker = words[0]?.speaker ?? 0
        let segStart = words[0]?.start ?? 0
        let segEnd = words[0]?.end ?? 0

        for (const word of words) {
          if (word.speaker !== currentSpeaker) {
            const speakerKey = `SPEAKER_${String(currentSpeaker).padStart(2, '0')}`
            if (!speakerSegments[speakerKey]) speakerSegments[speakerKey] = []
            speakerSegments[speakerKey].push({ start: segStart, end: segEnd })

            currentSpeaker = word.speaker
            segStart = word.start
          }
          segEnd = word.end
        }
        // Push last segment
        const lastKey = `SPEAKER_${String(currentSpeaker).padStart(2, '0')}`
        if (!speakerSegments[lastKey]) speakerSegments[lastKey] = []
        speakerSegments[lastKey].push({ start: segStart, end: segEnd })

        const speakers = Object.keys(speakerSegments).sort()
        send({ progress: 60, stage: `Found ${speakers.length} speakers, separating audio...` })

        // Convert original audio to WAV using Deepgram's response metadata
        // For proper audio splitting, we need WAV format
        // First, try to convert using the raw audio buffer
        // We'll request a WAV conversion from Deepgram by re-sending as WAV
        // Actually, let's use a simpler approach: create speaker audio as base64 data URLs

        // For audio splitting, we need the raw PCM data
        // Try parsing as WAV first
        let wavData = parseWav(audioBuffer)

        if (!wavData) {
          // Not a WAV file - we need to convert it
          // Use Deepgram to get the timestamps, then create audio segments
          // For non-WAV files, we'll provide download links that use client-side splitting
          // OR we can try to use ffmpeg if available

          try {
            // Try ffmpeg conversion
            const { execSync } = require('child_process')
            const wavPath = path.join(jobDir, 'converted.wav')
            execSync(`ffmpeg -y -i "${filePath}" -acodec pcm_s16le -ar 16000 -ac 1 "${wavPath}"`, {
              timeout: 60000,
              stdio: 'pipe',
            })
            const fs = require('fs')
            const wavBuffer = fs.readFileSync(wavPath)
            wavData = parseWav(wavBuffer)
          } catch {
            // ffmpeg not available - fall back to returning timestamps only with original audio
            // The frontend can still play segments using the original file
          }
        }

        const speakerAudios: { speaker: string; url: string }[] = []

        if (wavData) {
          // We have WAV data - split it by speaker
          const { sampleRate, channels, bitsPerSample, data } = wavData
          const bytesPerSample = (bitsPerSample / 8) * channels
          const bytesPerSecond = sampleRate * bytesPerSample
          const totalDurationMs = (data.length / bytesPerSecond) * 1000

          for (let i = 0; i < speakers.length; i++) {
            const speaker = speakers[i]
            const segments = speakerSegments[speaker]
            const progressPct = 65 + (30 * (i + 1) / speakers.length)
            send({ progress: progressPct, stage: `Processing ${speaker}...` })

            // Create silent buffer of full duration
            const speakerData = Buffer.alloc(data.length, 0)

            // Copy in speaker's segments
            for (const seg of segments) {
              const startByte = Math.floor(seg.start * bytesPerSecond)
              const endByte = Math.min(Math.floor(seg.end * bytesPerSecond), data.length)

              if (endByte > startByte) {
                data.copy(speakerData, startByte, startByte, endByte)
              }
            }

            // Write WAV file
            const header = createWavHeader(speakerData.length, sampleRate, channels, bitsPerSample)
            const wavFile = Buffer.concat([header, speakerData])
            const baseName = file.name.replace(/\.[^/.]+$/, '')
            const outputFileName = `${baseName}_${speaker}.wav`
            const outputPath = path.join(outputDir, outputFileName)
            await writeFile(outputPath, wavFile)

            speakerAudios.push({
              speaker,
              url: `/api/files/${jobId}/output/${outputFileName}`,
            })
          }
        } else {
          // No WAV conversion possible - provide the original file for each speaker
          // with timestamp metadata so the frontend knows the segments
          send({ error: 'Audio format not supported for splitting. Please upload a WAV or MP3 file, or ensure ffmpeg is available on the server.' })
          controller.close()
          return
        }

        send({
          progress: 100,
          stage: 'Complete',
          speakerAudios,
        })

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
