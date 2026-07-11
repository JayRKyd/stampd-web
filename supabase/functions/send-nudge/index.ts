import { createClient } from 'jsr:@supabase/supabase-js@2'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

  try {
    const { user_id } = await req.json()
    if (!user_id) return json({ ok: false, reason: 'missing_user_id' }, 400)

    // Run the RPC as the calling merchant — ownership checks, the 14-day
    // cooldown and the notifications log all happen inside Postgres.
    const supabaseUser = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } } },
    )

    const { data, error } = await supabaseUser.rpc('send_customer_nudge', { p_user_id: user_id })
    if (error) return json({ ok: false, reason: error.message }, 400)
    if (!data?.ok) return json(data, 200)

    // Deliver via Expo push to any registered devices (service role —
    // push_tokens are not readable by merchants).
    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )
    const { data: tokens } = await admin
      .from('push_tokens')
      .select('token')
      .eq('user_id', user_id)

    let delivered = false
    if (tokens && tokens.length > 0) {
      const messages = tokens.map((t: { token: string }) => ({
        to: t.token,
        title: data.title,
        body: data.body,
        sound: 'default',
      }))
      const res = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(messages),
      })
      delivered = res.ok
    }

    return json({ ok: true, delivered, title: data.title, body: data.body })
  } catch (e) {
    return json({ ok: false, reason: String(e) }, 500)
  }
})
