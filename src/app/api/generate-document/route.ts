import { NextRequest, NextResponse } from "next/server"
import Anthropic from "@anthropic-ai/sdk"
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
  AlignmentType,
  ShadingType,
  PageBreak,
  Header,
  Footer,
  ImageRun,
  convertInchesToTwip,
} from "docx"

// Extend route timeout for large transcript processing
export const maxDuration = 300 // 5 minutes
export const dynamic = "force-dynamic"

const HTML_DOCUMENT_PROMPT = `## Primary Objective

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

### 5. Navigation Menu

**Desktop (screens > 768px):**
- Section navigation menu at the top of the page
- Menu should NOT be sticky/fixed - it scrolls with the page normally
- Horizontal list of section links

**Mobile (screens <= 768px):**
- Hamburger menu icon (☰) in top-right corner
- Clicking hamburger opens a slide-out or dropdown menu with section links
- Menu closes when a section is selected or user clicks outside
- Hamburger menu should be fixed position for easy access

### 6. Functionality

- All dropdowns should be clickable/collapsible
- Smooth transitions for opening/closing sections
- Print-friendly option
- Easy navigation between sections via menu links
- Smooth scroll to sections when menu items are clicked

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

const WORD_DOCUMENT_PROMPT = `## Primary Objective

Analyze the conversation transcript below and extract structured content for a professional business reference document.

## Content Source

- **Input**: Transcript of business strategy conversation
- **Business Owner/s**: {businessOwners}
- **Related Websites**: {relatedWebsites}
- **Current Business Name or Proposed Business Name**: {businessName}
- **Additional Notes**: {additionalNotes}

## Output Requirements

Return a JSON object with the following structure (output ONLY valid JSON, no markdown code blocks):

{
  "title": "Document title based on the conversation topic",
  "subtitle": "A brief tagline or description",
  "executiveSummary": "2-3 paragraph executive summary of the conversation",
  "sections": [
    {
      "heading": "Section title",
      "content": "Main content paragraph for this section",
      "keyPoints": ["Point 1", "Point 2", "Point 3"],
      "sop": {
        "title": "How to implement this",
        "steps": ["Step 1", "Step 2", "Step 3"]
      },
      "financials": {
        "description": "Financial overview if applicable",
        "projections": [
          {"item": "Revenue Item", "amount": "$X,XXX", "timeframe": "per month"}
        ]
      }
    }
  ],
  "actionItems": [
    {"task": "Task description", "priority": "High/Medium/Low", "deadline": "Timeframe"}
  ],
  "resources": [
    {"name": "Resource name", "url": "URL if mentioned", "description": "Brief description"}
  ],
  "conclusion": "Closing paragraph summarizing next steps"
}

## Guidelines

- Extract ALL key topics discussed in the conversation
- Include specific numbers, prices, and projections mentioned
- Create actionable SOPs for each business concept
- Keep language simple (5th grade reading level)
- Include realistic financial projections where discussed
- Capture all action items and next steps

## Transcript:

