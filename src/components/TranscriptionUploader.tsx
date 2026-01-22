"use client"

import { useCallback, useState } from "react"
import { useDropzone } from "react-dropzone"
import { Upload, FileAudio, X, Users, Loader2, Clock, AlertCircle, Download, Copy, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn, formatFileSize } from "@/lib/utils"

interface TranscriptSegment {
  speaker: string
  text: string
  start: number
  end: number
}

const ACCEPTED_FORMATS = {
  'audio/mpeg': ['.mp3'],
  'audio/wav': ['.wav'],
  'audio/mp4': ['.m4a'],
  'audio/x-m4a': ['.m4a'],
  'audio/flac': ['.flac'],
  'audio/ogg': ['.ogg'],
  'audio/webm': ['.webm'],
  'video/mp4': ['.mp4'],
  'video/webm': ['.webm'],
}

function estimateProcessingTime(fileSizeBytes: number): { min: number; max: number; warning: boolean } {
  const sizeMB = fileSizeBytes / (1024 * 1024)
  const minMinutes = Math.ceil(sizeMB / 10) * 1
  const maxMinutes = Math.ceil(sizeMB / 10) * 3
  return {
    min: Math.max(1, minMinutes),
    max: Math.max(2, maxMinutes),
    warning: sizeMB > 100
  }
}

