"use client"

import { useState } from "react"
import { Menu, X, LayoutDashboard, ShieldCheck, Sparkles, Mic2, Split, FileText } from "lucide-react"
import Link from "next/link"
import { DarkModeToggle } from "./DarkModeToggle"
import { UserButton, SignedIn, SignedOut, useUser } from "@clerk/nextjs"
import { useCredits } from "@/hooks/useCredits"

const ADMIN_EMAIL = 'coreypearsonemail@gmail.com'
const GUMROAD_UPGRADE_URL = 'https://coreypearson.gumroad.com/l/eygnd'

// Credits info component for displaying remaining credits
function CreditsDisplay({
  credits,
  loading
}: {
  credits: { transcription: number; speakerSplit: number; documents: number } | null
  loading: boolean
}) {
  if (loading) {
    return (
      <div className="space-y-2">
        <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Credits Remaining</p>
        <div className="animate-pulse flex gap-2">
          <div className="h-16 w-20 bg-slate-200 dark:bg-slate-700 rounded-lg" />
          <div className="h-16 w-20 bg-slate-200 dark:bg-slate-700 rounded-lg" />
          <div className="h-16 w-20 bg-slate-200 dark:bg-slate-700 rounded-lg" />
        </div>
      </div>
    )
  }

  const displayCredits = credits || { transcription: 10, speakerSplit: 10, documents: 10 }

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Credits Remaining</p>
      <div className="grid grid-cols-3 gap-2">
        <div className="flex flex-col items-center p-2 rounded-lg bg-blue-50 dark:bg-blue-900/30">
          <Mic2 className="w-4 h-4 text-blue-600 dark:text-blue-400 mb-1" />
          <span className="text-lg font-bold text-blue-600 dark:text-blue-400">{displayCredits.transcription}</span>
          <span className="text-xs text-slate-500 dark:text-slate-400">Transcribe</span>
        </div>
        <div className="flex flex-col items-center p-2 rounded-lg bg-teal-50 dark:bg-teal-900/30">
          <Split className="w-4 h-4 text-teal-600 dark:text-teal-400 mb-1" />
          <span className="text-lg font-bold text-teal-600 dark:text-teal-400">{displayCredits.speakerSplit}</span>
          <span className="text-xs text-slate-500 dark:text-slate-400">Split</span>
        </div>
        <div className="flex flex-col items-center p-2 rounded-lg bg-amber-50 dark:bg-amber-900/30">
          <FileText className="w-4 h-4 text-amber-600 dark:text-amber-400 mb-1" />
          <span className="text-lg font-bold text-amber-600 dark:text-amber-400">{displayCredits.documents}</span>
          <span className="text-xs text-slate-500 dark:text-slate-400">Docs</span>
        </div>
      </div>
    </div>
  )
}

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const { user } = useUser()
  const { credits, isPro, loading } = useCredits()
  const isAdmin = user?.primaryEmailAddress?.emailAddress === ADMIN_EMAIL

  return (
    <header className="sticky top-0 z-50 backdrop-blur-md border-b bg-white/80 dark:bg-slate-900/80 border-slate-200 dark:border-slate-700">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14 sm:h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
            <img
              src="https://cdn.prod.website-files.com/6784053e7b7422e48efa5a84/6833a36f90c60fba010cee72_start_my_business_logo-removebg-preview.png"
              alt="Start My Business Inc."
              className="h-7 sm:h-8 md:h-10 w-auto"
            />
            <div className="border-l pl-2 sm:pl-3 border-slate-300 dark:border-slate-600">
              <h1 className="text-sm sm:text-base md:text-lg font-bold text-slate-900 dark:text-white">Speaker Split</h1>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-3 lg:gap-4">
            <SignedIn>
              <Link
                href="/dashboard"
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-medium text-sm transition-colors"
              >
                <LayoutDashboard className="w-4 h-4" />
                <span>Dashboard</span>
              </Link>
              {isAdmin && (
                <Link
                  href="/admin"
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 font-medium text-sm transition-colors"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>Admin</span>
                </Link>
              )}
              {!isPro && (
                <a
                  href={GUMROAD_UPGRADE_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 text-white font-semibold text-sm transition-all hover:from-amber-600 hover:to-orange-600 shadow-sm hover:shadow-md"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Upgrade</span>
                </a>
              )}
              {isPro && (
                <span className="flex items-center gap-1 px-2 py-1 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-bold">
                  <Sparkles className="w-3 h-3" />
                  PRO
                </span>
              )}
            </SignedIn>

            <DarkModeToggle />

            <SignedIn>
              <UserButton
                afterSignOutUrl="/"
                appearance={{
                  elements: {
                    avatarBox: "w-8 h-8 lg:w-9 lg:h-9",
                  },
                }}
              />
            </SignedIn>
            <SignedOut>
              <Link
                href="/sign-in"
                className="px-3 lg:px-4 py-2 border border-amber-500 text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-500/10 font-semibold rounded-lg transition-colors text-sm"
              >
                Sign In
              </Link>
              <Link
                href="/sign-up"
                className="px-3 lg:px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white font-semibold rounded-lg transition-colors text-sm"
              >
                Sign Up
              </Link>
            </SignedOut>
          </div>

          {/* Mobile Navigation */}
          <div className="md:hidden flex items-center gap-1 sm:gap-2">
            <DarkModeToggle />

            <SignedIn>
              <Link
                href="/dashboard"
                className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                aria-label="Dashboard"
              >
                <LayoutDashboard className="w-5 h-5 text-slate-700 dark:text-slate-300" />
              </Link>
              {isAdmin && (
                <Link
                  href="/admin"
                  className="p-2 rounded-lg hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors"
                  aria-label="Admin"
                >
                  <ShieldCheck className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                </Link>
              )}
              <UserButton
                afterSignOutUrl="/"
                appearance={{
                  elements: {
                    avatarBox: "w-8 h-8",
                  },
                }}
              />
            </SignedIn>
            <SignedOut>
              <Link
                href="/sign-in"
                className="px-2.5 py-1.5 text-amber-600 dark:text-amber-400 font-semibold text-sm"
              >
                Sign In
              </Link>
            </SignedOut>

            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? (
                <X className="w-5 h-5 text-slate-700 dark:text-slate-300" />
              ) : (
                <Menu className="w-5 h-5 text-slate-700 dark:text-slate-300" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Menu Dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden py-3 sm:py-4 border-t border-slate-200 dark:border-slate-700">
            <div className="flex flex-col gap-2 sm:gap-3">
              <SignedIn>
                {/* Credits Display */}
                <div className="px-3 py-2 mb-2">
                  <CreditsDisplay credits={credits} loading={loading} />
                </div>

                <Link
                  href="/dashboard"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-medium"
                >
                  <LayoutDashboard className="w-5 h-5" />
                  <span>My Dashboard</span>
                </Link>
                {isAdmin && (
                  <Link
                    href="/admin"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 font-medium"
                  >
                    <ShieldCheck className="w-5 h-5" />
                    <span>Admin Panel</span>
                  </Link>
                )}
                {!isPro && (
                  <a
                    href={GUMROAD_UPGRADE_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 text-white font-semibold transition-all"
                  >
                    <Sparkles className="w-5 h-5" />
                    <span>Upgrade to Pro</span>
                  </a>
                )}
                {isPro && (
                  <div className="flex items-center gap-2 px-3 py-2.5">
                    <span className="flex items-center gap-1 px-3 py-1 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-white text-sm font-bold">
                      <Sparkles className="w-4 h-4" />
                      PRO MEMBER
                    </span>
                  </div>
                )}
              </SignedIn>

              <SignedOut>
                <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
                  <Link
                    href="/sign-up"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block w-full px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-semibold rounded-lg transition-colors text-center"
                  >
                    Sign Up Free
                  </Link>
                </div>
              </SignedOut>
            </div>
          </div>
        )}
      </div>
    </header>
  )
}
