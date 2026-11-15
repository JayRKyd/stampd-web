import { createClient } from 'jsr:@supabase/supabase-js@2'

// Turns a staff invite code into a signed-in phone for the Stampd Business app.
//
// The owner makes a one-time code (create_staff_invite). The staff member's
// app sends it here. We make a login that exists only for that phone, link
// it to their staff row, and hand back a session. No email or password is
// ever shown to anyone. A second join on the same staff row replaces the
// old phone.

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } })
}

const hex = (buf: ArrayBuffer | Uint8Array) =>
  [...new Uint8Array(buf as ArrayBuffer)].map((b) => b.toString(16).padStart(2, '0')).join('')

const randomHex = (bytes: number) => hex(crypto.getRandomValues(new Uint8Array(bytes)))

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST') return json({ ok: false, error: 'method_not_allowed' }, 405)

  try {
    const body = await req.json().catch(() => ({}))
    const code = String(body?.code ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8)
    if (code.length !== 8) return json({ ok: false, error: 'bad_code' })

    const url = Deno.env.get('SUPABASE_URL')!
    const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
      auth: { persistSession: false, autoRefreshToken: false },
    })

    // Same hash as public.staff_invite_hash()
    const hash = hex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(code)))

    const { data: staff, error: findErr } = await admin
      .from('staff')
      .select('id, name, user_id, is_active, invite_expires_at, merchants(business_name, staff_logins_enabled)')
      .eq('invite_hash', hash)
      .maybeSingle()
    if (findErr) throw findErr

    const shop = (Array.isArray(staff?.merchants) ? staff?.merchants[0] : staff?.merchants) as
      | { business_name: string; staff_logins_enabled: boolean }
      | null
      | undefined

    if (!staff || !staff.is_active || !staff.invite_expires_at || new Date(staff.invite_expires_at).getTime() < Date.now()) {
      return json({ ok: false, error: 'not_found' })
    }
    if (!shop?.staff_logins_enabled) return json({ ok: false, error: 'not_enabled' })

    // A login for this phone only
    const email = `staff-${staff.id}-${randomHex(4)}@staff.stampdbahamas.com`
    const password = randomHex(32)
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { role: 'staff', staff_id: staff.id },
    })
    if (createErr || !created?.user) throw createErr ?? new Error('create_failed')

    // Claim the invite. The hash in the filter makes this one-time: if another
    // phone got there first, nothing matches and this login is thrown away.
    const { data: claimed, error: claimErr } = await admin
      .from('staff')
      .update({ user_id: created.user.id, invite_hash: null, invite_expires_at: null, joined_at: new Date().toISOString() })
      .eq('id', staff.id)
      .eq('invite_hash', hash)
      .select('id')
    if (claimErr || !claimed?.length) {
      await admin.auth.admin.deleteUser(created.user.id).catch(() => {})
      if (claimErr) throw claimErr
      return json({ ok: false, error: 'not_found' })
    }

    // The phone that was connected before, if any, is signed out for good
    if (staff.user_id) await admin.auth.admin.deleteUser(staff.user_id).catch(() => {})

    const anon = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
    const { data: signedIn, error: signErr } = await anon.auth.signInWithPassword({ email, password })
    if (signErr || !signedIn?.session) throw signErr ?? new Error('sign_in_failed')

    return json({
      ok: true,
      access_token: signedIn.session.access_token,
      refresh_token: signedIn.session.refresh_token,
      staff_name: staff.name,
      business_name: shop.business_name,
    })
  } catch (e) {
    console.log('staff-join failed', String(e instanceof Error ? e.message : e))
    return json({ ok: false, error: 'server_error' }, 500)
  }
})
