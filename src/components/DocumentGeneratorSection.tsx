"use client"

import { useState } from "react"
import { FileText, Upload, Loader2, Download, Globe, Users, Building, Link, StickyNote, Eye } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import { FAQ, DOCUMENT_GENERATOR_FAQ } from "./FAQ"

interface FormData {
  businessOwners: string
  businessName: string
  relatedWebsites: string
  additionalNotes: string
  transcript: string
}

export function DocumentGeneratorSection() {
  const [formData, setFormData] = useState<FormData>({
    businessOwners: "",
    businessName: "",
    relatedWebsites: "",
    additionalNotes: "",
    transcript: "",
  })
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedDoc, setGeneratedDoc] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showPreview, setShowPreview] = useState(false)

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleTranscriptDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const text = e.dataTransfer.getData("text/plain")
    if (text) {
      setFormData(prev => ({ ...prev, transcript: text }))
    }
  }

  const handleGenerate = async () => {
    if (!formData.transcript.trim()) {
      setError("Please provide a transcript")
      return
    }

    setIsGenerating(true)
    setError(null)
    setGeneratedDoc(null)

    try {
      const response = await fetch("/api/generate-document", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to generate document")
      }

      const data = await response.json()
      setGeneratedDoc(data.html)
      setShowPreview(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generation failed")
    } finally {
      setIsGenerating(false)
    }
  }

  const downloadHtml = () => {
    if (!generatedDoc) return
    const blob = new Blob([generatedDoc], { type: "text/html" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${formData.businessName || "document"}-reference.html`
    a.click()
    URL.revokeObjectURL(url)
  }

  const resetForm = () => {
    setGeneratedDoc(null)
    setShowPreview(false)
  }

  return (
    <div className="space-y-6">
      {/* Business Info Card */}
      <Card>
        <CardContent className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="businessOwners" className="flex items-center gap-2 text-sm">
                <Users className="w-4 h-4 text-amber-500" />
                Business Owner(s)
              </Label>
              <Input
                id="businessOwners"
                placeholder="John Doe, Jane Smith"
                value={formData.businessOwners}
                onChange={(e) => handleInputChange("businessOwners", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="businessName" className="flex items-center gap-2 text-sm">
                <Building className="w-4 h-4 text-amber-500" />
                Business Name
              </Label>
              <Input
                id="businessName"
                placeholder="Acme Corporation"
                value={formData.businessName}
                onChange={(e) => handleInputChange("businessName", e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="relatedWebsites" className="flex items-center gap-2 text-sm">
              <Link className="w-4 h-4 text-amber-500" />
              Related Websites
            </Label>
            <Input
              id="relatedWebsites"
              placeholder="https://example.com, https://another.com"
              value={formData.relatedWebsites}
              onChange={(e) => handleInputChange("relatedWebsites", e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="additionalNotes" className="flex items-center gap-2 text-sm">
              <StickyNote className="w-4 h-4 text-amber-500" />
              Additional Notes
            </Label>
            <Input
              id="additionalNotes"
              placeholder="Any special instructions or context..."
              value={formData.additionalNotes}
              onChange={(e) => handleInputChange("additionalNotes", e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Transcript Input Card */}
      <Card className={cn(
        "border-2 border-dashed transition-all",
        formData.transcript ? "border-amber-500 bg-amber-50/50 dark:bg-amber-950/20" : "border-gray-300 dark:border-gray-700"
      )}>
        <CardContent className="p-6">
          <Label className="flex items-center gap-2 mb-3">
            <FileText className="w-4 h-4 text-amber-500" />
            Transcript
          </Label>
          <div
            className="min-h-[200px]"
            onDrop={handleTranscriptDrop}
            onDragOver={(e) => e.preventDefault()}
          >
            <textarea
              className="w-full h-full min-h-[200px] bg-transparent border-none outline-none resize-none text-sm text-gray-700 dark:text-gray-300 placeholder-gray-400"
              placeholder="Paste your transcript here...

Example format:
Speaker 1: Hello, welcome to our consultation...
Speaker 2: Thank you for having me...

Tip: Copy the transcript from Section 1 (Transcription) and paste it here!"
              value={formData.transcript}
              onChange={(e) => handleInputChange("transcript", e.target.value)}
            />
          </div>
          {formData.transcript && (
            <p className="text-xs text-amber-600 mt-2">
              {formData.transcript.split('\n').filter(l => l.trim()).length} lines of transcript loaded
            </p>
          )}
        </CardContent>
      </Card>

      {/* Error */}
      {error && (
        <Card className="border-red-200 bg-red-50 dark:bg-red-950/20">
          <CardContent className="p-4">
            <p className="text-red-600 text-sm">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Generate Button */}
      {!generatedDoc && (
        <Button
          size="lg"
          className="w-full bg-amber-500 hover:bg-amber-600 text-white"
          onClick={handleGenerate}
          disabled={isGenerating || !formData.transcript.trim()}
        >
          {isGenerating ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
              Generating Document with AI...
            </>
          ) : (
            <>
              <FileText className="w-5 h-5 mr-2" />
              Generate Reference Document
            </>
          )}
        </Button>
      )}

      {/* Generated Document */}
      {generatedDoc && (
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-navy dark:text-white flex items-center gap-2">
                <FileText className="w-5 h-5 text-amber-500" />
                Generated Document
              </h3>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setShowPreview(!showPreview)}>
                  <Eye className="w-4 h-4 mr-1" />
                  {showPreview ? 'Hide' : 'Show'} Preview
                </Button>
                <Button variant="outline" size="sm" onClick={downloadHtml}>
                  <Download className="w-4 h-4 mr-1" />
                  Download HTML
                </Button>
              </div>
            </div>

            {showPreview && (
              <div className="border rounded-xl overflow-hidden bg-white">
                <iframe
                  srcDoc={generatedDoc}
                  className="w-full h-[500px] border-0"
                  title="Generated Document Preview"
                />
              </div>
            )}

            <div className="mt-4 p-4 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800">
              <p className="text-green-700 dark:text-green-400 text-sm">
                <strong>Document ready!</strong> Download the HTML file to use it anywhere.
                The document includes collapsible sections, SOPs, and profit projections.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Generate Another */}
      {generatedDoc && (
        <Button variant="outline" className="w-full" onClick={resetForm}>
          Generate Another Document
        </Button>
      )}

      {/* FAQ Section */}
      <FAQ items={DOCUMENT_GENERATOR_FAQ} accentColor="amber" />
    </div>
  )
}
