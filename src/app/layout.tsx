import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Speaker Split | Start My Business Inc.",
  description: "AI-powered audio transcription with speaker identification and separation. Transform your business calls into actionable reference documents.",
  keywords: ["speaker diarization", "audio transcription", "AI transcription", "speaker separation", "business consultation"],
  authors: [{ name: "Start My Business Inc." }],
  openGraph: {
    title: "Speaker Split | Start My Business Inc.",
    description: "AI-powered audio transcription with speaker identification",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className={`${inter.variable} font-sans antialiased`}>
        {children}
      </body>
    </html>
  );
}
