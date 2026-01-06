"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Header } from "@/components/Header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useAppStore, ProcessingJob, Speaker } from "@/lib/store"
import {
  Loader2,
  CheckCircle,
  AlertCircle,
  Download,
  FileText,
  FileAudio,
  FileJson,
  FileCode,
  Play,
  Pause,
  RefreshCw,
  ArrowRight,
  User,
  Building2,
  Globe,
  Calendar,
  Mic2
} from "lucide-react"
import { cn, formatDuration } from "@/lib/utils"

const PROCESSING_STAGES = [
  { key: 'uploading', label: 'Uploading', icon: '📤' },
  { key: 'processing', label: 'Processing', icon: '⚙️' },
  { key: 'transcribing', label: 'Transcribing', icon: '🎤' },
  { key: 'diarizing', label: 'Identifying Speakers', icon: '👥' },
  { key: 'splitting', label: 'Splitting Audio', icon: '✂️' },
  { key: 'complete', label: 'Complete', icon: '✅' },
]

export default function JobPage() {
  const params = useParams()
  const router = useRouter()
  const { getJob, updateJob, currentJob, setCurrentJob } = useAppStore()
  const [job, setJob] = useState<ProcessingJob | null>(null)
  const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(null)
  const [isGeneratingHtml, setIsGeneratingHtml] = useState(false)

  const jobId = params.id as string

  // Load job data
  useEffect(() => {
    const loadedJob = getJob(jobId)
    if (loadedJob) {
      setJob(loadedJob)
      setCurrentJob(loadedJob)
    }
  }, [jobId, getJob, setCurrentJob])

  // Poll for job status updates
  useEffect(() => {
    if (!job || job.status === 'complete' || job.status === 'error') {
      if (pollingInterval) {
        clearInterval(pollingInterval)
        setPollingInterval(null)
      }
      return
    }

    const poll = async () => {
      try {
        const response = await fetch(`/api/jobs/${jobId}`)
        if (response.ok) {
          const data = await response.json()
          updateJob(jobId, data)
          setJob({ ...job, ...data })
        }
      } catch (error) {
        console.error('Polling error:', error)
      }
    }

    const interval = setInterval(poll, 2000)
    setPollingInterval(interval)

    return () => {
      if (interval) clearInterval(interval)
    }
  }, [job?.status, jobId])

  // Update speaker name
  const updateSpeakerName = (speakerId: string, name: string) => {
    if (!job) return
    const updatedSpeakers = job.speakers.map(s =>
      s.id === speakerId ? { ...s, name } : s
    )
    updateJob(jobId, { speakers: updatedSpeakers })
    setJob({ ...job, speakers: updatedSpeakers })
  }

  // Update client info
  const updateClientInfo = (field: keyof ProcessingJob['clientInfo'], value: string) => {
    if (!job) return
    const updatedClientInfo = { ...job.clientInfo, [field]: value }
    updateJob(jobId, { clientInfo: updatedClientInfo })
    setJob({ ...job, clientInfo: updatedClientInfo })
  }

  // Generate HTML reference document
  const generateHtmlDocument = async () => {
    if (!job) return
    setIsGeneratingHtml(true)

    try {
      const response = await fetch('/api/generate-html', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobId,
          transcript: job.transcript,
          speakers: job.speakers,
          clientInfo: job.clientInfo,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        updateJob(jobId, {
          outputs: { ...job.outputs, html: data.htmlUrl }
        })
        setJob({ ...job, outputs: { ...job.outputs, html: data.htmlUrl } })
      }
    } catch (error) {
      console.error('HTML generation error:', error)
    } finally {
      setIsGeneratingHtml(false)
    }
  }

  if (!job) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="flex items-center justify-center h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </div>
    )
  }

  const isProcessing = !['complete', 'error'].includes(job.status)
  const currentStageIndex = PROCESSING_STAGES.findIndex(s => s.key === job.status)

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Processing Status */}
        <Card className="mb-8">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-3">
                {isProcessing ? (
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                ) : job.status === 'complete' ? (
                  <CheckCircle className="w-6 h-6 text-green-500" />
                ) : (
                  <AlertCircle className="w-6 h-6 text-red-500" />
                )}
                {isProcessing ? 'Processing Your Audio' : job.status === 'complete' ? 'Processing Complete' : 'Processing Failed'}
              </CardTitle>
              {job.audioFile && (
                <span className="text-sm text-gray-500">{job.audioFile.name}</span>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {/* Progress Bar */}
            <div className="mb-6">
              <div className="flex justify-between text-sm mb-2">
                <span className="font-medium text-gray-700">{job.stage}</span>
                <span className="text-primary font-semibold">{Math.round(job.progress)}%</span>
              </div>
              <Progress value={job.progress} />
            </div>

            {/* Processing Stages */}
            <div className="flex items-center justify-between">
              {PROCESSING_STAGES.map((stage, index) => (
                <div key={stage.key} className="flex flex-col items-center">
                  <div className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center text-lg transition-all",
                    index < currentStageIndex ? "bg-green-100" :
                    index === currentStageIndex ? "bg-primary/20 ring-2 ring-primary" :
                    "bg-gray-100"
                  )}>
                    {index < currentStageIndex ? '✓' : stage.icon}
                  </div>
                  <span className={cn(
                    "text-xs mt-2 hidden sm:block",
                    index <= currentStageIndex ? "text-gray-700 font-medium" : "text-gray-400"
                  )}>
                    {stage.label}
                  </span>
                </div>
              ))}
            </div>

            {job.error && (
              <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
                {job.error}
              </div>
            )}
          </CardContent>
        </Card>

        {job.status === 'complete' && (
          <div className="grid lg:grid-cols-2 gap-8">
            {/* Left Column - Transcript & Downloads */}
            <div className="space-y-6">
              {/* Transcript Preview */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-primary" />
                    Transcript
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="max-h-80 overflow-y-auto space-y-3 pr-2">
                    {job.transcript.length > 0 ? (
                      job.transcript.map((segment, index) => {
                        const speaker = job.speakers.find(s => s.id === segment.speaker)
                        return (
                          <div key={index} className="flex gap-3">
                            <div
                              className="w-2 rounded-full flex-shrink-0"
                              style={{ backgroundColor: speaker?.color || '#ccc' }}
                            />
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-sm font-semibold" style={{ color: speaker?.color }}>
                                  {speaker?.name || speaker?.label || segment.speaker}
                                </span>
                                <span className="text-xs text-gray-400">
                                  {formatDuration(segment.start)}
                                </span>
                              </div>
                              <p className="text-sm text-gray-700">{segment.text}</p>
                            </div>
                          </div>
                        )
                      })
                    ) : (
                      <p className="text-gray-500 text-center py-8">
                        Transcript will appear here after processing
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Downloads */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Download className="w-5 h-5 text-primary" />
                    Downloads
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {/* Export Files */}
                    <div className="grid grid-cols-3 gap-3">
                      {job.outputs.txt && (
                        <DownloadButton
                          href={job.outputs.txt}
                          icon={<FileText className="w-4 h-4" />}
                          label="TXT"
                        />
                      )}
                      {job.outputs.srt && (
                        <DownloadButton
                          href={job.outputs.srt}
                          icon={<FileCode className="w-4 h-4" />}
                          label="SRT"
                        />
                      )}
                      {job.outputs.json && (
                        <DownloadButton
                          href={job.outputs.json}
                          icon={<FileJson className="w-4 h-4" />}
                          label="JSON"
                        />
                      )}
                    </div>

                    {/* Speaker Audio Files */}
                    {job.outputs.speakerAudios.length > 0 && (
                      <>
                        <div className="border-t pt-3 mt-3">
                          <p className="text-sm font-semibold text-gray-700 mb-2">Speaker Audio Files</p>
                        </div>
                        <div className="space-y-2">
                          {job.outputs.speakerAudios.map((audio, index) => {
                            const speaker = job.speakers.find(s => s.id === audio.speaker)
                            return (
                              <div
                                key={index}
                                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                              >
                                <div className="flex items-center gap-3">
                                  <div
                                    className="w-8 h-8 rounded-lg flex items-center justify-center"
                                    style={{ backgroundColor: speaker?.color + '20' }}
                                  >
                                    <FileAudio className="w-4 h-4" style={{ color: speaker?.color }} />
                                  </div>
                                  <span className="font-medium text-sm">
                                    {speaker?.name || speaker?.label || audio.speaker}
                                  </span>
                                </div>
                                <a
                                  href={audio.url}
                                  download
                                  className="text-primary hover:text-primary-dark text-sm font-medium"
                                >
                                  Download WAV
                                </a>
                              </div>
                            )
                          })}
                        </div>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Right Column - Client Info Form */}
            <div className="space-y-6">
              {/* Speaker Names */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Mic2 className="w-5 h-5 text-primary" />
                    Speaker Names
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {job.speakers.map((speaker, index) => (
                    <div key={speaker.id} className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold"
                        style={{ backgroundColor: speaker.color }}
                      >
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <Label className="text-xs text-gray-500">{speaker.label}</Label>
                        <Input
                          placeholder={`Enter ${speaker.label}'s name`}
                          value={speaker.name}
                          onChange={(e) => updateSpeakerName(speaker.id, e.target.value)}
                        />
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Client Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-primary" />
                    Client Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label className="flex items-center gap-2">
                      <User className="w-4 h-4 text-gray-400" />
                      Client Name
                    </Label>
                    <Input
                      placeholder="e.g., John Smith"
                      value={job.clientInfo.clientName}
                      onChange={(e) => updateClientInfo('clientName', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label className="flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-gray-400" />
                      Business Name
                    </Label>
                    <Input
                      placeholder="e.g., Smith Enterprises LLC"
                      value={job.clientInfo.businessName}
                      onChange={(e) => updateClientInfo('businessName', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label className="flex items-center gap-2">
                      <Globe className="w-4 h-4 text-gray-400" />
                      Website
                    </Label>
                    <Input
                      placeholder="e.g., https://smithenterprises.com"
                      value={job.clientInfo.website}
                      onChange={(e) => updateClientInfo('website', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      Session Date
                    </Label>
                    <Input
                      placeholder="e.g., January 2026"
                      value={job.clientInfo.sessionDate}
                      onChange={(e) => updateClientInfo('sessionDate', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Primary Speaker (Consultant)</Label>
                    <Select
                      value={job.clientInfo.primarySpeaker}
                      onValueChange={(value) => updateClientInfo('primarySpeaker', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select primary speaker" />
                      </SelectTrigger>
                      <SelectContent>
                        {job.speakers.map((speaker) => (
                          <SelectItem key={speaker.id} value={speaker.id}>
                            {speaker.name || speaker.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>

              {/* Generate HTML Button */}
              <Button
                size="xl"
                className="w-full"
                onClick={generateHtmlDocument}
                disabled={isGeneratingHtml || !job.clientInfo.clientName || !job.clientInfo.businessName}
              >
                {isGeneratingHtml ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Generating Document...
                  </>
                ) : job.outputs.html ? (
                  <>
                    <RefreshCw className="w-5 h-5" />
                    Regenerate Reference Document
                  </>
                ) : (
                  <>
                    Generate Reference Document
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </Button>

              {job.outputs.html && (
                <div className="flex gap-3">
                  <Button variant="outline" className="flex-1" asChild>
                    <a href={job.outputs.html} target="_blank" rel="noopener">
                      View HTML Document
                    </a>
                  </Button>
                  <Button variant="secondary" className="flex-1" asChild>
                    <a href={job.outputs.html} download>
                      <Download className="w-4 h-4" />
                      Download HTML
                    </a>
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function DownloadButton({
  href,
  icon,
  label
}: {
  href: string
  icon: React.ReactNode
  label: string
}) {
  return (
    <a
      href={href}
      download
      className="flex items-center justify-center gap-2 p-3 bg-gray-50 hover:bg-primary/10 rounded-lg text-sm font-medium text-gray-700 hover:text-primary transition-all"
    >
      {icon}
      {label}
    </a>
  )
}
