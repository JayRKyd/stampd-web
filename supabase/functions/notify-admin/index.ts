import { createClient } from 'jsr:@supabase/supabase-js@2'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-internal-secret',
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST') return json({ ok: false, reason: 'method_not_allowed' }, 405)

  const internalSecret = Deno.env.get('NOTIFY_INTERNAL_SECRET')
  if (internalSecret && req.headers.get('x-internal-secret') !== internalSecret) {
    return json({ ok: false, reason: 'unauthorized' }, 401)
  }

  try {
    const payload = await req.json()
    const record = payload.record ?? payload
    const businessName = record.business_name ?? 'Unknown business'
    const merchantType = record.merchant_type ?? 'merchant'
    const category = record.category ?? ''

    const adminEmail = Deno.env.get('ADMIN_EMAIL')
    const resendKey = Deno.env.get('RESEND_API_KEY')

    if (!adminEmail || !resendKey) {
      console.log(`New merchant signup: ${businessName} (${merchantType}, ${category})`)
      return json({ ok: true, delivered: false, reason: 'email_not_configured' })
    }

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${resendKey}`,
      },
      body: JSON.stringify({
        from: Deno.env.get('RESEND_FROM') ?? 'Stampd <no-reply@stampdbahamas.com>',
        to: [adminEmail],
        subject: `New merchant signup: ${businessName}`,
        html: `<p>A new merchant signed up on Stampd.</p>
          <ul>
            <li><strong>Business:</strong> ${businessName}</li>
            <li><strong>Type:</strong> ${merchantType}</li>
            <li><strong>Category:</strong> ${category || '—'}</li>
          </ul>
          <p>Review and approve them in the admin panel.</p>`,
      }),
    })

    return json({ ok: true, delivered: res.ok })
  } catch (e) {
    return json({ ok: false, reason: String(e) }, 500)
  }
})
