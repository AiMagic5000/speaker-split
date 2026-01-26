"use client"

import { useEffect, useRef } from "react"

interface WaveBackgroundProps {
  lineColor?: string
  backgroundColor?: string
  waveSpeedX?: number
  waveSpeedY?: number
  waveAmpX?: number
  waveAmpY?: number
  xGap?: number
  yGap?: number
  friction?: number
  tension?: number
  maxCursorMove?: number
  className?: string
}

export function WaveBackground({
  lineColor = "rgba(59, 130, 246, 0.3)",
  backgroundColor = "transparent",
  waveSpeedX = 0.02,
  waveSpeedY = 0.01,
  waveAmpX = 40,
  waveAmpY = 20,
  xGap = 12,
  yGap = 36,
  friction = 0.9,
  tension = 0.01,
  maxCursorMove = 120,
  className = ""
}: WaveBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    let animationId: number
    let width = canvas.offsetWidth
    let height = canvas.offsetHeight
    let mouseX = width / 2
    let mouseY = height / 2
    let time = 0

    const resize = () => {
      width = canvas.offsetWidth
      height = canvas.offsetHeight
      canvas.width = width * window.devicePixelRatio
      canvas.height = height * window.devicePixelRatio
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio)
    }

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect()
      mouseX = e.clientX - rect.left
      mouseY = e.clientY - rect.top
    }

    const draw = () => {
      ctx.fillStyle = backgroundColor
      ctx.fillRect(0, 0, width, height)
      ctx.strokeStyle = lineColor
      ctx.lineWidth = 1

      const rows = Math.ceil(height / yGap) + 1
      const cols = Math.ceil(width / xGap) + 1

      for (let row = 0; row < rows; row++) {
        ctx.beginPath()

        for (let col = 0; col <= cols; col++) {
          const x = col * xGap
          const baseY = row * yGap

          // Wave animation
          const waveX = Math.sin(time * waveSpeedX + col * 0.3 + row * 0.1) * waveAmpX
          const waveY = Math.cos(time * waveSpeedY + row * 0.2) * waveAmpY

          // Mouse influence
          const dx = x - mouseX
          const dy = baseY - mouseY
          const dist = Math.sqrt(dx * dx + dy * dy)
          const maxDist = 200
          let mouseInfluence = 0
          if (dist < maxDist) {
            mouseInfluence = (1 - dist / maxDist) * maxCursorMove
          }

          const finalX = x + waveX * 0.3
          const finalY = baseY + waveY + (dy / dist || 0) * mouseInfluence * 0.3

          if (col === 0) {
            ctx.moveTo(finalX, finalY)
          } else {
            ctx.lineTo(finalX, finalY)
          }
        }

        ctx.stroke()
      }

      time += 1
      animationId = requestAnimationFrame(draw)
    }

    resize()
    window.addEventListener("resize", resize)
    canvas.addEventListener("mousemove", handleMouseMove)
    draw()

    return () => {
      window.removeEventListener("resize", resize)
      canvas.removeEventListener("mousemove", handleMouseMove)
      cancelAnimationFrame(animationId)
    }
  }, [lineColor, backgroundColor, waveSpeedX, waveSpeedY, waveAmpX, waveAmpY, xGap, yGap, friction, tension, maxCursorMove])

  return (
    <canvas
      ref={canvasRef}
      className={`absolute inset-0 w-full h-full ${className}`}
      style={{ pointerEvents: "auto" }}
    />
  )
}
