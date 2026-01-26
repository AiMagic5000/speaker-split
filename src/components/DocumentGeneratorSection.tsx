"use client"

import { useState } from "react"
import { FileText, Loader2, Download, Users, Building, Link, StickyNote, Eye, Globe, FileIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import { useUser } from "@clerk/nextjs"
import { saveUserFile } from "@/lib/user-files"

type OutputFormat = "html" | "docx"

interface FormData {
  businessOwners: string
  businessName: string
  relatedWebsites: string
  additionalNotes: string
  transcript: string
}

export function DocumentGeneratorSection() {
  const { user } = useUser()
  const [formData, setFormData] = useState<FormData>({
    businessOwners: "",
    businessName: "",
    relatedWebsites: "",
    additionalNotes: "",
    transcript: "",
  })
  const [outputFormat, setOutputFormat] = useState<OutputFormat>("html")
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedDoc, setGeneratedDoc] = useState<string | null>(null)
  const [generatedDocx, setGeneratedDocx] = useState<string | null>(null)
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
    setGeneratedDocx(null)

    try {
      const response = await fetch("/api/generate-document", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...formData, format: outputFormat }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to generate document")
      }

      if (outputFormat === "docx") {
        // For Word docs, response is base64 encoded
        const data = await response.json()
        setGeneratedDocx(data.docx)
        // Save to user history
        if (user?.id) {
          saveUserFile(user.id, {
            type: 'document',
            name: formData.businessName || 'Business Document',
            htmlContent: `[Word Document - ${formData.businessName || 'Business Document'}]`,
          })
        }
      } else {
        const data = await response.json()
        setGeneratedDoc(data.html)
        setShowPreview(true)
        // Save to user history
        if (user?.id) {
          saveUserFile(user.id, {
            type: 'document',
            name: formData.businessName || 'Business Document',
            htmlContent: data.html,
          })
        }
      }
    } catch (err) {
      if (err instanceof TypeError && err.message.includes('fetch')) {
        setError("Network error - please make sure you're accessing the app at http://localhost:3003")
      } else {
        setError(err instanceof Error ? err.message : "Generation failed")
      }
      console.error("Document generation error:", err)
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

  const downloadDocx = () => {
    if (!generatedDocx) return
    // Decode base64 and create blob
    const byteCharacters = atob(generatedDocx)
    const byteNumbers = new Array(byteCharacters.length)
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i)
    }
    const byteArray = new Uint8Array(byteNumbers)
    const blob = new Blob([byteArray], { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${formData.businessName || "document"}-reference.docx`
    a.click()
    URL.revokeObjectURL(url)
  }

  const resetForm = () => {
    setGeneratedDoc(null)
    setGeneratedDocx(null)
    setShowPreview(false)
  }

  const hasGeneratedContent = generatedDoc || generatedDocx

  return (
    <div className="space-y-6">
      {/* Business Info Card */}
      <Card>
        <CardContent className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="businessOwners" className="flex items-center gap-2 text-sm">
                <Users className="w-4 h-4 text-amber-500" />
                Business Owner(s) <span className="text-slate-400 dark:text-slate-500 font-normal">(Optional)</span>
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
                Business Name <span className="text-slate-400 dark:text-slate-500 font-normal">(Optional)</span>
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
              Related Websites <span className="text-slate-400 dark:text-slate-500 font-normal">(Optional)</span>
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
              Additional Notes <span className="text-slate-400 dark:text-slate-500 font-normal">(Optional)</span>
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

      {/* Output Format Selection */}
      <Card>
        <CardContent className="p-6">
          <Label className="flex items-center gap-2 mb-4 text-sm font-medium">
            <FileIcon className="w-4 h-4 text-amber-500" />
            Output Format
          </Label>
          <div className="flex gap-4">
            <label className={cn(
              "flex items-center gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all flex-1",
              outputFormat === "html"
                ? "border-amber-500 bg-amber-50 dark:bg-amber-950/20"
                : "border-slate-200 dark:border-slate-700 hover:border-amber-300"
            )}>
              <input
                type="radio"
                name="outputFormat"
                value="html"
                checked={outputFormat === "html"}
                onChange={() => setOutputFormat("html")}
                className="w-4 h-4 text-amber-500 focus:ring-amber-500"
              />
              <div>
                <div className="flex items-center gap-2">
                  <Globe className="w-5 h-5 text-amber-500" />
                  <span className="font-medium">HTML Web Page</span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Interactive with dropdowns, works in any browser</p>
              </div>
            </label>

            <label className={cn(
              "flex items-center gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all flex-1",
              outputFormat === "docx"
                ? "border-amber-500 bg-amber-50 dark:bg-amber-950/20"
                : "border-slate-200 dark:border-slate-700 hover:border-amber-300"
            )}>
              <input
                type="radio"
                name="outputFormat"
                value="docx"
                checked={outputFormat === "docx"}
                onChange={() => setOutputFormat("docx")}
                className="w-4 h-4 text-amber-500 focus:ring-amber-500"
              />
              <div>
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-blue-600" />
                  <span className="font-medium">Word Document</span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Professional .docx format, editable in Word</p>
              </div>
            </label>
          </div>
        </CardContent>
      </Card>

      {/* Transcript Input Card */}
      <Card className={cn(
        "border-2 border-dashed transition-all",
        formData.transcript ? "border-amber-500 bg-amber-50/50 dark:bg-amber-950/20" : "border-slate-300 dark:border-slate-600 dark:border-slate-700"
      )}>
        <CardContent className="p-6">
          <Label className="flex items-center gap-2 mb-3">
            <FileText className="w-4 h-4 text-amber-500" />
            Transcript <span className="text-red-500">*</span>
          </Label>
          <div
            className="min-h-[200px]"
            onDrop={handleTranscriptDrop}
            onDragOver={(e) => e.preventDefault()}
          >
            <textarea
              className="w-full h-full min-h-[200px] bg-transparent border-none outline-none resize-none text-sm text-slate-700 dark:text-slate-300 placeholder-slate-400 dark:placeholder-slate-500"
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
      {!hasGeneratedContent && (
        <Button
          size="lg"
          className="w-full bg-amber-500 hover:bg-amber-600 text-white"
          onClick={handleGenerate}
          disabled={isGenerating || !formData.transcript.trim()}
        >
          {isGenerating ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
              Generating {outputFormat === "docx" ? "Word Document" : "HTML Document"} with AI...
            </>
          ) : (
            <>
              {outputFormat === "docx" ? (
                <FileText className="w-5 h-5 mr-2" />
              ) : (
                <Globe className="w-5 h-5 mr-2" />
              )}
              Generate {outputFormat === "docx" ? "Word Document" : "HTML Document"}
            </>
          )}
        </Button>
      )}

      {/* Generated HTML Document */}
      {generatedDoc && (
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Globe className="w-5 h-5 text-amber-500" />
                Generated HTML Document
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

      {/* Generated Word Document */}
      {generatedDocx && (
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-600" />
                Generated Word Document
              </h3>
              <Button variant="outline" size="sm" onClick={downloadDocx}>
                <Download className="w-4 h-4 mr-1" />
                Download .docx
              </Button>
            </div>

            <div className="p-6 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800 text-center">
              <FileText className="w-16 h-16 text-blue-600 mx-auto mb-3" />
              <p className="text-blue-700 dark:text-blue-400 font-medium">
                Professional Word Document Ready
              </p>
              <p className="text-blue-600 dark:text-blue-300 text-sm mt-1">
                Click download to save your .docx file. Open in Microsoft Word, Google Docs, or any compatible editor.
              </p>
            </div>

            <div className="mt-4 p-4 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800">
              <p className="text-green-700 dark:text-green-400 text-sm">
                <strong>Document ready!</strong> Your professional Word document includes formatted sections,
                tables, and all the key information from the transcript.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Generate Another */}
      {hasGeneratedContent && (
        <Button variant="outline" className="w-full" onClick={resetForm}>
          Generate Another Document
        </Button>
      )}
    </div>
  )
}
