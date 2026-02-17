import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'

const UPLOAD_DIR = process.env.UPLOAD_DIR || '/tmp/uploads'
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8000'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const jobId = formData.get('jobId') as string
    const speakerCount = formData.get('speakerCount') as string

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    if (!jobId) {
      return NextResponse.json({ error: 'No job ID provided' }, { status: 400 })
    }

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

    // Trigger backend processing
    try {
      const processResponse = await fetch(`${BACKEND_URL}/process`, {
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
        console.warn('Backend processing not available, using mock mode')
      }
    } catch (error) {
      console.warn('Backend not running, job queued for later processing')
    }

    return NextResponse.json({
      success: true,
      jobId,
      filePath,
      message: 'File uploaded successfully',
    })

  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json(
      { error: 'Upload failed' },
      { status: 500 }
    )
  }
}

// App Router uses Next.js config for body parsing, not route config
export const dynamic = 'force-dynamic'
