"use client"

import { useState } from "react"
import { FileText, Upload, Loader2, Download, Globe, FileIcon, Users, Building, Link, StickyNote } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

interface FormData {
  businessOwners: string
  businessName: string
  relatedWebsites: string
  additionalNotes: string
  transcript: string
  outputHtml: boolean
  outputWord: boolean
}

export function DocumentGenerator() {
  const [formData, setFormData] = useState<FormData>({
    businessOwners: "",
    businessName: "",
    relatedWebsites: "",
    additionalNotes: "",
    transcript: "",
    outputHtml: true,
    outputWord: false,
  })
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedDoc, setGeneratedDoc] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleInputChange = (field: keyof FormData, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleTranscriptDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const text = e.dataTransfer.getData("text/plain")
    if (text) {
      setFormData(prev => ({ ...prev, transcript: text }))
    }
  }

  const handleTranscriptPaste = (e: React.ClipboardEvent) => {
    const text = e.clipboardData.getData("text/plain")
    if (text) {
      setFormData(prev => ({ ...prev, transcript: text }))
    }
  }

  const handleGenerate = async () => {
    if (!formData.transcript.trim()) {
      setError("Please provide a transcript")
      return
    }

    if (!formData.outputHtml && !formData.outputWord) {
      setError("Please select at least one output format")
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
        throw new Error("Failed to generate document")
      }

      const data = await response.json()
      setGeneratedDoc(data.html)
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

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            Document Generator
          </CardTitle>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Transform your transcript into a professional HTML reference document
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Business Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="businessOwners" className="flex items-center gap-2">
                <Users className="w-4 h-4" />
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
              <Label htmlFor="businessName" className="flex items-center gap-2">
                <Building className="w-4 h-4" />
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
            <Label htmlFor="relatedWebsites" className="flex items-center gap-2">
              <Link className="w-4 h-4" />
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
            <Label htmlFor="additionalNotes" className="flex items-center gap-2">
              <StickyNote className="w-4 h-4" />
              Additional Notes
            </Label>
            <Input
              id="additionalNotes"
              placeholder="Any special instructions or context..."
              value={formData.additionalNotes}
              onChange={(e) => handleInputChange("additionalNotes", e.target.value)}
            />
          </div>

          {/* Transcript Input */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Transcript
            </Label>
            <div
              className={cn(
                "border-2 border-dashed rounded-lg p-4 min-h-[200px] transition-colors",
                "hover:border-primary/50 cursor-text",
                formData.transcript ? "border-secondary bg-secondary/5" : "border-gray-300"
              )}
              onDrop={handleTranscriptDrop}
              onDragOver={(e) => e.preventDefault()}
            >
              <textarea
                className="w-full h-full min-h-[180px] bg-transparent border-none outline-none resize-none text-sm"
                placeholder="Paste or drop your transcript here...

Example format:
Speaker 1: Hello, welcome to our consultation...
Speaker 2: Thank you for having me..."
                value={formData.transcript}
                onChange={(e) => handleInputChange("transcript", e.target.value)}
                onPaste={handleTranscriptPaste}
              />
            </div>
            <p className="text-xs text-gray-500">
              Tip: Copy the transcript from the results page and paste it here
            </p>
          </div>

          {/* Output Format */}
          <div className="space-y-2">
            <Label>Output Format</Label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.outputHtml}
                  onChange={(e) => handleInputChange("outputHtml", e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
                />
                <Globe className="w-4 h-4 text-primary" />
                <span>HTML Document</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer opacity-50" title="Coming soon">
                <input
                  type="checkbox"
                  checked={formData.outputWord}
                  onChange={(e) => handleInputChange("outputWord", e.target.checked)}
                  disabled
                  className="w-4 h-4 rounded border-gray-300"
                />
                <FileIcon className="w-4 h-4" />
                <span>Word Document (Coming Soon)</span>
              </label>
            </div>
          </div>

          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-400 text-sm">
              {error}
            </div>
          )}

          <Button
            className="w-full"
            size="lg"
            onClick={handleGenerate}
            disabled={isGenerating || !formData.transcript.trim()}
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
                Generating Document...
              </>
            ) : (
              <>
                <FileText className="w-5 h-5 mr-2" />
                Generate Document
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Generated Document Preview */}
      {generatedDoc && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-secondary" />
                Generated Document
              </CardTitle>
              <Button onClick={downloadHtml} variant="outline" size="sm">
                <Download className="w-4 h-4 mr-2" />
                Download HTML
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="border rounded-lg overflow-hidden bg-white">
              <iframe
                srcDoc={generatedDoc}
                className="w-full h-[600px] border-0"
                title="Generated Document Preview"
              />
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
