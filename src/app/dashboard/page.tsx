"use client"

import { useState, useEffect } from "react"
import { useUser, SignedIn, SignedOut, RedirectToSignIn } from "@clerk/nextjs"
import {
  Mic2,
  Split,
  FileText,
  Trash2,
  Download,
  Clock,
  FileAudio,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  ArrowLeft,
  Volume2
} from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { AudioWaveformPlayer } from "@/components/AudioWaveformPlayer"
import {
  getUserFiles,
  deleteUserFile,
  UserFile,
  FileType,
  getFileTypeLabel,
  getFileTypeColor
} from "@/lib/user-files"
import { cn } from "@/lib/utils"

const FILE_TYPE_ICONS: Record<FileType, React.ReactNode> = {
  transcription: <Mic2 className="w-5 h-5" />,
  'speaker-split': <Split className="w-5 h-5" />,
  document: <FileText className="w-5 h-5" />,
  'voice-clone': <Volume2 className="w-5 h-5" />
}

const FILE_TYPE_COLORS: Record<FileType, { bg: string; text: string; border: string }> = {
  transcription: {
    bg: 'bg-blue-100 dark:bg-blue-900/30',
    text: 'text-blue-600 dark:text-blue-400',
    border: 'border-blue-200 dark:border-blue-800'
  },
  'speaker-split': {
    bg: 'bg-teal-100 dark:bg-teal-900/30',
    text: 'text-teal-600 dark:text-teal-400',
    border: 'border-teal-200 dark:border-teal-800'
  },
  document: {
    bg: 'bg-amber-100 dark:bg-amber-900/30',
    text: 'text-amber-600 dark:text-amber-400',
    border: 'border-amber-200 dark:border-amber-800'
  },
  'voice-clone': {
    bg: 'bg-violet-100 dark:bg-violet-900/30',
    text: 'text-violet-600 dark:text-violet-400',
    border: 'border-violet-200 dark:border-violet-800'
  }
}

const SPEAKER_COLORS = [
  '#3B82F6', // blue
  '#10B981', // green
  '#F59E0B', // amber
  '#EF4444', // red
  '#8B5CF6', // purple
  '#EC4899', // pink
]

// Helper to normalize URLs from old format (/files/...) to new format (/api/files/...)
function normalizeAudioUrl(url: string): string {
  if (url.startsWith('/files/') && !url.startsWith('/api/files/')) {
    return '/api' + url
  }
  return url
}

