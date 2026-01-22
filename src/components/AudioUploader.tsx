"use client"

import { useCallback, useState } from "react"
import { useDropzone } from "react-dropzone"
import { Upload, FileAudio, X, Users, ArrowRight, Loader2, Clock, AlertCircle } from "lucide-react"
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
import { useAppStore, updateSpeakerCount } from "@/lib/store"
import { useRouter } from "next/navigation"

// Estimate processing time based on file size
// GPU mode: ~1-2 min per 10MB, CPU mode: ~5-10 min per 10MB
function estimateProcessingTime(fileSizeBytes: number): { min: number; max: number; warning: boolean } {
  const sizeMB = fileSizeBytes / (1024 * 1024)
  // Assume GPU mode (faster) - adjust if needed
  const minMinutes = Math.ceil(sizeMB / 10) * 1  // ~1 min per 10MB
  const maxMinutes = Math.ceil(sizeMB / 10) * 3  // ~3 min per 10MB (conservative)
  return {
    min: Math.max(1, minMinutes),
    max: Math.max(2, maxMinutes),
    warning: sizeMB > 100 // Warn for files > 100MB
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

export function AudioUploader() {
  const router = useRouter()
  const { createJob, updateJob, currentJob } = useAppStore()
  const [file, setFile] = useState<File | null>(null)
  const [speakerCount, setSpeakerCount] = useState("2")
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      setFile(acceptedFiles[0])
    }
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPTED_FORMATS,
    maxFiles: 1,
    maxSize: 500 * 1024 * 1024, // 500MB
  })

  const handleSpeakerCountChange = (value: string) => {
    setSpeakerCount(value)
    if (currentJob) {
      updateSpeakerCount(parseInt(value))
    }
  }

  const handleStartProcessing = async () => {
    if (!file) return

    setIsUploading(true)
    setUploadProgress(0)

    try {
      // Create a new job
      const jobId = createJob()

      // Update job with file info
      updateJob(jobId, {
        audioFile: {
          name: file.name,
          size: file.size,
          type: file.type,
        },
        speakerCount: parseInt(speakerCount),
        status: 'uploading',
        stage: 'Uploading audio file...',
      })

      // Update speaker count for the job
      updateSpeakerCount(parseInt(speakerCount))

      // Create form data for upload
      const formData = new FormData()
      formData.append('file', file)
      formData.append('jobId', jobId)
      formData.append('speakerCount', speakerCount)

      // Upload file with progress
      const xhr = new XMLHttpRequest()

      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
          const progress = Math.round((event.loaded / event.total) * 100)
          setUploadProgress(progress)
          updateJob(jobId, { progress: progress * 0.3 }) // Upload is 30% of total
        }
      })

      xhr.addEventListener('load', () => {
        if (xhr.status === 200) {
          const response = JSON.parse(xhr.responseText)
          updateJob(jobId, {
            status: 'processing',
            stage: 'Processing started...',
            progress: 30,
          })
          // Redirect to job page
          router.push(`/job/${jobId}`)
        } else {
          throw new Error('Upload failed')
        }
      })

      xhr.addEventListener('error', () => {
        updateJob(jobId, {
          status: 'error',
          error: 'Upload failed. Please try again.',
        })
        setIsUploading(false)
      })

      xhr.open('POST', '/api/upload')
      xhr.send(formData)

    } catch (error) {
      console.error('Upload error:', error)
      setIsUploading(false)
    }
  }

  const removeFile = () => {
    setFile(null)
    setUploadProgress(0)
  }

  return (
    <div className="space-y-6">
      {/* Dropzone */}
      <Card className={cn(
        "border-2 border-dashed transition-all duration-300 cursor-pointer",
        isDragActive ? "border-primary bg-primary/5 dropzone-active" : "border-gray-300 hover:border-primary/50",
        file && "border-secondary bg-secondary/5"
      )}>
        <CardContent className="p-0">
          <div
            {...getRootProps()}
            className="p-8 sm:p-12 text-center"
          >
            <input {...getInputProps()} />

            {file ? (
              <div className="space-y-4">
                <div className="w-16 h-16 mx-auto rounded-2xl bg-secondary/10 flex items-center justify-center">
                  <FileAudio className="w-8 h-8 text-secondary" />
                </div>
                <div>
                  <p className="font-semibold text-navy">{file.name}</p>
                  <p className="text-sm text-gray-500">{formatFileSize(file.size)}</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation()
                    removeFile()
                  }}
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
                  <p className="text-lg font-semibold text-navy">
                    {isDragActive ? "Drop your audio file here" : "Drag & drop your audio file"}
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    or click to browse
                  </p>
                </div>
                <div className="flex flex-wrap justify-center gap-2 text-xs text-gray-400">
                  <span className="px-2 py-1 rounded bg-gray-100">MP3</span>
                  <span className="px-2 py-1 rounded bg-gray-100">WAV</span>
                  <span className="px-2 py-1 rounded bg-gray-100">M4A</span>
                  <span className="px-2 py-1 rounded bg-gray-100">FLAC</span>
                  <span className="px-2 py-1 rounded bg-gray-100">MP4</span>
                  <span className="px-2 py-1 rounded bg-gray-100">OGG</span>
                </div>
                <p className="text-xs text-gray-400">Maximum file size: 500MB</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Processing Time Estimate */}
      {file && (
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
              <div className="flex-1">
                <p className={cn(
                  "font-semibold",
                  estimateProcessingTime(file.size).warning ? "text-amber-700 dark:text-amber-400" : "text-navy dark:text-white"
                )}>
                  Estimated Processing Time: {formatTimeEstimate(
                    estimateProcessingTime(file.size).min,
                    estimateProcessingTime(file.size).max
                  )}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  {estimateProcessingTime(file.size).warning ? (
                    <>Large files take longer to process. Consider splitting into smaller segments for faster results.</>
                  ) : (
                    <>Processing includes transcription, alignment, and speaker identification.</>
                  )}
                </p>
                <div className="mt-2 text-xs text-gray-500 dark:text-gray-500">
                  File size: {formatFileSize(file.size)} • GPU accelerated
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Speaker Count Selection */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex items-center gap-3 flex-1">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <Users className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="font-semibold text-navy dark:text-white">Number of Speakers</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">How many people are in the conversation?</p>
              </div>
            </div>
            <Select value={speakerCount} onValueChange={handleSpeakerCountChange}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Select speakers" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="2">2 Speakers</SelectItem>
                <SelectItem value="3">3 Speakers</SelectItem>
                <SelectItem value="4">4 Speakers</SelectItem>
                <SelectItem value="5">5 Speakers</SelectItem>
                <SelectItem value="6">6 Speakers</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Upload Progress */}
      {isUploading && (
        <Card>
          <CardContent className="p-6">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-gray-700">Uploading...</p>
                <p className="text-sm text-primary font-semibold">{uploadProgress}%</p>
              </div>
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-primary to-secondary transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Start Button */}
      <Button
        size="xl"
        className="w-full"
        disabled={!file || isUploading}
        onClick={handleStartProcessing}
      >
        {isUploading ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            Uploading...
          </>
        ) : (
          <>
            Start Processing
            <ArrowRight className="w-5 h-5" />
          </>
        )}
      </Button>
    </div>
  )
}
