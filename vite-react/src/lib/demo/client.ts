/* eslint-disable @typescript-eslint/no-explicit-any */
// The stand-in for the Supabase client used by the public demo (see mode.ts).
// It keeps a made-up shop in memory and answers the same calls the dashboard
// makes: table reads with filters, the RPCs, storage and functions. Writes
// change the in-memory copy only, so a visitor can stamp, redeem and edit the
// card and see it take effect, and a refresh puts everything back.

type Row = Record<string, any>

const MERCHANT_ID = 'demo-merchant'
const OWNER_ID = 'demo-owner'
const CARD_ID = 'demo-card'
const SHOP = 'Bay Street Coffee'
const DAY = 86400000

const FIRST = ['Alicia', 'Devon', 'Shanice', 'Kareem', 'Tamika', 'Jerome', 'Latoya', 'Andre', 'Keisha', 'Marvin', 'Chantal', 'Dwayne',
  'Nadia', 'Trevor', 'Simone', 'Lamar', 'Renee', 'Gregory', 'Monique', 'Ricardo', 'Alexis', 'Brandon', 'Crystal', 'Darius',
  'Erica', 'Floyd', 'Gabrielle', 'Hakeem', 'Indira', 'Jamal', 'Kendra', 'Lionel', 'Maya', 'Nigel', 'Olivia', 'Perry',
  'Raquel', 'Stefan', 'Tia', 'Ulric', 'Vanessa', 'Wesley', 'Yolanda', 'Zane', 'Bianca', 'Cedric', 'Danielle', 'Ethan']
const LAST = ['Rolle', 'Ferguson', 'Knowles', 'Smith', 'Johnson', 'Moss', 'Stuart', 'Bain', 'Taylor', 'Cooper', 'Miller', 'Sands',
  'Russell', 'Bethel', 'Major', 'Gibson', 'Adderley', 'Munroe', 'Curry', 'Thompson', 'Pinder', 'Deveaux', 'Hanna', 'Strachan']

