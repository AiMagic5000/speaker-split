import { NextRequest, NextResponse } from 'next/server'

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8000'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const { path: pathSegments } = await params
    const filePath = pathSegments.join('/')

    // Proxy request to backend
    const response = await fetch(`${BACKEND_URL}/files/${filePath}`, {
      method: 'GET',
      // Don't cache files
      cache: 'no-store',
    })

    if (!response.ok) {
      if (response.status === 404) {
        return NextResponse.json({ error: 'File not found' }, { status: 404 })
      }
      throw new Error(`Backend returned ${response.status}`)
    }

    // Get content type from backend response
    const contentType = response.headers.get('content-type') || 'application/octet-stream'
    const contentDisposition = response.headers.get('content-disposition')

    // Stream the response
    const data = await response.arrayBuffer()

    const headers: Record<string, string> = {
      'Content-Type': contentType,
    }
    if (contentDisposition) {
      headers['Content-Disposition'] = contentDisposition
    }

    return new NextResponse(data, { headers })

  } catch (error) {
    console.error('File serve error:', error)
    return NextResponse.json(
      { error: 'Failed to serve file' },
      { status: 500 }
    )
  }
}
