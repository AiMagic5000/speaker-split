"use client"

import { useUser } from "@clerk/nextjs"
import { Lock } from "lucide-react"
import Link from "next/link"
import { ReactNode } from "react"

interface AuthGateProps {
  children: ReactNode
  featureName: string
}

export function AuthGate({ children, featureName }: AuthGateProps) {
  const { isSignedIn, isLoaded } = useUser()

  // Show children normally if signed in
  if (isLoaded && isSignedIn) {
    return <>{children}</>
  }

  // Show locked overlay when not signed in
  return (
    <div className="relative">
      {/* Blurred/disabled content preview */}
      <div className="pointer-events-none select-none opacity-50 blur-[2px]">
        {children}
      </div>

      {/* Sign-in overlay */}
      <div className="absolute inset-0 flex items-center justify-center bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm rounded-2xl">
        <div className="text-center p-8 max-w-sm">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
            <Lock className="w-8 h-8 text-amber-600 dark:text-amber-400" />
          </div>
          <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
            Sign In Required
          </h3>
          <p className="text-slate-600 dark:text-slate-400 mb-6">
            Create a free account to use {featureName} and all other features.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/sign-in"
              className="px-6 py-3 border-2 border-amber-500 text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-500/10 font-semibold rounded-lg transition-colors text-center"
            >
              Sign In
            </Link>
            <Link
              href="/sign-up"
              className="px-6 py-3 bg-amber-500 hover:bg-amber-600 text-white font-semibold rounded-lg transition-colors text-center"
            >
              Sign Up Free
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
