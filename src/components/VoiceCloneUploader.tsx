"use client"

import { useCallback, useState } from "react"
import { useDropzone, FileRejection } from "react-dropzone"
import { useUser } from "@clerk/nextjs"
import { Upload, FileAudio, X, Loader2, Clock, AlertCircle, Download, Sparkles, AlertTriangle, Volume2, Type, Gauge } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { cn, formatFileSize } from "@/lib/utils"
import { saveUserFile } from "@/lib/user-files"

const ACCEPTED_FORMATS = {
  'audio/mpeg': ['.mp3'],
  'audio/wav': ['.wav'],
  'audio/mp4': ['.m4a'],
  'audio/x-m4a': ['.m4a'],
  'audio/flac': ['.flac'],
  'audio/ogg': ['.ogg'],
  'audio/webm': ['.webm'],
}

const MAX_REF_SIZE = 10 * 1024 * 1024 // 10MB
const MAX_WORDS = 750

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(w => w.length > 0).length
}

function estimateAudioDuration(wordCount: number, speed: number): string {
  // ~150 words per minute at 1.0x speed
  const minutes = wordCount / (150 * speed)
  if (minutes < 1) return `~${Math.ceil(minutes * 60)} seconds`
  return `~${minutes.toFixed(1)} minutes`
}

