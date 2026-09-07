// Keeps every Lightspeed connection alive. Runs hourly via pg_cron; also
// callable with ?force=1 to refresh all connections regardless of expiry
// (used for testing). Refreshing is harmless + returns no secrets, so it
// needs no auth. CRITICAL Lightspeed behavior: every refresh returns a NEW
// refresh token that replaces the old one — each store is saved
// immediately, row by row, never batched. Deploy with verify_jwt OFF.
import { createClient } from 'npm:@supabase/supabase-js@2'

Deno.serve(async (req: Request) => {
  const force = new URL(req.url).searchParams.get('force') === '1'

  const clientId = Deno.env.get('LS_CLIENT_ID')
  const clientSecret = Deno.env.get('LS_CLIENT_SECRET')
  if (!clientId || !clientSecret) {
    return Response.json({ ok: false, error: 'missing client credentials' }, { status: 500 })
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  const cutoff = new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString()
  let query = supabase
    .from('pos_connections')
    .select('id, domain_prefix, refresh_token, token_expires_at')
    .eq('provider', 'lightspeed_xseries')
    .eq('status', 'connected')
    .not('refresh_token', 'is', null)
  if (!force) query = query.lt('token_expires_at', cutoff)

  const { data: connections, error } = await query
  if (error) {
    console.error('connection query failed', error)
    return Response.json({ ok: false }, { status: 500 })
  }

  let refreshed = 0
  let failed = 0

  for (const conn of connections ?? []) {
    try {
      const res = await fetch(`https://${conn.domain_prefix}.retail.lightspeed.app/api/1.0/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          refresh_token: conn.refresh_token,
          client_id: clientId,
          client_secret: clientSecret,
          grant_type: 'refresh_token',
        }),
      })
      const text = await res.text()

      if (!res.ok) {
        console.error('refresh failed', conn.domain_prefix, res.status, text)
        failed++
        // 4xx = the grant itself is dead (revoked/uninstalled): merchant must reconnect.
        // 5xx/network = Lightspeed hiccup: leave as-is, next hourly run retries.
        if (res.status >= 400 && res.status < 500) {
          await supabase.from('pos_connections')
            .update({ status: 'needs_reconnect', updated_at: new Date().toISOString() })
            .eq('id', conn.id)
        }
        continue
      }

      const tokens = JSON.parse(text)
      const { error: upErr } = await supabase.from('pos_connections').update({
        access_token: tokens.access_token,
        // Lightspeed rotates the refresh token on every use — keep old one
        // only if (unexpectedly) none came back
        refresh_token: tokens.refresh_token ?? conn.refresh_token,
        token_expires_at: tokens.expires ? new Date(Number(tokens.expires) * 1000).toISOString() : null,
        status: 'connected',
        updated_at: new Date().toISOString(),
      }).eq('id', conn.id)

      if (upErr) {
        console.error('token save failed', conn.domain_prefix, upErr)
        failed++
      } else {
        refreshed++
        console.log('refreshed', conn.domain_prefix)
      }
    } catch (e) {
      console.error('refresh error', conn.domain_prefix, e)
      failed++
    }
  }

  return Response.json({ ok: true, checked: connections?.length ?? 0, refreshed, failed })
})