function formatTimeEstimate(min: number, max: number): string {
  if (min === max) return `~${min} minute${min === 1 ? '' : 's'}`
  if (max < 60) return `${min}-${max} minutes`
  const minHours = Math.floor(min / 60)
  const maxHours = Math.ceil(max / 60)
  if (minHours === maxHours) return `~${minHours} hour${minHours === 1 ? '' : 's'}`
  return `${minHours}-${maxHours} hours`
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

const SPEAKER_COLORS = [
  '#3B82F6', // blue
  '#10B981', // green
  '#F59E0B', // amber
  '#EF4444', // red
  '#8B5CF6', // purple
  '#EC4899', // pink
]

export function TranscriptionUploader() {
  const [file, setFile] = useState<File | null>(null)
  const [speakerCount, setSpeakerCount] = useState("2")
  const [isProcessing, setIsProcessing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [stage, setStage] = useState("")
  const [transcript, setTranscript] = useState<TranscriptSegment[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      setFile(acceptedFiles[0])
      setTranscript(null)
      setError(null)
    }
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPTED_FORMATS,
    maxFiles: 1,
    maxSize: 500 * 1024 * 1024,
  })

  const handleProcess = async () => {
    if (!file) return

    setIsProcessing(true)
    setProgress(0)
    setStage("Uploading...")
    setError(null)
    setTranscript(null)

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('speakerCount', speakerCount)
      formData.append('mode', 'transcription') // transcription only mode

      const response = await fetch('/api/transcribe', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Transcription failed')
      }

      // Handle streaming response
      const reader = response.body?.getReader()
      const decoder = new TextDecoder()

      if (reader) {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          const text = decoder.decode(value)
          const lines = text.split('\n').filter(line => line.trim())

          for (const line of lines) {
            try {
              const data = JSON.parse(line)
              if (data.progress) setProgress(data.progress)
              if (data.stage) setStage(data.stage)
              if (data.transcript) setTranscript(data.transcript)
              if (data.error) throw new Error(data.error)
            } catch (e) {
              // Ignore JSON parse errors for partial data
            }
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Processing failed')
    } finally {
      setIsProcessing(false)
    }
  }

  const removeFile = () => {
    setFile(null)
    setTranscript(null)
    setError(null)
  }

  const copyTranscript = () => {
    if (!transcript) return
    const text = transcript.map(seg => `Speaker ${seg.speaker}: ${seg.text}`).join('\n\n')
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const downloadTranscript = () => {
    if (!transcript) return
    const text = transcript.map(seg => `Speaker ${seg.speaker}: ${seg.text}`).join('\n\n')
    const blob = new Blob([text], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${file?.name.replace(/\.[^/.]+$/, '')}-transcript.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6">
      {/* Dropzone */}
      <Card className={cn(
        "border-2 border-dashed transition-all duration-300 cursor-pointer",
        isDragActive ? "border-primary bg-primary/5" : "border-slate-300 dark:border-slate-600 dark:border-slate-700 hover:border-primary/50",
        file && "border-primary bg-primary/5"
      )}>
        <CardContent className="p-0">
          <div {...getRootProps()} className="p-8 text-center">
            <input {...getInputProps()} />
            {file ? (
              <div className="space-y-4">
                <div className="w-16 h-16 mx-auto rounded-2xl bg-primary/10 flex items-center justify-center">
                  <FileAudio className="w-8 h-8 text-primary" />
                </div>
                <div>
                  <p className="font-semibold text-slate-900 dark:text-white">{file.name}</p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">{formatFileSize(file.size)}</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => { e.stopPropagation(); removeFile() }}
                  className="text-red-500 hover:text-red-600 hover:bg-red-50"
                >
                  <X className="w-4 h-4 mr-1" />
                  Remove file
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="w-16 h-16 mx-auto rounded-2xl bg-primary/10 flex items-center justify-center">
                  <Upload className="w-8 h-8 text-primary" />
                </div>
                <div>
                  <p className="text-lg font-semibold text-slate-900 dark:text-white">
                    {isDragActive ? "Drop your audio file here" : "Drag & drop your audio file"}
                  </p>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">or click to browse</p>
                </div>
                <div className="flex flex-wrap justify-center gap-2 text-xs text-slate-400 dark:text-slate-500">
                  <span className="px-2 py-1 rounded bg-slate-100 dark:bg-slate-800">MP3</span>
                  <span className="px-2 py-1 rounded bg-slate-100 dark:bg-slate-800">WAV</span>
                  <span className="px-2 py-1 rounded bg-slate-100 dark:bg-slate-800">M4A</span>
                  <span className="px-2 py-1 rounded bg-slate-100 dark:bg-slate-800">FLAC</span>
                  <span className="px-2 py-1 rounded bg-slate-100 dark:bg-slate-800">MP4</span>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Time Estimate */}
      {file && !isProcessing && !transcript && (
        <Card className={cn(
          "border-l-4",
          estimateProcessingTime(file.size).warning ? "border-l-amber-500 bg-amber-50 dark:bg-amber-950/20" : "border-l-primary bg-primary/5"
        )}>
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className={cn(
                "w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0",
                estimateProcessingTime(file.size).warning ? "bg-amber-100 dark:bg-amber-900/30" : "bg-primary/10"
              )}>
                {estimateProcessingTime(file.size).warning ? (
                  <AlertCircle className="w-5 h-5 text-amber-600" />
                ) : (
                  <Clock className="w-5 h-5 text-primary" />
                )}
              </div>
              <div>
                <p className="font-semibold text-slate-900 dark:text-white">
                  Estimated Time: {formatTimeEstimate(
                    estimateProcessingTime(file.size).min,
                    estimateProcessingTime(file.size).max
                  )}
                </p>
                <p className="text-sm text-gray-600 dark:text-slate-400 dark:text-slate-500 mt-1">
                  File size: {formatFileSize(file.size)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Speaker Count */}
      {file && !isProcessing && !transcript && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Users className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="font-semibold text-slate-900 dark:text-white">Number of Speakers</p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">How many people are talking?</p>
                </div>
              </div>
              <Select value={speakerCount} onValueChange={setSpeakerCount}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[2, 3, 4, 5, 6].map(n => (
                    <SelectItem key={n} value={String(n)}>{n} Speakers</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Processing Progress */}
      {isProcessing && (
        <Card>
          <CardContent className="p-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Loader2 className="w-5 h-5 animate-spin text-primary" />
                  <span className="font-medium text-slate-900 dark:text-white">{stage}</span>
                </div>
                <span className="text-primary font-semibold">{Math.round(progress)}%</span>
              </div>
              <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-primary to-secondary transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error */}
      {error && (
        <Card className="border-red-200 bg-red-50 dark:bg-red-950/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3 text-red-600">
              <AlertCircle className="w-5 h-5" />
              <p>{error}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Start Button */}
      {file && !isProcessing && !transcript && (
        <Button size="lg" className="w-full" onClick={handleProcess}>
          Start Transcription
        </Button>
      )}

      {/* Transcript Results */}
      {transcript && (
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-slate-900 dark:text-white">Transcript</h3>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={copyTranscript}>
                  {copied ? <Check className="w-4 h-4 mr-1" /> : <Copy className="w-4 h-4 mr-1" />}
                  {copied ? 'Copied!' : 'Copy'}
                </Button>
                <Button variant="outline" size="sm" onClick={downloadTranscript}>
                  <Download className="w-4 h-4 mr-1" />
                  Download
                </Button>
              </div>
            </div>
            <div className="max-h-96 overflow-y-auto space-y-3 pr-2">
              {transcript.map((segment, index) => {
                const speakerNum = parseInt(segment.speaker.replace('SPEAKER_', '')) || index
                const color = SPEAKER_COLORS[speakerNum % SPEAKER_COLORS.length]
                return (
                  <div key={index} className="flex gap-3">
                    <div
                      className="w-1 rounded-full flex-shrink-0"
                      style={{ backgroundColor: color }}
                    />
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-semibold" style={{ color }}>
                          Speaker {speakerNum + 1}
                        </span>
                        <span className="text-xs text-slate-400 dark:text-slate-500">
                          {formatDuration(segment.start)}
                        </span>
                      </div>
                      <p className="text-sm text-slate-700 dark:text-slate-300">{segment.text}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Process Another */}
      {transcript && (
        <Button variant="outline" className="w-full" onClick={removeFile}>
          Process Another File
        </Button>
      )}
    </div>
  )
}
