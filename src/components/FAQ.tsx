"use client"

import { useState } from "react"
import { ChevronDown, HelpCircle } from "lucide-react"
import { cn } from "@/lib/utils"

interface FAQItem {
  question: string
  answer: string
}

interface FAQProps {
  items: FAQItem[]
  accentColor?: 'primary' | 'secondary' | 'amber' | 'violet'
}

export function FAQ({ items, accentColor = 'primary' }: FAQProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  const colorClasses = {
    primary: 'text-primary border-primary/20 hover:border-primary/40',
    secondary: 'text-secondary border-secondary/20 hover:border-secondary/40',
    amber: 'text-amber-500 border-amber-500/20 hover:border-amber-500/40',
    violet: 'text-violet-500 border-violet-500/20 hover:border-violet-500/40',
  }

  const bgClasses = {
    primary: 'bg-primary/5',
    secondary: 'bg-secondary/5',
    amber: 'bg-amber-500/5',
    violet: 'bg-violet-500/5',
  }

  return (
    <div className="mt-8 space-y-3">
      <div className="flex items-center gap-2 mb-4">
        <HelpCircle className={cn("w-5 h-5", colorClasses[accentColor].split(' ')[0])} />
        <h4 className="font-semibold text-slate-900 dark:text-white">Common Questions</h4>
      </div>
      {items.map((item, index) => (
        <div
          key={index}
          className={cn(
            "border rounded-xl overflow-hidden transition-all",
            colorClasses[accentColor]
          )}
        >
          <button
            className="w-full flex items-center justify-between p-4 text-left"
            onClick={() => setOpenIndex(openIndex === index ? null : index)}
          >
            <span className="font-medium text-slate-900 dark:text-white pr-4">{item.question}</span>
            <ChevronDown
              className={cn(
                "w-5 h-5 flex-shrink-0 transition-transform",
                openIndex === index && "rotate-180"
              )}
            />
          </button>
          {openIndex === index && (
            <div className={cn("px-4 pb-4", bgClasses[accentColor])}>
              <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
                {item.answer}
              </p>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

// Pre-defined FAQ content for each section
export const TRANSCRIPTION_FAQ = [
  {
    question: "What audio formats are supported?",
    answer: "We support MP3, WAV, M4A, FLAC, OGG, WebM, and MP4 files. Maximum file size is 500MB. For best results, use high-quality audio with minimal background noise."
  },
  {
    question: "How accurate is the transcription?",
    answer: "Our AI uses WhisperX, one of the most accurate transcription models available. Accuracy is typically 95%+ for clear audio in English. Other languages are also supported with high accuracy."
  },
  {
    question: "What does 'speaker labels' mean?",
    answer: "Speaker labels identify who is speaking at each point in the conversation. The AI analyzes voice patterns to distinguish between different speakers and labels each segment accordingly (Speaker 1, Speaker 2, etc.)."
  },
  {
    question: "How long does transcription take?",
    answer: "Processing time depends on file size and server load. A 10-minute audio file typically takes 1-3 minutes with GPU acceleration. Larger files may take longer."
  },
]

export const SPEAKER_SPLIT_FAQ = [
  {
    question: "What is speaker separation?",
    answer: "Speaker separation creates individual audio files for each person in the conversation. This allows you to hear only what a specific speaker said, useful for review, editing, or creating focused content."
  },
  {
    question: "How many speakers can be identified?",
    answer: "Our system supports 2-6 speakers. Select the number that matches your audio. If you're unsure, start with 2 speakers - the AI will still identify distinct voices even if there are more."
  },
  {
    question: "Why does speaker split take longer than transcription?",
    answer: "Speaker split includes full transcription PLUS audio processing to create separate files for each speaker. This additional step of isolating and exporting audio tracks adds processing time."
  },
  {
    question: "What format are the speaker audio files?",
    answer: "Speaker audio files are exported as WAV format for maximum quality and compatibility. Each file contains only the segments where that specific speaker is talking."
  },
]

export const DOCUMENT_GENERATOR_FAQ = [
  {
    question: "What does the document generator create?",
    answer: "It creates a professional HTML document from your transcript, including summaries, action items, business concepts discussed, profit projections, and collapsible SOPs. The document uses a gold/yellow and green color scheme for easy reading."
  },
  {
    question: "Do I need to use Section 1 first?",
    answer: "No! You can paste any transcript into the Document Generator. However, using Section 1 (Transcription) first gives you speaker-labeled text that produces better results with clearer attribution."
  },
  {
    question: "How should I format my transcript?",
    answer: "For best results, include speaker labels like 'Speaker 1: Hello...' or 'John: Thank you for...'. The AI will use these to attribute statements correctly in the final document."
  },
  {
    question: "Can I edit the generated document?",
    answer: "Yes! Download the HTML file and open it in any text editor to make changes. The document includes embedded CSS and JavaScript, so it works as a standalone file that you can customize."
  },
]

export const VOICE_CLONE_FAQ = [
  {
    question: "How long should the reference audio be?",
    answer: "For best results, use 5-12 seconds of clear speech from a single speaker. The audio should have minimal background noise, no music, and no overlapping voices. Quality matters more than length."
  },
  {
    question: "How much text can I generate at once?",
    answer: "You can generate up to about 750 words (roughly 3 minutes of speech) per request. For longer content, split your text into multiple requests using the same reference audio."
  },
  {
    question: "What languages are supported?",
    answer: "F5-TTS supports English and Chinese natively. English produces the most natural results. Other languages may work but with reduced quality."
  },
  {
    question: "How accurate is the voice clone?",
    answer: "F5-TTS captures tone, pitch, and speaking style from the reference audio. Results are best when the reference audio is high quality with clear speech. The generated output will sound similar but not identical to the original voice."
  },
  {
    question: "What format is the output?",
    answer: "The generated audio is provided as a WAV file at 24kHz for maximum quality. You can convert it to MP3 or other formats using any audio converter."
  },
]
