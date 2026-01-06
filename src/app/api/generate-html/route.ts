import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { writeFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'

const UPLOAD_DIR = process.env.UPLOAD_DIR || './uploads'
const N8N_WEBHOOK_URL = process.env.N8N_WEBHOOK_URL || 'https://n8n.srv836017.hstgr.cloud/webhook/transcript-to-html'

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

export async function POST(request: NextRequest) {
  try {
    const { jobId, transcript, speakers, clientInfo } = await request.json() as {
      jobId: string
      transcript: TranscriptSegment[]
      speakers: Speaker[]
      clientInfo: ClientInfo
    }

    // Format transcript for the n8n workflow
    const formattedTranscript = transcript.map(segment => {
      const speaker = speakers.find(s => s.id === segment.speaker)
      const speakerName = speaker?.name || speaker?.label || segment.speaker
      return `[${speakerName}]: ${segment.text}`
    }).join('\n\n')

    // Try n8n webhook first
    try {
      const n8nResponse = await fetch(N8N_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcript: formattedTranscript,
          client_name: clientInfo.clientName,
          business_name: clientInfo.businessName,
          website: clientInfo.website,
          session_date: clientInfo.sessionDate,
          primary_color: '#4493f2',
          secondary_color: '#4dc0b5',
        }),
      })

      if (n8nResponse.ok) {
        const result = await n8nResponse.json()

        // Save HTML locally as well
        const jobDir = path.join(UPLOAD_DIR, jobId, 'output')
        if (!existsSync(jobDir)) {
          await mkdir(jobDir, { recursive: true })
        }

        const htmlPath = path.join(jobDir, `${clientInfo.clientName.replace(/[^a-zA-Z0-9]/g, '_')}_reference.html`)
        if (result.html_preview || result.html) {
          await writeFile(htmlPath, result.html || result.html_preview)
        }

        return NextResponse.json({
          success: true,
          htmlUrl: `/api/files/${jobId}/output/${path.basename(htmlPath)}`,
          filename: result.filename,
        })
      }
    } catch (n8nError) {
      console.warn('n8n webhook not available, generating HTML locally')
    }

    // Fallback: Generate HTML directly using Claude API
    const anthropicApiKey = process.env.ANTHROPIC_API_KEY
    if (!anthropicApiKey) {
      return NextResponse.json(
        { error: 'HTML generation service unavailable' },
        { status: 503 }
      )
    }

    const anthropic = new Anthropic({ apiKey: anthropicApiKey })

    // Extract key information using Claude
    const extractionResponse = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 8000,
      messages: [
        {
          role: 'user',
          content: `Analyze this business consultation transcript and extract structured information.

TRANSCRIPT:
${formattedTranscript}

Extract the following as JSON:
1. summary_points: Array of 6-8 key bullet points
2. action_items: Array of tasks with title, description, priority (high/medium/low)
3. sections: Array of topic sections with title, description, bullet_points, sop_steps (if applicable), example, profit_projection, resources
4. key_contacts: People/companies mentioned
5. important_dates: Timelines mentioned
6. financial_figures: Dollar amounts, percentages

Respond ONLY with valid JSON.`
        }
      ],
    })

    // Parse extracted data
    let extractedData: any = {}
    try {
      const responseText = extractionResponse.content[0].type === 'text'
        ? extractionResponse.content[0].text
        : ''
      const cleanJson = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
      extractedData = JSON.parse(cleanJson)
    } catch (parseError) {
      console.error('Failed to parse Claude response:', parseError)
      extractedData = {
        summary_points: ['Consultation session recorded'],
        action_items: [],
        sections: [],
      }
    }

    // Generate HTML document
    const html = generateHtmlDocument({
      clientName: clientInfo.clientName,
      businessName: clientInfo.businessName,
      website: clientInfo.website,
      sessionDate: clientInfo.sessionDate,
      extractedData,
    })

    // Save HTML file
    const jobDir = path.join(UPLOAD_DIR, jobId, 'output')
    if (!existsSync(jobDir)) {
      await mkdir(jobDir, { recursive: true })
    }

    const filename = `${clientInfo.clientName.replace(/[^a-zA-Z0-9]/g, '_')}_reference_${Date.now()}.html`
    const htmlPath = path.join(jobDir, filename)
    await writeFile(htmlPath, html)

    return NextResponse.json({
      success: true,
      htmlUrl: `/api/files/${jobId}/output/${filename}`,
      filename,
    })

  } catch (error) {
    console.error('HTML generation error:', error)
    return NextResponse.json(
      { error: 'Failed to generate HTML document' },
      { status: 500 }
    )
  }
}