export function VoiceCloneUploader() {
  const { user } = useUser()

  const [referenceFile, setReferenceFile] = useState<File | null>(null)
  const [textToGenerate, setTextToGenerate] = useState("")
  const [speed, setSpeed] = useState(1.0)
  const [isProcessing, setIsProcessing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [stage, setStage] = useState("")
  const [resultAudioUrl, setResultAudioUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const wordCount = countWords(textToGenerate)
  const isOverLimit = wordCount > MAX_WORDS

  const onDrop = useCallback((acceptedFiles: File[], rejectedFiles: FileRejection[]) => {
    if (rejectedFiles.length > 0) {
      const rejection = rejectedFiles[0]
      if (rejection.errors.some(e => e.code === 'file-too-large')) {
        setError('Reference audio must be under 10MB')
        return
      }
    }

    if (acceptedFiles.length > 0) {
      setReferenceFile(acceptedFiles[0])
      setResultAudioUrl(null)
      setError(null)
    }
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPTED_FORMATS,
    maxFiles: 1,
    maxSize: MAX_REF_SIZE,
  })

  const handleGenerate = async () => {
    if (!referenceFile || !textToGenerate.trim() || isOverLimit) return

    setIsProcessing(true)
    setProgress(0)
    setStage("Uploading...")
    setError(null)
    setResultAudioUrl(null)

    try {
      const formData = new FormData()
      formData.append('referenceAudio', referenceFile)
      formData.append('textToGenerate', textToGenerate.trim())
      formData.append('speed', String(speed))
      formData.append('quality', '32')

      const response = await fetch('/api/clone-voice', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Voice cloning failed')
      }

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      if (reader) {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n')
          buffer = lines.pop() || ''

          for (const line of lines) {
            if (!line.trim()) continue
            try {
              const data = JSON.parse(line)
              if (data.progress) setProgress(data.progress)
              if (data.stage) setStage(data.stage)
              if (data.audioUrl) {
                setResultAudioUrl(data.audioUrl)
                // Save to user history
                if (user?.id) {
                  saveUserFile(user.id, {
                    type: 'voice-clone',
                    name: `Clone - ${referenceFile.name.replace(/\.[^/.]+$/, '')}`,
                    clonedAudioUrl: data.audioUrl,
                    generatedText: textToGenerate.trim(),
                    originalFileName: referenceFile.name,
                    originalFileSize: referenceFile.size,
                  })
                }
              }
              if (data.error) throw new Error(data.error)
            } catch (e) {
              if (e instanceof Error && e.message !== 'Voice cloning failed') {
                // Only throw if it's our error, not a JSON parse error
                if (!(e instanceof SyntaxError)) throw e
              }
            }
          }
        }

        // Process remaining buffer
        if (buffer.trim()) {
          try {
            const data = JSON.parse(buffer)
            if (data.progress) setProgress(data.progress)
            if (data.stage) setStage(data.stage)
            if (data.audioUrl) {
              setResultAudioUrl(data.audioUrl)
              if (user?.id) {
                saveUserFile(user.id, {
                  type: 'voice-clone',
                  name: `Clone - ${referenceFile.name.replace(/\.[^/.]+$/, '')}`,
                  clonedAudioUrl: data.audioUrl,
                  generatedText: textToGenerate.trim(),
                  originalFileName: referenceFile.name,
                  originalFileSize: referenceFile.size,
                })
              }
            }
            if (data.error) throw new Error(data.error)
          } catch {
            // Ignore final buffer parse errors
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
    setReferenceFile(null)
    setResultAudioUrl(null)
    setError(null)
  }

  const resetAll = () => {
    setReferenceFile(null)
    setTextToGenerate("")
    setSpeed(1.0)
    setResultAudioUrl(null)
    setError(null)
    setProgress(0)
    setStage("")
  }

  const downloadAudio = () => {
    if (!resultAudioUrl) return
    const a = document.createElement('a')
    a.href = resultAudioUrl
    a.download = `${referenceFile?.name.replace(/\.[^/.]+$/, '') || 'voice'}-cloned.mp3`
    a.click()
  }

  return (
    <div className="space-y-6">
      {/* Reference Audio Dropzone */}
      <Card className={cn(
        "border-2 border-dashed transition-all duration-300 cursor-pointer",
        isDragActive ? "border-violet-500 bg-violet-500/5" : "border-slate-300 dark:border-slate-600 hover:border-violet-500/50",
        referenceFile && "border-violet-500 bg-violet-500/5"
      )}>
        <CardContent className="p-0">
          <div {...getRootProps()} className="p-8 text-center">
            <input {...getInputProps()} />
            {referenceFile ? (
              <div className="space-y-4">
                <div className="w-16 h-16 mx-auto rounded-2xl bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center">
                  <FileAudio className="w-8 h-8 text-violet-600 dark:text-violet-400" />
                </div>
                <div>
                  <p className="font-semibold text-slate-900 dark:text-white">{referenceFile.name}</p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">{formatFileSize(referenceFile.size)}</p>
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
                <div className="w-16 h-16 mx-auto rounded-2xl bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center">
                  <Upload className="w-8 h-8 text-violet-600 dark:text-violet-400" />
                </div>
                <div>
                  <p className="text-lg font-semibold text-slate-900 dark:text-white">
                    {isDragActive ? "Drop your reference audio here" : "Upload Reference Voice (10-60 seconds)"}
                  </p>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                    Clear speech from a single speaker, minimum 10 seconds, no background noise
                  </p>
                </div>
                <div className="flex flex-wrap justify-center gap-2 text-xs text-slate-400 dark:text-slate-500">
                  <span className="px-2 py-1 rounded bg-slate-100 dark:bg-slate-800">MP3</span>
                  <span className="px-2 py-1 rounded bg-slate-100 dark:bg-slate-800">WAV</span>
                  <span className="px-2 py-1 rounded bg-slate-100 dark:bg-slate-800">M4A</span>
                  <span className="px-2 py-1 rounded bg-slate-100 dark:bg-slate-800">FLAC</span>
                </div>
                <p className="text-xs text-slate-400 dark:text-slate-500">Max 10MB</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Text Input */}
      {referenceFile && !isProcessing && !resultAudioUrl && (
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-3">
              <label className="flex items-center gap-2 text-sm font-medium text-slate-900 dark:text-white">
                <Type className="w-4 h-4 text-violet-600 dark:text-violet-400" />
                Text to Generate
              </label>
              <span className={cn(
                "text-xs font-medium",
                isOverLimit ? "text-red-500" : wordCount > MAX_WORDS * 0.9 ? "text-amber-500" : "text-slate-400 dark:text-slate-500"
              )}>
                {wordCount} / {MAX_WORDS} words
              </span>
            </div>
            <textarea
              className="w-full min-h-[160px] p-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none resize-none text-sm text-slate-700 dark:text-slate-300 placeholder-slate-400 dark:placeholder-slate-500 focus:ring-2 focus:ring-violet-500 focus:border-transparent"
              placeholder="Enter the text you want spoken in the cloned voice...

For best results, use complete sentences with natural punctuation. The AI will generate speech that matches the tone and style of your reference audio."
              value={textToGenerate}
              onChange={(e) => setTextToGenerate(e.target.value)}
            />
            {isOverLimit && (
              <p className="text-xs text-red-500 mt-2">
                Text exceeds the {MAX_WORDS} word limit. Please shorten your text.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Speed Selector */}
      {referenceFile && !isProcessing && !resultAudioUrl && textToGenerate.trim() && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center">
                  <Gauge className="w-5 h-5 text-violet-600 dark:text-violet-400" />
                </div>
                <div>
                  <p className="font-semibold text-slate-900 dark:text-white">Speech Speed</p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Adjust the pace of generated speech</p>
                </div>
              </div>
              <div className="flex gap-1">
                {[0.8, 0.9, 1.0, 1.1, 1.2].map(s => (
                  <button
                    key={s}
                    onClick={() => setSpeed(s)}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
                      speed === s
                        ? "bg-violet-600 text-white"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-violet-100 dark:hover:bg-violet-900/20"
                    )}
                  >
                    {s}x
                  </button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Time Estimate */}
      {referenceFile && !isProcessing && !resultAudioUrl && wordCount > 0 && !isOverLimit && (
        <Card className="border-l-4 border-l-violet-500 bg-violet-50/50 dark:bg-violet-950/20">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center flex-shrink-0">
                <Clock className="w-5 h-5 text-violet-600 dark:text-violet-400" />
              </div>
              <div>
                <p className="font-semibold text-slate-900 dark:text-white">
                  Estimated Output: {estimateAudioDuration(wordCount, speed)}
                </p>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                  {wordCount} words at {speed}x speed
                </p>
              </div>
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
                  <Loader2 className="w-5 h-5 animate-spin text-violet-600" />
                  <span className="font-medium text-slate-900 dark:text-white">{stage}</span>
                </div>
                <span className="text-violet-600 font-semibold">{Math.round(progress)}%</span>
              </div>
              <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-violet-500 to-purple-500 transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Navigation Warning */}
      {isProcessing && (
        <Card className="border-amber-300 bg-amber-50 dark:bg-amber-950/30 border-2">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-amber-800 dark:text-amber-200">Do not navigate away from this page</p>
                <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                  Your voice is being cloned. Leaving this page will cancel the process and your progress will be lost.
                </p>
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

      {/* Generate Button */}
      {referenceFile && !isProcessing && !resultAudioUrl && textToGenerate.trim() && !isOverLimit && (
        <Button
          size="lg"
          className="w-full bg-violet-600 hover:bg-violet-700 text-white"
          onClick={handleGenerate}
        >
          <Volume2 className="w-5 h-5 mr-2" />
          Generate Cloned Voice
        </Button>
      )}

      {/* Result */}
      {resultAudioUrl && (
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Volume2 className="w-5 h-5 text-violet-600 dark:text-violet-400" />
                Cloned Voice Output
              </h3>
              <Button variant="outline" size="sm" onClick={downloadAudio}>
                <Download className="w-4 h-4 mr-1" />
                Download MP3
              </Button>
            </div>

            <audio
              controls
              src={resultAudioUrl}
              className="w-full"
            />

            <div className="mt-4 p-4 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800">
              <p className="text-green-700 dark:text-green-400 text-sm">
                <strong>Voice clone complete!</strong> Download the MP3 file to use it in your projects.
                High-definition audio at 32kHz sample rate.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Generate Another */}
      {resultAudioUrl && (
        <Button variant="outline" className="w-full" onClick={resetAll}>
          Generate Another Clone
        </Button>
      )}
    </div>
  )
}
