"use client"

import { Phone } from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import { DarkModeToggle } from "./DarkModeToggle"

export function Header() {
  return (
    <header className="backdrop-blur-md border-b" style={{ backgroundColor: 'var(--header-bg)', borderColor: 'var(--border)' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3">
            <Image
              src="https://cdn.prod.website-files.com/6784053e7b7422e48efa5a84/6833a36f90c60fba010cee72_start_my_business_logo-removebg-preview.png"
              alt="Start My Business Inc."
              width={160}
              height={40}
              className="h-10 w-auto dark:brightness-0 dark:invert"
              unoptimized
            />
            <div className="border-l pl-3 hidden sm:block" style={{ borderColor: 'var(--border)' }}>
              <h1 className="text-lg font-bold" style={{ color: 'var(--navy)' }}>Audio Tools</h1>
            </div>
          </Link>

          {/* Right side controls */}
          <div className="flex items-center gap-4">
            {/* Dark Mode Toggle */}
            <DarkModeToggle />

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
      </div>
    </header>
  )
}
