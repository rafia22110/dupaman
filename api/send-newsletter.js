// דופמין — Newsletter email API
// POST /api/send-newsletter
// Sends newsletter to all active subscribers via Resend
import { supabaseAdmin } from './_lib/supabase.js'

export const config = { runtime: 'edge' }

const RESEND_API_KEY = process.env.RESEND_API_KEY || ''
const SITE_URL = process.env.SITE_URL || 'https://dupaman.vercel.app'

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
    const auth = req.headers.get('authorization')
    const apiSecret = process.env.NEWSLETTER_API_SECRET
    if (apiSecret && auth !== `Bearer ${apiSecret}`) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      })
    }

    // Get active subscribers
    const { data: subscribers, error: subErr } = await supabaseAdmin
      .from('subscribers')
      .select('id, email, name, topics, subscription_tier')
      .eq('is_active', true)

    if (subErr) throw subErr

    // Get latest articles for the newsletter
    const { data: articles, error: artErr } = await supabaseAdmin
      .from('articles')
      .select('*')
      .eq('is_published', true)
      .order('published_at', { ascending: false })
      .limit(5)

    if (artErr) throw artErr

    if (!subscribers || subscribers.length === 0) {
      return new Response(JSON.stringify({ ok: true, sent: 0, message: 'אין מנויים פעילים' }), {
        status: 200, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      })
    }

    // Ensure we have articles — fallback to RSS API
    let newsletterArticles = articles
    if (!newsletterArticles || newsletterArticles.length === 0) {
      try {
        const rssRes = await fetch(`${SITE_URL}/api/articles`)
        const rssData = await rssRes.json()
        newsletterArticles = (rssData.articles || []).slice(0, 5)
      } catch (e) {
        newsletterArticles = []
      }
    }

    // Build newsletter HTML
    const articlesHtml = (newsletterArticles || []).map((a, i) => `
      <tr>
        <td style="padding:24px 0;border-bottom:1px solid #222">
          <div style="display:inline-block;background:rgba(0,255,136,0.12);color:#00ff88;padding:3px 10px;border-radius:20px;font-size:11px;margin-bottom:8px">${esc(a.topic_he || a.topic)}</div>
          <h2 style="font-size:16px;font-weight:700;margin-bottom:8px;line-height:1.4">
            <a href="${SITE_URL}/a/${esc(a.id)}" style="color:#fff;text-decoration:none">${esc(a.title)}</a>
          </h2>
          <p style="font-size:13px;color:#888;line-height:1.6;margin-bottom:8px">${esc((a.description || '').slice(0, 200))}</p>
          <a href="${esc(a.link || '')}" style="color:#00ff88;font-size:12px;text-decoration:none;font-weight:600">קרא מקור →</a>
        </td>
      </tr>
    `).join('')

    let sentCount = 0
    const results = []

    // Send to all active subscribers in batches
    const batchSize = 50
    for (let i = 0; i < subscribers.length; i += batchSize) {
      const batch = subscribers.slice(i, i + batchSize)
      const batchPromises = batch.map(async (sub) => {
        try {
          const r = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${RESEND_API_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              from: 'דופמין <newsletter@dupaman.vercel.app>',
              to: [sub.email],
              subject: `דופמין — ${new Date().toLocaleDateString('he-IL', { weekday: 'long', day: 'numeric', month: 'long' })}`,
              html: emailTemplate(sub.name || 'חבר', articlesHtml),
            }),
          })
          if (r.ok) {
            sentCount++
            return { email: sub.email, ok: true }
          }
          const errText = await r.text()
          console.error(`Failed to send to ${sub.email}:`, errText)
          return { email: sub.email, ok: false, error: errText }
        } catch (e) {
          return { email: sub.email, ok: false, error: e.message }
        }
      })
      const batchResults = await Promise.allSettled(batchPromises)
      results.push(...batchResults.map(r => r.status === 'fulfilled' ? r.value : { ok: false }))
    }

    // Log newsletter history
    await supabaseAdmin.from('newsletter_history').insert({
      article_count: (newsletterArticles || []).length,
      recipient_count: subscribers.length,
      sent_count: sentCount,
      status: sentCount > 0 ? 'sent' : 'failed',
    })

    return new Response(JSON.stringify({
      ok: true,
      sent: sentCount,
      total: subscribers.length,
      results: results.filter(r => !r.ok),
    }), {
      status: 200, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('Send newsletter error:', err)
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    })
  }
}

function esc(s) {
  return String(s || '').replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])
}

function emailTemplate(name, contentHtml) {
  return `<!DOCTYPE html>
<html dir="rtl" lang="he">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;font-family:-apple-system,'Segoe UI',Arial,sans-serif;background:#000;color:#fff">
  <table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:40px 20px">
    <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%">
      <tr><td style="padding:0 0 20px;border-bottom:1px solid #222">
        <table width="100%"><tr>
          <td><span style="font-size:20px;font-weight:900;color:#00ff88">דופמין</span></td>
          <td style="text-align:left"><span style="font-size:11px;color:#555">${new Date().toLocaleDateString('he-IL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</span></td>
        </tr></table>
      </td></tr>
      <tr><td style="padding:32px 0 24px">
        <h1 style="font-size:22px;font-weight:800;margin:0 0 8px">שלום, ${esc(name)}! 👋</h1>
        <p style="font-size:14px;color:#888;line-height:1.6;margin:0">הנה המאמרים החמים של הבוקר, מסוכמים במיוחד בשבילך.</p>
      </td></tr>
      ${contentHtml}
      <tr><td style="padding:32px 0;text-align:center;border-top:1px solid #222">
        <p style="font-size:11px;color:#555;margin:0 0 12px">קיבלת את המייל הזה כי נרשמת לדופמין – ניוזלטר יומי</p>
        <a href="${SITE_URL}/unsubscribe.html" style="color:#666;font-size:11px;text-decoration:underline">ביטול הרשמה</a>
        <p style="font-size:11px;color:#444;margin-top:12px">דופמין © ${new Date().getFullYear()}</p>
      </td></tr>
    </table>
  </td></tr></table>
</body>
</html>`
}