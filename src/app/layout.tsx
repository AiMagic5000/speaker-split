import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ClerkProvider } from "@clerk/nextjs";
import { Header } from "@/components/Header";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://speakersplit.startmybusiness.us";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Speaker Split - AI Audio Transcription & Speaker Separation | Start My Business Inc.",
    template: "%s | Speaker Split"
  },
  description: "Free AI-powered audio transcription with speaker identification, audio separation by speaker, and professional document generation. Transform business calls, podcasts, and meetings into actionable documents.",
  keywords: [
    "speaker diarization",
    "audio transcription",
    "AI transcription",
    "speaker separation",
    "speech to text",
    "meeting transcription",
    "podcast transcription",
    "WhisperX",
    "speaker identification",
    "audio to text",
    "voice recognition",
    "business call transcription",
    "interview transcription",
    "multi-speaker audio",
    "Start My Business Inc"
  ],
  authors: [{ name: "Start My Business Inc.", url: "https://startmybusiness.us" }],
  creator: "Start My Business Inc.",
  publisher: "Start My Business Inc.",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: siteUrl,
    siteName: "Speaker Split",
    title: "Speaker Split - AI Audio Transcription & Speaker Separation",
    description: "Free AI-powered audio transcription with speaker identification, audio separation, and document generation. Perfect for business calls, podcasts, and meetings.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Speaker Split - AI Audio Processing Suite",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Speaker Split - AI Audio Transcription & Speaker Separation",
    description: "Free AI-powered audio transcription with speaker identification and separation.",
    images: ["/og-image.png"],
    creator: "@startmybizinc",
  },
  alternates: {
    canonical: siteUrl,
  },
  category: "Technology",
  other: {
    "ai-content-declaration": "AI-assisted audio processing tool",
    "application-name": "Speaker Split",
  },
};

// Global Clerk appearance for sign-in/sign-up modals
const clerkAppearance = {
  variables: {
    colorPrimary: "#f59e0b",
    colorBackground: "#ffffff",
    colorText: "#1f2937",
    colorTextSecondary: "#6b7280",
    colorInputBackground: "#ffffff",
    colorInputText: "#1f2937",
  },
  elements: {
    card: {
      backgroundColor: "#ffffff",
      boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
    },
    headerTitle: {
      color: "#1f2937",
    },
    headerSubtitle: {
      color: "#6b7280",
    },
    socialButtonsBlockButton: {
      backgroundColor: "#ffffff",
      border: "1px solid #d1d5db",
      color: "#374151",
    },
    socialButtonsBlockButtonText: {
      color: "#374151",
    },
    dividerLine: {
      backgroundColor: "#e5e7eb",
    },
    dividerText: {
      color: "#6b7280",
    },
    formFieldLabel: {
      color: "#374151",
    },
    formFieldInput: {
      backgroundColor: "#ffffff",
      border: "1px solid #d1d5db",
      color: "#1f2937",
    },
    formButtonPrimary: {
      backgroundColor: "#f59e0b",
      color: "#ffffff",
    },
    footerActionLink: {
      color: "#d97706",
    },
    footer: {
      color: "#6b7280",
    },
    footerActionText: {
      color: "#6b7280",
    },
    modalContent: {
      backgroundColor: "#ffffff",
    },
    modalCloseButton: {
      color: "#6b7280",
    },
  },
};

// JSON-LD Structured Data
const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebApplication",
      "@id": `${siteUrl}/#application`,
      "name": "Speaker Split",
      "description": "AI-powered audio transcription with speaker identification, audio separation by speaker, and professional document generation.",
      "url": siteUrl,
      "applicationCategory": "BusinessApplication",
      "operatingSystem": "Web Browser",
      "offers": {
        "@type": "Offer",
        "price": "0",
        "priceCurrency": "USD",
        "description": "Free tier available with premium options"
      },
      "featureList": [
        "Audio transcription with speaker labels",
        "Speaker separation into individual audio files",
        "AI-powered document generation",
        "Support for MP3, WAV, M4A, FLAC, OGG, WebM, MP4",
        "95%+ transcription accuracy with WhisperX",
        "Export as HTML or Word documents"
      ],
      "provider": {
        "@type": "Organization",
        "@id": "https://startmybusiness.us/#organization"
      }
    },
    {
      "@type": "Organization",
      "@id": "https://startmybusiness.us/#organization",
      "name": "Start My Business Inc.",
      "url": "https://startmybusiness.us",
      "logo": "https://cdn.prod.website-files.com/6784053e7b7422e48efa5a84/6833a36f90c60fba010cee72_start_my_business_logo-removebg-preview.png",
      "contactPoint": {
        "@type": "ContactPoint",
        "telephone": "+1-888-534-4145",
        "contactType": "customer service",
        "availableLanguage": "English"
      },
      "sameAs": [
        "https://www.facebook.com/startmybusinessinc",
        "https://www.linkedin.com/company/startmybusinessinc"
      ]
    },
    {
      "@type": "WebSite",
      "@id": `${siteUrl}/#website`,
      "url": siteUrl,
      "name": "Speaker Split",
      "publisher": {
        "@id": "https://startmybusiness.us/#organization"
      }
    },
    {
      "@type": "FAQPage",
      "@id": `${siteUrl}/#faq`,
      "mainEntity": [
        {
          "@type": "Question",
          "name": "What audio formats does Speaker Split support?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Speaker Split supports MP3, WAV, M4A, FLAC, OGG, WebM, and MP4 files. Maximum file size is 500MB. For best results, use high-quality audio with minimal background noise."
          }
        },
        {
          "@type": "Question",
          "name": "How accurate is the AI transcription?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Our AI uses WhisperX, one of the most accurate transcription models available. Accuracy is typically 95%+ for clear audio in English. Other languages are also supported with high accuracy."
          }
        },
        {
          "@type": "Question",
          "name": "What is speaker diarization?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Speaker diarization identifies who is speaking at each point in the conversation. The AI analyzes voice patterns to distinguish between different speakers and labels each segment accordingly (Speaker 1, Speaker 2, etc.)."
          }
        },
        {
          "@type": "Question",
          "name": "How does speaker separation work?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Speaker separation creates individual audio files for each person in the conversation. This allows you to hear only what a specific speaker said, useful for review, editing, or creating focused content."
          }
        },
        {
          "@type": "Question",
          "name": "How many speakers can be identified?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Speaker Split supports 2-6 speakers. Select the number that matches your audio. The AI will identify distinct voices and separate them accordingly."
          }
        },
        {
          "@type": "Question",
          "name": "What does the document generator create?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "The document generator creates professional HTML or Word documents from your transcript, including summaries, action items, business concepts discussed, profit projections, and collapsible SOPs."
          }
        }
      ]
    }
  ]
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider appearance={clerkAppearance}>
      <html lang="en">
        <head>
          <link rel="preconnect" href="https://fonts.googleapis.com" />
          <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
          />
        </head>
        <body className={`${inter.variable} font-sans antialiased`}>
          <Header />
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
