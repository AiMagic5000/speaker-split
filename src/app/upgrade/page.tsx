"use client"

import { useUser } from "@clerk/nextjs"
import { Check, Zap, AudioWaveform, Clock, FileAudio } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { getUserTier, TIER_LIMITS } from "@/lib/tiers"
import Link from "next/link"

// Gumroad product URL - update this after creating the product on Gumroad
const GUMROAD_PRODUCT_URL = process.env.NEXT_PUBLIC_GUMROAD_PRODUCT_URL || "https://coreypearson.gumroad.com/l/speaker-split-pro"

const PRO_FEATURES = [
  { icon: FileAudio, text: "Upload files up to 200MB" },
  { icon: AudioWaveform, text: "100 processing credits per month" },
  { icon: Clock, text: "Priority processing queue" },
  { icon: Zap, text: "Access to new features first" },
]

export default function UpgradePage() {
  const { user, isLoaded } = useUser()
  const userTier = getUserTier(user?.publicMetadata as { tier?: string })
  const isPro = userTier === 'pro'

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (isPro) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white dark:from-slate-950 dark:to-slate-900 py-16 px-4">
        <div className="max-w-lg mx-auto text-center">
          <div className="w-20 h-20 mx-auto rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mb-6">
            <Check className="w-10 h-10 text-green-600" />
          </div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-4">
            You're Already Pro!
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mb-8">
            You have full access to all Speaker Split Pro features including 200MB file uploads and 100 monthly credits.
          </p>
          <Link href="/">
            <Button size="lg">
              Go to Dashboard
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  const handleUpgrade = () => {
    // Add user email to Gumroad URL for automatic association
    const email = user?.primaryEmailAddress?.emailAddress
    const url = email
      ? `${GUMROAD_PRODUCT_URL}?email=${encodeURIComponent(email)}`
      : GUMROAD_PRODUCT_URL
    window.open(url, '_blank')
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white dark:from-slate-950 dark:to-slate-900 py-16 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 text-sm font-medium mb-4">
            <Zap className="w-4 h-4" />
            Upgrade to Pro
          </div>
          <h1 className="text-4xl font-bold text-slate-900 dark:text-white mb-4">
            Unlock the Full Power of Speaker Split
          </h1>
          <p className="text-xl text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
            Process larger files, get more credits, and enjoy priority support.
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-2 gap-8 max-w-3xl mx-auto">
          {/* Free Tier */}
          <Card className="relative">
            <CardHeader>
              <CardTitle className="text-xl">Free</CardTitle>
              <div className="mt-4">
                <span className="text-4xl font-bold text-slate-900 dark:text-white">$0</span>
                <span className="text-slate-500 dark:text-slate-400">/month</span>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="space-y-3">
                <li className="flex items-center gap-3 text-slate-600 dark:text-slate-400">
                  <Check className="w-5 h-5 text-slate-400" />
                  <span>Up to {TIER_LIMITS.free.maxFileSizeMB}MB file uploads</span>
                </li>
                <li className="flex items-center gap-3 text-slate-600 dark:text-slate-400">
                  <Check className="w-5 h-5 text-slate-400" />
                  <span>{TIER_LIMITS.free.monthlyCredits} credits per month</span>
                </li>
                <li className="flex items-center gap-3 text-slate-600 dark:text-slate-400">
                  <Check className="w-5 h-5 text-slate-400" />
                  <span>Standard processing</span>
                </li>
              </ul>
              <Button variant="outline" className="w-full" disabled>
                Current Plan
              </Button>
            </CardContent>
          </Card>

          {/* Pro Tier */}
          <Card className="relative border-2 border-primary shadow-lg">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2">
              <span className="px-3 py-1 rounded-full bg-primary text-white text-sm font-medium">
                Recommended
              </span>
            </div>
            <CardHeader>
              <CardTitle className="text-xl">Pro</CardTitle>
              <div className="mt-4">
                <span className="text-4xl font-bold text-slate-900 dark:text-white">${TIER_LIMITS.pro.pricePerMonth}</span>
                <span className="text-slate-500 dark:text-slate-400">/month</span>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="space-y-3">
                {PRO_FEATURES.map((feature, index) => (
                  <li key={index} className="flex items-center gap-3 text-slate-900 dark:text-white">
                    <feature.icon className="w-5 h-5 text-primary" />
                    <span>{feature.text}</span>
                  </li>
                ))}
              </ul>
              <Button
                size="lg"
                className="w-full bg-primary hover:bg-primary/90"
                onClick={handleUpgrade}
              >
                <Zap className="w-4 h-4 mr-2" />
                Upgrade Now
              </Button>
              <p className="text-xs text-center text-slate-500 dark:text-slate-400">
                Secure payment via Gumroad. Cancel anytime.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* FAQ */}
        <div className="mt-16 max-w-2xl mx-auto">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white text-center mb-8">
            Frequently Asked Questions
          </h2>
          <div className="space-y-6">
            <div>
              <h3 className="font-semibold text-slate-900 dark:text-white mb-2">
                How do credits work?
              </h3>
              <p className="text-slate-600 dark:text-slate-400">
                Each transcription or speaker split uses 1 credit. Free users get 5 credits per month, Pro users get 100 credits per month. Credits reset on your billing date.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 dark:text-white mb-2">
                Can I cancel anytime?
              </h3>
              <p className="text-slate-600 dark:text-slate-400">
                Yes! You can cancel your subscription at any time through Gumroad. You'll keep Pro access until the end of your billing period.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 dark:text-white mb-2">
                What happens to my files?
              </h3>
              <p className="text-slate-600 dark:text-slate-400">
                Your uploaded files are processed securely and deleted after 24 hours. We don't store or share your audio content.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
