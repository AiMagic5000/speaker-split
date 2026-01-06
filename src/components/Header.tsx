"use client"

import { AudioWaveform, Phone } from "lucide-react"
import Link from "next/link"

export function Header() {
  return (
    <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
              <AudioWaveform className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-navy">Speaker Split</h1>
              <p className="text-xs text-gray-500">by Start My Business Inc.</p>
            </div>
          </Link>

          {/* Contact */}
          <a
            href="tel:+18885344145"
            className="flex items-center gap-2 text-primary hover:text-primary-dark font-semibold"
          >
            <Phone className="w-4 h-4" />
            <span className="hidden sm:inline">(888) 534-4145</span>
          </a>
        </div>
      </div>
    </header>
  )
}
