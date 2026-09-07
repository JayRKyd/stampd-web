// Starts the Lightspeed connect flow from the merchant dashboard. Runs as
// the signed-in merchant owner (deploy with verify_jwt ON), resolves their
// merchant, and returns the Lightspeed authorize URL with a signed state so
// the callback can auto-link the connection to the right merchant. The
// signature (HMAC over merchant id + expiry, keyed by the client secret)
// prevents anyone from forging a link to a merchant they don't own.
import { createClient } from 'npm:@supabase/supabase-js@2'

const ALLOWED_ORIGINS = new Set([
  'https://www.stampdbahamas.com',
  'https://stampdbahamas.com',
  'http://localhost:5173',
])

function corsHeaders(req: Request): Headers {
  const h = new Headers()
  const origin = req.headers.get('origin') ?? ''
  if (ALLOWED_ORIGINS.has(origin)) h.set('Access-Control-Allow-Origin', origin)
  h.set('Access-Control-Allow-Headers', 'authorization, x-client-info, apikey, content-type')
  h.set('Access-Control-Allow-Methods', 'POST, OPTIONS')
  return h
}

function json(req: Request, body: unknown, status = 200): Response {
  const h = corsHeaders(req)
  h.set('content-type', 'application/json')
  return new Response(JSON.stringify(body), { status, headers: h })
}

async function hmac(input: string, key: string): Promise<string> {
  const k = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(key), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  )
  const sig = await crypto.subtle.sign('HMAC', k, new TextEncoder().encode(input))
  return Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('')
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders(req) })
  }

  const clientId = Deno.env.get('LS_CLIENT_ID')
  const clientSecret = Deno.env.get('LS_CLIENT_SECRET')
  if (!clientId || !clientSecret) {
    return json(req, { error: 'POS integration not configured' }, 500)
  }

  const authHeader = req.headers.get('Authorization') ?? ''
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } }
  )
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return json(req, { error: 'not signed in' }, 401)

  const service = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )
  const { data: merchant } = await service
    .from('merchants')
    .select('id')
    .eq('owner_id', user.id)
    .maybeSingle()
  if (!merchant) return json(req, { error: 'no merchant account' }, 403)

  const exp = Math.floor(Date.now() / 1000) + 30 * 60
  const base = `${merchant.id}.${exp}`
  const state = `${base}.${await hmac(base, clientSecret)}`

  const redirectUri = `${Deno.env.get('SUPABASE_URL')}/functions/v1/lightspeed-oauth-callback`
  const url =
    `https://secure.retail.lightspeed.app/connect?response_type=code` +
    `&client_id=${encodeURIComponent(clientId)}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&state=${encodeURIComponent(state)}`

  return json(req, { url })
})
