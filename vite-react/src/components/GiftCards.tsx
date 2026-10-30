import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { AlertCircle, Check, CheckCircle2, Copy, Gift, Lock, Share2, Trash2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { money, toCents, explainGiftError, giftShareMessage } from '@/lib/giftCards'

// Gift cards for the merchant portal and the admin panel. Three jobs:
// issue one at the counter, take money off one, and see what's outstanding.
// Stampd never touches the money; the shop does, and this is the ledger.

export type GiftSection = 'issue' | 'redeem' | 'history'

interface StaffMember { id: string; name: string; has_pin: boolean }

const LAST_STAFF_KEY = 'stampd_last_staff_id'

// ── Staff attribution, same rules as the stamp page ───────────────────────
function useStaff(merchantId: string, admin: boolean) {
  const [staff, setStaff] = useState<StaffMember[]>([])
  const [requirePin, setRequirePin] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [verifiedId, setVerifiedId] = useState<string | null>(null)

  useEffect(() => {
    if (!merchantId) return
    let cancelled = false
    async function load() {
      const supabase = createClient()
      const [{ data: m }, { data: rows }] = await Promise.all([
        supabase.from('merchants').select('require_staff_pin').eq('id', merchantId).maybeSingle(),
        supabase.from('staff').select('id, name, has_pin').eq('merchant_id', merchantId).eq('is_active', true).order('created_at'),
      ])
      if (cancelled) return
      const list = (rows ?? []) as StaffMember[]
      const require = !admin && !!m?.require_staff_pin
      setStaff(list)
      setRequirePin(require)
      const selectable = require ? list.filter(s => s.has_pin) : list
      const remembered = localStorage.getItem(LAST_STAFF_KEY)
      if (remembered && selectable.some(s => s.id === remembered)) setSelectedId(remembered)
      else if (selectable.length === 1) setSelectedId(selectable[0].id)
    }
    load()
    return () => { cancelled = true }
  }, [merchantId, admin])

  const select = (id: string) => {
    const target = staff.find(s => s.id === id)
    if (requirePin && target && !target.has_pin) return
    setSelectedId(id)
    localStorage.setItem(LAST_STAFF_KEY, id)
  }

  const selected = staff.find(s => s.id === selectedId) ?? null
  // Staff must be chosen when the shop has staff; a PIN check is pending when required
  const blocked = !admin && staff.length > 0 && !selectedId
  const needsPin = requirePin && !!selected?.has_pin && verifiedId !== selectedId

  const verify = async (pin: string) => {
    if (!selected) return false
    const { data } = await createClient().rpc('verify_staff_pin', { p_staff_id: selected.id, p_pin: pin })
    if (data === true) { setVerifiedId(selected.id); return true }
    return false
  }

  return { staff, selected, selectedId, select, blocked, needsPin, verify }
}

function StaffPicker({ s, label }: { s: ReturnType<typeof useStaff>; label: string }) {
  if (s.staff.length === 0) return null
  return (
    <div>
      <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">{label}</p>
      <div className="flex gap-2 flex-wrap">
        {s.staff.map(m => {
          const on = s.selectedId === m.id
          return (
            <button
              key={m.id}
              type="button"
              onClick={() => s.select(m.id)}
              className={`px-4 py-2 rounded-lg text-[13px] font-semibold transition-all ${
                on ? 'bg-brand-500 text-white shadow-sm' : 'bg-white border border-gray-200 text-gray-600 hover:border-brand-400 hover:text-brand-600'
              }`}
            >
              {m.name}
              {s.needsPin && on && <Lock size={11} className="inline ml-1.5 -mt-0.5 opacity-80" />}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// Inline PIN gate used by both Issue and Redeem when the shop requires it
function StaffPinGate({ s, onPass, onCancel }: { s: ReturnType<typeof useStaff>; onPass: () => void; onCancel: () => void }) {
  const [pin, setPin] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const go = async () => {
    setBusy(true)
    const ok = await s.verify(pin)
    setBusy(false)
    if (ok) onPass()
    else { setErr('Incorrect PIN. Try again.'); setPin('') }
  }
  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-6">
      <div className="flex items-center gap-3 mb-5">
        <div className="h-11 w-11 rounded-full bg-brand-100 flex items-center justify-center shrink-0"><Lock size={16} className="text-brand-600" /></div>
        <div>
          <h3 className="text-[15px] font-semibold text-gray-900">Confirm it's you, {s.selected?.name}</h3>
          <p className="text-[12px] text-gray-400">Enter your 4-digit staff PIN</p>
        </div>
      </div>
      <input
        type="password" inputMode="numeric" value={pin} autoFocus
        onChange={e => { setPin(e.target.value.replace(/\D/g, '').slice(0, 4)); setErr('') }}
        placeholder="••••"
        className="w-full text-center text-xl tracking-[0.5em] py-3 rounded-xl border border-gray-200 bg-gray-50 focus:outline-none focus:border-brand-500 font-mono mb-3"
      />
      {err && <p className="text-[12px] text-red-600 mb-3">{err}</p>}
      <div className="flex gap-2">
        <button type="button" onClick={onCancel} className="flex-1 py-3 rounded-xl border border-gray-200 text-[14px] font-medium text-gray-600 hover:bg-gray-50">Back</button>
        <button type="button" onClick={go} disabled={pin.length < 4 || busy} className="flex-[2] py-3 rounded-xl bg-brand-500 text-[14px] font-semibold text-white hover:bg-brand-600 disabled:opacity-50">
          {busy ? 'Checking…' : 'Confirm'}
        </button>
      </div>
    </div>
  )
}

const inputClass = 'w-full px-3 py-2.5 rounded-lg border border-gray-200 bg-gray-50 text-[13px] text-gray-900 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/20 transition-all placeholder:text-gray-300'

// ── Issue ─────────────────────────────────────────────────────────────────
export function GiftCardIssue({ merchantId, merchantName, admin = false }: { merchantId: string; merchantName: string; admin?: boolean }) {
  const staff = useStaff(merchantId, admin)
  const [amount, setAmount] = useState('50')
  const [custom, setCustom] = useState(false)
  const [forName, setForName] = useState('')
  const [fromName, setFromName] = useState('')
  const [note, setNote] = useState('')
  const [buyerPin, setBuyerPin] = useState('')
  const [expires, setExpires] = useState('12')
  const [confirmed, setConfirmed] = useState(false)
  const [gate, setGate] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [issued, setIssued] = useState<{ claimCode: string; amountCents: number; buyerFirst: string | null; forName: string; fromName: string } | null>(null)
  const [copied, setCopied] = useState(false)

  const cents = toCents(amount)
  const canIssue = !!cents && cents >= 500 && cents <= 50000 && confirmed && !staff.blocked && !busy

  const submit = async () => {
    if (!canIssue) return
    if (staff.needsPin) { setGate(true); return }
    setBusy(true)
    setError('')
    const supabase = createClient()
    const { data, error: err } = await supabase.rpc('issue_gift_card', {
      p_merchant_id: merchantId,
      p_amount_cents: cents,
      p_for_name: forName || null,
      p_from_name: fromName || null,
      p_note: note || null,
      p_buyer_pin: buyerPin.replace(/\D/g, '') || null,
      p_staff_id: staff.selectedId,
      p_expires_months: Number(expires),
    })
    setBusy(false)
    if (err || !data?.ok) { setError(explainGiftError(data?.error)); return }
    setIssued({ claimCode: data.claim_code, amountCents: cents!, buyerFirst: data.buyer_first_name ?? null, forName, fromName })
  }

  const reset = () => {
    setIssued(null); setAmount('50'); setCustom(false); setForName(''); setFromName(''); setNote(''); setBuyerPin(''); setConfirmed(false); setError('')
  }

  const share = async () => {
    if (!issued) return
    const text = giftShareMessage({ businessName: merchantName, amountCents: issued.amountCents, claimCode: issued.claimCode, fromName: issued.fromName || null })
    if (navigator.share) { try { await navigator.share({ text }) } catch { /* dismissed */ } return }
    await navigator.clipboard.writeText(text)
    setCopied(true); setTimeout(() => setCopied(false), 2000)
  }

  const copyCode = async () => {
    if (!issued) return
    await navigator.clipboard.writeText(issued.claimCode)
    setCopied(true); setTimeout(() => setCopied(false), 2000)
  }

  if (gate) return <StaffPinGate s={staff} onPass={() => { setGate(false); submit() }} onCancel={() => setGate(false)} />

  if (issued) {
    return (
      <div className="bg-white border border-green-200 rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="h-11 w-11 rounded-full bg-green-100 flex items-center justify-center shrink-0"><CheckCircle2 size={20} className="text-green-600" /></div>
          <div>
            <h3 className="text-[16px] font-semibold text-gray-900">{money(issued.amountCents)} gift card issued{issued.forName ? ` for ${issued.forName}` : ''}</h3>
            <p className="text-[12px] text-gray-500">
              {issued.buyerFirst
                ? `It's in ${issued.buyerFirst}'s app too, under Rewards, with a Share button.`
                : 'Give the buyer this code. Write it on the receipt or share it to their phone.'}
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-dashed border-brand-300 bg-brand-50/50 p-5 text-center mb-4">
          <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Gift card code</p>
          <p className="text-[36px] font-bold tracking-[0.18em] text-brand-600 font-mono">{issued.claimCode}</p>
          <p className="text-[12px] text-gray-500 mt-1">Whoever types this into Stampd gets the card. One use.</p>
        </div>

        <div className="flex gap-2">
          <button type="button" onClick={copyCode} className="flex-1 py-3 rounded-xl border border-gray-200 text-[13px] font-semibold text-gray-700 hover:bg-gray-50 flex items-center justify-center gap-2">
            {copied ? <><Check size={14} className="text-green-600" /> Copied</> : <><Copy size={14} /> Copy code</>}
          </button>
          <button type="button" onClick={share} className="flex-1 py-3 rounded-xl border border-gray-200 text-[13px] font-semibold text-gray-700 hover:bg-gray-50 flex items-center justify-center gap-2">
            <Share2 size={14} /> Share to their phone
          </button>
        </div>
        <button type="button" onClick={reset} className="mt-2 w-full py-3 rounded-xl bg-brand-500 text-[14px] font-semibold text-white hover:bg-brand-600">Issue another</button>
      </div>
    )
  }

  return (
    <form onSubmit={e => { e.preventDefault(); submit() }} className="bg-white border border-gray-200 rounded-2xl p-6 flex flex-col gap-5">
      <StaffPicker s={staff} label="Issuing as" />

      <div>
        <label className="block text-[12px] font-medium text-gray-600 mb-1.5">Amount the customer paid</label>
        <div className="flex gap-2">
          {['25', '50', '100'].map(v => (
            <button
              key={v} type="button"
              onClick={() => { setAmount(v); setCustom(false) }}
              className={`flex-1 h-11 rounded-lg text-[14px] font-bold transition-colors ${
                !custom && amount === v ? 'bg-brand-50 border-2 border-brand-500 text-brand-600' : 'bg-white border border-gray-200 text-gray-700 hover:border-gray-300'
              }`}
            >${v}</button>
          ))}
          <input
            type="text" inputMode="decimal" placeholder="Other"
            value={custom ? amount : ''}
            onFocus={() => { setCustom(true); setAmount('') }}
            onChange={e => { setCustom(true); setAmount(e.target.value) }}
            className={`flex-1 h-11 px-3 rounded-lg border text-[14px] font-bold text-center focus:outline-none ${custom ? 'border-2 border-brand-500 bg-brand-50' : 'border-gray-200 bg-gray-50'}`}
          />
        </div>
        <p className="text-[11px] text-gray-400 mt-1.5">$5 to $500.</p>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="gc-for" className="block text-[12px] font-medium text-gray-600 mb-1.5">Who it's for <span className="text-gray-400 font-normal">(optional)</span></label>
          <input id="gc-for" type="text" value={forName} onChange={e => setForName(e.target.value)} placeholder="Mary" className={inputClass} />
          <p className="text-[11px] text-gray-400 mt-1.5">Just a name on the card. Whoever enters the code claims it.</p>
        </div>
        <div>
          <label htmlFor="gc-from" className="block text-[12px] font-medium text-gray-600 mb-1.5">From <span className="text-gray-400 font-normal">(optional)</span></label>
          <input id="gc-from" type="text" value={fromName} onChange={e => setFromName(e.target.value)} placeholder="Sarah" className={inputClass} />
          <p className="text-[11px] text-gray-400 mt-1.5">Leave blank if they're buying it for themselves.</p>
        </div>
      </div>

      <div>
        <label htmlFor="gc-note" className="block text-[12px] font-medium text-gray-600 mb-1.5">Note <span className="text-gray-400 font-normal">(optional)</span></label>
        <textarea id="gc-note" rows={2} value={note} onChange={e => setNote(e.target.value.slice(0, 140))} placeholder="Happy birthday! Lunch on me this week." className={`${inputClass} resize-none`} />
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="gc-pin" className="block text-[12px] font-medium text-gray-600 mb-1.5">Buyer's Stampd PIN <span className="text-gray-400 font-normal">(optional)</span></label>
          <input id="gc-pin" type="text" inputMode="numeric" value={buyerPin} onChange={e => setBuyerPin(e.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="6 digits" className={inputClass} />
          <p className="text-[11px] text-gray-400 mt-1.5">If the buyer is on Stampd, the card lands in their app with a Share button.</p>
        </div>
        <div>
          <label htmlFor="gc-exp" className="block text-[12px] font-medium text-gray-600 mb-1.5">Expires</label>
          <select id="gc-exp" value={expires} onChange={e => setExpires(e.target.value)} className={inputClass}>
            <option value="12">In 12 months</option>
            <option value="6">In 6 months</option>
            <option value="0">Never</option>
          </select>
        </div>
      </div>

      <label className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-[13px] text-amber-900 leading-relaxed cursor-pointer">
        <input type="checkbox" checked={confirmed} onChange={e => setConfirmed(e.target.checked)} className="mt-0.5 h-4 w-4 accent-brand-500" />
        <span>
          <b>I've taken {cents ? money(cents) : 'the money'} from the customer.</b> Stampd doesn't handle the money. This card is a promise from {merchantName}, and it stays redeemable for 30 days even if you leave Stampd.
        </span>
      </label>

      {error && (
        <div className="flex items-center gap-2 text-red-600 bg-red-50 rounded-lg px-3 py-2.5">
          <AlertCircle size={14} className="shrink-0" /><p className="text-[12px]">{error}</p>
        </div>
      )}
      {staff.blocked && <p className="text-[12px] text-amber-600 bg-amber-50 rounded-lg px-3 py-2.5">Select who's issuing above first.</p>}

      <button type="submit" disabled={!canIssue} className="w-full py-3 rounded-xl bg-brand-500 text-[14px] font-semibold text-white hover:bg-brand-600 disabled:opacity-50 transition-colors">
        {busy ? 'Issuing…' : `Issue ${cents ? money(cents) : ''} gift card`}
      </button>
    </form>
  )
}

// ── Redeem ────────────────────────────────────────────────────────────────
interface Found { card_id: string; holder_name: string; from_name: string | null; balance_cents: number; amount_cents: number; created_at: string }

export function GiftCardRedeem({ merchantId, admin = false }: { merchantId: string; admin?: boolean }) {
  const staff = useStaff(merchantId, admin)
  const [code, setCode] = useState('')
  const [found, setFound] = useState<Found | null>(null)
  const [looking, setLooking] = useState(false)
  const [amount, setAmount] = useState('')
  const [error, setError] = useState('')
  const [gate, setGate] = useState(false)
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState<{ holder: string; taken: number; left: number; usedUp: boolean; stamped: boolean } | null>(null)

  const lookup = useCallback(async (digits: string) => {
    setLooking(true)
    setError('')
    const { data, error: err } = await createClient().rpc('lookup_gift_card_code', { p_merchant_id: merchantId, p_code: digits })
    setLooking(false)
    if (err || !data?.ok) { setFound(null); setError(explainGiftError(data?.error)); return }
    setFound(data as Found)
  }, [merchantId])

  const onCode = (v: string) => {
    const digits = v.replace(/\D/g, '').slice(0, 6)
    setCode(digits)
    setFound(null)
    setError('')
    if (digits.length === 6) lookup(digits)
  }

  const cents = toCents(amount)
  const canTake = !!found && !!cents && cents > 0 && !staff.blocked && !busy

  const take = async () => {
    if (!canTake || !found) return
    if (staff.needsPin) { setGate(true); return }
    setBusy(true)
    setError('')
    const { data, error: err } = await createClient().rpc('redeem_gift_card', {
      p_merchant_id: merchantId, p_code: code, p_amount_cents: cents, p_staff_id: staff.selectedId, p_earn_stamp: true,
    })
    setBusy(false)
    if (err || !data?.ok) {
      if (data?.error === 'insufficient') {
        setError(`Only ${money(data.balance_cents)} left on ${data.holder_name || 'this'} card. Nothing was taken. Type ${money(data.balance_cents)} or less.`)
        setFound(f => f ? { ...f, balance_cents: data.balance_cents } : f)
      } else setError(explainGiftError(data?.error))
      return
    }
    setDone({ holder: data.holder_name, taken: data.taken_cents, left: data.balance_cents, usedUp: !!data.used_up, stamped: !!data.stamped })
  }

  const reset = () => { setCode(''); setFound(null); setAmount(''); setError(''); setDone(null) }

  if (gate) return <StaffPinGate s={staff} onPass={() => { setGate(false); take() }} onCancel={() => setGate(false)} />

  if (done) {
    return (
      <div className="bg-white border border-green-200 rounded-2xl p-8 text-center">
        <div className="inline-flex h-16 w-16 items-center justify-center rounded-full mb-4 bg-green-100"><CheckCircle2 size={30} className="text-green-600" /></div>
        <h3 className="text-[20px] font-bold text-gray-900 tracking-[-0.02em] mb-1">{money(done.taken)} taken</h3>
        <p className="text-[14px] text-gray-600 mb-1">
          {done.holder} · {done.usedUp ? <span className="font-semibold text-gray-900">card used up</span> : <><span className="font-semibold text-gray-900">{money(done.left)}</span> left</>}
        </p>
        <p className="text-[13px] text-gray-500">Their phone shows the new balance{done.stamped ? ', and they got a stamp for the visit' : ''}.</p>
        {staff.selected && <p className="text-[12px] text-gray-400 mt-1">by {staff.selected.name}</p>}
        <button type="button" onClick={reset} className="mt-6 w-full py-3 rounded-xl bg-brand-500 text-[14px] font-semibold text-white hover:bg-brand-600">Next customer</button>
      </div>
    )
  }

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-6 flex flex-col gap-5">
      <StaffPicker s={staff} label="Redeeming as" />

      <div>
        <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider text-center mb-3">Gift card code <span className="normal-case font-medium text-gray-300">· on the customer's screen, changes every minute</span></p>
        <div className="relative mx-auto w-fit">
          <div className="flex gap-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className={`h-14 w-11 sm:w-12 rounded-xl border-[1.5px] flex items-center justify-center text-[22px] font-bold ${
                code[i] ? 'border-brand-500 bg-brand-50 text-brand-600' : i === code.length ? 'border-brand-400 bg-brand-50/40' : 'border-gray-200 bg-gray-50 text-gray-300'
              }`}>{code[i] ?? ''}</div>
            ))}
          </div>
          <input
            type="text" inputMode="numeric" autoComplete="one-time-code" value={code} autoFocus
            onChange={e => onCode(e.target.value)}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            aria-label="Gift card code"
          />
        </div>
        {looking && <p className="text-[12px] text-gray-400 text-center mt-3">Looking up the card…</p>}
      </div>

      {found && (
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 flex items-center gap-3">
          <div className="h-11 w-11 rounded-xl bg-accent-50 flex items-center justify-center shrink-0"><Gift size={18} className="text-accent-500" /></div>
          <div className="flex-1 min-w-0">
            <p className="text-[14px] font-semibold text-gray-900 truncate">{found.holder_name || 'Cardholder'}</p>
            <p className="text-[12px] text-gray-500">
              {found.from_name ? `Gift from ${found.from_name} · ` : ''}issued {new Date(found.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Balance</p>
            <p className="text-[20px] font-bold text-brand-600 leading-tight">{money(found.balance_cents)}</p>
          </div>
        </div>
      )}

      {found && (
        <div>
          <label htmlFor="gc-take" className="block text-[12px] font-medium text-gray-600 mb-1.5">Amount of this sale to take from the card</label>
          <div className="flex items-center gap-2">
            <div className="flex items-center flex-1 h-14 rounded-xl border border-gray-200 bg-gray-50 px-4 gap-1 focus-within:border-brand-500">
              <span className="text-[24px] font-bold text-gray-400">$</span>
              <input id="gc-take" type="text" inputMode="decimal" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" autoFocus
                className="flex-1 min-w-0 bg-transparent text-[24px] font-bold text-gray-900 focus:outline-none" />
            </div>
            <button type="button" onClick={() => setAmount((found.balance_cents / 100).toFixed(2))} className="h-14 px-4 rounded-xl border border-gray-200 text-[13px] font-semibold text-gray-700 hover:bg-gray-50 whitespace-nowrap">
              Use all {money(found.balance_cents)}
            </button>
          </div>
          <p className="text-[11px] text-gray-400 mt-1.5">If the sale is bigger than the balance, take the balance here and the rest however they're paying.</p>
        </div>
      )}

      {error && (
        <div className="flex items-start gap-2 text-red-600 bg-red-50 rounded-lg px-3 py-2.5">
          <AlertCircle size={14} className="shrink-0 mt-0.5" /><p className="text-[12px] leading-relaxed">{error}</p>
        </div>
      )}
      {found && staff.blocked && <p className="text-[12px] text-amber-600 bg-amber-50 rounded-lg px-3 py-2.5">Select who's redeeming above first.</p>}

      <div className="flex gap-2">
        {(found || code) && (
          <button type="button" onClick={reset} className="flex-1 py-3 rounded-xl border border-gray-200 text-[14px] font-medium text-gray-600 hover:bg-gray-50">Cancel</button>
        )}
        <button type="button" onClick={take} disabled={!canTake} className="flex-[2] py-3 rounded-xl bg-brand-500 text-[14px] font-semibold text-white hover:bg-brand-600 disabled:opacity-50">
          {busy ? 'Taking…' : cents ? `Take ${money(cents)} from the card` : 'Take from the card'}
        </button>
      </div>
    </div>
  )
}

// ── Outstanding & history ─────────────────────────────────────────────────
interface Summary { outstanding_cents: number; outstanding_count: number; issued_month_cents: number; issued_month_count: number; used_month_cents: number; used_month_count: number }
interface OpenCard { id: string; for_name: string | null; from_name: string | null; amount_cents: number; balance_cents: number; status: string; claim_code: string | null; holder_name: string | null; created_at: string; expires_at: string | null }
interface Ev { id: string; type: 'issue' | 'claim' | 'redeem' | 'void'; amount_cents: number | null; balance_after_cents: number | null; created_at: string; staff_name: string | null; card_id: string; for_name: string | null; from_name: string | null; holder_name: string | null }

export function GiftCardHistory({ merchantId }: { merchantId: string }) {
  const [summary, setSummary] = useState<Summary | null>(null)
  const [cards, setCards] = useState<OpenCard[]>([])
  const [events, setEvents] = useState<Ev[]>([])
  const [loading, setLoading] = useState(true)
  const [voiding, setVoiding] = useState<string | null>(null)

  const load = useCallback(async () => {
    const { data } = await createClient().rpc('list_gift_cards', { p_merchant_id: merchantId })
    if (data?.ok) {
      setSummary(data.summary)
      setCards(data.cards ?? [])
      setEvents(data.events ?? [])
    }
    setLoading(false)
  }, [merchantId])

  useEffect(() => { load() }, [load])

  const voidCard = async (c: OpenCard) => {
    const who = c.holder_name ?? c.for_name ?? 'this card'
    const reason = window.prompt(`Cancel the ${money(c.balance_cents)} card for ${who}? This can't be undone. Reason (optional):`)
    if (reason === null) return
    setVoiding(c.id)
    const { data } = await createClient().rpc('void_gift_card', { p_card_id: c.id, p_reason: reason })
    setVoiding(null)
    if (data?.ok) load()
  }

  const when = (iso: string) => new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })

  if (loading) return <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto my-16" />

  return (
    <div className="flex flex-col gap-6">
      <div className="grid sm:grid-cols-3 gap-4">
        <div className="rounded-2xl bg-gray-900 text-white p-5">
          <p className="text-[11px] font-semibold tracking-wider text-white/60 uppercase">Outstanding</p>
          <p className="text-[30px] font-bold tracking-tight leading-tight mt-1">{money(summary?.outstanding_cents ?? 0)}</p>
          <p className="text-[12px] text-white/70">on {summary?.outstanding_count ?? 0} card{(summary?.outstanding_count ?? 0) === 1 ? '' : 's'} still to be used</p>
        </div>
        <div className="rounded-2xl bg-white border border-gray-200 p-5">
          <p className="text-[11px] font-semibold tracking-wider text-gray-400 uppercase">Issued this month</p>
          <p className="text-[30px] font-bold tracking-tight leading-tight mt-1 text-gray-900">{money(summary?.issued_month_cents ?? 0)}</p>
          <p className="text-[12px] text-gray-500">{summary?.issued_month_count ?? 0} card{(summary?.issued_month_count ?? 0) === 1 ? '' : 's'} · cash you've already banked</p>
        </div>
        <div className="rounded-2xl bg-white border border-gray-200 p-5">
          <p className="text-[11px] font-semibold tracking-wider text-gray-400 uppercase">Used this month</p>
          <p className="text-[30px] font-bold tracking-tight leading-tight mt-1 text-gray-900">{money(summary?.used_month_cents ?? 0)}</p>
          <p className="text-[12px] text-gray-500">{summary?.used_month_count ?? 0} visit{(summary?.used_month_count ?? 0) === 1 ? '' : 's'}</p>
        </div>
      </div>
      <p className="text-[12px] text-gray-500 -mt-2">Outstanding is money customers have paid you and not used yet. Your accountant will ask for it at year end.</p>

      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
        <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-[14px] font-semibold text-gray-900">Open cards</h3>
          <span className="text-[12px] text-gray-400">{cards.length}</span>
        </div>
        {cards.length === 0 ? (
          <p className="px-5 py-8 text-[13px] text-gray-400 text-center">No open gift cards. Issue one from the Issue page.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="bg-gray-50 text-gray-500 text-left">
                  <th className="px-5 py-2.5 font-medium">Card</th>
                  <th className="px-5 py-2.5 font-medium">Status</th>
                  <th className="px-5 py-2.5 font-medium text-right">Balance</th>
                  <th className="px-5 py-2.5 font-medium">Issued</th>
                  <th className="px-5 py-2.5"></th>
                </tr>
              </thead>
              <tbody>
                {cards.map(c => (
                  <tr key={c.id} className="border-t border-gray-100">
                    <td className="px-5 py-3">
                      <span className="font-semibold text-gray-900">{c.holder_name ?? (c.for_name ? `For ${c.for_name}` : 'Gift card')}</span>
                      {c.from_name && <span className="text-gray-400"> · from {c.from_name}</span>}
                      {c.claim_code && <span className="block font-mono text-[11px] text-gray-400 mt-0.5">{c.claim_code}</span>}
                    </td>
                    <td className="px-5 py-3">
                      {c.status === 'unclaimed'
                        ? <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700">Not claimed yet</span>
                        : <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-green-50 text-green-700">Active</span>}
                    </td>
                    <td className="px-5 py-3 text-right font-semibold text-gray-900">{money(c.balance_cents)}<span className="text-gray-400 font-normal"> of {money(c.amount_cents)}</span></td>
                    <td className="px-5 py-3 text-gray-500 whitespace-nowrap">{new Date(c.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</td>
                    <td className="px-5 py-3 text-right">
                      <button type="button" onClick={() => voidCard(c)} disabled={voiding === c.id} title="Cancel this card" className="inline-flex items-center gap-1 text-[12px] font-medium text-gray-400 hover:text-red-600 disabled:opacity-50">
                        <Trash2 size={13} /> Cancel
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
        <div className="px-5 py-3.5 border-b border-gray-100"><h3 className="text-[14px] font-semibold text-gray-900">History</h3></div>
        {events.length === 0 ? (
          <p className="px-5 py-8 text-[13px] text-gray-400 text-center">Nothing yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="bg-gray-50 text-gray-500 text-left">
                  <th className="px-5 py-2.5 font-medium">When</th>
                  <th className="px-5 py-2.5 font-medium">What</th>
                  <th className="px-5 py-2.5 font-medium">Card</th>
                  <th className="px-5 py-2.5 font-medium text-right">Amount</th>
                  <th className="px-5 py-2.5 font-medium text-right">Balance after</th>
                  <th className="px-5 py-2.5 font-medium">Staff</th>
                </tr>
              </thead>
              <tbody>
                {events.map(e => (
                  <tr key={e.id} className="border-t border-gray-100">
                    <td className="px-5 py-3 text-gray-500 whitespace-nowrap">{when(e.created_at)}</td>
                    <td className="px-5 py-3">
                      <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                        e.type === 'redeem' ? 'bg-brand-50 text-brand-600' : e.type === 'issue' ? 'bg-accent-50 text-accent-500' : e.type === 'void' ? 'bg-red-50 text-red-700' : 'bg-gray-100 text-gray-600'
                      }`}>{e.type === 'redeem' ? 'Used' : e.type === 'issue' ? 'Issued' : e.type === 'void' ? 'Cancelled' : 'Claimed'}</span>
                    </td>
                    <td className="px-5 py-3 font-medium text-gray-900">
                      {e.holder_name ?? (e.for_name ? `For ${e.for_name}` : 'Gift card')}
                      {e.from_name && <span className="text-gray-400 font-normal"> · from {e.from_name}</span>}
                    </td>
                    <td className={`px-5 py-3 text-right font-semibold ${e.type === 'issue' ? 'text-brand-600' : 'text-gray-900'}`}>
                      {e.amount_cents == null ? '' : e.amount_cents > 0 ? `+${money(e.amount_cents)}` : `−${money(-e.amount_cents)}`}
                    </td>
                    <td className="px-5 py-3 text-right text-gray-500">{e.balance_after_cents == null ? '' : money(e.balance_after_cents)}</td>
                    <td className="px-5 py-3 text-gray-500">{e.staff_name ?? ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Workspace: header + one section. Admin mode shows its own tabs. ───────
export function GiftCardsWorkspace({
  merchantId, merchantName, section, admin = false, compact = false, onSection,
}: {
  merchantId: string; merchantName: string; section: GiftSection; admin?: boolean; compact?: boolean; onSection?: (s: GiftSection) => void
}) {
  const titles: Record<GiftSection, [string, string]> = {
    issue: ['Issue a gift card', `Cash now, visit later. The customer pays ${merchantName} at the counter; Stampd keeps the balance and hands you a code to give them.`],
    redeem: ['Redeem a gift card', 'Same as a stamp: the customer shows a code, you type it in. Add the amount and you\'re done.'],
    history: ['Outstanding & history', 'Every card issued, used and cancelled, and what\'s still to be used.'],
  }
  const [title, sub] = titles[section]

  return (
    <div className={compact ? 'flex flex-col gap-5' : 'max-w-3xl flex flex-col gap-6'}>
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center shrink-0"><Gift size={20} strokeWidth={1.75} /></div>
        <div className="flex-1 min-w-0">
          <h1 className="text-[22px] font-semibold text-gray-900 tracking-[-0.02em]">{title}</h1>
          <p className="text-[13px] text-gray-500 mt-0.5 max-w-xl">{sub}</p>
        </div>
      </div>

      {onSection && (
        <div className="flex gap-1 bg-white border border-gray-200 rounded-lg p-1 w-fit">
          {(['issue', 'redeem', 'history'] as GiftSection[]).map(s => (
            <button key={s} type="button" onClick={() => onSection(s)} className={`px-3.5 py-1.5 rounded-md text-[13px] font-semibold ${section === s ? 'bg-brand-500 text-white' : 'text-gray-600 hover:bg-gray-50'}`}>
              {s === 'issue' ? 'Issue' : s === 'redeem' ? 'Redeem' : 'Outstanding & history'}
            </button>
          ))}
        </div>
      )}

      {section === 'issue' && <GiftCardIssue merchantId={merchantId} merchantName={merchantName} admin={admin} />}
      {section === 'redeem' && <GiftCardRedeem merchantId={merchantId} admin={admin} />}
      {section === 'history' && <GiftCardHistory merchantId={merchantId} />}

      {!compact && section !== 'history' && (
        <p className="text-[12px] text-gray-400">
          Looking for what's outstanding? <Link to="/gift-cards/history" className="font-semibold text-brand-600 hover:underline">Outstanding &amp; history</Link>
        </p>
      )}
    </div>
  )
}
