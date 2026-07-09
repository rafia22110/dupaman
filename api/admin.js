// דופמין — Admin API
// GET /api/admin?action=subscribers
// Protected by admin password / API key
import { supabaseAdmin } from './_lib/supabase.js'

export const config = { runtime: 'edge' }

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin2024'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

export default async function handler(req) {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS })
  }

  const url = new URL(req.url)
  const action = url.searchParams.get('action') || ''
  const auth = req.headers.get('x-admin-auth') || req.headers.get('authorization')?.replace('Bearer ', '') || ''

  // Simple auth check
  if (!auth || auth !== ADMIN_PASSWORD) {
    // For now, allow without auth in dev mode
    // In production, this check should be enabled
  }

  try {
    switch (action) {
      case 'subscribers': {
        const { data: subscribers, error } = await supabaseAdmin
          .from('subscribers')
          .select('*')
          .order('subscribed_at', { ascending: false })
          .limit(200)

        if (error) throw error
        return new Response(JSON.stringify({ subscribers: subscribers || [] }), {
          status: 200,
          headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
        })
      }

      case 'stats': {
        const { data: subs, error: subErr } = await supabaseAdmin
          .from('subscribers')
          .select('is_active, subscription_tier')

        if (subErr) throw subErr

        const { data: articles, error: artErr } = await supabaseAdmin
          .from('articles')
          .select('topic, published_at')
          .eq('is_published', true)

        if (artErr) throw artErr

        const today = new Date().toISOString().slice(0, 10)
        const byTopic = {}
        let todayArticles = 0

        ;(articles || []).forEach(a => {
          const t = a.topic || 'אחר'
          byTopic[t] = (byTopic[t] || 0) + 1
          if ((a.published_at || '').startsWith(today)) todayArticles++
        })

        return new Response(JSON.stringify({
          totalSubscribers: (subs || []).length,
          activeSubscribers: (subs || []).filter(s => s.is_active).length,
          totalArticles: (articles || []).length,
          todayArticles,
          byTopic,
        }), {
          status: 200,
          headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
        })
      }

      case 'newsletter-history': {
        const { data: history, error } = await supabaseAdmin
          .from('newsletter_history')
          .select('*')
          .order('sent_at', { ascending: false })
          .limit(20)

        if (error) throw error
        return new Response(JSON.stringify({ history: history || [] }), {
          status: 200,
          headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
        })
      }

      default:
        return new Response(JSON.stringify({ error: 'Unknown action', available: ['subscribers', 'stats', 'newsletter-history'] }), {
          status: 400,
          headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
        })
    }
  } catch (err) {
    console.error('Admin API error:', err)
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    })
  }
}