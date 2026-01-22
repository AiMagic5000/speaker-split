import { NextRequest, NextResponse } from "next/server"
import Anthropic from "@anthropic-ai/sdk"

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

const DOCUMENT_PROMPT = `## Primary Objective

Convert the conversation transcript below between a client and agent into
an interactive HTML reference document for a mentorship and training
business.

## Content Source

- **Input**: Transcript of business strategy conversation
- **Business Owner/s**: {businessOwners}
- **Related Websites**: {relatedWebsites}
- **Current Business Name or Proposed Business Name**: {businessName}
- **Additional Notes**: {additionalNotes}

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
    const { businessOwners, businessName, relatedWebsites, additionalNotes, transcript } = body

    if (!transcript) {
      return NextResponse.json({ error: "Transcript is required" }, { status: 400 })
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({ error: "Anthropic API key not configured" }, { status: 500 })
    }

    // Build the prompt with user data
    const prompt = DOCUMENT_PROMPT
      .replace("{businessOwners}", businessOwners || "Not specified")
      .replace("{businessName}", businessName || "Not specified")
      .replace("{relatedWebsites}", relatedWebsites || "None provided")
      .replace("{additionalNotes}", additionalNotes || "None")
      .replace("{transcript}", transcript)

    // Call Claude API
    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 8192,
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    })

    // Extract the HTML from the response
    const content = message.content[0]
    if (content.type !== "text") {
      throw new Error("Unexpected response type")
    }

    let html = content.text

    // Clean up the response - extract just the HTML if wrapped in code blocks
    if (html.includes("```html")) {
      html = html.split("```html")[1].split("```")[0].trim()
    } else if (html.includes("```")) {
      html = html.split("```")[1].split("```")[0].trim()
    }

    return NextResponse.json({ html })
  } catch (error) {
    console.error("Document generation error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to generate document" },
      { status: 500 }
    )
  }
}
