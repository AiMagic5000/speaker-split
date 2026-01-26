"use client"

import { useState, useRef, useEffect } from "react"
import { Play, Pause, Volume2, VolumeX, Download } from "lucide-react"
import { cn } from "@/lib/utils"

interface AudioWaveformPlayerProps {
  url: string
  title?: string
  color?: string
  compact?: boolean
}

export function AudioWaveformPlayer({
  url,
  title,
  color = "#3B82F6",
  compact = false
}: AudioWaveformPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const progressRef = useRef<HTMLDivElement>(null)
  const animationRef = useRef<number | undefined>(undefined)
  const analyserRef = useRef<AnalyserNode | undefined>(undefined)
  const audioContextRef = useRef<AudioContext | undefined>(undefined)
  const sourceRef = useRef<MediaElementAudioSourceNode | undefined>(undefined)

  const [isPlaying, setIsPlaying] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [isLoaded, setIsLoaded] = useState(false)
  const [isDragging, setIsDragging] = useState(false)

  // Initialize audio context and analyser
  const initAudioContext = () => {
    if (audioContextRef.current || !audioRef.current) return

    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
    const analyser = audioContext.createAnalyser()
    analyser.fftSize = 256
    analyser.smoothingTimeConstant = 0.8

    const source = audioContext.createMediaElementSource(audioRef.current)
    source.connect(analyser)
    analyser.connect(audioContext.destination)

    audioContextRef.current = audioContext
    analyserRef.current = analyser
    sourceRef.current = source
  }

  // Draw waveform visualization
  const drawWaveform = () => {
    if (!canvasRef.current || !analyserRef.current) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const analyser = analyserRef.current
    const bufferLength = analyser.frequencyBinCount
    const dataArray = new Uint8Array(bufferLength)

    const draw = () => {
      animationRef.current = requestAnimationFrame(draw)

      analyser.getByteFrequencyData(dataArray)

      ctx.fillStyle = 'rgba(15, 23, 42, 0.1)'
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      const barWidth = (canvas.width / bufferLength) * 2.5
      let x = 0

      for (let i = 0; i < bufferLength; i++) {
        const barHeight = (dataArray[i] / 255) * canvas.height * 0.8

        // Create gradient for bars
        const gradient = ctx.createLinearGradient(0, canvas.height - barHeight, 0, canvas.height)
        gradient.addColorStop(0, color)
        gradient.addColorStop(1, `${color}40`)

        ctx.fillStyle = gradient
        ctx.fillRect(x, canvas.height - barHeight, barWidth - 1, barHeight)

        x += barWidth + 1
      }
    }

    draw()
  }

  // Draw static waveform bars when not playing
  const drawStaticWaveform = () => {
    if (!canvasRef.current) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.clearRect(0, 0, canvas.width, canvas.height)

    const barCount = 32
    const barWidth = (canvas.width / barCount) - 2

    for (let i = 0; i < barCount; i++) {
      // Create random-ish but deterministic heights
      const height = Math.sin(i * 0.5) * 0.3 + 0.4 + Math.sin(i * 0.3) * 0.2
      const barHeight = height * canvas.height * 0.6

      ctx.fillStyle = `${color}40`
      ctx.fillRect(i * (barWidth + 2), (canvas.height - barHeight) / 2, barWidth, barHeight)
    }
  }

  useEffect(() => {
    drawStaticWaveform()
  }, [color])

  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [])

  const togglePlay = async () => {
    if (!audioRef.current) return

    if (!audioContextRef.current) {
      initAudioContext()
    }

    if (audioContextRef.current?.state === 'suspended') {
      await audioContextRef.current.resume()
    }

    if (isPlaying) {
      audioRef.current.pause()
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
      drawStaticWaveform()
    } else {
      await audioRef.current.play()
      drawWaveform()
    }

    setIsPlaying(!isPlaying)
  }

  const toggleMute = () => {
    if (!audioRef.current) return
    audioRef.current.muted = !isMuted
    setIsMuted(!isMuted)
  }

  const handleTimeUpdate = () => {
    if (audioRef.current && !isDragging) {
      setCurrentTime(audioRef.current.currentTime)
    }
  }

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      const audioDuration = audioRef.current.duration
      // Only set duration if it's a valid finite number
      if (isFinite(audioDuration) && audioDuration > 0) {
        setDuration(audioDuration)
      }
      setIsLoaded(true)
    }
  }

  // Also try to get duration when data is loaded (for streaming audio)
  const handleDurationChange = () => {
    if (audioRef.current) {
      const audioDuration = audioRef.current.duration
      if (isFinite(audioDuration) && audioDuration > 0) {
        setDuration(audioDuration)
      }
    }
  }

  const handleEnded = () => {
    setIsPlaying(false)
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current)
    }
    drawStaticWaveform()
  }

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!audioRef.current) return
    const time = parseFloat(e.target.value)
    audioRef.current.currentTime = time
    setCurrentTime(time)
  }

  // Handle click on progress bar for seeking
  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!audioRef.current || !progressRef.current || !isFinite(duration) || duration <= 0) return

    const rect = progressRef.current.getBoundingClientRect()
    const clickPosition = (e.clientX - rect.left) / rect.width
    const newTime = clickPosition * duration

    audioRef.current.currentTime = newTime
    setCurrentTime(newTime)
  }

  // Handle drag on progress bar
  const handleProgressDrag = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging || !audioRef.current || !progressRef.current || !isFinite(duration) || duration <= 0) return

    const rect = progressRef.current.getBoundingClientRect()
    const dragPosition = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
    const newTime = dragPosition * duration

    setCurrentTime(newTime)
  }

  const handleDragStart = () => {
    setIsDragging(true)
  }

  const handleDragEnd = () => {
    if (isDragging && audioRef.current) {
      audioRef.current.currentTime = currentTime
    }
    setIsDragging(false)
  }

  // Add mouse event listeners for drag
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging || !progressRef.current || !isFinite(duration) || duration <= 0) return

      const rect = progressRef.current.getBoundingClientRect()
      const dragPosition = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
      const newTime = dragPosition * duration

      setCurrentTime(newTime)
    }

    const handleMouseUp = () => {
      if (isDragging && audioRef.current) {
        audioRef.current.currentTime = currentTime
      }
      setIsDragging(false)
    }

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDragging, currentTime, duration])

  const formatTime = (seconds: number): string => {
    // Handle invalid values
    if (!isFinite(seconds) || isNaN(seconds) || seconds < 0) {
      return '0:00'
    }
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  // Calculate progress percentage
  const progressPercent = isFinite(duration) && duration > 0
    ? (currentTime / duration) * 100
    : 0

  const handleDownload = () => {
    const link = document.createElement('a')
    link.href = url
    link.download = title ? `${title}.wav` : 'audio.wav'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  if (compact) {
    return (
      <div className="flex flex-col gap-2 p-3 rounded-xl bg-slate-100 dark:bg-slate-800">
        <audio
          ref={audioRef}
          src={url}
          crossOrigin="anonymous"
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          onDurationChange={handleDurationChange}
          onEnded={handleEnded}
          preload="metadata"
        />

        <div className="flex items-center gap-3">
          <button
            onClick={togglePlay}
            className="w-10 h-10 rounded-full flex items-center justify-center transition-colors flex-shrink-0"
            style={{ backgroundColor: `${color}20` }}
          >
            {isPlaying ? (
              <Pause className="w-5 h-5" style={{ color }} />
            ) : (
              <Play className="w-5 h-5 ml-0.5" style={{ color }} />
            )}
          </button>

          <div className="flex-1 min-w-0">
            {title && (
              <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{title}</p>
            )}
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span>{formatTime(currentTime)}</span>
              <span>/</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          <button
            onClick={handleDownload}
            className="p-2 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors flex-shrink-0"
            title="Download"
          >
            <Download className="w-4 h-4" />
          </button>
        </div>

        {/* Clickable seek bar */}
        <div
          ref={progressRef}
          className="relative h-2 bg-slate-300 dark:bg-slate-600 rounded-full cursor-pointer group"
          onClick={handleProgressClick}
          onMouseDown={handleDragStart}
        >
          {/* Progress fill */}
          <div
            className="absolute top-0 left-0 h-full rounded-full transition-all"
            style={{
              width: `${progressPercent}%`,
              backgroundColor: color
            }}
          />
          {/* Drag handle */}
          <div
            className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
            style={{
              left: `calc(${progressPercent}% - 6px)`,
              border: `2px solid ${color}`
            }}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="bg-slate-100 dark:bg-slate-800 rounded-2xl p-4 space-y-4">
      <audio
        ref={audioRef}
        src={url}
        crossOrigin="anonymous"
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onDurationChange={handleDurationChange}
        onEnded={handleEnded}
        preload="metadata"
      />

      {title && (
        <p className="font-semibold text-slate-900 dark:text-white">{title}</p>
      )}

      {/* Waveform Canvas */}
      <div className="relative rounded-xl overflow-hidden bg-slate-900/5 dark:bg-slate-900/50">
        <canvas
          ref={canvasRef}
          width={400}
          height={80}
          className="w-full h-20"
        />
      </div>

      {/* Controls */}
      <div className="flex items-center gap-4">
        <button
          onClick={togglePlay}
          className="w-12 h-12 rounded-full flex items-center justify-center transition-all hover:scale-105"
          style={{ backgroundColor: color }}
        >
          {isPlaying ? (
            <Pause className="w-6 h-6 text-white" />
          ) : (
            <Play className="w-6 h-6 text-white ml-0.5" />
          )}
        </button>

        <div className="flex-1 space-y-1">
          {/* Clickable seek bar */}
          <div
            ref={progressRef}
            className="relative h-2 bg-slate-300 dark:bg-slate-700 rounded-full cursor-pointer group"
            onClick={handleProgressClick}
            onMouseDown={handleDragStart}
          >
            {/* Progress fill */}
            <div
              className="absolute top-0 left-0 h-full rounded-full transition-all"
              style={{
                width: `${progressPercent}%`,
                backgroundColor: color
              }}
            />
            {/* Drag handle */}
            <div
              className="absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-white shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
              style={{
                left: `calc(${progressPercent}% - 8px)`,
                border: `2px solid ${color}`
              }}
            />
          </div>
          <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        <button
          onClick={toggleMute}
          className={cn(
            "p-2 rounded-lg transition-colors",
            isMuted ? "text-slate-400" : "text-slate-700 dark:text-slate-300"
          )}
        >
          {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
        </button>

        <button
          onClick={handleDownload}
          className="p-2 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
          title="Download"
        >
          <Download className="w-5 h-5" />
        </button>
      </div>
    </div>
  )
}
