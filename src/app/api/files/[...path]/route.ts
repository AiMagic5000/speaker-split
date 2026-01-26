import { NextRequest, NextResponse } from 'next/server'

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8000'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const { path: pathSegments } = await params
    const filePath = pathSegments.join('/')

    // Check for range request (for audio seeking)
    const range = request.headers.get('range')

    // Proxy request to backend
    const backendHeaders: Record<string, string> = {}
    if (range) {
      backendHeaders['Range'] = range
    }

    const response = await fetch(`${BACKEND_URL}/files/${filePath}`, {
      method: 'GET',
      headers: backendHeaders,
      cache: 'no-store',
    })

    if (!response.ok && response.status !== 206) {
      if (response.status === 404) {
        return NextResponse.json({ error: 'File not found' }, { status: 404 })
      }
      throw new Error(`Backend returned ${response.status}`)
    }

    // Get headers from backend response
    const contentType = response.headers.get('content-type') || 'audio/wav'
    const contentDisposition = response.headers.get('content-disposition')
    const contentLength = response.headers.get('content-length')
    const contentRange = response.headers.get('content-range')
    const acceptRanges = response.headers.get('accept-ranges')

    // Stream the response
    const data = await response.arrayBuffer()

    const headers: Record<string, string> = {
      'Content-Type': contentType,
      'Accept-Ranges': acceptRanges || 'bytes',
      'Cache-Control': 'public, max-age=3600',
    }

    if (contentLength) {
      headers['Content-Length'] = contentLength
    } else {
      // Set content length from actual data size
      headers['Content-Length'] = data.byteLength.toString()
    }

    if (contentDisposition) {
      headers['Content-Disposition'] = contentDisposition
    }

    if (contentRange) {
      headers['Content-Range'] = contentRange
    }

    return new NextResponse(data, {
      status: response.status,
      headers
    })

  } catch (error) {
    console.error('File serve error:', error)
    return NextResponse.json(
      { error: 'Failed to serve file' },
      { status: 500 }
    )
  }
}
