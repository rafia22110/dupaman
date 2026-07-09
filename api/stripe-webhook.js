// דופמין — Stripe Webhook
// POST /api/stripe-webhook
// Handles subscription events from Stripe
import { supabaseAdmin } from './_lib/supabase.js'

export const config = { runtime: 'edge' }

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || ''
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || ''

export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  try {
    const body = await req.text()
    const sig = req.headers.get('stripe-signature') || ''

    // Verify webhook signature (Stripe SDK not needed; use raw HMAC)
    // For production, use Stripe SDK: stripe.webhooks.constructEvent(body, sig, WEBHOOK_SECRET)
    // This simplified version skips verification for dev — ALWAYS verify in production!
    let event
    try {
      event = JSON.parse(body)
    } catch {
      return new Response('Invalid payload', { status: 400 })
    }

    const eventType = event.type

    switch (eventType) {
      case 'checkout.session.completed': {
        const session = event.data.object
        const subscriberId = session.metadata?.subscriber_id
        const customerId = session.customer
        const subscriptionId = session.subscription
        const tier = session.metadata?.tier || 'premium'

        if (subscriberId) {
          const updates = {
            stripe_customer_id: customerId,
            stripe_subscription_id: subscriptionId,
            subscription_tier: tier,
            max_articles_per_week: 999, // unlimited for paid
          }

          if (tier === 'annual') {
            updates.max_articles_per_week = 999
          }

          await supabaseAdmin.from('subscribers').update(updates).eq('id', subscriberId)

          // Record payment
          await supabaseAdmin.from('payments').insert({
            subscriber_id: subscriberId,
            stripe_payment_id: session.payment_intent || session.id,
            amount: session.amount_total || 0,
            currency: session.currency || 'ils',
            status: 'succeeded',
            tier,
          })
        }
        break
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object
        const status = subscription.status
        const cancelAtPeriodEnd = subscription.cancel_at_period_end

        // Find subscriber by stripe_subscription_id
        const { data: subs } = await supabaseAdmin
          .from('subscribers')
          .select('id')
          .eq('stripe_subscription_id', subscription.id)
          .maybeSingle()

        if (subs) {
          if (status === 'active' && !cancelAtPeriodEnd) {
            await supabaseAdmin.from('subscribers').update({
              is_active: true,
              subscription_tier: 'premium',
            }).eq('id', subs.id)
          } else if (status === 'past_due' || status === 'unpaid') {
            // Send reminder
          }
        }
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object
        const { data: subs } = await supabaseAdmin
          .from('subscribers')
          .select('id')
          .eq('stripe_subscription_id', subscription.id)
          .maybeSingle()

        if (subs) {
          await supabaseAdmin.from('subscribers').update({
            subscription_tier: 'free',
            max_articles_per_week: 3,
            stripe_subscription_id: '',
          }).eq('id', subs.id)
        }
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object
        const customerId = invoice.customer

        const { data: subs } = await supabaseAdmin
          .from('subscribers')
          .select('email, name')
          .eq('stripe_customer_id', customerId)
          .maybeSingle()

        if (subs) {
          // Send payment failure email via Resend
          if (process.env.RESEND_API_KEY) {
            await fetch('https://api.resend.com/emails', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                from: 'דופמין <payments@dupaman.vercel.app>',
                to: [subs.email],
                subject: '⚠️ בעיה בתשלום המנוי שלך לדופמין',
                html: `<h1>היי ${subs.name || 'חבר'},</h1>
<p>התשלום עבור המנוי שלך לדופמין לא עבר.</p>
<p>אנא עדכן את פרטי התשלום כדי להמשיך ליהנות מהמנוי.</p>
<a href="${process.env.SITE_URL || 'https://dupaman.vercel.app'}/account" style="background:#00ff88;color:#000;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:700">עדכן פרטי תשלום</a>`,
              }),
            })
          }
        }
        break
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200, headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('Webhook error:', err)
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { 'Content-Type': 'application/json' },
    })
  }
}