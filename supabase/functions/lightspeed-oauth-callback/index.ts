// Lightspeed X-Series OAuth callback. Exchanges the one-time code for
// tokens, stores the connection, auto-links it to the Stampd merchant when
// the state carries a valid signature (from pos-connect-start), and
// registers the sale.update webhook. Deploy with verify_jwt OFF: this is an
// external browser redirect from Lightspeed.
import { createClient } from 'npm:@supabase/supabase-js@2'

async function hmac(input: string, key: string): Promise<string> {
  const k = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(key), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  )
  const sig = await crypto.subtle.sign('HMAC', k, new TextEncoder().encode(input))
  return Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('')
}

// state = merchantId.expiry.signature — returns merchantId only if the
// signature checks out and it hasn't expired
async function verifyState(state: string | null, secret: string): Promise<string | null> {
  if (!state) return null
  const parts = state.split('.')
  if (parts.length !== 3) return null
  const [merchantId, exp, sig] = parts
  if (Number(exp) < Math.floor(Date.now() / 1000)) return null
  const expected = await hmac(`${merchantId}.${exp}`, secret)
  return sig === expected ? merchantId : null
}

function page(title: string, body: string, ok: boolean) {
  const html =
    `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${title}</title></head>` +
    `<body style="font-family:system-ui,sans-serif;background:#F7F2E8;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0">` +
    `<div style="background:#fff;border-radius:16px;padding:32px;max-width:420px;text-align:center;border:1px solid #E8E0CD">` +
    `<div style="font-size:40px">${ok ? '✅' : '⚠️'}</div>` +
    `<h1 style="font-size:20px;color:#1A2B2A;margin:12px 0 8px">${title}</h1>` +
    `<p style="font-size:14px;color:#74807E;line-height:1.5;margin:0">${body}</p>` +
    `</div></body></html>`
  const headers = new Headers()
  headers.set('content-type', 'text/html; charset=utf-8')
  return new Response(html, { status: ok ? 200 : 400, headers })
}

Deno.serve(async (req: Request) => {
  const url = new URL(req.url)
  const err = url.searchParams.get('error')
  if (err) {
    return page('Authorization declined', 'The Lightspeed connection was not approved. You can close this tab and try again from Stampd.', false)
  }

  const code = url.searchParams.get('code')
  const domainPrefix = url.searchParams.get('domain_prefix')
  const state = url.searchParams.get('state')
  if (!code || !domainPrefix) {
    return page('Missing details', 'This link is incomplete. Start the connection again from Stampd.', false)
  }

  const clientId = Deno.env.get('LS_CLIENT_ID')
  const clientSecret = Deno.env.get('LS_CLIENT_SECRET')
  if (!clientId || !clientSecret) {
    return page('Not configured yet', 'Stampd has not finished setting up the Lightspeed connection (missing credentials). Contact Stampd support.', false)
  }

  const tokenRes = await fetch(`https://${domainPrefix}.retail.lightspeed.app/api/1.0/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'authorization_code',
      redirect_uri: `${Deno.env.get('SUPABASE_URL')}/functions/v1/lightspeed-oauth-callback`,
    }),
  })

  const tokenText = await tokenRes.text()
  if (!tokenRes.ok) {
    console.error('token exchange failed', tokenRes.status, tokenText)
    return page('Connection failed', `Lightspeed rejected the token exchange (HTTP ${tokenRes.status}). Try connecting again; if it keeps failing, contact Stampd.`, false)
  }

  let tokens: Record<string, unknown>
  try { tokens = JSON.parse(tokenText) } catch {
    console.error('unparseable token response', tokenText)
    return page('Connection failed', 'Lightspeed returned an unexpected response. Contact Stampd.', false)
  }

  // Signed state from the dashboard button links the store to its merchant
  const linkedMerchantId = await verifyState(state, clientSecret)

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  const upsertRow: Record<string, unknown> = {
    provider: 'lightspeed_xseries',
    domain_prefix: domainPrefix,
    access_token: tokens.access_token as string,
    refresh_token: (tokens.refresh_token as string) ?? null,
    token_expires_at: tokens.expires ? new Date(Number(tokens.expires) * 1000).toISOString() : null,
    scope: (tokens.scope as string) ?? null,
    oauth_state: state,
    status: 'connected',
    updated_at: new Date().toISOString(),
  }
  if (linkedMerchantId) upsertRow.merchant_id = linkedMerchantId

  const { error: dbErr } = await supabase.from('pos_connections').upsert(upsertRow, { onConflict: 'provider,domain_prefix' })

  if (dbErr) {
    console.error('failed to store connection', dbErr)
    return page('Almost there', 'Lightspeed approved the connection but Stampd could not save it. Contact Stampd support.', false)
  }

  // Auto-register the sale.update webhook. Duplicate registrations are
  // harmless: the processor dedupes by sale id.
  try {
    const hookData = JSON.stringify({
      url: `${Deno.env.get('SUPABASE_URL')}/functions/v1/lightspeed-webhook`,
      active: true,
      type: 'sale.update',
    })
    const hookRes = await fetch(`https://${domainPrefix}.retail.lightspeed.app/api/webhooks`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${tokens.access_token}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({ data: hookData }),
    })
    if (!hookRes.ok) console.error('webhook registration failed', hookRes.status, await hookRes.text())
    else console.log('webhook registered for', domainPrefix)
  } catch (e) {
    console.error('webhook registration error', e)
  }

  return page(
    'Store connected',
    linkedMerchantId
      ? `${domainPrefix} is now connected to your Stampd account. Sales with a customer PIN in the note will stamp automatically — you can close this tab.`
      : `${domainPrefix} is connected. Stampd will finish linking it to your business shortly — you can close this tab.`,
    true
  )
})
