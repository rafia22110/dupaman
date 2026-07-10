// דופמין — Stripe Checkout API
// POST /api/checkout — creates Stripe Checkout session
import { supabaseAdmin } from './_lib/supabase.js'

export const config = { runtime: 'edge' }

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || ''
const SITE_URL = process.env.SITE_URL || 'https://dupaman.vercel.app'

const PRICE_IDS = {
  premium_monthly: process.env.STRIPE_PRICE_PREMIUM_MONTHLY || '',
  premium_annual: process.env.STRIPE_PRICE_PREMIUM_ANNUAL || '',
}

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

export default async function handler(req) {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS })
  }
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    })
  }

  try {
    const { priceId, email, subscriberId, tier } = await req.json()

    if (!priceId || !email) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      })
    }

    // Create Stripe Checkout Session via REST (no SDK dependency)
    const stripeRes = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${STRIPE_SECRET_KEY}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        'mode': 'subscription',
        'line_items[0][price]': priceId,
        'line_items[0][quantity]': '1',
        'customer_email': email,
        'success_url': `${SITE_URL}/success.html?session_id={CHECKOUT_SESSION_ID}`,
        'cancel_url': `${SITE_URL}/?canceled=1`,
        'metadata[subscriber_id]': subscriberId || '',
        'metadata[tier]': tier || 'premium',
        'subscription_data[metadata][subscriber_id]': subscriberId || '',
      }).toString(),
    })

    if (!stripeRes.ok) {
      const errBody = await stripeRes.text()
      console.error('Stripe checkout error:', stripeRes.status, errBody)
      return new Response(JSON.stringify({ error: 'Stripe error', detail: errBody }), {
        status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      })
    }

    const session = await stripeRes.json()

    return new Response(JSON.stringify({
      ok: true,
      sessionId: session.id,
      url: session.url,
    }), {
      status: 200, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('Checkout error:', err)
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    })
  }
}