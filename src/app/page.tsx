import { TranscriptionUploader } from "@/components/TranscriptionUploader"
import { SpeakerSplitUploader } from "@/components/SpeakerSplitUploader"
import { DocumentGeneratorSection } from "@/components/DocumentGeneratorSection"
import { VoiceCloneUploader } from "@/components/VoiceCloneUploader"
import { AuthGate } from "@/components/AuthGate"
import { FAQ, TRANSCRIPTION_FAQ, SPEAKER_SPLIT_FAQ, DOCUMENT_GENERATOR_FAQ, VOICE_CLONE_FAQ } from "@/components/FAQ"
import { AudioWaveform, Mic2, Split, FileText, Volume2 } from "lucide-react"

export default function Home() {
  return (
    <div className="min-h-screen bg-white dark:bg-slate-900">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-slate-50 to-white dark:from-slate-800 dark:to-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
          <div className="text-center max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 text-sm font-semibold mb-6">
              <AudioWaveform className="w-4 h-4" />
              AI-Powered Audio Processing Suite
            </div>
            <h1 className="text-4xl sm:text-5xl font-bold text-slate-900 dark:text-white leading-tight">
              Transcribe, Split, Clone &
              <span className="block bg-gradient-to-r from-blue-600 to-violet-500 bg-clip-text text-transparent">Generate Documents</span>
            </h1>
            <p className="text-lg text-slate-600 dark:text-slate-300 mt-6 leading-relaxed">
              Four powerful tools in one place. Transcribe conversations with speaker labels,
              separate audio by speaker, clone voices with AI, and generate professional reference documents.
            </p>
          </div>

          {/* Quick Nav Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-10 max-w-5xl mx-auto">
            <QuickNavCard
              icon={<Mic2 className="w-6 h-6" />}
              title="1. Transcription"
              description="Upload audio, get transcript with speaker labels"
              color="primary"
              href="#transcription"
            />
            <QuickNavCard
              icon={<Split className="w-6 h-6" />}
              title="2. Speaker Split"
              description="Separate audio files for each speaker"
              color="secondary"
              href="#speaker-split"
            />
            <QuickNavCard
              icon={<FileText className="w-6 h-6" />}
              title="3. Document Generator"
              description="Create professional HTML documents"
              color="accent"
              href="#document-generator"
            />
            <QuickNavCard
              icon={<Volume2 className="w-6 h-6" />}
              title="4. Voice Clone"
              description="Clone any voice and generate speech from text"
              color="violet"
              href="#voice-clone"
            />
          </div>
        </div>
      </section>

      {/* Section 1: Transcription */}
      <section id="transcription" className="py-12 sm:py-16 scroll-mt-20 bg-white dark:bg-slate-900">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHeader
            number="1"
            icon={<Mic2 className="w-6 h-6" />}
            title="Audio Transcription"
            subtitle="Upload your audio file and get a full transcript with speaker labels"
            color="primary"
          />
          <div className="mt-8">
            <AuthGate featureName="Audio Transcription">
              <TranscriptionUploader />
            </AuthGate>
          </div>
          {/* FAQ visible to everyone */}
          <FAQ items={TRANSCRIPTION_FAQ} accentColor="primary" />
        </div>
      </section>

      {/* Divider */}
      <div className="max-w-4xl mx-auto px-4">
        <div className="h-px bg-gradient-to-r from-transparent via-slate-300 dark:via-slate-700 to-transparent" />
      </div>

      {/* Section 2: Speaker Split */}
      <section id="speaker-split" className="py-12 sm:py-16 scroll-mt-20 bg-white dark:bg-slate-900">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHeader
            number="2"
            icon={<Split className="w-6 h-6" />}
            title="Speaker Audio Split"
            subtitle="Separate your audio file into individual tracks for each speaker"
            color="secondary"
          />
          <div className="mt-8">
            <AuthGate featureName="Speaker Split">
              <SpeakerSplitUploader />
            </AuthGate>
          </div>
          {/* FAQ visible to everyone */}
          <FAQ items={SPEAKER_SPLIT_FAQ} accentColor="secondary" />
        </div>
      </section>

      {/* Divider */}
      <div className="max-w-4xl mx-auto px-4">
        <div className="h-px bg-gradient-to-r from-transparent via-slate-300 dark:via-slate-700 to-transparent" />
      </div>

      {/* Section 3: Document Generator */}
      <section id="document-generator" className="py-12 sm:py-16 scroll-mt-20 bg-white dark:bg-slate-900">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHeader
            number="3"
            icon={<FileText className="w-6 h-6" />}
            title="Document Generator"
            subtitle="Transform your transcript into a professional HTML reference document"
            color="accent"
          />
          <div className="mt-8">
            <AuthGate featureName="Document Generator">
              <DocumentGeneratorSection />
            </AuthGate>
          </div>
          {/* FAQ visible to everyone */}
          <FAQ items={DOCUMENT_GENERATOR_FAQ} accentColor="amber" />
        </div>
      </section>

      {/* Divider */}
      <div className="max-w-4xl mx-auto px-4">
        <div className="h-px bg-gradient-to-r from-transparent via-slate-300 dark:via-slate-700 to-transparent" />
      </div>

      {/* Section 4: Voice Clone */}
      <section id="voice-clone" className="py-12 sm:py-16 scroll-mt-20 bg-white dark:bg-slate-900">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHeader
            number="4"
            icon={<Volume2 className="w-6 h-6" />}
            title="Voice Clone"
            subtitle="Upload a short voice sample and generate speech in that voice"
            color="violet"
          />
          <div className="mt-8">
            <AuthGate featureName="Voice Clone">
              <VoiceCloneUploader />
            </AuthGate>
          </div>
          {/* FAQ visible to everyone */}
          <FAQ items={VOICE_CLONE_FAQ} accentColor="violet" />
        </div>
      </section>

      {/* Footer spacing */}
      <div className="h-16 bg-white dark:bg-slate-900" />
    </div>
  )
}

