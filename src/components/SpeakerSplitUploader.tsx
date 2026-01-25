"use client"

import { useCallback, useState } from "react"
import { useDropzone, FileRejection } from "react-dropzone"
import { Upload, FileAudio, X, Users, Loader2, Clock, AlertCircle, Download, Play, Pause, Zap } from "lucide-react"
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
import { useUser } from "@clerk/nextjs"
import { TIER_LIMITS, getUserTier, getUpgradeMessage, formatMaxSize, type UserTier } from "@/lib/tiers"

interface SpeakerAudio {
  speaker: string
  url: string
  duration?: number
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
  // Speaker split takes longer than transcription only
  const minMinutes = Math.ceil(sizeMB / 10) * 2
  const maxMinutes = Math.ceil(sizeMB / 10) * 5
  return {
    min: Math.max(2, minMinutes),
    max: Math.max(4, maxMinutes),
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

const SPEAKER_COLORS = [
  '#3B82F6', // blue
  '#10B981', // green
  '#F59E0B', // amber
  '#EF4444', // red
  '#8B5CF6', // purple
  '#EC4899', // pink
]

export function SpeakerSplitUploader() {
  const { user } = useUser()
  const userTier: UserTier = getUserTier(user?.publicMetadata as { tier?: string })
  const tierLimits = TIER_LIMITS[userTier]

  const [file, setFile] = useState<File | null>(null)
  const [speakerCount, setSpeakerCount] = useState("2")
  const [isProcessing, setIsProcessing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [stage, setStage] = useState("")
  const [speakerAudios, setSpeakerAudios] = useState<SpeakerAudio[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [fileSizeError, setFileSizeError] = useState<string | null>(null)
  const [playingIndex, setPlayingIndex] = useState<number | null>(null)
  const [audioElements, setAudioElements] = useState<{ [key: number]: HTMLAudioElement }>({})

  const onDrop = useCallback((acceptedFiles: File[], rejectedFiles: FileRejection[]) => {
    setFileSizeError(null)

    // Check for file size rejection
    if (rejectedFiles.length > 0) {
      const rejection = rejectedFiles[0]
      const fileSizeMB = rejection.file.size / (1024 * 1024)

      if (rejection.errors.some(e => e.code === 'file-too-large')) {
        setFileSizeError(getUpgradeMessage(fileSizeMB))
        return
      }
    }

    if (acceptedFiles.length > 0) {
      setFile(acceptedFiles[0])
      setSpeakerAudios(null)
      setError(null)
    }
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPTED_FORMATS,
    maxFiles: 1,
    maxSize: tierLimits.maxFileSize,
  })

  const handleProcess = async () => {
    if (!file) return

    setIsProcessing(true)
    setProgress(0)
    setStage("Uploading...")
    setError(null)
    setSpeakerAudios(null)

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('speakerCount', speakerCount)
      formData.append('mode', 'split') // speaker split mode

      const response = await fetch('/api/split', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Speaker split failed')
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
              if (data.speakerAudios) setSpeakerAudios(data.speakerAudios)
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
    setSpeakerAudios(null)
    setError(null)
    setFileSizeError(null)
    setPlayingIndex(null)
    // Stop any playing audio
    Object.values(audioElements).forEach(audio => {
      audio.pause()
      audio.currentTime = 0
    })
    setAudioElements({})
  }

  const togglePlay = (index: number, url: string) => {
    if (playingIndex === index) {
      // Pause current
      audioElements[index]?.pause()
      setPlayingIndex(null)
    } else {
      // Stop previous
      if (playingIndex !== null && audioElements[playingIndex]) {
        audioElements[playingIndex].pause()
        audioElements[playingIndex].currentTime = 0
      }

      // Play new
      let audio = audioElements[index]
      if (!audio) {
        audio = new Audio(url)
        audio.onended = () => setPlayingIndex(null)
        setAudioElements(prev => ({ ...prev, [index]: audio }))
      }
      audio.play()
      setPlayingIndex(index)
    }
  }

  const downloadAll = () => {
    speakerAudios?.forEach((audio, index) => {
      const a = document.createElement('a')
      a.href = audio.url
      a.download = `speaker-${index + 1}.wav`
      a.click()
    })
  }

  return (
    <div className="space-y-6">
      {/* Dropzone */}
      <Card className={cn(
        "border-2 border-dashed transition-all duration-300 cursor-pointer",
        isDragActive ? "border-secondary bg-secondary/5" : "border-slate-300 dark:border-slate-600 dark:border-slate-700 hover:border-secondary/50",
        file && "border-secondary bg-secondary/5"
      )}>
        <CardContent className="p-0">
          <div {...getRootProps()} className="p-8 text-center">
            <input {...getInputProps()} />
            {file ? (
              <div className="space-y-4">
                <div className="w-16 h-16 mx-auto rounded-2xl bg-secondary/10 flex items-center justify-center">
                  <FileAudio className="w-8 h-8 text-secondary" />
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
                <div className="w-16 h-16 mx-auto rounded-2xl bg-secondary/10 flex items-center justify-center">
                  <Upload className="w-8 h-8 text-secondary" />
                </div>
                <div>
                  <p className="text-lg font-semibold text-slate-900 dark:text-white">
                    {isDragActive ? "Drop your audio file here" : "Drag & drop your audio file"}
                  </p>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">or click to browse</p>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-2">
                    Max file size: {formatMaxSize(userTier)}
                    {userTier === 'free' && (
                      <span className="ml-1">(Pro: up to 200MB)</span>
                    )}
                  </p>
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

      {/* File Size Error / Upgrade Prompt */}
      {fileSizeError && (
        <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950/20">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center flex-shrink-0">
                <Zap className="w-5 h-5 text-amber-600" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-amber-800 dark:text-amber-200">File Too Large</p>
                <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">{fileSizeError}</p>
                {userTier === 'free' && (
                  <Button
                    size="sm"
                    className="mt-3 bg-amber-600 hover:bg-amber-700 text-white"
                    onClick={() => window.location.href = '/upgrade'}
                  >
                    <Zap className="w-4 h-4 mr-1" />
                    Upgrade to Pro
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Time Estimate */}
      {file && !isProcessing && !speakerAudios && (
        <Card className={cn(
          "border-l-4",
          estimateProcessingTime(file.size).warning ? "border-l-amber-500 bg-amber-50 dark:bg-amber-950/20" : "border-l-secondary bg-secondary/5"
        )}>
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className={cn(
                "w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0",
                estimateProcessingTime(file.size).warning ? "bg-amber-100 dark:bg-amber-900/30" : "bg-secondary/10"
              )}>
                {estimateProcessingTime(file.size).warning ? (
                  <AlertCircle className="w-5 h-5 text-amber-600" />
                ) : (
                  <Clock className="w-5 h-5 text-secondary" />
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
                  File size: {formatFileSize(file.size)} • Includes transcription + audio separation
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Speaker Count */}
      {file && !isProcessing && !speakerAudios && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-secondary/10 flex items-center justify-center">
                  <Users className="w-5 h-5 text-secondary" />
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
                  <Loader2 className="w-5 h-5 animate-spin text-secondary" />
                  <span className="font-medium text-slate-900 dark:text-white">{stage}</span>
                </div>
                <span className="text-secondary font-semibold">{Math.round(progress)}%</span>
              </div>
              <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-secondary to-primary transition-all duration-300"
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
      {file && !isProcessing && !speakerAudios && (
        <Button size="lg" className="w-full bg-blue-600 hover:bg-blue-700 text-white" onClick={handleProcess}>
          Start Speaker Split
        </Button>
      )}

      {/* Speaker Audio Results */}
      {speakerAudios && (
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-slate-900 dark:text-white">Speaker Audio Files</h3>
              <Button variant="outline" size="sm" onClick={downloadAll}>
                <Download className="w-4 h-4 mr-1" />
                Download All
              </Button>
            </div>
            <div className="space-y-3">
              {speakerAudios.map((audio, index) => {
                const color = SPEAKER_COLORS[index % SPEAKER_COLORS.length]
                const isPlaying = playingIndex === index
                return (
                  <div
                    key={index}
                    className="flex items-center justify-between p-4 rounded-xl bg-slate-50 dark:bg-slate-800"
                  >
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => togglePlay(index, audio.url)}
                        className="w-10 h-10 rounded-full flex items-center justify-center transition-colors"
                        style={{ backgroundColor: color + '20' }}
                      >
                        {isPlaying ? (
                          <Pause className="w-5 h-5" style={{ color }} />
                        ) : (
                          <Play className="w-5 h-5 ml-0.5" style={{ color }} />
                        )}
                      </button>
                      <div>
                        <p className="font-semibold" style={{ color }}>Speaker {index + 1}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">WAV Audio</p>
                      </div>
                    </div>
                    <a
                      href={audio.url}
                      download={`speaker-${index + 1}.wav`}
                      className="text-secondary hover:text-secondary/80 text-sm font-medium"
                    >
                      Download
                    </a>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Process Another */}
      {speakerAudios && (
        <Button variant="outline" className="w-full" onClick={removeFile}>
          Process Another File
        </Button>
      )}
    </div>
  )
}
