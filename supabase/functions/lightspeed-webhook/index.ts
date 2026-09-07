// Lightspeed X-Series webhook receiver. Logs every delivery to pos_events,
// extracts a Stampd PIN from the sale note, then hands the event to the
// process_pos_event DB function (dedupe by sale, CLOSED only, resolve
// merchant, stamp via issue_stamp_by_personal_pin). Deploy with verify_jwt
// OFF: external caller; the DB functions gate on the service_role context.
import { createClient } from 'npm:@supabase/supabase-js@2'

// 6-digit PIN, optionally written as STMP-123456 / stmp 123456 / bare digits.
function extractPin(note: string | null | undefined): string | null {
  if (!note) return null
  const tagged = note.match(/stmp[\s:_-]*([0-9]{6})/i)
  if (tagged) return tagged[1]
  const bare = note.match(/(?<![0-9])([0-9]{6})(?![0-9])/)
  return bare ? bare[1] : null
}

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response('ok', { status: 200 })
  }

  const rawBody = await req.text()
  const contentType = req.headers.get('content-type') ?? ''

  let eventType: string | null = null
  let domainPrefix: string | null = null
  let payload: unknown = null

  try {
    if (contentType.includes('application/json')) {
      const parsed = JSON.parse(rawBody)
      eventType = parsed.type ?? null
      domainPrefix = parsed.domain_prefix ?? parsed.retailer ?? null
      payload = parsed.payload ? (typeof parsed.payload === 'string' ? JSON.parse(parsed.payload) : parsed.payload) : parsed
    } else {
      // Lightspeed sends form-encoded with the JSON inside a `payload` field
      const form = new URLSearchParams(rawBody)
      eventType = form.get('type')
      domainPrefix = form.get('domain_prefix') ?? form.get('retailer_id')
      const payloadField = form.get('payload')
      if (payloadField) {
        try { payload = JSON.parse(payloadField) } catch { payload = { unparseable: payloadField } }
      }
    }
  } catch (e) {
    console.error('parse failure', e)
  }

  const sale = (payload ?? {}) as Record<string, unknown>
  const note = (sale.note as string | undefined) ?? null
  const pin = extractPin(note)

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  const { data: inserted, error } = await supabase.from('pos_events').insert({
    provider: 'lightspeed_xseries',
    event_type: eventType,
    domain_prefix: domainPrefix,
    sale_id: (sale.id as string | undefined) ?? null,
    sale_status: (sale.status as string | undefined) ?? null,
    note,
    extracted_pin: pin,
    payload: payload ?? null,
    raw_body: rawBody.slice(0, 100000),
  }).select('id').single()
  if (error) console.error('pos_events insert failed', error)

  // Process immediately so the customer's push lands while they're still
  // at the counter. The poller re-runs anything left unprocessed.
  if (inserted?.id) {
    const { data: result, error: procErr } = await supabase.rpc('process_pos_event', { p_event_id: inserted.id })
    if (procErr) console.error('process_pos_event failed', procErr)
    else console.log('processed', { eventId: inserted.id, result })
  }

  console.log('webhook received', { eventType, domainPrefix, saleId: sale.id, saleStatus: sale.status, hasNote: !!note, pin })

  // Always 200 fast — Lightspeed disables webhooks that keep failing
  return Response.json({ ok: true })
})
