import { NextRequest, NextResponse } from 'next/server'
import { readFile, access } from 'fs/promises'
import path from 'path'

const UPLOAD_DIR = process.env.UPLOAD_DIR || './uploads'

// In-memory job store (in production, use a database)
const jobStore: Map<string, any> = new Map()

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: jobId } = await params

  try {
    // Check if job status file exists
    const statusPath = path.join(UPLOAD_DIR, jobId, 'status.json')

    try {
      await access(statusPath)
      const statusData = await readFile(statusPath, 'utf-8')
      const status = JSON.parse(statusData)
      return NextResponse.json(status)
    } catch {
      // No status file yet, return current in-memory status or default
      const memoryStatus = jobStore.get(jobId)
      if (memoryStatus) {
        return NextResponse.json(memoryStatus)
      }

      // Return default processing status
      return NextResponse.json({
        status: 'processing',
        progress: 35,
        stage: 'Initializing AI models...',
      })
    }

  } catch (error) {
    console.error('Job status error:', error)
    return NextResponse.json(
      { error: 'Failed to get job status' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: jobId } = await params

  try {
    const updates = await request.json()

    // Update in-memory store
    const existing = jobStore.get(jobId) || {}
    jobStore.set(jobId, { ...existing, ...updates })

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Job update error:', error)
    return NextResponse.json(
      { error: 'Failed to update job' },
      { status: 500 }
    )
  }
}
