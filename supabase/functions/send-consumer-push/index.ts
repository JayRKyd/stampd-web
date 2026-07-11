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
    const { user_id, title, body: messageBody } = await req.json()
    if (!user_id || !title || !messageBody) {
      return json({ ok: false, reason: 'missing_fields' }, 400)
    }

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    const { data: tokens } = await admin
      .from('push_tokens')
      .select('token')
      .eq('user_id', user_id)

    if (!tokens?.length) {
      return json({ ok: true, delivered: false, reason: 'no_tokens' })
    }

    const messages = tokens.map((t: { token: string }) => ({
      to: t.token,
      title,
      body: messageBody,
      sound: 'default',
    }))

    const res = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(messages),
    })

    return json({ ok: true, delivered: res.ok })
  } catch (e) {
    return json({ ok: false, reason: String(e) }, 500)
  }
})
