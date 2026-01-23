import { NextRequest, NextResponse } from 'next/server'
import { clerkClient } from '@clerk/nextjs/server'

// Gumroad webhook secret for verification (optional but recommended)
const GUMROAD_WEBHOOK_SECRET = process.env.GUMROAD_WEBHOOK_SECRET

interface GumroadSalePayload {
  seller_id: string
  product_id: string
  product_name: string
  permalink: string
  product_permalink: string
  short_product_id: string
  email: string
  price: number
  gumroad_fee: number
  currency: string
  quantity: number
  discover_fee_charged: boolean
  can_contact: boolean
  referrer: string
  card: {
    visual: string
    type: string
    bin: string
    expiry_month: number
    expiry_year: number
  }
  order_number: number
  sale_id: string
  sale_timestamp: string
  purchaser_id: string
  subscription_id?: string
  variants?: string
  license_key?: string
  ip_country?: string
  is_gift_receiver_purchase?: boolean
  refunded?: boolean
  disputed?: boolean
  dispute_won?: boolean
  test?: boolean
  url_params?: Record<string, string>
  // Custom fields if any
  custom_fields?: Record<string, string>
}

export async function POST(request: NextRequest) {
  try {
    const payload = await request.formData()

    // Convert FormData to object
    const data: Record<string, string> = {}
    payload.forEach((value, key) => {
      data[key] = value.toString()
    })

    console.log('Gumroad webhook received:', JSON.stringify(data, null, 2))

    // Verify this is a sale event (not refund, etc.)
    const email = data.email
    const productPermalink = data.product_permalink || data.permalink
    const isRefunded = data.refunded === 'true'
    const isTest = data.test === 'true'
    const subscriptionId = data.subscription_id

    if (!email) {
      console.error('No email in Gumroad webhook payload')
      return NextResponse.json({ error: 'No email provided' }, { status: 400 })
    }

    // Skip test transactions in production (optionally handle them)
    if (isTest && process.env.NODE_ENV === 'production') {
      console.log('Skipping test transaction')
      return NextResponse.json({ success: true, message: 'Test transaction ignored' })
    }

    // Handle refunds - downgrade user
    if (isRefunded) {
      console.log(`Processing refund for ${email}`)
      await updateUserTier(email, 'free')
      return NextResponse.json({ success: true, message: 'User downgraded due to refund' })
    }

    // Upgrade user to pro
    console.log(`Processing sale for ${email}, product: ${productPermalink}`)
    await updateUserTier(email, 'pro', subscriptionId)

    return NextResponse.json({ success: true, message: 'User upgraded to pro' })
  } catch (error) {
    console.error('Gumroad webhook error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Webhook processing failed' },
      { status: 500 }
    )
  }
}

async function updateUserTier(email: string, tier: 'free' | 'pro', subscriptionId?: string) {
  const clerk = await clerkClient()

  // Find user by email
  const users = await clerk.users.getUserList({
    emailAddress: [email],
  })

  if (users.data.length === 0) {
    console.log(`No Clerk user found for email: ${email}`)
    // User might not have signed up yet - could store this for later
    // For now, we'll just log it
    return
  }

  const user = users.data[0]

  // Update user's public metadata with tier
  await clerk.users.updateUser(user.id, {
    publicMetadata: {
      ...user.publicMetadata,
      tier,
      gumroadSubscriptionId: subscriptionId || null,
      tierUpdatedAt: new Date().toISOString(),
    },
  })

  console.log(`Updated user ${user.id} (${email}) to tier: ${tier}`)
}

// Also handle GET for webhook verification (some services ping GET first)
export async function GET() {
  return NextResponse.json({ status: 'Gumroad webhook endpoint active' })
}