function FileCard({ file, onDelete }: { file: UserFile; onDelete: () => void }) {
  const [expanded, setExpanded] = useState(false)
  const colors = FILE_TYPE_COLORS[file.type]

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    })
  }

  const downloadTranscript = () => {
    if (!file.transcript) return

    const text = file.transcript.map(seg =>
      `[${seg.speaker}] ${seg.text}`
    ).join('\n\n')

    const blob = new Blob([text], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${file.name}-transcript.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  const downloadDocument = () => {
    // Handle Word documents
    if (file.documentType === 'docx' && file.docxContent) {
      const byteCharacters = atob(file.docxContent)
      const byteNumbers = new Array(byteCharacters.length)
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i)
      }
      const byteArray = new Uint8Array(byteNumbers)
      const blob = new Blob([byteArray], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${file.name}.docx`
      a.click()
      URL.revokeObjectURL(url)
      return
    }

    // Handle HTML documents
    if (!file.htmlContent) return

    const blob = new Blob([file.htmlContent], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${file.name}.html`
    a.click()
    URL.revokeObjectURL(url)
  }

  // Get document file size
  const getDocumentSize = (): number => {
    if (file.documentType === 'docx' && file.docxContent) {
      // Base64 is ~4/3 the size of binary
      return Math.round((file.docxContent.length * 3) / 4 / 1024)
    }
    if (file.htmlContent) {
      return Math.round(file.htmlContent.length / 1024)
    }
    return 0
  }

  // Get document file extension
  const getDocumentExtension = (): string => {
    return file.documentType === 'docx' ? 'docx' : 'html'
  }

  // Check if document has downloadable content
  const hasDocumentContent = (): boolean => {
    return !!(file.docxContent || file.htmlContent)
  }

  return (
    <Card className={cn("border-2 transition-all", colors.border)}>
      <CardContent className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0", colors.bg, colors.text)}>
              {FILE_TYPE_ICONS[file.type]}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-slate-900 dark:text-white truncate">
                {file.name}
              </h3>
              <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                <span className={cn("px-2 py-0.5 rounded text-xs font-medium", colors.bg, colors.text)}>
                  {getFileTypeLabel(file.type)}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {formatDate(file.createdAt)}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setExpanded(!expanded)}
              className="text-slate-500"
            >
              {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onDelete}
              className="text-red-500 hover:text-red-600 hover:bg-red-50"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Expanded Content */}
        {expanded && (
          <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700 space-y-4">
            {/* Original file info */}
            {file.originalFileName && (
              <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                <FileAudio className="w-4 h-4" />
                <span>Original: {file.originalFileName}</span>
                {file.originalFileSize && (
                  <span className="text-slate-400">
                    ({(file.originalFileSize / (1024 * 1024)).toFixed(1)} MB)
                  </span>
                )}
              </div>
            )}

            {/* Transcription Content */}
            {file.type === 'transcription' && file.transcript && (
              <div className="space-y-4">
                {/* Prominent Download Button */}
                <div className="flex items-center justify-between bg-amber-50 dark:bg-amber-900/20 rounded-lg p-4 border border-amber-200 dark:border-amber-800">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 flex items-center justify-center">
                      <Mic2 className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="font-medium text-slate-900 dark:text-white">{file.name}-transcript.txt</p>
                      <p className="text-sm text-slate-500 dark:text-slate-400">
                        {file.transcript.length} segments
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={downloadTranscript}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 text-white font-semibold text-sm transition-all hover:from-amber-600 hover:to-orange-600 shadow-sm hover:shadow-md"
                  >
                    <Download className="w-4 h-4" />
                    Download
                  </button>
                </div>

                {/* Preview Section */}
                <div className="space-y-2">
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Preview (first 10 segments)</p>
                  <div className="max-h-60 overflow-y-auto space-y-2 bg-slate-50 dark:bg-slate-800/50 rounded-lg p-3 border border-slate-200 dark:border-slate-700">
                    {file.transcript.slice(0, 10).map((seg, idx) => (
                      <div key={idx} className="text-sm">
                        <span className="font-medium text-blue-600 dark:text-blue-400">
                          [{seg.speaker}]
                        </span>
                        <span className="text-slate-700 dark:text-slate-300 ml-2">
                          {seg.text}
                        </span>
                      </div>
                    ))}
                    {file.transcript.length > 10 && (
                      <p className="text-sm text-slate-500 italic">
                        ... and {file.transcript.length - 10} more segments
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Speaker Split Content */}
            {file.type === 'speaker-split' && file.speakerAudios && (
              <div className="space-y-4">
                {/* Download All Button */}
                <div className="flex items-center justify-between bg-amber-50 dark:bg-amber-900/20 rounded-lg p-4 border border-amber-200 dark:border-amber-800">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 flex items-center justify-center">
                      <Split className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="font-medium text-slate-900 dark:text-white">Speaker Audio Files</p>
                      <p className="text-sm text-slate-500 dark:text-slate-400">
                        {file.speakerAudios.length} speaker{file.speakerAudios.length > 1 ? 's' : ''} detected
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      file.speakerAudios?.forEach((audio, idx) => {
                        setTimeout(() => {
                          const link = document.createElement('a')
                          link.href = normalizeAudioUrl(audio.url)
                          link.download = `${file.name}-${audio.speaker}.wav`
                          document.body.appendChild(link)
                          link.click()
                          document.body.removeChild(link)
                        }, idx * 500)
                      })
                    }}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 text-white font-semibold text-sm transition-all hover:from-amber-600 hover:to-orange-600 shadow-sm hover:shadow-md"
                  >
                    <Download className="w-4 h-4" />
                    Download All
                  </button>
                </div>

                {/* Individual Speaker Players */}
                <div className="space-y-2">
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Play or download individual speakers</p>
                  <div className="space-y-2">
                    {file.speakerAudios.map((audio, idx) => (
                      <AudioWaveformPlayer
                        key={idx}
                        url={normalizeAudioUrl(audio.url)}
                        title={audio.speaker}
                        color={SPEAKER_COLORS[idx % SPEAKER_COLORS.length]}
                        compact
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Voice Clone Content */}
            {file.type === 'voice-clone' && (
              <div className="space-y-4">
                {file.clonedAudioUrl && (
                  <div className="flex items-center justify-between bg-violet-50 dark:bg-violet-900/20 rounded-lg p-4 border border-violet-200 dark:border-violet-800">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-r from-violet-500 to-purple-500 flex items-center justify-center">
                        <Volume2 className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <p className="font-medium text-slate-900 dark:text-white">{file.name}.wav</p>
                        <p className="text-sm text-slate-500 dark:text-slate-400">Cloned voice audio</p>
                      </div>
                    </div>
                    <a
                      href={file.clonedAudioUrl}
                      download={`${file.name}.wav`}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-gradient-to-r from-violet-500 to-purple-500 text-white font-semibold text-sm transition-all hover:from-violet-600 hover:to-purple-600 shadow-sm hover:shadow-md"
                    >
                      <Download className="w-4 h-4" />
                      Download
                    </a>
                  </div>
                )}

                {file.clonedAudioUrl && (
                  <audio controls src={file.clonedAudioUrl} className="w-full" />
                )}

                {file.generatedText && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Generated Text</p>
                    <div className="max-h-40 overflow-y-auto bg-slate-50 dark:bg-slate-800/50 rounded-lg p-3 border border-slate-200 dark:border-slate-700">
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        {file.generatedText.substring(0, 500)}
                        {file.generatedText.length > 500 && '...'}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Document Content */}
            {file.type === 'document' && (
              <div className="space-y-4">
                {/* Prominent Download Button */}
                {hasDocumentContent() && (
                  <div className={cn(
                    "flex items-center justify-between rounded-lg p-4 border",
                    file.documentType === 'docx'
                      ? "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800"
                      : "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800"
                  )}>
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "w-10 h-10 rounded-lg flex items-center justify-center",
                        file.documentType === 'docx'
                          ? "bg-gradient-to-r from-blue-500 to-blue-600"
                          : "bg-gradient-to-r from-amber-500 to-orange-500"
                      )}>
                        <FileText className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <p className="font-medium text-slate-900 dark:text-white">
                          {file.name}.{getDocumentExtension()}
                        </p>
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                          {file.documentType === 'docx' ? 'Word Document' : 'HTML Document'} ({getDocumentSize()} KB)
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={downloadDocument}
                      className={cn(
                        "flex items-center gap-2 px-4 py-2.5 rounded-lg text-white font-semibold text-sm transition-all shadow-sm hover:shadow-md",
                        file.documentType === 'docx'
                          ? "bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700"
                          : "bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
                      )}
                    >
                      <Download className="w-4 h-4" />
                      Download
                    </button>
                  </div>
                )}

                {/* No content message */}
                {!hasDocumentContent() && (
                  <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700 text-center">
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      Document content not available. This may be from an older version.
                    </p>
                  </div>
                )}

                {/* View Document Link */}
                {file.documentUrl && (
                  <a
                    href={file.documentUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    <ExternalLink className="w-4 h-4" />
                    View Document in Browser
                  </a>
                )}

                {/* Preview Section - Only for HTML */}
                {file.documentType !== 'docx' && file.htmlContent && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Preview (first 500 characters)</p>
                    <div className="max-h-40 overflow-y-auto bg-slate-50 dark:bg-slate-800/50 rounded-lg p-3 border border-slate-200 dark:border-slate-700">
                      <pre className="text-xs text-slate-600 dark:text-slate-400 whitespace-pre-wrap font-mono">
                        {file.htmlContent.substring(0, 500)}...
                      </pre>
                    </div>
                  </div>
                )}

                {/* Info for Word docs */}
                {file.documentType === 'docx' && (
                  <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                    <p className="text-sm text-blue-700 dark:text-blue-400">
                      Word documents can be opened in Microsoft Word, Google Docs, or any compatible editor.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function DashboardContent() {
  const { user } = useUser()
  const [files, setFiles] = useState<UserFile[]>([])
  const [filter, setFilter] = useState<FileType | 'all'>('all')
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (user?.id) {
      const userFiles = getUserFiles(user.id)
      setFiles(userFiles)
      setIsLoading(false)
    }
  }, [user?.id])

  const handleDelete = (fileId: string) => {
    if (!user?.id) return
    if (!confirm('Are you sure you want to delete this file?')) return

    deleteUserFile(user.id, fileId)
    setFiles(files.filter(f => f.id !== fileId))
  }

  const filteredFiles = filter === 'all'
    ? files
    : files.filter(f => f.type === filter)

  const counts = {
    all: files.length,
    transcription: files.filter(f => f.type === 'transcription').length,
    'speaker-split': files.filter(f => f.type === 'speaker-split').length,
    document: files.filter(f => f.type === 'document').length,
    'voice-clone': files.filter(f => f.type === 'voice-clone').length
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white dark:from-slate-900 dark:to-slate-800">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <Link
              href="/"
              className="inline-flex items-center gap-1 text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white mb-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Tools
            </Link>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
              My Dashboard
            </h1>
            <p className="text-slate-600 dark:text-slate-400 mt-1">
              Access all your transcriptions, speaker splits, and documents
            </p>
          </div>
          <Link href="/">
            <Button className="bg-blue-600 hover:bg-blue-700">
              <ArrowLeft className="w-4 h-4 mr-2" />
              App
            </Button>
          </Link>
        </div>

        {/* Filter Tabs */}
        <div className="flex flex-wrap gap-2 mb-6">
          {[
            { key: 'all' as const, label: 'All Files' },
            { key: 'transcription' as const, label: 'Transcriptions' },
            { key: 'speaker-split' as const, label: 'Speaker Splits' },
            { key: 'document' as const, label: 'Documents' },
            { key: 'voice-clone' as const, label: 'Voice Clones' }
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              className={cn(
                "px-4 py-2 rounded-lg font-medium text-sm transition-colors",
                filter === tab.key
                  ? "bg-blue-600 text-white"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
              )}
            >
              {tab.label}
              <span className="ml-2 px-2 py-0.5 rounded-full bg-white/20 text-xs">
                {counts[tab.key]}
              </span>
            </button>
          ))}
        </div>

        {/* File List */}
        {filteredFiles.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center">
              <div className="w-16 h-16 mx-auto rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4">
                <FileAudio className="w-8 h-8 text-slate-400" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                No files yet
              </h3>
              <p className="text-slate-600 dark:text-slate-400 mb-6">
                {filter === 'all'
                  ? "Start processing audio files to see them here"
                  : `You haven't created any ${getFileTypeLabel(filter as FileType).toLowerCase()}s yet`}
              </p>
              <Link href="/">
                <Button>
                  Start Processing
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredFiles.map(file => (
              <FileCard
                key={file.id}
                file={file}
                onDelete={() => handleDelete(file.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default function DashboardPage() {
  return (
    <>
      <SignedIn>
        <DashboardContent />
      </SignedIn>
      <SignedOut>
        <RedirectToSignIn />
      </SignedOut>
    </>
  )
}
