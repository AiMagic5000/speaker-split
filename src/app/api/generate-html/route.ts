import { NextRequest, NextResponse } from "next/server"
import fs from "fs/promises"
import path from "path"

const MINIMAX_API_KEY = process.env.MINIMAX_API_KEY || ''
const MINIMAX_BASE_URL = 'https://api.minimaxi.chat/v1'

interface TranscriptSegment {
  speaker: string
  text: string
  start: number
  end: number
}

interface Speaker {
  id: string
  label: string
  name: string
  color: string
}

interface ClientInfo {
  clientName: string
  businessName: string
  website: string
  sessionDate: string
  primarySpeaker: string
}

const DOCUMENT_PROMPT = `## Primary Objective

Convert the conversation transcript below between a client and agent into
an interactive HTML reference document for a mentorship and training
business.

## Content Source

- **Input**: Transcript of business strategy conversation
- **Business Owner/Client**: {clientName}
- **Business Name**: {businessName}
- **Website**: {website}
- **Session Date**: {sessionDate}
- **Speakers**: {speakersList}

## Output Requirements

### 1. Format & Structure

- **File Type**: Single HTML page with embedded CSS and JavaScript
- **Color Scheme**: Use gold/yellow and green accents. NO PURPLE COLORS.
- **Main Content**: Bullet-point article format
- **Interactive Elements**: Collapsible dropdown sections
- **Reading Level**: 5th grade comprehension

### 2. Content Organization

**Main Sections to Include:**

- Summary of key conversation topics (bullet points)
- Business concepts discussed
- Advertising strategies
- Training methodologies
- Financial projections and business model
- Action items and next steps

### 3. Interactive Dropdown Features

Each major topic should include expandable sections with:

- **Expanded explanation** of the concept
- **Standard Operating Procedure (SOP)** for implementation
- **Example/mock data** demonstrating the idea
- **Realistic profit projections** where applicable
- **Links to relevant websites** mentioned in conversation
- **Visual examples** or scenarios for clarity

### 4. Specific Requirements

**Visual Design:**

- Clean, easy-to-scan layout
- Clear hierarchy with headings
- Color-coded sections for different topics (gold/yellow and green theme)
- Mobile-responsive design
- Professional business appearance

**Content Style:**

- Simple, straightforward language
- Short sentences and paragraphs
- Action-oriented phrasing
- Real-world examples for each concept

**Business Model Elements:**

- Revenue projections with sample numbers
- Cost breakdowns
- Timeline expectations
- Scalability options

### 5. Functionality

- All dropdowns should be clickable/collapsible
- Smooth transitions for opening/closing sections
- Print-friendly option
- Easy navigation between sections

## Example Structure Template

[Main Topic Heading]

• Key point from conversation
• Another key point

└─ [Dropdown Button: "Expand for SOP & Examples"]

- Detailed explanation
- Step-by-step procedure
- Mock data example (with numbers)
- Expected outcome/profit
- Related resources/links

## Final Deliverable Should Enable:

1. Quick reference to all conversation topics
2. Actionable implementation plans for each idea
3. Clear understanding of profit potential
4. Easy expansion and updates by business owner
5. Professional presentation for client review

**Please analyze the transcript and create this HTML document following
these specifications. Output ONLY the complete HTML code, no explanations.**

## Transcript:

{transcript}`

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { jobId, transcript, speakers, clientInfo } = body as {
      jobId: string
      transcript: TranscriptSegment[]
      speakers: Speaker[]
      clientInfo: ClientInfo
    }

    if (!transcript || transcript.length === 0) {
      return NextResponse.json({ error: "Transcript is required" }, { status: 400 })
    }

    if (!MINIMAX_API_KEY) {
      return NextResponse.json({ error: "MiniMax API key not configured" }, { status: 500 })
    }

    // Format transcript with speaker names
    const formattedTranscript = transcript
      .map((segment) => {
        const speaker = speakers.find((s) => s.id === segment.speaker)
        const speakerName = speaker?.name || speaker?.label || segment.speaker
        return `${speakerName}: ${segment.text}`
      })
      .join("\n\n")

    // Format speakers list
    const speakersList = speakers
      .map((s) => s.name || s.label)
      .join(", ")

    // Build the prompt with data
    const prompt = DOCUMENT_PROMPT
      .replace("{clientName}", clientInfo.clientName || "Not specified")
      .replace("{businessName}", clientInfo.businessName || "Not specified")
      .replace("{website}", clientInfo.website || "None provided")
      .replace("{sessionDate}", clientInfo.sessionDate || "Not specified")
      .replace("{speakersList}", speakersList || "Unknown")
      .replace("{transcript}", formattedTranscript)

    // Call MiniMax API (OpenAI-compatible)
    const response = await fetch(`${MINIMAX_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${MINIMAX_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'MiniMax-M2.5',
        max_tokens: 2000,
        messages: [
          { role: 'system', content: 'You are an expert document generator. Respond directly with the requested output. Do not use thinking tags or explain your reasoning.' },
          { role: 'user', content: prompt },
        ],
      }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData?.error?.message || `MiniMax API error: ${response.status}`)
    }

    const result = await response.json()
    const rawText = result.choices?.[0]?.message?.content || ''

    // Strip <think>...</think> tags from MiniMax reasoning output
    let html = rawText.replace(/<think>[\s\S]*?<\/think>\s*/g, '').trim()

    // Clean up the response - extract just the HTML if wrapped in code blocks
    if (html.includes("```html")) {
      html = html.split("```html")[1].split("```")[0].trim()
    } else if (html.includes("```")) {
      html = html.split("```")[1].split("```")[0].trim()
    }

    // Save the HTML file
    const outputDir = path.join(process.cwd(), "public", "outputs", jobId)
    await fs.mkdir(outputDir, { recursive: true })

    const htmlFileName = `${clientInfo.businessName || "document"}-reference.html`
      .toLowerCase()
      .replace(/[^a-z0-9.-]/g, "-")
    const htmlFilePath = path.join(outputDir, htmlFileName)
    await fs.writeFile(htmlFilePath, html, "utf-8")

    const htmlUrl = `/outputs/${jobId}/${htmlFileName}`

    return NextResponse.json({ html, htmlUrl })
  } catch (error) {
    console.error("HTML generation error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to generate HTML document" },
      { status: 500 }
    )
  }
}