{transcript}`

interface DocumentSection {
  heading: string
  content: string
  keyPoints?: string[]
  sop?: {
    title: string
    steps: string[]
  }
  financials?: {
    description: string
    projections: Array<{
      item: string
      amount: string
      timeframe: string
    }>
  }
}

interface DocumentData {
  title: string
  subtitle: string
  executiveSummary: string
  sections: DocumentSection[]
  actionItems: Array<{
    task: string
    priority: string
    deadline: string
  }>
  resources: Array<{
    name: string
    url: string
    description: string
  }>
  conclusion: string
}

function createProfessionalWordDocument(data: DocumentData, businessName: string): Document {
  const goldColor = "D4A017"
  const darkGreen = "1B5E20"
  const lightGold = "FFF8E1"

  const children: any[] = []

  // Title Page
  children.push(
    new Paragraph({
      children: [new TextRun({ text: "", break: 3 })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({
          text: data.title || "Business Strategy Document",
          bold: true,
          size: 72,
          color: darkGreen,
          font: "Georgia",
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 400 },
      children: [
        new TextRun({
          text: data.subtitle || "Strategic Reference Guide",
          size: 32,
          color: goldColor,
          font: "Georgia",
          italics: true,
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 800 },
      children: [
        new TextRun({
          text: `Prepared for: ${businessName || "Business Owner"}`,
          size: 28,
          color: "444444",
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 200 },
      children: [
        new TextRun({
          text: `Date: ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}`,
          size: 24,
          color: "666666",
        }),
      ],
    }),
    new Paragraph({
      children: [new PageBreak()],
    })
  )

  // Table of Contents Header
  children.push(
    new Paragraph({
      heading: HeadingLevel.HEADING_1,
      spacing: { after: 400 },
      children: [
        new TextRun({
          text: "Table of Contents",
          bold: true,
          color: darkGreen,
          size: 36,
        }),
      ],
    })
  )

  // TOC Entries
  const tocItems = [
    "Executive Summary",
    ...data.sections.map((s) => s.heading),
    "Action Items",
    "Resources & Links",
    "Conclusion",
  ]

  tocItems.forEach((item, index) => {
    children.push(
      new Paragraph({
        spacing: { before: 100 },
        children: [
          new TextRun({
            text: `${index + 1}. ${item}`,
            size: 24,
            color: "333333",
          }),
        ],
      })
    )
  })

  children.push(
    new Paragraph({
      children: [new PageBreak()],
    })
  )

  // Executive Summary
  children.push(
    new Paragraph({
      heading: HeadingLevel.HEADING_1,
      spacing: { after: 300 },
      shading: { type: ShadingType.SOLID, color: lightGold },
      children: [
        new TextRun({
          text: "Executive Summary",
          bold: true,
          color: darkGreen,
          size: 32,
        }),
      ],
    }),
    new Paragraph({
      spacing: { after: 400 },
      children: [
        new TextRun({
          text: data.executiveSummary || "This document summarizes key business strategies and action items discussed.",
          size: 24,
          color: "333333",
        }),
      ],
    })
  )

  // Main Sections
  data.sections.forEach((section) => {
    // Section Heading
    children.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 400, after: 200 },
        border: {
          bottom: { color: goldColor, size: 12, style: BorderStyle.SINGLE },
        },
        children: [
          new TextRun({
            text: section.heading,
            bold: true,
            color: darkGreen,
            size: 32,
          }),
        ],
      })
    )

    // Section Content
    if (section.content) {
      children.push(
        new Paragraph({
          spacing: { after: 200 },
          children: [
            new TextRun({
              text: section.content,
              size: 24,
              color: "333333",
            }),
          ],
        })
      )
    }

    // Key Points
    if (section.keyPoints && section.keyPoints.length > 0) {
      children.push(
        new Paragraph({
          spacing: { before: 200 },
          children: [
            new TextRun({
              text: "Key Points:",
              bold: true,
              size: 24,
              color: darkGreen,
            }),
          ],
        })
      )

      section.keyPoints.forEach((point) => {
        children.push(
          new Paragraph({
            bullet: { level: 0 },
            spacing: { before: 100 },
            children: [
              new TextRun({
                text: point,
                size: 22,
                color: "444444",
              }),
            ],
          })
        )
      })
    }

    // SOP
    if (section.sop) {
      children.push(
        new Paragraph({
          spacing: { before: 300 },
          shading: { type: ShadingType.SOLID, color: "E8F5E9" },
          children: [
            new TextRun({
              text: `📋 ${section.sop.title}`,
              bold: true,
              size: 26,
              color: darkGreen,
            }),
          ],
        })
      )

      section.sop.steps.forEach((step, idx) => {
        children.push(
          new Paragraph({
            spacing: { before: 100 },
            indent: { left: convertInchesToTwip(0.5) },
            children: [
              new TextRun({
                text: `${idx + 1}. ${step}`,
                size: 22,
                color: "444444",
              }),
            ],
          })
        )
      })
    }

    // Financials Table
    if (section.financials && section.financials.projections && section.financials.projections.length > 0) {
      children.push(
        new Paragraph({
          spacing: { before: 300, after: 200 },
          children: [
            new TextRun({
              text: "💰 Financial Projections",
              bold: true,
              size: 26,
              color: goldColor,
            }),
          ],
        })
      )

      if (section.financials.description) {
        children.push(
          new Paragraph({
            spacing: { after: 200 },
            children: [
              new TextRun({
                text: section.financials.description,
                size: 22,
                color: "555555",
                italics: true,
              }),
            ],
          })
        )
      }

      const tableRows = [
        new TableRow({
          tableHeader: true,
          children: [
            new TableCell({
              shading: { type: ShadingType.SOLID, color: darkGreen },
              children: [
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [new TextRun({ text: "Item", bold: true, color: "FFFFFF", size: 22 })],
                }),
              ],
            }),
            new TableCell({
              shading: { type: ShadingType.SOLID, color: darkGreen },
              children: [
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [new TextRun({ text: "Amount", bold: true, color: "FFFFFF", size: 22 })],
                }),
              ],
            }),
            new TableCell({
              shading: { type: ShadingType.SOLID, color: darkGreen },
              children: [
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [new TextRun({ text: "Timeframe", bold: true, color: "FFFFFF", size: 22 })],
                }),
              ],
            }),
          ],
        }),
        ...section.financials.projections.map(
          (proj, idx) =>
            new TableRow({
              children: [
                new TableCell({
                  shading: { type: ShadingType.SOLID, color: idx % 2 === 0 ? "FFFFFF" : lightGold },
                  children: [new Paragraph({ children: [new TextRun({ text: proj.item, size: 22 })] })],
                }),
                new TableCell({
                  shading: { type: ShadingType.SOLID, color: idx % 2 === 0 ? "FFFFFF" : lightGold },
                  children: [
                    new Paragraph({
                      alignment: AlignmentType.RIGHT,
                      children: [new TextRun({ text: proj.amount, size: 22, bold: true, color: darkGreen })],
                    }),
                  ],
                }),
                new TableCell({
                  shading: { type: ShadingType.SOLID, color: idx % 2 === 0 ? "FFFFFF" : lightGold },
                  children: [new Paragraph({ children: [new TextRun({ text: proj.timeframe, size: 22 })] })],
                }),
              ],
            })
        ),
      ]

      children.push(
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: tableRows,
        })
      )
    }
  })

  // Action Items Section
  if (data.actionItems && data.actionItems.length > 0) {
    children.push(
      new Paragraph({
        children: [new PageBreak()],
      }),
      new Paragraph({
        heading: HeadingLevel.HEADING_1,
        spacing: { after: 300 },
        shading: { type: ShadingType.SOLID, color: lightGold },
        children: [
          new TextRun({
            text: "✅ Action Items",
            bold: true,
            color: darkGreen,
            size: 32,
          }),
        ],
      })
    )

    const actionTableRows = [
      new TableRow({
        tableHeader: true,
        children: [
          new TableCell({
            shading: { type: ShadingType.SOLID, color: goldColor },
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ text: "Task", bold: true, color: "FFFFFF", size: 22 })],
              }),
            ],
          }),
          new TableCell({
            shading: { type: ShadingType.SOLID, color: goldColor },
            width: { size: 15, type: WidthType.PERCENTAGE },
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ text: "Priority", bold: true, color: "FFFFFF", size: 22 })],
              }),
            ],
          }),
          new TableCell({
            shading: { type: ShadingType.SOLID, color: goldColor },
            width: { size: 20, type: WidthType.PERCENTAGE },
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ text: "Deadline", bold: true, color: "FFFFFF", size: 22 })],
              }),
            ],
          }),
        ],
      }),
      ...data.actionItems.map(
        (item, idx) =>
          new TableRow({
            children: [
              new TableCell({
                shading: { type: ShadingType.SOLID, color: idx % 2 === 0 ? "FFFFFF" : lightGold },
                children: [new Paragraph({ children: [new TextRun({ text: item.task, size: 22 })] })],
              }),
              new TableCell({
                shading: { type: ShadingType.SOLID, color: idx % 2 === 0 ? "FFFFFF" : lightGold },
                children: [
                  new Paragraph({
                    alignment: AlignmentType.CENTER,
                    children: [
                      new TextRun({
                        text: item.priority,
                        size: 22,
                        bold: true,
                        color: item.priority === "High" ? "D32F2F" : item.priority === "Medium" ? goldColor : "666666",
                      }),
                    ],
                  }),
                ],
              }),
              new TableCell({
                shading: { type: ShadingType.SOLID, color: idx % 2 === 0 ? "FFFFFF" : lightGold },
                children: [
                  new Paragraph({
                    alignment: AlignmentType.CENTER,
                    children: [new TextRun({ text: item.deadline, size: 22 })],
                  }),
                ],
              }),
            ],
          })
      ),
    ]

    children.push(
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: actionTableRows,
      })
    )
  }

  // Resources Section
  if (data.resources && data.resources.length > 0) {
    children.push(
      new Paragraph({
        spacing: { before: 400 },
        heading: HeadingLevel.HEADING_1,
        border: {
          bottom: { color: goldColor, size: 12, style: BorderStyle.SINGLE },
        },
        children: [
          new TextRun({
            text: "🔗 Resources & Links",
            bold: true,
            color: darkGreen,
            size: 32,
          }),
        ],
      })
    )

    data.resources.forEach((resource) => {
      children.push(
        new Paragraph({
          spacing: { before: 200 },
          bullet: { level: 0 },
          children: [
            new TextRun({
              text: resource.name,
              bold: true,
              size: 24,
              color: darkGreen,
            }),
            new TextRun({
              text: resource.url ? ` - ${resource.url}` : "",
              size: 22,
              color: "0066CC",
            }),
          ],
        }),
        new Paragraph({
          indent: { left: convertInchesToTwip(0.5) },
          children: [
            new TextRun({
              text: resource.description,
              size: 22,
              color: "555555",
            }),
          ],
        })
      )
    })
  }

  // Conclusion
  children.push(
    new Paragraph({
      children: [new PageBreak()],
    }),
    new Paragraph({
      heading: HeadingLevel.HEADING_1,
      spacing: { after: 300 },
      shading: { type: ShadingType.SOLID, color: lightGold },
      children: [
        new TextRun({
          text: "Conclusion & Next Steps",
          bold: true,
          color: darkGreen,
          size: 32,
        }),
      ],
    }),
    new Paragraph({
      spacing: { after: 200 },
      children: [
        new TextRun({
          text: data.conclusion || "Review the action items above and begin implementation. Success comes from consistent action!",
          size: 24,
          color: "333333",
        }),
      ],
    }),
    new Paragraph({
      spacing: { before: 400 },
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({
          text: "— End of Document —",
          italics: true,
          color: "888888",
          size: 22,
        }),
      ],
    })
  )

  return new Document({
    styles: {
      default: {
        document: {
          run: {
            font: "Calibri",
          },
        },
      },
    },
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: convertInchesToTwip(1),
              bottom: convertInchesToTwip(1),
              left: convertInchesToTwip(1),
              right: convertInchesToTwip(1),
            },
          },
        },
        children,
      },
    ],
  })
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { businessOwners, businessName, relatedWebsites, additionalNotes, transcript, format = "html" } = body

    if (!transcript) {
      return NextResponse.json({ error: "Transcript is required" }, { status: 400 })
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({ error: "Anthropic API key not configured" }, { status: 500 })
    }

    // Truncate very long transcripts to avoid token limits (keep ~50k chars max)
    const maxTranscriptLength = 50000
    let processedTranscript = transcript
    if (transcript.length > maxTranscriptLength) {
      processedTranscript =
        transcript.substring(0, maxTranscriptLength) +
        "\n\n[Transcript truncated due to length - focus on key topics covered above]"
    }

    // Select prompt based on format
    const promptTemplate = format === "docx" ? WORD_DOCUMENT_PROMPT : HTML_DOCUMENT_PROMPT

    // Build the prompt with user data
    const prompt = promptTemplate
      .replace("{businessOwners}", businessOwners || "Not specified")
      .replace("{businessName}", businessName || "Not specified")
      .replace("{relatedWebsites}", relatedWebsites || "None provided")
      .replace("{additionalNotes}", additionalNotes || "None")
      .replace("{transcript}", processedTranscript)

    // Create client fresh for each request to avoid connection reuse issues
    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    })

    // Use streaming to keep connection alive for large requests
    let responseText = ""

    const stream = anthropic.messages.stream({
      model: "claude-sonnet-4-20250514",
      max_tokens: 8192,
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    })

    // Collect streamed response
    for await (const event of stream) {
      if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
        responseText += event.delta.text
      }
    }

    if (format === "docx") {
      // Parse the JSON response and create Word document
      let documentData: DocumentData

      try {
        // Clean up the response - remove any markdown code blocks
        let jsonText = responseText
        if (jsonText.includes("```json")) {
          jsonText = jsonText.split("```json")[1].split("```")[0].trim()
        } else if (jsonText.includes("```")) {
          jsonText = jsonText.split("```")[1].split("```")[0].trim()
        }

        documentData = JSON.parse(jsonText)
      } catch (parseError) {
        console.error("JSON parse error:", parseError)
        // Create a basic document structure if parsing fails
        documentData = {
          title: businessName || "Business Strategy Document",
          subtitle: "Reference Guide",
          executiveSummary: "This document summarizes the key points from your business consultation.",
          sections: [
            {
              heading: "Conversation Summary",
              content: responseText.substring(0, 2000),
              keyPoints: ["Review the full transcript for detailed information"],
            },
          ],
          actionItems: [{ task: "Review this document", priority: "High", deadline: "This week" }],
          resources: [],
          conclusion: "Please review the information above and take action on the items listed.",
        }
      }

      // Generate the Word document
      const doc = createProfessionalWordDocument(documentData, businessName || "Business Owner")
      const buffer = await Packer.toBuffer(doc)

      // Return as base64
      const base64 = buffer.toString("base64")
      return NextResponse.json({ docx: base64 })
    } else {
      // HTML format - clean up the response
      let html = responseText
      if (html.includes("```html")) {
        html = html.split("```html")[1].split("```")[0].trim()
      } else if (html.includes("```")) {
        html = html.split("```")[1].split("```")[0].trim()
      }

      return NextResponse.json({ html })
    }
  } catch (error) {
    console.error("Document generation error:", error)

    // More specific error messages
    const errorMessage = error instanceof Error ? error.message : "Failed to generate document"

    if (errorMessage.includes("fetch failed") || errorMessage.includes("socket") || errorMessage.includes("Connection")) {
      return NextResponse.json(
        { error: "Network connection issue - please try again. If this persists, try a shorter transcript." },
        { status: 500 }
      )
    }

    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}
