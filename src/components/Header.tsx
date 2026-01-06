"use client"

import { Phone } from "lucide-react"
import Link from "next/link"
import Image from "next/image"

export function Header() {
  return (
    <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3">
            <Image
              src="https://cdn.prod.website-files.com/6784053e7b7422e48efa5a84/6833a36f90c60fba010cee72_start_my_business_logo-removebg-preview.png"
              alt="Start My Business Inc."
              width={160}
              height={40}
              className="h-10 w-auto"
              unoptimized
            />
            <div className="border-l border-gray-300 pl-3">
              <h1 className="text-lg font-bold text-navy">Speaker Split</h1>
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
