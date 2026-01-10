import { NextRequest, NextResponse } from 'next/server'

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8000'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: jobId } = await params

  try {
    // Fetch job status from backend
    const response = await fetch(`${BACKEND_URL}/jobs/${jobId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      // Don't cache job status
      cache: 'no-store',
    })

    if (!response.ok) {
      // If backend doesn't have the job yet, return default status
      if (response.status === 404) {
        return NextResponse.json({
          status: 'processing',
          progress: 10,
          stage: 'Initializing...',
        })
      }
      throw new Error(`Backend returned ${response.status}`)
    }

    const status = await response.json()
    return NextResponse.json(status)

  } catch (error) {
    console.error('Job status error:', error)
    // Return processing status on error (backend might still be starting)
    return NextResponse.json({
      status: 'processing',
      progress: 5,
      stage: 'Connecting to processing server...',
    })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: jobId } = await params

  try {
    const updates = await request.json()

    // Forward update to backend
    const response = await fetch(`${BACKEND_URL}/jobs/${jobId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updates),
    })

    if (!response.ok) {
      throw new Error(`Backend returned ${response.status}`)
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Job update error:', error)
    return NextResponse.json(
      { error: 'Failed to update job' },
      { status: 500 }
    )
  }
}
