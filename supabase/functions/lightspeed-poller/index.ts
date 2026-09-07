// Polling backstop: Lightspeed says webhook delivery isn't guaranteed, so
// every few minutes we sweep each connected store's recent sales via the
// API and feed anything with a PIN through the same processor. Dedupe by
// sale id makes this safe to overlap with webhooks. Also re-runs webhook
// events whose processing failed. Runs via pg_cron; no auth needed —
// idempotent, returns only counts. Deploy with verify_jwt OFF.
import { createClient } from 'npm:@supabase/supabase-js@2'

function extractPin(note: string | null | undefined): string | null {
  if (!note) return null
  const tagged = note.match(/stmp[\s:_-]*([0-9]{6})/i)
  if (tagged) return tagged[1]
  const bare = note.match(/(?<![0-9])([0-9]{6})(?![0-9])/)
  return bare ? bare[1] : null
}

Deno.serve(async (_req: Request) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  let swept = 0
  let backfilled = 0
  let reprocessed = 0

  // 1. Re-run webhook events that logged but failed to process (older than
  //    2 minutes so we don't race the webhook's own inline processing)
  const { data: stuck } = await supabase
    .from('pos_events')
    .select('id')
    .eq('processed', false)
    .lt('created_at', new Date(Date.now() - 2 * 60 * 1000).toISOString())
    .limit(50)
  for (const ev of stuck ?? []) {
    const { error } = await supabase.rpc('process_pos_event', { p_event_id: ev.id })
    if (!error) reprocessed++
  }

  // 2. Sweep recent sales per connected store
  const { data: connections } = await supabase
    .from('pos_connections')
    .select('id, domain_prefix, access_token, merchant_id, poll_cursor')
    .eq('provider', 'lightspeed_xseries')
    .eq('status', 'connected')
    .not('access_token', 'is', null)

  for (const conn of connections ?? []) {
    try {
      const res = await fetch(
        `https://${conn.domain_prefix}.retail.lightspeed.app/api/2.0/sales?after=${conn.poll_cursor}&page_size=100`,
        { headers: { Authorization: `Bearer ${conn.access_token}` } }
      )
      if (!res.ok) {
        console.error('poll failed', conn.domain_prefix, res.status)
        continue // 401 heals via token refresher; transient errors retry next run
      }
      const body = await res.json()
      const sales = (body?.data ?? []) as Array<Record<string, unknown>>
      let maxVersion = Number(conn.poll_cursor)

      for (const sale of sales) {
        swept++
        const version = Number(sale.version ?? 0)
        if (version > maxVersion) maxVersion = version

        const note = (sale.note as string | undefined) ?? null
        const pin = extractPin(note)
        if (!pin || sale.status !== 'CLOSED') continue

        // Skip sales the webhook already handled
        const { data: existing } = await supabase
          .from('pos_events')
          .select('id')
          .eq('provider', 'lightspeed_xseries')
          .eq('sale_id', sale.id as string)
          .eq('processed', true)
          .limit(1)
        if (existing && existing.length > 0) continue

        const { data: inserted } = await supabase.from('pos_events').insert({
          provider: 'lightspeed_xseries',
          event_type: 'poll.sale',
          domain_prefix: conn.domain_prefix,
          sale_id: sale.id as string,
          sale_status: sale.status as string,
          note,
          extracted_pin: pin,
          payload: sale,
          raw_body: null,
        }).select('id').single()

        if (inserted?.id) {
          const { error } = await supabase.rpc('process_pos_event', { p_event_id: inserted.id })
          if (!error) backfilled++
        }
      }

      if (maxVersion > Number(conn.poll_cursor)) {
        await supabase.from('pos_connections')
          .update({ poll_cursor: maxVersion, updated_at: new Date().toISOString() })
          .eq('id', conn.id)
      }
    } catch (e) {
      console.error('poll error', conn.domain_prefix, e)
    }
  }

  // 3. Surface dead connections in the logs (dashboard also shows a banner)
  const { data: dead } = await supabase
    .from('pos_connections')
    .select('domain_prefix')
    .eq('status', 'needs_reconnect')
  if (dead && dead.length > 0) {
    console.error('CONNECTIONS NEEDING RECONNECT:', dead.map(d => d.domain_prefix).join(', '))
  }

  return Response.json({ ok: true, swept, backfilled, reprocessed, needsReconnect: dead?.length ?? 0 })
})
