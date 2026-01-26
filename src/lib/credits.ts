// Credits management system for Speaker Split
// Free users: 10 credits each for transcription, speakerSplit, documents per month
// Pro users: 100 credits total with 200MB max file size

export type CreditType = 'transcription' | 'speakerSplit' | 'documents'

export interface UserCredits {
  transcription: number
  speakerSplit: number
  documents: number
  lastResetDate: string // ISO date string for monthly reset
}

export interface UserTier {
  tier: 'free' | 'pro'
  gumroadSubscriptionId?: string
  tierUpdatedAt?: string
}

// Default credits for free users
export const FREE_CREDITS: UserCredits = {
  transcription: 10,
  speakerSplit: 10,
  documents: 10,
  lastResetDate: new Date().toISOString()
}

// Default credits for pro users (100 total, allocated evenly)
export const PRO_CREDITS: UserCredits = {
  transcription: 100,
  speakerSplit: 100,
  documents: 100,
  lastResetDate: new Date().toISOString()
}

// File size limits
export const FREE_MAX_FILE_SIZE_MB = 50
export const PRO_MAX_FILE_SIZE_MB = 200

// Get the first day of current month (for reset check)
export function getMonthStart(): string {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
}

// Check if credits should be reset (new month)
export function shouldResetCredits(lastResetDate: string): boolean {
  const lastReset = new Date(lastResetDate)
  const monthStart = new Date(getMonthStart())
  return lastReset < monthStart
}

// Get default credits based on tier
export function getDefaultCredits(tier: 'free' | 'pro'): UserCredits {
  return tier === 'pro' ? { ...PRO_CREDITS } : { ...FREE_CREDITS }
}

// Parse credits from Clerk metadata
export function parseCreditsFromMetadata(metadata: Record<string, unknown>): UserCredits | null {
  if (!metadata.credits) return null

  const credits = metadata.credits as Record<string, unknown>

  return {
    transcription: typeof credits.transcription === 'number' ? credits.transcription : 10,
    speakerSplit: typeof credits.speakerSplit === 'number' ? credits.speakerSplit : 10,
    documents: typeof credits.documents === 'number' ? credits.documents : 10,
    lastResetDate: typeof credits.lastResetDate === 'string' ? credits.lastResetDate : new Date().toISOString()
  }
}

// Parse tier from Clerk metadata
export function parseTierFromMetadata(metadata: Record<string, unknown>): UserTier {
  return {
    tier: metadata.tier === 'pro' ? 'pro' : 'free',
    gumroadSubscriptionId: typeof metadata.gumroadSubscriptionId === 'string' ? metadata.gumroadSubscriptionId : undefined,
    tierUpdatedAt: typeof metadata.tierUpdatedAt === 'string' ? metadata.tierUpdatedAt : undefined
  }
}

// Check if user has enough credits
export function hasCredits(credits: UserCredits, type: CreditType): boolean {
  return credits[type] > 0
}

// Calculate credits to deduct (always 1 per operation)
export function getCreditsToDeduct(): number {
  return 1
}

// Get max file size based on tier (in bytes)
export function getMaxFileSize(tier: 'free' | 'pro'): number {
  return tier === 'pro' ? PRO_MAX_FILE_SIZE_MB * 1024 * 1024 : FREE_MAX_FILE_SIZE_MB * 1024 * 1024
}

// Format credits for display
export function formatCreditsDisplay(credits: UserCredits): string {
  return `Transcription: ${credits.transcription} | Split: ${credits.speakerSplit} | Docs: ${credits.documents}`
}
