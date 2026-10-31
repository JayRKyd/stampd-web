import { createClient } from 'jsr:@supabase/supabase-js@2'

// Sends the gift card email. Called by the database (dispatch_gift_email)
// with the card already laid out; this only builds the HTML and hands it
// to Resend. From: "<Shop> via Stampd <gifts@stampdbahamas.com>".

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-internal-secret',
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } })
}

const esc = (s: unknown) =>
  String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

const money = (cents: number) => `$${(cents / 100).toFixed(2)}`

function buildHtml(p: {
  business_name: string; logo_url: string | null; card_color: string; address: string | null
  for_name: string | null; from_name: string | null; note: string | null
  amount_cents: number; claim_code: string; expires_at: string | null; link: string
}) {
  const shop = esc(p.business_name)
  const who = p.for_name ? `For ${esc(p.for_name)}` : 'Gift card'
  const from = p.from_name ? ` · from ${esc(p.from_name)}` : ''
  const greet = p.for_name ? `Hi ${esc(p.for_name)}.` : 'Hi.'
  const sender = p.from_name ? `${esc(p.from_name)} bought you` : "You've got"
  const expires = p.expires_at
    ? ` until ${new Date(p.expires_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`
    : ''
  const initials = esc(p.business_name.slice(0, 2).toUpperCase())
  const logo = p.logo_url
    ? `<img src="${esc(p.logo_url)}" width="36" height="36" alt="" style="display:block;width:36px;height:36px;border-radius:10px;background:#F7F2E8;object-fit:contain">`
    : `<div style="width:36px;height:36px;border-radius:10px;background:#F7F2E8;color:${esc(p.card_color)};font-weight:800;font-size:12px;line-height:36px;text-align:center">${initials}</div>`

  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${sender} a ${money(p.amount_cents)} gift card for ${shop}</title></head>
<body style="margin:0;padding:0;background:#ffffff;font-family:'Plus Jakarta Sans',-apple-system,Segoe UI,Helvetica,Arial,sans-serif;color:#1A2B2A">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#ffffff"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:420px;background:#F7F2E8;border-radius:18px">
<tr><td style="padding:22px 20px 0">
  <div style="font-size:11px;font-weight:700;letter-spacing:1px;color:#00605A">A GIFT FOR YOU</div>
</td></tr>
<tr><td style="padding:16px 20px 0">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${esc(p.card_color)};border-radius:18px;color:#F7F2E8">
    <tr><td style="padding:16px">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
        <td width="36" valign="middle">${logo}</td>
        <td valign="middle" style="padding-left:10px">
          <div style="font-size:15px;font-weight:800;color:#F7F2E8">${shop}</div>
          <div style="font-size:11px;color:rgba(247,242,232,0.75)">${who}${from}</div>
        </td>
        <td align="right" valign="middle"><span style="display:inline-block;font-size:9px;font-weight:800;letter-spacing:1px;color:#0C2E29;background:#d4a843;padding:4px 8px;border-radius:999px">GIFT CARD</span></td>
      </tr></table>
      <div style="font-size:34px;font-weight:800;letter-spacing:-1px;line-height:1;margin-top:14px;color:#F7F2E8">${money(p.amount_cents)}</div>
      ${p.note ? `<div style="margin-top:12px;background:rgba(247,242,232,0.12);border-radius:12px;padding:10px 12px;font-size:13px;line-height:1.4;font-style:italic;color:#F7F2E8">&ldquo;${esc(p.note)}&rdquo;</div>` : ''}
    </td></tr>
  </table>
</td></tr>
<tr><td style="padding:16px 20px 0;font-size:14px;line-height:1.5;color:#1A2B2A">
  ${greet} ${sender} a gift card at ${shop}. Add it to the Stampd app and show your code at the counter whenever you visit. Spend a bit at a time, the balance keeps.
</td></tr>
<tr><td style="padding:18px 20px 0">
  <a href="${esc(p.link)}" style="display:block;background:#00605A;color:#ffffff;text-decoration:none;text-align:center;font-size:15px;font-weight:800;padding:15px 20px;border-radius:999px">Add it to Stampd</a>
</td></tr>
<tr><td style="padding:14px 20px 0">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px"><tr>
    <td style="padding:10px 14px;font-size:12px;color:#74807E">Or type this in the app</td>
    <td align="right" style="padding:10px 14px;font-family:ui-monospace,Menlo,Consolas,monospace;font-size:15px;font-weight:800;letter-spacing:2px;color:#0C2E29">${esc(p.claim_code)}</td>
  </tr></table>
</td></tr>
<tr><td style="padding:18px 20px 22px;font-size:11px;line-height:1.5;color:#74807E">
  Sent by Stampd Bahamas for ${shop}${p.address ? `, ${esc(p.address)}` : ''}. ${shop} keeps the money and honours the balance${expires}. Something wrong? Reply to this email.
</td></tr>
</table>
</td></tr></table>
</body></html>`
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST') return json({ ok: false, reason: 'method_not_allowed' }, 405)

  const internalSecret = Deno.env.get('NOTIFY_INTERNAL_SECRET')
  if (internalSecret && req.headers.get('x-internal-secret') !== internalSecret) {
    return json({ ok: false, reason: 'unauthorized' }, 401)
  }

  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
  let cardId: string | null = null

  try {
    const p = await req.json()
    cardId = p.card_id ?? null
    const resendKey = Deno.env.get('RESEND_API_KEY')
    if (!resendKey) throw new Error('email_not_configured')
    if (!p.to || !p.claim_code) throw new Error('missing_fields')

    const link = `https://stampdbahamas.com/g/${String(p.claim_code).replace('-', '')}`
    const html = buildHtml({ ...p, link })
    const subject = p.from_name
      ? `${p.from_name} sent you a ${money(p.amount_cents)} gift card for ${p.business_name}`
      : `Your ${money(p.amount_cents)} gift card for ${p.business_name}`

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${resendKey}` },
      body: JSON.stringify({
        from: `${p.business_name} via Stampd <${Deno.env.get('GIFT_FROM_ADDRESS') ?? 'gifts@stampdbahamas.com'}>`,
        to: [p.to],
        reply_to: Deno.env.get('GIFT_REPLY_TO') ?? Deno.env.get('ADMIN_EMAIL') ?? undefined,
        subject,
        html,
        text:
          `${subject}.\n\nAdd it to Stampd: ${link}\n\nOr open Stampd, go to Rewards, tap "Have a gift card code?" and type ${p.claim_code}.\n\n` +
          `${p.business_name} keeps the money and honours the balance. Reply to this email if something's wrong.`,
      }),
    })

    if (!res.ok) {
      const body = await res.text()
      throw new Error(`resend_${res.status}: ${body.slice(0, 200)}`)
    }
    return json({ ok: true, delivered: true })
  } catch (e) {
    const msg = String(e instanceof Error ? e.message : e)
    if (cardId) {
      await supabase.from('gift_cards').update({ email_last_error: msg, email_sent_at: null }).eq('id', cardId)
    }
    return json({ ok: false, reason: msg }, 500)
  }
})
