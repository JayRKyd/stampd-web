import { useEffect, useRef, useState } from 'react'
import { ImagePlus, X, Send, Check } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { resizeImage } from '@/lib/resizeImage'

// Compose and send one special or update for a merchant. Used by the
// merchant's own Specials page and by the admin panel (same rules either
// way: the server decides who may post and enforces caps and hours).

type Kind = 'special' | 'update'
type Tag = 'SPECIAL' | 'TODAY' | 'UNTIL' | 'ENDS' | 'COUNTDOWN'

interface Preview {
  ok: boolean
  reason?: string
  title?: string
  body?: string
  recipients?: number
  month_used?: number
  month_cap?: number
  next_allowed_at?: string
}

interface Props {
  merchantId: string
  merchantName: string
  onPosted?: () => void
}

const MAX = 80

// Plain-language reasons for every refusal the server can return
function explain(p: Preview): string {
  switch (p.reason) {
    case 'unauthorized': return "You can't post for this business."
    case 'merchant_not_found': return 'Business not found.'
    case 'merchant_not_active': return 'Posts open once the account is approved and active.'
    case 'empty': return 'Type what the special is.'
    case 'too_long': return `Keep it under ${MAX} characters.`
    case 'no_links': return "Links don't go through. Customers tap the post to find you."
    case 'no_phone_numbers': return 'Leave the phone number out. Your shop page already has it.'
    case 'no_all_caps': return 'Easy on the caps lock. Plain words get read.'
    case 'too_many_exclamations': return 'One exclamation mark is plenty.'
    case 'bad_run_length': return 'A post can run from 1 to 7 days.'
    case 'end_time_passed': return 'That end time has already passed today.'
    case 'quiet_hours': return `Posts send between 9am and 8pm. Next window: ${whenNext(p.next_allowed_at)}.`
    case 'daily_cap': return `You've sent today's post. You can send again ${whenNext(p.next_allowed_at)}.`
    case 'monthly_cap': return `You've used ${p.month_used} of ${p.month_cap} posts this month.`
    default: return 'Something went wrong. Try again.'
  }
}

function whenNext(ts?: string): string {
  if (!ts) return 'tomorrow at 9am'
  const d = new Date(ts.replace(' ', 'T'))
  const today = new Date()
  const sameDay = d.getFullYear() === today.getFullYear() && d.getMonth() === today.getMonth() && d.getDate() === today.getDate()
  const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }).replace(':00', '')
  return sameDay ? `today at ${time}` : `tomorrow at ${time}`
}

function tagLabel(tag: Tag, endsAt: string, days: number): string {
  if (tag === 'UNTIL' && endsAt) {
    const [h, m] = endsAt.split(':').map(Number)
    const hour12 = ((h + 11) % 12) + 1
    const ampm = h >= 12 ? 'pm' : 'am'
    return `UNTIL ${hour12}${m ? ':' + String(m).padStart(2, '0') : ''}${ampm}`.toUpperCase()
  }
  if (tag === 'ENDS' && days > 1) {
    const end = new Date(); end.setDate(end.getDate() + days - 1)
    return `ENDS ${end.toLocaleDateString('en-US', { weekday: 'long' })}`.toUpperCase()
  }
  if (tag === 'COUNTDOWN' && days > 1) return `${days} DAYS LEFT`
  return tag === 'TODAY' ? 'TODAY' : 'SPECIAL'
}