function mulberry32(a: number) {
  return () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

let seq = 0
const newId = (p: string) => `demo-${p}-${++seq}`
const iso = (ms: number) => new Date(ms).toISOString()

interface Person { user_id: string; first_name: string; last_name: string; pin: string; kind: 'vip' | 'regular' | 'slipping' | 'new' | 'casual' }

interface Db {
  tables: Record<string, Row[]>
  people: Person[]
  pins: Record<string, string>          // PIN typed this visit -> user_id
  nudged: Record<string, string>
  gift: { cards: Row[]; events: Row[] }
  specials: Row[]
  files: Record<string, string>
}

let db: Db | null = null

function card(d: Db): Row { return d.tables.loyalty_cards[0] }
function tiers(d: Db): Row[] {
  return d.tables.reward_tiers.filter(t => t.loyalty_card_id === CARD_ID).sort((a, b) => a.stamp_threshold - b.stamp_threshold)
}
function person(d: Db, userId: string) { return d.people.find(p => p.user_id === userId) }
function totalStamps(d: Db, userId: string) {
  return d.tables.stamp_events.reduce((n, e) => n + (e.user_id === userId ? (e.quantity ?? 1) : 0), 0)
}

// Adds one stamp event and whatever rewards it earns. Shared by the seed data
// and by the Issue Stamp screen.
function addStamp(d: Db, p: Person, at: number, quantity: number, staff: Row | null, settle?: (createdAt: number) => { status: string; redeemed_at: string | null }) {
  const goal = Math.max(1, Number(card(d).stamp_count_required) || 8)
  let membership = d.tables.memberships.find(m => m.user_id === p.user_id)
  if (!membership) {
    membership = { id: newId('mem'), merchant_id: MERCHANT_ID, user_id: p.user_id, created_at: iso(at) }
    d.tables.memberships.push(membership)
  }
  const before = totalStamps(d, p.user_id)
  d.tables.stamp_events.push({
    id: newId('ev'), merchant_id: MERCHANT_ID, user_id: p.user_id, membership_id: membership.id,
    staff_id: staff?.id ?? null, quantity, created_at: iso(at),
    users: { first_name: p.first_name, last_name: p.last_name },
    staff: staff ? { name: staff.name } : null,
  })
  const levels = tiers(d)
  for (let n = before + 1; n <= before + quantity; n++) {
    const pos = n % goal === 0 ? goal : n % goal
    const tier = levels.find(t => Number(t.stamp_threshold) === pos)
    if (!tier) continue
    const state = settle ? settle(at) : { status: 'pending', redeemed_at: null }
    d.tables.rewards.push({
      id: newId('rw'), merchant_id: MERCHANT_ID, user_id: p.user_id, loyalty_card_id: CARD_ID,
      reward_title: tier.reward_title, status: state.status, created_at: iso(at), redeemed_at: state.redeemed_at,
      redeemed_by_staff_id: null, users: { first_name: p.first_name, last_name: p.last_name },
    })
  }
}

function build(): Db {
  const rand = mulberry32(20261117)
  const now = Date.now()
  const midnight = new Date(); midnight.setHours(0, 0, 0, 0)
  const day0 = midnight.getTime()

  const d: Db = {
    tables: {
      merchants: [{
        id: MERCHANT_ID, owner_id: OWNER_ID, business_name: SHOP, category: 'Coffee & Drinks', address: 'Bay Street, Nassau',
        description: 'A demo shop used to show how Stampd works.', merchant_type: 'business', island: 'nassau',
        is_active: true, gift_cards_enabled: true, require_staff_pin: false, logo_url: null, closed_at: null,
        created_at: iso(day0 - 60 * DAY),
        loyalty_cards: [{ reward_tiers: [{ id: 'demo-tier-1' }, { id: 'demo-tier-2' }] }],
      }],
      loyalty_cards: [{
        id: CARD_ID, merchant_id: MERCHANT_ID, is_active: true, stamp_count_required: 8, reward_title: 'Free coffee',
        reward_description: 'Any size, any style.', card_color: '#00605a', stamp_icon: 'coffee', visit_label: 'stamp',
      }],
      reward_tiers: [
        { id: 'demo-tier-1', loyalty_card_id: CARD_ID, stamp_threshold: 4, reward_title: 'Free pastry', sort_order: 1 },
        { id: 'demo-tier-2', loyalty_card_id: CARD_ID, stamp_threshold: 8, reward_title: 'Free coffee', sort_order: 2 },
      ],
      staff: ['Tanya', 'Marcus', 'Dee'].map((name, i) => ({
        id: `demo-staff-${i + 1}`, merchant_id: MERCHANT_ID, name, has_pin: false, is_active: true, created_at: iso(day0 - (60 - i) * DAY),
      })),
      stamp_events: [], memberships: [], rewards: [], merchant_customer_notes: [],
    },
    people: FIRST.map((first, i) => ({
      user_id: `demo-user-${i + 1}`, first_name: first, last_name: LAST[(i * 7) % LAST.length],
      pin: String(100000 + ((i + 1) * 7919) % 900000),
      kind: i < 6 ? 'vip' : i < 26 ? 'regular' : i < 34 ? 'slipping' : i < 40 ? 'new' : 'casual',
    })),
    pins: {}, nudged: {}, gift: { cards: [], events: [] }, specials: [], files: {},
  }

  // Forty-five days of visits. Busier towards the weekend, regulars come most.
  const WEIGHT = { vip: 6, regular: 2.5, slipping: 2, casual: 1, new: 0 }
  const BASE = [8, 13, 14, 15, 16, 20, 22] // Sun..Sat
  const visits: { at: number; p: Person }[] = []
  for (let ago = 45; ago >= 0; ago--) {
    const start = day0 - ago * DAY
    const open = start + 7 * 3600000, close = start + 17 * 3600000
    let count = BASE[new Date(start).getDay()] + Math.floor(rand() * 5) - 2
    let from = open, to = close
    if (ago === 0) {
      // Today: only what could have happened so far, and never an empty screen
      to = now - 120000
      from = now > open + 3600000 ? open : now - 2 * 3600000
      count = Math.max(4, Math.round(count * Math.min(1, Math.max(0, (now - open) / (close - open)))))
    }
    const pool = d.people.filter(p => WEIGHT[p.kind] > 0 && (p.kind !== 'slipping' || ago >= 24))
    const total = pool.reduce((n, p) => n + WEIGHT[p.kind], 0)
    for (let i = 0; i < count; i++) {
      let r = rand() * total
      const p = pool.find(x => (r -= WEIGHT[x.kind]) <= 0) ?? pool[0]
      visits.push({ at: Math.floor(from + rand() * Math.max(1, to - from)), p })
    }
  }
  // First-timers: one visit each this past week, one of them today
  d.people.filter(p => p.kind === 'new').forEach((p, i) => {
    visits.push({ at: i === 0 ? now - 25 * 60000 : day0 - i * DAY + (9 + i) * 3600000, p })
  })
  visits.sort((a, b) => a.at - b.at)
  for (const v of visits) {
    const staff = rand() < 0.85 ? d.tables.staff[Math.floor(rand() * 3)] : null
    addStamp(d, v.p, v.at, 1, staff, (createdAt) => {
      const redeemedAt = createdAt + Math.floor(rand() * 6 * DAY) + 600000
      return redeemedAt < now ? { status: 'redeemed', redeemed_at: iso(redeemedAt) } : { status: 'pending', redeemed_at: null }
    })
  }
  d.tables.merchant_customer_notes.push(
    { merchant_id: MERCHANT_ID, user_id: 'demo-user-1', note: 'Oat milk flat white. Comes in before 8.' },
    { merchant_id: MERCHANT_ID, user_id: 'demo-user-3', note: 'Orders for her whole office on Fridays.' },
  )

  // Gift cards
  const gc = (ago: number, amount: number, balance: number, forName: string | null, fromName: string | null, holder: string | null, status: string, code: string) => {
    const c = {
      id: newId('gc'), for_name: forName, from_name: fromName, amount_cents: amount, balance_cents: balance, status,
      claim_code: status === 'unclaimed' ? code : null, holder_name: holder, created_at: iso(day0 - ago * DAY + 11 * 3600000),
      expires_at: iso(day0 + (365 - ago) * DAY), email_to: null, email_send_at: null, email_sent_at: null, email_last_error: null,
    }
    d.gift.cards.push(c)
    const ev = (type: string, at: number, amt: number | null, after: number | null, staff: string | null) => d.gift.events.push({
      id: newId('ge'), type, amount_cents: amt, balance_after_cents: after, created_at: iso(at), staff_name: staff,
      card_id: c.id, for_name: forName, from_name: fromName, holder_name: holder,
    })
    const made = day0 - ago * DAY + 11 * 3600000
    ev('issue', made, amount, amount, 'Tanya')
    if (holder) ev('claim', made + 3 * 3600000, null, amount, null)
    if (balance < amount) ev('redeem', Math.min(now - 3600000, made + 2 * DAY), amount - balance, balance, 'Marcus')
    return c
  }
  gc(1, 5000, 5000, 'Keisha', 'Andre', null, 'unclaimed', 'BSCF-7K2M')
  gc(3, 2500, 2500, 'Mum', 'Simone', 'Renee M.', 'active', '')
  gc(6, 5000, 3250, 'Jerome', 'The team', 'Jerome B.', 'active', '')
  gc(9, 10000, 6400, null, 'Nadia', 'Trevor S.', 'active', '')
  gc(14, 2500, 0, 'Tia', 'Lamar', 'Tia C.', 'used', '')
  gc(20, 5000, 1800, 'Dad', 'Alexis', 'Gregory T.', 'active', '')
  d.gift.events.sort((a, b) => (a.created_at < b.created_at ? 1 : -1))

  // Specials: one running today, one planned, two finished with results
  const ymd = (ms: number) => { const x = new Date(ms); return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}` }
  const members = d.tables.memberships.length
  const special = (r: Row) => d.specials.push({
    id: newId('sp'), kind: 'special', image_url: null, earns_stamp: false, ends_at_time: null, tag: 'special', ended_at: null,
    running: false, stamped_window: null, usual_day: null, new_customers: null, posted_by_admin: false, ...r,
  })
  special({ text: 'Iced lattes, 2 for $8 until 3pm', starts_on: ymd(now), ends_on: ymd(now), ends_at_time: '15:00', status: 'sent', sent_at: iso(Math.min(now - 600000, day0 + 8 * 3600000)), running: true, recipients: members })
  special({ text: 'Double stamps all day', earns_stamp: true, starts_on: ymd(day0 + 3 * DAY), ends_on: ymd(day0 + 3 * DAY), status: 'scheduled', sent_at: iso(day0 + 3 * DAY + 9 * 3600000), recipients: members })
  special({ text: 'Fresh guava duff today while it lasts', starts_on: ymd(day0 - 5 * DAY), ends_on: ymd(day0 - 5 * DAY), status: 'sent', sent_at: iso(day0 - 5 * DAY + 9 * 3600000), ended_at: iso(day0 - 4 * DAY), recipients: members - 3, stamped_window: 27, usual_day: 17, new_customers: 3 })
  special({ text: 'Free pastry with any large coffee before 10am', starts_on: ymd(day0 - 12 * DAY), ends_on: ymd(day0 - 12 * DAY), ends_at_time: '10:00', status: 'sent', sent_at: iso(day0 - 12 * DAY + 7 * 3600000), ended_at: iso(day0 - 12 * DAY + 10 * 3600000), recipients: members - 6, stamped_window: 23, usual_day: 15, new_customers: 2 })

  return d
}

function getDb(): Db { return db ?? (db = build()) }

// The customer list the Customers and Dashboard screens ask for
function crm(d: Db): Row[] {
  const goal = Math.max(1, Number(card(d).stamp_count_required) || 8)
  return d.tables.memberships.map(m => {
    const p = person(d, m.user_id)!
    const events = d.tables.stamp_events.filter(e => e.user_id === p.user_id)
    const rewards = d.tables.rewards.filter(r => r.user_id === p.user_id)
    const total = events.reduce((n, e) => n + (e.quantity ?? 1), 0)
    return {
      user_id: p.user_id, first_name: p.first_name, last_name: p.last_name, avatar_url: null, phone_masked: null,
      current_stamps: total % goal, total_stamps_earned: total, total_rewards_earned: rewards.length,
      cycles_completed: Math.floor(total / goal), member_since: m.created_at,
      last_stamp_at: events.length ? events.reduce((a, e) => (e.created_at > a ? e.created_at : a), '') : null,
      pending_rewards: rewards.filter(r => r.status === 'pending').length,
      note: d.tables.merchant_customer_notes.find(n => n.user_id === p.user_id)?.note ?? '',
      last_nudged_at: d.nudged[p.user_id] ?? null,
    }
  }).sort((a, b) => ((a.last_stamp_at ?? '') < (b.last_stamp_at ?? '') ? 1 : -1))
}

// Any six digits find someone, so a visitor never hits a dead end
function personForPin(d: Db, pin: string): Person {
  const known = d.people.find(p => p.pin === pin) ?? person(d, d.pins[pin] ?? '')
  if (known) { d.pins[pin] = known.user_id; return known }
  const members = d.people.filter(p => p.kind === 'regular' || p.kind === 'vip')
  const p = members[Number(pin) % members.length]
  d.pins[pin] = p.user_id
  return p
}

const lastStamped: Record<string, number> = {}

const RPC: Record<string, (d: Db, a: Row) => any> = {
  get_merchant_customers: (d) => crm(d),
  find_my_customer_by_pin: (d, a) => d.people.find(p => p.pin === String(a.p_pin))?.user_id ?? null,
  verify_staff_pin: () => true,
  lookup_by_personal_pin: (d, a) => {
    const p = personForPin(d, String(a.p_pin))
    const goal = Math.max(1, Number(card(d).stamp_count_required) || 8)
    const membership = d.tables.memberships.find(m => m.user_id === p.user_id)
    return {
      user_id: p.user_id, first_name: p.first_name, last_name: p.last_name,
      current_stamps: totalStamps(d, p.user_id) % goal, total_required: goal, reward_title: card(d).reward_title,
      total_rewards_earned: d.tables.rewards.filter(r => r.user_id === p.user_id).length,
      member_since: membership?.created_at ?? iso(Date.now()),
    }
  },
  issue_stamp_by_personal_pin: (d, a) => {
    const pin = String(a.p_pin)
    // A PIN nobody looked up here is not ours to answer for (an offline
    // queue from a real shop on this device, say): fail soft so it is kept.
    if (!d.pins[pin] && !d.people.some(p => p.pin === pin)) return { __error: 'demo' }
    const p = personForPin(d, pin)
    const since = Date.now() - (lastStamped[p.user_id] ?? 0)
    if (!a.p_override_cooldown && since < 60000) {
      return { success: false, error: 'cooldown', minutes_ago: 0, seconds_ago: Math.max(1, Math.round(since / 1000)) }
    }
    const goal = Math.max(1, Number(card(d).stamp_count_required) || 8)
    const quantity = Math.max(1, Number(a.p_quantity) || 1)
    const before = totalStamps(d, p.user_id) % goal
    addStamp(d, p, Date.now(), quantity, d.tables.staff.find(s => s.id === a.p_staff_id) ?? null)
    lastStamped[p.user_id] = Date.now()
    return { success: true, current_stamps: Math.min(goal, before + quantity) }
  },
  redeem_customer_reward: (d, a) => {
    const r = d.tables.rewards.find(x => x.id === a.p_reward_id)
    if (!r || r.status !== 'pending') return { ok: false, error: 'not_pending' }
    r.status = 'redeemed'; r.redeemed_at = iso(Date.now()); r.redeemed_by_staff_id = a.p_staff_id ?? null
    return { ok: true }
  },
  generate_merchant_pin: () => ({ code: String(100000 + Math.floor(Math.random() * 900000)), expires_at: iso(Date.now() + 10 * 60000) }),

  list_gift_cards: (d) => {
    const month = new Date(); month.setDate(1); month.setHours(0, 0, 0, 0)
    const since = month.toISOString()
    const open = d.gift.cards.filter(c => c.status === 'active' || c.status === 'unclaimed')
    const sum = (rows: Row[]) => rows.reduce((n, e) => n + (e.amount_cents ?? 0), 0)
    const issued = d.gift.events.filter(e => e.type === 'issue' && e.created_at >= since)
    const used = d.gift.events.filter(e => e.type === 'redeem' && e.created_at >= since)
    return {
      ok: true,
      summary: {
        outstanding_cents: open.reduce((n, c) => n + c.balance_cents, 0), outstanding_count: open.length,
        issued_month_cents: sum(issued), issued_month_count: issued.length,
        used_month_cents: sum(used), used_month_count: used.length,
      },
      cards: open, events: d.gift.events,
    }
  },
  issue_gift_card: (d, a) => {
    const cents = Number(a.p_amount_cents)
    if (!(cents >= 500 && cents <= 50000)) return { ok: false, error: 'bad_amount' }
    const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
    const pick = () => Array.from({ length: 4 }, () => letters[Math.floor(Math.random() * letters.length)]).join('')
    const code = `${pick()}-${pick()}`
    const staff = d.tables.staff.find(s => s.id === a.p_staff_id)
    const c = {
      id: newId('gc'), for_name: a.p_for_name ?? null, from_name: a.p_from_name ?? null, amount_cents: cents, balance_cents: cents,
      status: 'unclaimed', claim_code: code, holder_name: null, created_at: iso(Date.now()),
      expires_at: iso(Date.now() + (Number(a.p_expires_months) || 12) * 30 * DAY),
      email_to: a.p_email ?? null, email_send_at: a.p_send_at ?? (a.p_email ? iso(Date.now()) : null), email_sent_at: null, email_last_error: null,
    }
    d.gift.cards.unshift(c)
    d.gift.events.unshift({
      id: newId('ge'), type: 'issue', amount_cents: cents, balance_after_cents: cents, created_at: c.created_at,
      staff_name: staff?.name ?? null, card_id: c.id, for_name: c.for_name, from_name: c.from_name, holder_name: null,
    })
    return { ok: true, card: { id: c.id }, claim_code: code, buyer_first_name: null, email_to: c.email_to, email_send_at: c.email_send_at }
  },
  resend_gift_card_email: (d, a) => {
    const c = d.gift.cards.find(x => x.id === a.p_card_id)
    const to = a.p_email ?? c?.email_to
    if (!c || !to) return { ok: false, error: 'bad_email' }
    c.email_to = to
    return { ok: true, email_to: to }
  },
  lookup_gift_card_code: (d, a) => {
    const digits = String(a.p_code ?? '').replace(/\D/g, '')
    if (digits.length !== 6) return { ok: false, error: 'bad_code' }
    const held = d.gift.cards.filter(c => c.status === 'active' && c.balance_cents > 0)
    if (!held.length) return { ok: false, error: 'code_not_found' }
    const c = held[Number(digits) % held.length]
    return { ok: true, card_id: c.id, holder_name: c.holder_name, from_name: c.from_name, balance_cents: c.balance_cents, amount_cents: c.amount_cents, created_at: c.created_at }
  },
  redeem_gift_card: (d, a) => {
    const digits = String(a.p_code ?? '').replace(/\D/g, '')
    const held = d.gift.cards.filter(c => c.status === 'active' && c.balance_cents > 0)
    if (!held.length) return { ok: false, error: 'code_not_found' }
    const c = held[Number(digits) % held.length]
    const cents = Number(a.p_amount_cents)
    if (cents > c.balance_cents) return { ok: false, error: 'insufficient', balance_cents: c.balance_cents, holder_name: c.holder_name }
    c.balance_cents -= cents
    if (c.balance_cents === 0) c.status = 'used'
    d.gift.events.unshift({
      id: newId('ge'), type: 'redeem', amount_cents: cents, balance_after_cents: c.balance_cents, created_at: iso(Date.now()),
      staff_name: d.tables.staff.find(s => s.id === a.p_staff_id)?.name ?? null, card_id: c.id, for_name: c.for_name, from_name: c.from_name, holder_name: c.holder_name,
    })
    return { ok: true, holder_name: c.holder_name, taken_cents: cents, balance_cents: c.balance_cents, used_up: c.balance_cents === 0, stamped: true }
  },
  void_gift_card: (d, a) => {
    const c = d.gift.cards.find(x => x.id === a.p_card_id)
    if (!c) return { ok: false, error: 'not_voidable' }
    c.status = 'void'
    d.gift.events.unshift({
      id: newId('ge'), type: 'void', amount_cents: c.balance_cents, balance_after_cents: 0, created_at: iso(Date.now()),
      staff_name: null, card_id: c.id, for_name: c.for_name, from_name: c.from_name, holder_name: c.holder_name,
    })
    return { ok: true }
  },

  preview_special: (d, a) => {
    const text = String(a.p_text ?? '').trim()
    return {
      ok: true, scheduled: !!a.p_send_at, title: SHOP, body: text, recipients: d.tables.memberships.length,
      month_used: d.specials.filter(s => s.status !== 'cancelled').length, month_cap: 8,
    }
  },
  send_special: (d, a) => {
    const at = a.p_send_at ? new Date(a.p_send_at).getTime() : Date.now()
    const pad = (n: number) => String(n).padStart(2, '0')
    const ymd = (ms: number) => { const x = new Date(ms); return `${x.getFullYear()}-${pad(x.getMonth() + 1)}-${pad(x.getDate())}` }
    const days = Math.max(1, Number(a.p_days) || 1)
    d.specials.unshift({
      id: newId('sp'), kind: a.p_kind ?? 'special', text: String(a.p_text ?? ''), image_url: a.p_image_url ?? null,
      earns_stamp: !!a.p_earns_stamp, starts_on: ymd(at), ends_on: ymd(at + (days - 1) * DAY), ends_at_time: a.p_ends_at_time ?? null,
      tag: a.p_tag ?? 'special', status: a.p_send_at ? 'scheduled' : 'sent', sent_at: iso(at), ended_at: null, running: !a.p_send_at,
      recipients: d.tables.memberships.length, stamped_window: null, usual_day: null, new_customers: null, posted_by_admin: false,
    })
    return { ok: true, scheduled: !!a.p_send_at, recipients: d.tables.memberships.length, send_at: iso(at) }
  },
  list_merchant_specials: (d) => d.specials.map(s => ({ ...s })),
  end_special: (d, a) => {
    const s = d.specials.find(x => x.id === a.p_id)
    if (s) { s.running = false; s.ended_at = iso(Date.now()) }
    return { ok: true }
  },
  cancel_special: (d, a) => {
    const s = d.specials.find(x => x.id === a.p_id)
    if (s) { s.status = 'cancelled'; s.running = false }
    return { ok: true }
  },
}

const wait = (ms: number) => new Promise(r => setTimeout(r, ms))

// A chainable, awaitable query over one in-memory table
class Query {
  private op: 'select' | 'insert' | 'update' | 'delete' | 'upsert' = 'select'
  private tests: ((r: Row) => boolean)[] = []
  private sort: { col: string; asc: boolean }[] = []
  private max: number | null = null
  private head = false
  private one = false
  private payload: any = null
  private rows: Row[]

  constructor(table: string) {
    const d = getDb()
    this.rows = d.tables[table] ?? (d.tables[table] = [])
  }

  select(_cols?: string, opts?: { count?: string; head?: boolean }) {
    if (this.op === 'select' && opts?.head) this.head = true
    return this
  }
  insert(p: any) { this.op = 'insert'; this.payload = p; return this }
  upsert(p: any) { this.op = 'upsert'; this.payload = p; return this }
  update(p: any) { this.op = 'update'; this.payload = p; return this }
  delete() { this.op = 'delete'; return this }

  // A filter on a column this table doesn't carry (a joined one, say) is
  // skipped rather than emptying the result.
  private where(col: string, test: (v: any) => boolean) {
    if (!col.includes('.') && this.rows.some(r => col in r)) this.tests.push(r => test(r[col]))
    return this
  }
  eq(c: string, v: any) { return this.where(c, x => x === v) }
  neq(c: string, v: any) { return this.where(c, x => x !== v) }
  gt(c: string, v: any) { return this.where(c, x => x != null && x > v) }
  gte(c: string, v: any) { return this.where(c, x => x != null && x >= v) }
  lt(c: string, v: any) { return this.where(c, x => x != null && x < v) }
  lte(c: string, v: any) { return this.where(c, x => x != null && x <= v) }
  in(c: string, v: any[]) { return this.where(c, x => v.includes(x)) }
  is(c: string, v: any) { return this.where(c, x => (v === null ? x == null : x === v)) }
  order(col: string, opts?: { ascending?: boolean }) { this.sort.push({ col, asc: opts?.ascending !== false }); return this }
  limit(n: number) { this.max = n; return this }
  maybeSingle() { this.one = true; return this }
  single() { this.one = true; return this }

  private run() {
    const match = (r: Row) => this.tests.every(t => t(r))
    if (this.op === 'insert' || this.op === 'upsert') {
      const list: Row[] = ([] as Row[]).concat(this.payload ?? [])
      const out = list.map(item => {
        const existing = this.op === 'upsert'
          ? this.rows.find(r => (item.id != null ? r.id === item.id : item.merchant_id != null && item.user_id != null && r.merchant_id === item.merchant_id && r.user_id === item.user_id))
          : undefined
        if (existing) return Object.assign(existing, item)
        const row = { id: newId('row'), created_at: iso(Date.now()), ...item }
        this.rows.push(row)
        return row
      })
      return { data: this.one ? out[0] ?? null : out, error: null, count: null }
    }
    if (this.op === 'update') {
      const hit = this.rows.filter(match)
      hit.forEach(r => Object.assign(r, this.payload))
      return { data: this.one ? hit[0] ?? null : hit, error: null, count: null }
    }
    if (this.op === 'delete') {
      const keep = this.rows.filter(r => !match(r))
      this.rows.length = 0
      this.rows.push(...keep)
      return { data: null, error: null, count: null }
    }
    let out = this.rows.filter(match)
    const count = out.length
    for (const s of [...this.sort].reverse()) {
      out = [...out].sort((a, b) => (a[s.col] === b[s.col] ? 0 : (a[s.col] > b[s.col] ? 1 : -1) * (s.asc ? 1 : -1)))
    }
    if (this.max != null) out = out.slice(0, this.max)
    if (this.head) return { data: null, error: null, count }
    return { data: this.one ? (out[0] ? { ...out[0] } : null) : out.map(r => ({ ...r })), error: null, count }
  }

  then<A, B>(resolve: (v: any) => A, reject?: (e: any) => B) {
    return wait(60).then(() => this.run()).then(resolve, reject)
  }
}

// Filters this stand-in doesn't know (or, ilike, range...) pass through
function query(table: string) {
  const q = new Query(table)
  const proxy: any = new Proxy(q, {
    get(target, prop) {
      const v = (target as any)[prop]
      if (typeof v === 'function') return (...args: any[]) => { const r = v.apply(target, args); return r === target ? proxy : r }
      if (v !== undefined || typeof prop === 'symbol') return v
      return () => proxy
    },
  })
  return proxy
}

const user = { id: OWNER_ID, email: 'demo@stampdbahamas.com' }

export const demoClient: any = {
  auth: {
    getUser: async () => ({ data: { user }, error: null }),
    getSession: async () => ({ data: { session: { user, access_token: 'demo' } }, error: null }),
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
    signOut: async () => ({ error: null }),
    signInWithPassword: async () => ({ data: { user: null, session: null }, error: { message: 'This is a demo.' } }),
    updateUser: async () => ({ data: { user }, error: null }),
  },
  from: (table: string) => query(table),
  rpc: async (name: string, args: Row = {}) => {
    await wait(220)
    const fn = RPC[name]
    if (!fn) return { data: null, error: null }
    const data = fn(getDb(), args)
    if (data && data.__error) return { data: null, error: { message: data.__error } }
    return { data, error: null }
  },
  functions: {
    invoke: async (name: string, opts?: { body?: Row }) => {
      await wait(300)
      if (name === 'send-nudge') {
        const d = getDb()
        const p = person(d, opts?.body?.user_id)
        if (p) d.nudged[p.user_id] = iso(Date.now())
        return { data: { ok: true, delivered: true, body: `We miss you at ${SHOP}, ${p?.first_name ?? 'friend'}. Stop by soon!` }, error: null }
      }
      return { data: { ok: true }, error: null }
    },
  },
  storage: {
    from: () => ({
      upload: async (path: string, file: Blob) => {
        try { getDb().files[path] = URL.createObjectURL(file) } catch { /* no preview, still fine */ }
        return { data: { path }, error: null }
      },
      getPublicUrl: (path: string) => ({ data: { publicUrl: getDb().files[path] ?? '' } }),
    }),
  },
  channel: () => {
    const c: any = { on: () => c, subscribe: () => c, unsubscribe: () => {} }
    return c
  },
  removeChannel: () => {},
}