function generateHtmlDocument({
  clientName,
  businessName,
  website,
  sessionDate,
  extractedData
}: {
  clientName: string
  businessName: string
  website: string
  sessionDate: string
  extractedData: any
}) {
  const escapeHtml = (text: string) => {
    if (!text) return ''
    return String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;')
  }

  const summaryItems = (extractedData.summary_points || [])
    .map((point: string) => `<div class="summary-item">${escapeHtml(point)}</div>`)
    .join('\n')

  const actionItems = (extractedData.action_items || [])
    .map((item: any) => `
      <div class="action-item">
        <div class="action-checkbox" onclick="this.classList.toggle('checked')">
          <span class="checkmark">✓</span>
        </div>
        <div class="action-text">
          <h4>${escapeHtml(item.title)} ${item.priority ? `<span class="priority-tag priority-${item.priority}">${item.priority.toUpperCase()}</span>` : ''}</h4>
          <p>${escapeHtml(item.description || '')}</p>
        </div>
      </div>
    `).join('\n')

  const sections = (extractedData.sections || [])
    .map((section: any, index: number) => {
      const iconClass = index % 2 === 0 ? 'primary' : 'secondary'
      let content = ''

      if (section.bullet_points?.length > 0) {
        content += `<ul class="bullet-list">${section.bullet_points.map((p: string) => `<li>${escapeHtml(p)}</li>`).join('')}</ul>`
      }

      if (section.sop_steps?.length > 0) {
        content += `<div class="sop-box"><h4>📋 Standard Operating Procedure</h4><ol class="sop-steps">${section.sop_steps.map((s: string) => `<li>${escapeHtml(s)}</li>`).join('')}</ol></div>`
      }

      if (section.example) {
        content += `<div class="example-box"><h4>💡 Example</h4><p>${escapeHtml(section.example)}</p></div>`
      }

      return `
        <section class="section">
          <div class="section-header" onclick="toggleSection(this.parentElement)">
            <div class="section-title">
              <div class="section-icon ${iconClass}">📌</div>
              <div>
                <h3>${escapeHtml(section.title)}</h3>
                <p>${escapeHtml(section.description || '')}</p>
              </div>
            </div>
            <span class="chevron">▼</span>
          </div>
          <div class="section-content">
            <div class="section-body">${content}</div>
          </div>
        </section>
      `
    }).join('\n')

  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Business Strategy Reference - ${escapeHtml(businessName)}</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    <style>
        :root {
            --primary: #4493f2;
            --primary-light: #e8f2fe;
            --primary-dark: #2d7ad4;
            --secondary: #4dc0b5;
            --secondary-light: #e8f8f6;
            --charcoal: #1e1e1e;
            --navy: #132743;
            --text: #333333;
            --text-light: #666666;
            --bg: #FAFAF8;
            --white: #FFFFFF;
            --border: #E5E5E5;
        }
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Inter', sans-serif; background: var(--bg); color: var(--text); line-height: 1.7; font-size: 16px; }
        .header { background: linear-gradient(135deg, var(--navy) 0%, #1e3a5f 100%); color: var(--white); padding: 3rem 2rem; }
        .header-content { max-width: 1000px; margin: 0 auto; }
        .business-badge { display: inline-block; background: var(--primary); color: var(--white); padding: 0.4rem 1rem; border-radius: 20px; font-size: 0.85rem; font-weight: 600; margin-bottom: 1rem; }
        .header h1 { font-size: 2.5rem; font-weight: 700; margin-bottom: 0.5rem; }
        .header .subtitle { font-size: 1.1rem; opacity: 0.8; }
        .meta-info { display: flex; gap: 2rem; margin-top: 1.5rem; flex-wrap: wrap; font-size: 0.9rem; opacity: 0.9; }
        .meta-info a { color: inherit; }
        .nav-bar { background: var(--white); border-bottom: 1px solid var(--border); padding: 1rem 2rem; position: sticky; top: 0; z-index: 100; }
        .nav-content { max-width: 1000px; margin: 0 auto; display: flex; justify-content: flex-end; }
        .print-btn { background: var(--primary); color: var(--white); border: none; padding: 0.6rem 1.2rem; border-radius: 6px; font-size: 0.85rem; font-weight: 500; cursor: pointer; }
        .print-btn:hover { background: var(--primary-dark); }
        .main { max-width: 1000px; margin: 0 auto; padding: 2rem; }
        .summary-section { background: linear-gradient(135deg, var(--primary-light) 0%, var(--white) 100%); border: 2px solid var(--primary); border-radius: 16px; padding: 2rem; margin-bottom: 2rem; }
        .summary-section h2 { color: var(--primary-dark); font-size: 1.4rem; margin-bottom: 1.5rem; }
        .summary-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 1rem; }
        .summary-item { background: var(--white); padding: 1rem 1.25rem; border-radius: 10px; border-left: 4px solid var(--primary); font-size: 0.95rem; }
        .section { background: var(--white); border-radius: 16px; margin-bottom: 1.5rem; box-shadow: 0 2px 12px rgba(0,0,0,0.04); border: 1px solid var(--border); overflow: hidden; }
        .section-header { padding: 1.5rem 2rem; cursor: pointer; display: flex; justify-content: space-between; align-items: center; }
        .section-header:hover { background: var(--bg); }
        .section-title { display: flex; align-items: center; gap: 1rem; }
        .section-icon { width: 44px; height: 44px; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 1.2rem; }
        .section-icon.primary { background: var(--primary-light); }
        .section-icon.secondary { background: var(--secondary-light); }
        .section-header h3 { font-size: 1.15rem; font-weight: 600; color: var(--navy); }
        .section-header p { font-size: 0.85rem; color: var(--text-light); margin-top: 0.25rem; }
        .chevron { font-size: 0.8rem; color: var(--text-light); transition: transform 0.3s; }
        .section.open .chevron { transform: rotate(180deg); }
        .section-content { max-height: 0; overflow: hidden; transition: max-height 0.4s; }
        .section.open .section-content { max-height: 5000px; }
        .section-body { padding: 0 2rem 2rem; border-top: 1px solid var(--border); }
        .bullet-list { list-style: none; margin: 1.5rem 0; }
        .bullet-list li { padding: 0.6rem 0 0.6rem 1.5rem; position: relative; font-size: 0.95rem; }
        .bullet-list li::before { content: ''; position: absolute; left: 0; top: 1rem; width: 8px; height: 8px; background: var(--primary); border-radius: 50%; }
        .sop-box { background: linear-gradient(135deg, var(--secondary-light) 0%, var(--white) 100%); border: 1px solid var(--secondary); border-radius: 12px; padding: 1.5rem; margin: 1.5rem 0; }
        .sop-box h4 { color: var(--secondary); font-size: 1rem; margin-bottom: 1rem; }
        .sop-steps { counter-reset: step; list-style: none; padding-left: 0; }
        .sop-steps li { counter-increment: step; padding: 0.75rem 0 0.75rem 3rem; position: relative; font-size: 0.95rem; border-left: 2px solid var(--secondary); margin-left: 1rem; }
        .sop-steps li:last-child { border-left-color: transparent; }
        .sop-steps li::before { content: counter(step); position: absolute; left: -0.75rem; top: 0.65rem; width: 24px; height: 24px; background: var(--secondary); color: var(--white); border-radius: 50%; font-size: 0.75rem; font-weight: 600; display: flex; align-items: center; justify-content: center; }
        .example-box { background: var(--navy); color: var(--white); border-radius: 12px; padding: 1.5rem; margin: 1.5rem 0; }
        .example-box h4 { color: var(--primary); font-size: 0.9rem; margin-bottom: 1rem; text-transform: uppercase; }
        .example-box p { font-size: 0.95rem; opacity: 0.9; }
        .action-section { background: linear-gradient(135deg, var(--primary-dark) 0%, var(--primary) 100%); color: var(--white); border-radius: 16px; padding: 2rem; margin: 2rem 0; }
        .action-section h2 { font-size: 1.4rem; margin-bottom: 1.5rem; }
        .action-grid { display: grid; gap: 1rem; }
        .action-item { background: rgba(255,255,255,0.15); border-radius: 10px; padding: 1.25rem; display: flex; gap: 1rem; align-items: flex-start; }
        .action-checkbox { width: 24px; height: 24px; border: 2px solid var(--white); border-radius: 6px; flex-shrink: 0; cursor: pointer; display: flex; align-items: center; justify-content: center; }
        .action-checkbox .checkmark { opacity: 0; }
        .action-checkbox.checked { background: var(--secondary); border-color: var(--secondary); }
        .action-checkbox.checked .checkmark { opacity: 1; }
        .action-text h4 { font-size: 1rem; margin-bottom: 0.25rem; }
        .action-text p { font-size: 0.9rem; opacity: 0.85; }
        .priority-tag { display: inline-block; padding: 0.2rem 0.6rem; border-radius: 4px; font-size: 0.7rem; font-weight: 600; margin-left: 0.5rem; }
        .priority-high { background: #FF6B6B; }
        .priority-medium { background: var(--secondary); }
        .priority-low { background: #94a3b8; }
        .footer { text-align: center; padding: 2rem; color: var(--text-light); font-size: 0.85rem; }
        @media print { .nav-bar, .print-btn { display: none !important; } .section-content { max-height: none !important; } }
        @media (max-width: 768px) { .header { padding: 2rem 1.5rem; } .header h1 { font-size: 1.8rem; } .main { padding: 1rem; } }
    </style>
</head>
<body>
    <header class="header">
        <div class="header-content">
            <span class="business-badge">📋 Business Strategy Session</span>
            <h1>${escapeHtml(businessName)}</h1>
            <p class="subtitle">Comprehensive Business Development Reference Guide</p>
            <div class="meta-info">
                <span>👤 Client: ${escapeHtml(clientName)}</span>
                ${website ? `<span>🌐 <a href="${escapeHtml(website)}" target="_blank">${escapeHtml(website)}</a></span>` : ''}
                <span>📅 Session: ${escapeHtml(sessionDate)}</span>
            </div>
        </div>
    </header>
    <nav class="nav-bar">
        <div class="nav-content">
            <button class="print-btn" onclick="window.print()">🖨️ Print / Save PDF</button>
        </div>
    </nav>
    <main class="main">
        <section class="summary-section">
            <h2>📋 Key Topics Covered</h2>
            <div class="summary-grid">${summaryItems}</div>
        </section>
        ${sections}
        ${actionItems ? `
        <section class="action-section">
            <h2>✅ Your Action Items</h2>
            <div class="action-grid">${actionItems}</div>
        </section>` : ''}
    </main>
    <footer class="footer">
        <p>Generated by Speaker Split - Start My Business Inc.</p>
        <p>${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
    </footer>
    <script>
        function toggleSection(section) { section.classList.toggle('open'); }
        document.addEventListener('DOMContentLoaded', function() {
            const sections = document.querySelectorAll('.section');
            if (sections.length > 0) sections[0].classList.add('open');
        });
    </script>
</body>
</html>`
}
