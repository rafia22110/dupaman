// דופמין — Subscribe API
// POST /api/subscribe
// Creates a subscriber in Supabase and sends welcome email via Resend
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
    const { email, name, topics } = await req.json()
    if (!email || !email.includes('@')) {
      return new Response(JSON.stringify({ error: 'Invalid email' }), {
        status: 400, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      })
    }

    // Check if already subscribed
    const { data: existing } = await supabaseAdmin
      .from('subscribers')
      .select('id, is_active')
      .eq('email', email)
      .maybeSingle()

    if (existing) {
      if (existing.is_active) {
        return new Response(JSON.stringify({ error: 'כבר רשום!', alreadyRegistered: true }), {
          status: 409, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
        })
      }
      // Re-activate
      await supabaseAdmin
        .from('subscribers')
        .update({ is_active: true, unsubscribed_at: null, topics: topics || [] })
        .eq('id', existing.id)

      // Send re-subscribe email
      await sendEmail(email, name || 'חבר', 'welcome-back')

      return new Response(JSON.stringify({ ok: true, message: 'ברוך שובך!', reactivated: true }), {
        status: 200, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      })
    }

    // New subscriber
    const { data, error } = await supabaseAdmin
      .from('subscribers')
      .insert({ email, name: name || '', topics: topics || [] })
      .select()
      .single()

    if (error) {
      console.error('Supabase insert error:', error)
      return new Response(JSON.stringify({ error: 'שגיאה בהרשמה. נסה שוב.' }), {
        status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      })
    }

    // Send welcome email
    await sendEmail(email, name || 'חבר', 'welcome')

    return new Response(JSON.stringify({
      ok: true,
      subscriber: data,
      message: 'נרשמת בהצלחה! בדוק את תיבת המייל שלך.',
    }), {
      status: 200, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('Subscribe error:', err)
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    })
  }
}

async function sendEmail(to, name, type) {
  if (!RESEND_API_KEY) {
    console.warn('RESEND_API_KEY not set — skipping email')
    return
  }

  const templates = {
    welcome: {
      subject: 'ברוך הבא לדופמין! 🎉',
      html: `<h1 style="color:#00ff88">ברוך הבא לדופמין, ${name}!</h1>
<p>נרשמת בהצלחה לניוזלטר היומי שלנו.</p>
<p>מחר בבוקר ב-7:00 תקבל את הגיליון הראשון שלך עם מיטב המאמרים מסוכמים בעברית.</p>
<p>בברכה,<br/>צוות דופמין</p>
<p style="color:#888;font-size:12px">ניתן לבטל בכל עת: ${SITE_URL}/unsubscribe.html?email=${to}</p>`,
    },
    'welcome-back': {
      subject: 'ברוך שובך לדופמין! 🔄',
      html: `<h1 style="color:#00ff88">ברוך שובך לדופמין, ${name}!</h1>
<p>המנוי שלך חודש. נמשיך לשלוח לך את הניוזלטר היומי כרגיל.</p>
<p>בברכה,<br/>צוות דופמין</p>`,
    },
  }

  const tpl = templates[type] || templates.welcome

  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'דופמין <newsletter@dupaman.vercel.app>',
        to: [to],
        subject: tpl.subject,
        html: tpl.html,
      }),
    })
    if (!r.ok) {
      const errBody = await r.text()
      console.error('Resend email failed:', r.status, errBody)
    }
  } catch (e) {
    console.error('Resend send error:', e)
  }
}