function QuickNavCard({
  icon,
  title,
  description,
  color,
  href
}: {
  icon: React.ReactNode
  title: string
  description: string
  color: 'primary' | 'secondary' | 'accent' | 'violet'
  href: string
}) {
  const colorClasses = {
    primary: 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800 hover:border-blue-400 dark:hover:border-blue-600',
    secondary: 'bg-teal-50 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400 border-teal-200 dark:border-teal-800 hover:border-teal-400 dark:hover:border-teal-600',
    accent: 'bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800 hover:border-amber-400 dark:hover:border-amber-600',
    violet: 'bg-violet-50 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400 border-violet-200 dark:border-violet-800 hover:border-violet-400 dark:hover:border-violet-600',
  }

  return (
    <a
      href={href}
      className={`flex flex-col items-center text-center p-6 rounded-2xl border-2 transition-all hover:shadow-lg ${colorClasses[color]}`}
    >
      <div className="w-12 h-12 rounded-xl bg-white dark:bg-slate-800 flex items-center justify-center shadow-sm mb-3">
        {icon}
      </div>
      <h3 className="font-bold text-slate-900 dark:text-white">{title}</h3>
      <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">{description}</p>
    </a>
  )
}

function SectionHeader({
  number,
  icon,
  title,
  subtitle,
  color
}: {
  number: string
  icon: React.ReactNode
  title: string
  subtitle: string
  color: 'primary' | 'secondary' | 'accent' | 'violet'
}) {
  const colorClasses = {
    primary: 'bg-blue-600 text-white',
    secondary: 'bg-teal-600 text-white',
    accent: 'bg-amber-500 text-white',
    violet: 'bg-violet-600 text-white',
  }

  const iconColorClasses = {
    primary: 'text-blue-600 dark:text-blue-400',
    secondary: 'text-teal-600 dark:text-teal-400',
    accent: 'text-amber-500 dark:text-amber-400',
    violet: 'text-violet-600 dark:text-violet-400',
  }

  return (
    <div className="flex items-start gap-4">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl font-bold flex-shrink-0 ${colorClasses[color]}`}>
        {number}
      </div>
      <div>
        <div className="flex items-center gap-2">
          <span className={iconColorClasses[color]}>{icon}</span>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{title}</h2>
        </div>
        <p className="text-slate-600 dark:text-slate-400 mt-1">{subtitle}</p>
      </div>
    </div>
  )
}
