// User tier configuration for file upload limits and credits

export type UserTier = 'free' | 'pro'

export interface TierLimits {
  maxFileSize: number // in bytes
  maxFileSizeMB: number // for display
  monthlyCredits: number
  pricePerMonth: number
}

export const TIER_LIMITS: Record<UserTier, TierLimits> = {
  free: {
    maxFileSize: 50 * 1024 * 1024, // 50MB
    maxFileSizeMB: 50,
    monthlyCredits: 5, // 5 free transcriptions per month
    pricePerMonth: 0,
  },
  pro: {
    maxFileSize: 200 * 1024 * 1024, // 200MB
    maxFileSizeMB: 200,
    monthlyCredits: 100, // 100 credits per month
    pricePerMonth: 7.95,
  },
}

// Helper to get user tier from Clerk metadata
export function getUserTier(userMetadata?: { tier?: string }): UserTier {
  if (userMetadata?.tier === 'pro') return 'pro'
  return 'free'
}

// Helper to format file size limit for display
export function formatMaxSize(tier: UserTier): string {
  return `${TIER_LIMITS[tier].maxFileSizeMB}MB`
}

// Check if file exceeds tier limit
export function exceedsTierLimit(fileSizeBytes: number, tier: UserTier): boolean {
  return fileSizeBytes > TIER_LIMITS[tier].maxFileSize
}

// Get upgrade message for free users
export function getUpgradeMessage(fileSizeMB: number): string {
  if (fileSizeMB > 200) {
    return `File size (${Math.round(fileSizeMB)}MB) exceeds maximum limit of 200MB.`
  }
  return `File size (${Math.round(fileSizeMB)}MB) exceeds free tier limit of 50MB. Upgrade to Pro ($7.95/month) for files up to 200MB and 100 monthly credits.`
}
