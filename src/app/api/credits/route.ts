import { NextRequest, NextResponse } from 'next/server'
import { auth, clerkClient } from '@clerk/nextjs/server'
import {
  CreditType,
  UserCredits,
  getDefaultCredits,
  parseCreditsFromMetadata,
  parseTierFromMetadata,
  shouldResetCredits,
  getMonthStart,
  hasCredits,
  getMaxFileSize
} from '@/lib/credits'

// GET - Fetch current user's credits
export async function GET() {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const clerk = await clerkClient()
    const user = await clerk.users.getUser(userId)

    const tierInfo = parseTierFromMetadata(user.publicMetadata)
    let credits = parseCreditsFromMetadata(user.publicMetadata)

    // If no credits exist or need reset, initialize/reset them
    if (!credits || shouldResetCredits(credits.lastResetDate)) {
      credits = getDefaultCredits(tierInfo.tier)
      credits.lastResetDate = getMonthStart()

      // Save to Clerk
      await clerk.users.updateUser(userId, {
        publicMetadata: {
          ...user.publicMetadata,
          credits
        }
      })
    }

    return NextResponse.json({
      credits,
      tier: tierInfo.tier,
      isPro: tierInfo.tier === 'pro',
      maxFileSize: getMaxFileSize(tierInfo.tier),
      maxFileSizeMB: tierInfo.tier === 'pro' ? 200 : 50
    })
  } catch (error) {
    console.error('Error fetching credits:', error)
    return NextResponse.json(
      { error: 'Failed to fetch credits' },
      { status: 500 }
    )
  }
}

// POST - Deduct credits
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const creditType = body.type as CreditType

    if (!creditType || !['transcription', 'speakerSplit', 'documents', 'voiceClone'].includes(creditType)) {
      return NextResponse.json({ error: 'Invalid credit type' }, { status: 400 })
    }

    const clerk = await clerkClient()
    const user = await clerk.users.getUser(userId)

    const tierInfo = parseTierFromMetadata(user.publicMetadata)
    let credits = parseCreditsFromMetadata(user.publicMetadata)

    // Initialize credits if needed
    if (!credits || shouldResetCredits(credits.lastResetDate)) {
      credits = getDefaultCredits(tierInfo.tier)
      credits.lastResetDate = getMonthStart()
    }

    // Check if user has credits
    if (!hasCredits(credits, creditType)) {
      return NextResponse.json({
        error: 'Insufficient credits',
        credits,
        type: creditType
      }, { status: 402 }) // Payment Required
    }

    // Deduct credit
    credits[creditType] -= 1

    // Save to Clerk
    await clerk.users.updateUser(userId, {
      publicMetadata: {
        ...user.publicMetadata,
        credits
      }
    })

    return NextResponse.json({
      success: true,
      credits,
      deducted: 1,
      type: creditType
    })
  } catch (error) {
    console.error('Error deducting credits:', error)
    return NextResponse.json(
      { error: 'Failed to deduct credits' },
      { status: 500 }
    )
  }
}
