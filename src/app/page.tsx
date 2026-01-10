import { AudioUploader } from "@/components/AudioUploader"
import { AudioWaveform, Mic2, Split, FileText, CheckCircle } from "lucide-react"

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Hero Section with Video Background */}
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
          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-b from-white/80 via-white/60 to-white" />
        </div>

        {/* Decorative blurs */}
        <div className="absolute inset-0 -z-10 pointer-events-none">
          <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-secondary/5 rounded-full blur-3xl" />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-20">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left Column - Info */}
            <div className="space-y-8">
              <div>
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-semibold mb-6">
                  <AudioWaveform className="w-4 h-4" />
                  AI-Powered Audio Processing
                </div>
                <h1 className="text-4xl sm:text-5xl font-bold text-navy leading-tight">
                  Split & Transcribe
                  <span className="gradient-text block">Your Conversations</span>
                </h1>
                <p className="text-lg text-gray-600 mt-6 leading-relaxed">
                  Upload any audio file and let our AI identify each speaker, transcribe the conversation,
                  and generate separate audio tracks. Perfect for business consultations, interviews, and meetings.
                </p>
              </div>

              {/* Features */}
              <div className="grid sm:grid-cols-2 gap-4">
                <FeatureItem
                  icon={<Mic2 className="w-5 h-5" />}
                  title="Speaker Recognition"
                  description="Automatically identify up to 6 speakers"
                />
                <FeatureItem
                  icon={<Split className="w-5 h-5" />}
                  title="Audio Separation"
                  description="Get individual audio files per speaker"
                />
                <FeatureItem
                  icon={<FileText className="w-5 h-5" />}
                  title="Full Transcript"
                  description="Word-level timestamps & speaker labels"
                />
                <FeatureItem
                  icon={<CheckCircle className="w-5 h-5" />}
                  title="Reference Documents"
                  description="Generate professional HTML summaries"
                />
              </div>
            </div>

            {/* Right Column - Upload Form */}
            <div className="lg:pl-8">
              <div className="bg-white rounded-3xl shadow-xl shadow-gray-200/50 p-6 sm:p-8 border border-gray-100">
                <div className="text-center mb-6">
                  <h2 className="text-2xl font-bold text-navy">Upload Your Audio</h2>
                  <p className="text-gray-500 mt-1">Start processing in seconds</p>
                </div>
                <AudioUploader />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="bg-navy py-16 sm:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-white">How It Works</h2>
            <p className="text-gray-400 mt-2">Three simple steps to transform your audio</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <StepCard
              number="1"
              title="Upload Audio"
              description="Drag and drop your audio file. We support MP3, WAV, M4A, FLAC, and more."
              color="primary"
            />
            <StepCard
              number="2"
              title="AI Processing"
              description="Our AI transcribes the conversation and identifies each speaker automatically."
              color="secondary"
            />
            <StepCard
              number="3"
              title="Get Results"
              description="Download transcripts, separated audio files, and generate reference documents."
              color="primary"
            />
          </div>
        </div>
      </section>
    </div>
  )
}

function FeatureItem({
  icon,
  title,
  description
}: {
  icon: React.ReactNode
  title: string
  description: string
}) {
  return (
    <div className="flex items-start gap-3 p-4 rounded-xl bg-white border border-gray-100 hover:border-primary/30 hover:shadow-md transition-all">
      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary flex-shrink-0">
        {icon}
      </div>
      <div>
        <p className="font-semibold text-navy">{title}</p>
        <p className="text-sm text-gray-500">{description}</p>
      </div>
    </div>
  )
}

function StepCard({
  number,
  title,
  description,
  color
}: {
  number: string
  title: string
  description: string
  color: 'primary' | 'secondary'
}) {
  return (
    <div className="relative p-6 rounded-2xl bg-navy-light/50 border border-gray-700/50 hover:border-gray-600 transition-all group">
      <div className={`
        absolute -top-4 -left-2 w-12 h-12 rounded-xl flex items-center justify-center text-xl font-bold text-white
        ${color === 'primary' ? 'bg-primary' : 'bg-secondary'}
        group-hover:scale-110 transition-transform
      `}>
        {number}
      </div>
      <div className="pt-6">
        <h3 className="text-xl font-bold text-white mb-2">{title}</h3>
        <p className="text-gray-400">{description}</p>
      </div>
    </div>
  )
}
