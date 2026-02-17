import { NextRequest, NextResponse } from 'next/server'
import { auth, clerkClient } from '@clerk/nextjs/server'
import {
  parseCreditsFromMetadata,
  parseTierFromMetadata,
  getDefaultCredits,
  shouldResetCredits,
  FREE_CREDITS,
  PRO_CREDITS
} from '@/lib/credits'

// Admin email - the only user who can access admin functions
const ADMIN_EMAIL = 'coreypearsonemail@gmail.com'

async function isAdmin(userId: string): Promise<boolean> {
  const clerk = await clerkClient()
  const user = await clerk.users.getUser(userId)
  const primaryEmail = user.emailAddresses.find(e => e.id === user.primaryEmailAddressId)
  return primaryEmail?.emailAddress === ADMIN_EMAIL
}

// GET - List all users
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if current user is admin
    if (!await isAdmin(userId)) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 })
    }

    const clerk = await clerkClient()

    // Get all users with pagination
    const limit = 100
    let offset = 0
    const allUsers: any[] = []

    while (true) {
      const response = await clerk.users.getUserList({
        limit,
        offset,
        orderBy: '-created_at',
      })

      if (response.data.length === 0) break

      allUsers.push(...response.data.map(user => {
        const tierInfo = parseTierFromMetadata(user.publicMetadata as Record<string, unknown>)
        const credits = parseCreditsFromMetadata(user.publicMetadata as Record<string, unknown>)
        const defaultCredits = getDefaultCredits(tierInfo.tier)

        // Calculate credits used (default - remaining)
        const creditsUsed = credits ? {
          transcription: defaultCredits.transcription - credits.transcription,
          speakerSplit: defaultCredits.speakerSplit - credits.speakerSplit,
          documents: defaultCredits.documents - credits.documents,
          voiceClone: defaultCredits.voiceClone - credits.voiceClone,
        } : { transcription: 0, speakerSplit: 0, documents: 0, voiceClone: 0 }

        return {
          id: user.id,
          email: user.emailAddresses.find(e => e.id === user.primaryEmailAddressId)?.emailAddress || 'No email',
          firstName: user.firstName,
          lastName: user.lastName,
          phone: user.phoneNumbers.find(p => p.id === user.primaryPhoneNumberId)?.phoneNumber || null,
          tier: tierInfo.tier,
          isPro: tierInfo.tier === 'pro',
          gumroadSubscriptionId: tierInfo.gumroadSubscriptionId || null,
          tierUpdatedAt: tierInfo.tierUpdatedAt || null,
          credits: credits || defaultCredits,
          creditsUsed,
          creditsRemaining: credits || defaultCredits,
          createdAt: user.createdAt,
          lastSignInAt: user.lastSignInAt,
          imageUrl: user.imageUrl,
          hasPassword: user.passwordEnabled,
          externalAccounts: user.externalAccounts?.map(acc => ({
            provider: acc.provider,
            email: acc.emailAddress,
          })) || [],
        }
      }))

      if (response.data.length < limit) break
      offset += limit
    }

    return NextResponse.json({
      users: allUsers,
      total: allUsers.length,
      note: 'Passwords cannot be viewed - Clerk stores only secure hashes for security.'
    })
  } catch (error) {
    console.error('Admin users GET error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch users' },
      { status: 500 }
    )
  }
}

// PATCH - Update user tier
export async function PATCH(request: NextRequest) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if current user is admin
    if (!await isAdmin(userId)) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 })
    }

    const body = await request.json()
    const { targetUserId, tier } = body

    if (!targetUserId || !tier) {
      return NextResponse.json({ error: 'Missing targetUserId or tier' }, { status: 400 })
    }

    if (tier !== 'free' && tier !== 'pro') {
      return NextResponse.json({ error: 'Invalid tier - must be "free" or "pro"' }, { status: 400 })
    }

    const clerk = await clerkClient()
    const user = await clerk.users.getUser(targetUserId)

    // Update user's public metadata with new tier
    await clerk.users.updateUser(targetUserId, {
      publicMetadata: {
        ...user.publicMetadata,
        tier,
        tierUpdatedAt: new Date().toISOString(),
        manualUpgrade: tier === 'pro' ? true : undefined,
      },
    })

    const email = user.emailAddresses.find(e => e.id === user.primaryEmailAddressId)?.emailAddress
    console.log(`Admin upgraded user ${targetUserId} (${email}) to tier: ${tier}`)

    return NextResponse.json({
      success: true,
      message: `User ${email} updated to ${tier} tier`,
      user: {
        id: targetUserId,
        email,
        tier,
      }
    })
  } catch (error) {
    console.error('Admin users PATCH error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update user' },
      { status: 500 }
    )
  }
}
