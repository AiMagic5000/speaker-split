import { NextRequest } from 'next/server'

export const maxDuration = 300
export const dynamic = 'force-dynamic'

const DEEPGRAM_API_KEY = process.env.DEEPGRAM_API_KEY || ''

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

        send({ progress: 5, stage: 'Uploading audio...' })

        // Read file into buffer
        const bytes = await file.arrayBuffer()
        const buffer = Buffer.from(bytes)

        send({ progress: 15, stage: 'Sending to transcription service...' })

        // Determine MIME type
        const mimeType = file.type || 'audio/mpeg'

        // Call Deepgram API with diarization
        const dgResponse = await fetch(
          `https://api.deepgram.com/v1/listen?model=nova-3&smart_format=true&diarize=true&punctuate=true&utterances=true&paragraphs=true`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Token ${DEEPGRAM_API_KEY}`,
              'Content-Type': mimeType,
            },
            body: buffer,
          }
        )

        if (!dgResponse.ok) {
          const errText = await dgResponse.text().catch(() => '')
          throw new Error(`Transcription failed: ${dgResponse.status} ${errText}`)
        }

        send({ progress: 60, stage: 'Processing transcript...' })

        const result = await dgResponse.json()

        // Extract transcript segments with speaker labels from utterances
        const utterances = result.results?.utterances || []
        const words = result.results?.channels?.[0]?.alternatives?.[0]?.words || []

        let transcript: { speaker: string; text: string; start: number; end: number }[] = []

        if (utterances.length > 0) {
          // Use utterances (better speaker grouping)
          transcript = utterances.map((utt: { speaker: number; transcript: string; start: number; end: number }) => ({
            speaker: `SPEAKER_${String(utt.speaker).padStart(2, '0')}`,
            text: utt.transcript,
            start: utt.start,
            end: utt.end,
          }))
        } else if (words.length > 0) {
          // Fallback: group words by speaker
          let currentSpeaker = words[0]?.speaker ?? 0
          let currentText = ''
          let segStart = words[0]?.start ?? 0
          let segEnd = 0

          for (const word of words) {
            if (word.speaker !== currentSpeaker) {
              transcript.push({
                speaker: `SPEAKER_${String(currentSpeaker).padStart(2, '0')}`,
                text: currentText.trim(),
                start: segStart,
                end: segEnd,
              })
              currentSpeaker = word.speaker
              currentText = ''
              segStart = word.start
            }
            currentText += ` ${word.punctuated_word || word.word}`
            segEnd = word.end
          }
          // Push last segment
          if (currentText.trim()) {
            transcript.push({
              speaker: `SPEAKER_${String(currentSpeaker).padStart(2, '0')}`,
              text: currentText.trim(),
              start: segStart,
              end: segEnd,
            })
          }
        }

        send({ progress: 90, stage: 'Formatting results...' })

        if (transcript.length === 0) {
          send({ error: 'No speech detected in the audio file. Please check the audio quality and try again.' })
          controller.close()
          return
        }

        send({
          progress: 100,
          stage: 'Complete',
          transcript,
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
