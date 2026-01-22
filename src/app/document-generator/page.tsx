"use client"

import { DocumentGenerator } from "@/components/DocumentGenerator"
import { FileText, ArrowLeft } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function DocumentGeneratorPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-950">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back Button */}
        <Link href="/" className="inline-flex items-center text-gray-600 dark:text-gray-400 hover:text-primary mb-6">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Home
        </Link>

        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-semibold mb-4">
            <FileText className="w-4 h-4" />
            AI-Powered Document Generation
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-navy dark:text-white">
            Create Reference Documents
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-3 max-w-2xl mx-auto">
            Transform your conversation transcripts into professional, interactive HTML reference documents
            with summaries, action items, and business insights.
          </p>
        </div>

        {/* Document Generator Component */}
        <DocumentGenerator />
      </div>
    </div>
  )
}
