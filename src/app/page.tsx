import { TranscriptionUploader } from "@/components/TranscriptionUploader"
import { SpeakerSplitUploader } from "@/components/SpeakerSplitUploader"
import { DocumentGeneratorSection } from "@/components/DocumentGeneratorSection"
import { AudioWaveform, Mic2, Split, FileText } from "lucide-react"

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-950">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        {/* Background Video */}
        <div className="absolute inset-0 -z-10 overflow-hidden">
          <video
            autoPlay
            muted
            loop
            playsInline
            className="absolute top-1/2 left-1/2 min-w-full min-h-full w-auto h-auto transform -translate-x-1/2 -translate-y-1/2 object-cover opacity-20"
          >
            <source src="https://seafile.alwaysencrypted.com/seafhttp/f/5e3bd8a3f72b46f48f32/" type="video/mp4" />
          </video>
          <div className="absolute inset-0 bg-gradient-to-b from-white/80 via-white/60 to-white dark:from-gray-900/80 dark:via-gray-900/60 dark:to-gray-900" />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
          <div className="text-center max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-semibold mb-6">
              <AudioWaveform className="w-4 h-4" />
              AI-Powered Audio Processing Suite
            </div>
            <h1 className="text-4xl sm:text-5xl font-bold text-navy dark:text-white leading-tight">
              Transcribe, Split &
              <span className="gradient-text block">Generate Documents</span>
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-400 mt-6 leading-relaxed">
              Three powerful tools in one place. Transcribe conversations with speaker labels,
              separate audio by speaker, and generate professional reference documents.
            </p>
          </div>

          {/* Quick Nav Cards */}
          <div className="grid md:grid-cols-3 gap-4 mt-10 max-w-4xl mx-auto">
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
          </div>
        </div>
      </section>

      {/* Section 1: Transcription */}
      <section id="transcription" className="py-12 sm:py-16 scroll-mt-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHeader
            number="1"
            icon={<Mic2 className="w-6 h-6" />}
            title="Audio Transcription"
            subtitle="Upload your audio file and get a full transcript with speaker labels"
            color="primary"
          />
          <div className="mt-8">
            <TranscriptionUploader />
          </div>
        </div>
      </section>

      {/* Divider */}
      <div className="max-w-4xl mx-auto px-4">
        <div className="h-px bg-gradient-to-r from-transparent via-gray-300 dark:via-gray-700 to-transparent" />
      </div>

      {/* Section 2: Speaker Split */}
      <section id="speaker-split" className="py-12 sm:py-16 scroll-mt-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHeader
            number="2"
            icon={<Split className="w-6 h-6" />}
            title="Speaker Audio Split"
            subtitle="Separate your audio file into individual tracks for each speaker"
            color="secondary"
          />
          <div className="mt-8">
            <SpeakerSplitUploader />
          </div>
        </div>
      </section>

      {/* Divider */}
      <div className="max-w-4xl mx-auto px-4">
        <div className="h-px bg-gradient-to-r from-transparent via-gray-300 dark:via-gray-700 to-transparent" />
      </div>

      {/* Section 3: Document Generator */}
      <section id="document-generator" className="py-12 sm:py-16 scroll-mt-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHeader
            number="3"
            icon={<FileText className="w-6 h-6" />}
            title="Document Generator"
            subtitle="Transform your transcript into a professional HTML reference document"
            color="accent"
          />
          <div className="mt-8">
            <DocumentGeneratorSection />
          </div>
        </div>
      </section>

      {/* Footer spacing */}
      <div className="h-16" />
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
  color: 'primary' | 'secondary' | 'accent'
  href: string
}) {
  const colorClasses = {
    primary: 'bg-primary/10 text-primary border-primary/20 hover:border-primary/40',
    secondary: 'bg-secondary/10 text-secondary border-secondary/20 hover:border-secondary/40',
    accent: 'bg-amber-500/10 text-amber-600 border-amber-500/20 hover:border-amber-500/40',
  }

  return (
    <a
      href={href}
      className={`flex flex-col items-center text-center p-6 rounded-2xl border-2 transition-all hover:shadow-lg ${colorClasses[color]}`}
    >
      <div className="w-12 h-12 rounded-xl bg-white dark:bg-gray-800 flex items-center justify-center shadow-sm mb-3">
        {icon}
      </div>
      <h3 className="font-bold text-navy dark:text-white">{title}</h3>
      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{description}</p>
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
  color: 'primary' | 'secondary' | 'accent'
}) {
  const colorClasses = {
    primary: 'bg-primary text-white',
    secondary: 'bg-secondary text-white',
    accent: 'bg-amber-500 text-white',
  }

  const iconColorClasses = {
    primary: 'text-primary',
    secondary: 'text-secondary',
    accent: 'text-amber-500',
  }

  return (
    <div className="flex items-start gap-4">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl font-bold flex-shrink-0 ${colorClasses[color]}`}>
        {number}
      </div>
      <div>
        <div className="flex items-center gap-2">
          <span className={iconColorClasses[color]}>{icon}</span>
          <h2 className="text-2xl font-bold text-navy dark:text-white">{title}</h2>
        </div>
        <p className="text-gray-600 dark:text-gray-400 mt-1">{subtitle}</p>
      </div>
    </div>
  )
}