export function SpecialComposer({ merchantId, merchantName, onPosted }: Props) {
  const [kind, setKind] = useState<Kind>('special')
  const [text, setText] = useState('')
  const [days, setDays] = useState(1)
  const [endsAt, setEndsAt] = useState('')          // 'HH:MM' or ''
  const [tag, setTag] = useState<Tag>('SPECIAL')
  const [earnsStamp, setEarnsStamp] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [localPreview, setLocalPreview] = useState<string | null>(null)
  const [preview, setPreview] = useState<Preview | null>(null)
  const [checking, setChecking] = useState(false)
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState<{ recipients: number } | null>(null)
  const [error, setError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  // Default tag follows the type; a tag that no longer applies falls back
  useEffect(() => {
    setTag(prev => {
      if (prev === 'UNTIL' && !endsAt) return kind === 'update' ? 'TODAY' : 'SPECIAL'
      if ((prev === 'ENDS' || prev === 'COUNTDOWN') && days < 2) return kind === 'update' ? 'TODAY' : 'SPECIAL'
      if (prev === 'SPECIAL' || prev === 'TODAY') return kind === 'update' ? 'TODAY' : 'SPECIAL'
      return prev
    })
  }, [kind, endsAt, days])

  // Ask the server what it thinks, a beat after the merchant stops typing
  useEffect(() => {
    if (!text.trim()) { setPreview(null); return }
    let alive = true
    setChecking(true)
    const t = setTimeout(async () => {
      const supabase = createClient()
      const { data, error: rpcErr } = await supabase.rpc('preview_special', {
        p_merchant_id: merchantId,
        p_text: text,
        p_days: days,
        p_ends_at_time: endsAt || null,
      })
      if (!alive) return
      setPreview(rpcErr ? { ok: false } : (data as Preview))
      setChecking(false)
    }, 400)
    return () => { alive = false; clearTimeout(t) }
  }, [text, days, endsAt, merchantId])

  function pickFile(f: File | null) {
    setFile(f)
    if (localPreview) URL.revokeObjectURL(localPreview)
    setLocalPreview(f ? URL.createObjectURL(f) : null)
  }

  async function post() {
    if (!preview?.ok || sending) return
    setSending(true)
    setError('')
    const supabase = createClient()

    let imageUrl: string | null = null
    if (file) {
      try {
        const resized = await resizeImage(file, 1350)
        const ext = resized.type === 'image/png' ? 'png' : 'jpg'
        const path = `merchants/${merchantId}/specials/${Date.now()}.${ext}`
        const { error: upErr } = await supabase.storage
          .from('merchant-assets')
          .upload(path, resized, { upsert: true, contentType: resized.type || undefined })
        if (upErr) throw upErr
        const { data: { publicUrl } } = supabase.storage.from('merchant-assets').getPublicUrl(path)
        imageUrl = publicUrl
      } catch {
        setError("The flyer didn't upload. Try a smaller image, or post without one.")
        setSending(false)
        return
      }
    }

    const { data, error: rpcErr } = await supabase.rpc('send_special', {
      p_merchant_id: merchantId,
      p_text: text,
      p_kind: kind,
      p_image_url: imageUrl,
      p_earns_stamp: earnsStamp,
      p_days: days,
      p_ends_at_time: endsAt || null,
      p_tag: tag,
    })
    setSending(false)
    const res = data as Preview & { recipients?: number }
    if (rpcErr || !res?.ok) {
      setError(explain(res ?? { ok: false }))
      return
    }
    setSent({ recipients: res.recipients ?? 0 })
    onPosted?.()
  }

  function reset() {
    setText(''); setDays(1); setEndsAt(''); setEarnsStamp(false); pickFile(null)
    setPreview(null); setSent(null); setError('')
  }

  const bodyLine = text.trim()
    ? `${text.trim()}${/[.!?]$/.test(text.trim()) ? '' : '.'} Stop by.`
    : 'What’s on today? Stop by.'
  const remaining = MAX - text.length
  const blocked = preview && !preview.ok

  if (sent) {
    return (
      <div className="border border-gray-200 rounded-xl bg-white p-6 flex flex-col items-center text-center gap-3">
        <div className="w-11 h-11 rounded-full bg-green-50 text-green-600 flex items-center justify-center">
          <Check size={22} strokeWidth={2.5} />
        </div>
        <p className="text-[15px] font-semibold text-gray-900">Posted.</p>
        <p className="text-[13px] text-gray-500 max-w-sm">
          Sent to {sent.recipients} {sent.recipients === 1 ? 'customer' : 'customers'} and listed under Today for everyone on Stampd.
          Tomorrow you’ll see how many came in.
        </p>
        <button onClick={reset} className="mt-1 px-4 py-2 rounded-lg border border-gray-200 text-[13px] font-semibold text-gray-700 hover:bg-gray-50">
          Done
        </button>
      </div>
    )
  }

  return (
    <div className="grid lg:grid-cols-[1fr_300px] gap-5">
      <div className="border border-gray-200 rounded-xl bg-white p-5 flex flex-col gap-4">
        {/* Special or update */}
        <div className="flex gap-1.5">
          {(['special', 'update'] as Kind[]).map(k => (
            <button
              key={k}
              type="button"
              onClick={() => setKind(k)}
              className={`px-3 py-1.5 rounded-lg text-[12px] font-semibold capitalize transition-colors ${
                kind === k ? 'bg-brand-500 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              {k === 'special' ? 'Special' : 'Update'}
            </button>
          ))}
          <span className="self-center text-[12px] text-gray-500 ml-1">
            {kind === 'special' ? 'A deal or a sale.' : 'News, hours, something new.'}
          </span>
        </div>

        {/* The line */}
        <div>
          <label htmlFor="special-text" className="block text-[11px] font-semibold uppercase tracking-wider text-gray-500 mb-1.5">
            Your line
          </label>
          <div className={`flex items-center gap-2 rounded-xl border px-2 py-1.5 ${blocked ? 'border-amber-300' : 'border-gray-200 focus-within:border-brand-500'}`}>
            <span className="shrink-0 text-[13px] font-semibold text-brand-600 bg-brand-50 px-2 py-1 rounded-md">{merchantName}:</span>
            <input
              id="special-text"
              type="text"
              value={text}
              maxLength={MAX}
              onChange={e => { setText(e.target.value); setError('') }}
              placeholder="Half price on large smoothies until 3pm"
              className="flex-1 min-w-0 border-0 outline-none text-[15px] font-medium text-gray-900 placeholder:text-gray-400 bg-transparent"
            />
            <span className="shrink-0 text-[13px] font-semibold text-brand-600 bg-brand-50 px-2 py-1 rounded-md">Stop by.</span>
          </div>
          <div className="flex justify-between mt-1.5 text-[12px]">
            <span className={blocked ? 'text-amber-700' : 'text-gray-500'}>
              {blocked ? explain(preview) : 'Plain words work best. No links, no all caps.'}
            </span>
            <span className={`font-semibold tabular-nums ${remaining < 10 ? 'text-amber-600' : 'text-gray-400'}`}>{text.length} / {MAX}</span>
          </div>
        </div>

        {/* Flyer */}
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500 mb-1.5">Flyer (optional)</p>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={e => pickFile(e.target.files?.[0] ?? null)} />
          {localPreview ? (
            <div className="flex items-center gap-3">
              <img src={localPreview} alt="" className="w-16 h-20 object-cover rounded-lg border border-gray-200" />
              <div className="text-[12px] text-gray-500">
                <p>Shown as your card under Today. 4:5 or square looks best.</p>
                <button type="button" onClick={() => pickFile(null)} className="mt-1 inline-flex items-center gap-1 text-gray-700 font-semibold hover:underline">
                  <X size={12} /> Remove
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-dashed border-gray-300 text-[13px] text-gray-600 hover:bg-gray-50"
            >
              <ImagePlus size={15} /> Add the flyer you made
            </button>
          )}
          <p className="text-[12px] text-gray-400 mt-1.5">No flyer? Stampd draws a card in your colours with your line on it.</p>
        </div>

        {/* Timing and tag */}
        <div className="grid sm:grid-cols-3 gap-3">
          <div>
            <label htmlFor="special-days" className="block text-[11px] font-semibold uppercase tracking-wider text-gray-500 mb-1.5">Runs</label>
            <select id="special-days" value={days} onChange={e => setDays(Number(e.target.value))}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 text-[13px] bg-white">
              <option value={1}>Today only</option>
              {[2, 3, 4, 5, 6, 7].map(d => <option key={d} value={d}>{d} days</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="special-ends" className="block text-[11px] font-semibold uppercase tracking-wider text-gray-500 mb-1.5">Ends at</label>
            <input id="special-ends" type="time" value={endsAt} onChange={e => setEndsAt(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 text-[13px] bg-white" />
            <p className="text-[11px] text-gray-400 mt-1">Blank = end of day</p>
          </div>
          <div>
            <label htmlFor="special-tag" className="block text-[11px] font-semibold uppercase tracking-wider text-gray-500 mb-1.5">Tag</label>
            <select id="special-tag" value={tag} onChange={e => setTag(e.target.value as Tag)}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 text-[13px] bg-white">
              <option value={kind === 'update' ? 'TODAY' : 'SPECIAL'}>{kind === 'update' ? 'Today' : 'Special'}</option>
              {endsAt && <option value="UNTIL">Until {tagLabel('UNTIL', endsAt, days).replace('UNTIL ', '').toLowerCase()}</option>}
              {days > 1 && <option value="ENDS">{tagLabel('ENDS', endsAt, days).replace('ENDS ', 'Ends ')}</option>}
              {days > 1 && <option value="COUNTDOWN">{days} days left</option>}
            </select>
          </div>
        </div>

        <label className="flex items-start gap-2.5 text-[13px] text-gray-700">
          <input type="checkbox" checked={earnsStamp} onChange={e => setEarnsStamp(e.target.checked)} className="mt-0.5 accent-brand-500" />
          <span>
            <span className="font-semibold">This earns a stamp.</span>{' '}
            <span className="text-gray-500">Tick it when the special is on the thing that earns a stamp. Those posts get counted.</span>
          </span>
        </label>

        {/* Audience and send */}
        <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-gray-100">
          <p className="text-[13px] text-gray-600 flex-1 min-w-[200px]">
            {preview?.ok
              ? <>Goes to <span className="font-semibold text-gray-900">{preview.recipients} {preview.recipients === 1 ? 'customer' : 'customers'}</span> and onto Today for everyone on Stampd. {preview.month_used}/{preview.month_cap} used this month.</>
              : checking ? 'Checking…' : 'Type your line to see who it reaches.'}
          </p>
          <button
            type="button"
            onClick={post}
            disabled={!preview?.ok || sending}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-brand-500 text-white text-[13px] font-semibold hover:bg-brand-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Send size={14} /> {sending ? 'Posting…' : 'Post now'}
          </button>
        </div>
        {error && <p className="text-[13px] text-amber-700">{error}</p>}
      </div>

      {/* Live preview: the push and the card */}
      <aside className="flex flex-col gap-3">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">What customers see</p>
        <div className="rounded-2xl bg-[#F7F2E8] border border-gray-200 p-3">
          <p className="text-[10px] font-semibold text-gray-400 mb-2">PUSH</p>
          <div className="bg-white rounded-xl p-3 flex gap-2.5 items-start shadow-sm">
            <div className="w-8 h-8 rounded-lg bg-brand-500 text-white text-[12px] font-bold flex items-center justify-center shrink-0">
              {merchantName.slice(0, 1).toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="flex justify-between gap-2"><span className="text-[13px] font-bold text-gray-900 truncate">{merchantName}</span><span className="text-[11px] text-gray-400">now</span></div>
              <p className="text-[12.5px] text-gray-700 leading-snug">{bodyLine}</p>
            </div>
          </div>
        </div>
        <div className="rounded-2xl bg-[#F7F2E8] border border-gray-200 p-3">
          <p className="text-[10px] font-semibold text-gray-400 mb-2">CARD UNDER TODAY</p>
          <div className="relative w-[150px] aspect-[4/5] rounded-xl overflow-hidden bg-[#0B3B34] text-[#F7F2E8] flex items-center justify-center text-center p-3">
            {localPreview
              ? <img src={localPreview} alt="" className="absolute inset-0 w-full h-full object-cover" />
              : <p className="text-[13px] font-bold leading-snug">{text.trim() || 'Your line here'}</p>}
            <span className="absolute top-2 left-2 text-[9px] font-extrabold tracking-wider bg-[#d4a843] text-[#0C2E29] px-1.5 py-0.5 rounded-full">
              {tagLabel(tag, endsAt, days)}
            </span>
            <div className="absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-black/60 to-transparent text-left">
              <p className="text-[11px] font-bold truncate">{merchantName}</p>
              {earnsStamp && <p className="text-[9px] opacity-85">Earns a stamp</p>}
            </div>
          </div>
        </div>
      </aside>
    </div>
  )
}
