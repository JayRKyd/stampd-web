import { useState, useEffect, useCallback } from 'react'
import { X, Phone, CalendarDays, Stamp, Gift, Check, BellRing, CheckCircle2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { timeAgo } from '@/lib/timeAgo'
import { type CrmCustomer, primarySegment, displayName, initials, canNudge, nextNudgeAt } from '@/lib/crm'

interface PendingReward {
  id: string
  reward_title: string
  created_at: string
}

interface TimelineEvent {
  id: string
  kind: 'stamp' | 'reward_earned' | 'reward_redeemed'
  date: string
  label: string
  detail: string | null
}

const TONE_CLASSES = {
  gold: 'bg-accent-50 text-accent-500',
  amber: 'bg-amber-50 text-amber-700',
  green: 'bg-green-50 text-green-700',
  gray: 'bg-gray-100 text-gray-500',
} as const

export default function CustomerDrawer({
  customer,
  merchantId,
  stampGoal,
  isActive,
  onClose,
  onNoteSaved,
  onNudged,
}: {
  customer: CrmCustomer
  merchantId: string
  stampGoal: number
  isActive: boolean
  onClose: () => void
  onNoteSaved: (userId: string, note: string) => void
  onNudged: (userId: string, at: string) => void
}) {
  const [timeline, setTimeline] = useState<TimelineEvent[]>([])
  const [timelineLoading, setTimelineLoading] = useState(true)
  const [note, setNote] = useState(customer.note)
  const [noteSaving, setNoteSaving] = useState(false)
  const [noteSaved, setNoteSaved] = useState(false)
  const [nudging, setNudging] = useState(false)
  const [nudgeResult, setNudgeResult] = useState<{ body: string; delivered: boolean } | null>(null)
  const [nudgeError, setNudgeError] = useState('')
  const [pendingRewards, setPendingRewards] = useState<PendingReward[]>([])
  const [redeemingId, setRedeemingId] = useState<string | null>(null)
  const [redeemSuccess, setRedeemSuccess] = useState('')

  const segment = primarySegment(customer, stampGoal)

  useEffect(() => {
    setNote(customer.note)
    setNoteSaved(false)
    setNudgeResult(null)
    setNudgeError('')
    setRedeemSuccess('')
  }, [customer.user_id, customer.note])

  useEffect(() => {
    let cancelled = false
    async function loadPendingRewards() {
      const supabase = createClient()
      const { data } = await supabase
        .from('rewards')
        .select('id, reward_title, created_at')
        .eq('merchant_id', merchantId)
        .eq('user_id', customer.user_id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
      if (!cancelled) setPendingRewards(data ?? [])
    }
    loadPendingRewards()
    return () => { cancelled = true }
  }, [customer.user_id, merchantId])

  useEffect(() => {
    let cancelled = false
    async function loadTimeline() {
      setTimelineLoading(true)
      const supabase = createClient()

      const [{ data: stamps }, { data: rewards }] = await Promise.all([
        supabase
          .from('stamp_events')
          .select('id, created_at, quantity, staff(name)')
          .eq('merchant_id', merchantId)
          .eq('user_id', customer.user_id)
          .order('created_at', { ascending: false })
          .limit(20),
        supabase
          .from('rewards')
          .select('id, reward_title, status, created_at, redeemed_at')
          .eq('merchant_id', merchantId)
          .eq('user_id', customer.user_id)
          .order('created_at', { ascending: false })
          .limit(10),
      ])

      if (cancelled) return

      const events: TimelineEvent[] = []

      for (const s of stamps ?? []) {
        const staff = s.staff as unknown as { name: string } | null
        const qty = s.quantity ?? 1
        events.push({
          id: `stamp-${s.id}`,
          kind: 'stamp',
          date: s.created_at,
          label: qty > 1 ? `+${qty} stamps` : '+1 stamp',
          detail: staff?.name ? `by ${staff.name}` : null,
        })
      }

      for (const r of rewards ?? []) {
        events.push({
          id: `reward-${r.id}`,
          kind: 'reward_earned',
          date: r.created_at,
          label: 'Reward earned',
          detail: r.reward_title,
        })
        if (r.status === 'redeemed' && r.redeemed_at) {
          events.push({
            id: `redeem-${r.id}`,
            kind: 'reward_redeemed',
            date: r.redeemed_at,
            label: 'Reward redeemed',
            detail: r.reward_title,
          })
        }
      }

      events.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      setTimeline(events.slice(0, 25))
      setTimelineLoading(false)
    }
    loadTimeline()
    return () => { cancelled = true }
  }, [customer.user_id, merchantId])

  // Escape to close
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  const saveNote = useCallback(async () => {
    if (!isActive) return
    setNoteSaving(true)
    const supabase = createClient()
    const { error } = await supabase
      .from('merchant_customer_notes')
      .upsert({
        merchant_id: merchantId,
        user_id: customer.user_id,
        note: note.trim(),
        updated_at: new Date().toISOString(),
      })
    setNoteSaving(false)
    if (!error) {
      setNoteSaved(true)
      onNoteSaved(customer.user_id, note.trim())
      setTimeout(() => setNoteSaved(false), 2000)
    }
  }, [merchantId, customer.user_id, note, onNoteSaved, isActive])

  const sendNudge = useCallback(async () => {
    if (!isActive) return
    setNudging(true)
    setNudgeError('')
    const supabase = createClient()
    const { data, error } = await supabase.functions.invoke('send-nudge', {
      body: { user_id: customer.user_id },
    })
    setNudging(false)
    if (error) {
      setNudgeError('Could not send the nudge — try again in a moment.')
      return
    }
    if (data?.reason === 'merchant_not_approved') {
      setNudgeError('Available after your account is approved.')
      return
    }
    if (data?.ok) {
      setNudgeResult({ body: data.body, delivered: !!data.delivered })
      onNudged(customer.user_id, new Date().toISOString())
    } else if (data?.reason === 'cooldown') {
      setNudgeError('This customer was nudged recently — you can send another once the cooldown ends.')
      if (data.next_allowed_at) {
        // Sync local state with the server's view of the cooldown
        const serverLast = new Date(new Date(data.next_allowed_at).getTime() - 14 * 86400000)
        onNudged(customer.user_id, serverLast.toISOString())
      }
    } else {
      setNudgeError('Could not send the nudge — try again in a moment.')
    }
  }, [customer.user_id, onNudged, isActive])

  const redeemReward = useCallback(async (rewardId: string) => {
    if (!isActive) return
    setRedeemingId(rewardId)
    setRedeemSuccess('')
    const supabase = createClient()
    const { data, error } = await supabase.rpc('redeem_customer_reward', { p_reward_id: rewardId })
    setRedeemingId(null)
    if (error || !data?.ok) {
      setRedeemSuccess('')
      return
    }
    setPendingRewards(prev => prev.filter(r => r.id !== rewardId))
    setRedeemSuccess('Reward marked as redeemed — customer notified in app.')
    setTimeout(() => setRedeemSuccess(''), 4000)
  }, [isActive])

  const memberSince = new Date(customer.member_since).toLocaleDateString('en-US', {
    month: 'short', year: 'numeric',
  })

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 z-40 bg-gray-950/20" onClick={onClose} />

      {/* Panel */}
      <aside className="fixed inset-y-0 right-0 z-50 w-full max-w-[420px] bg-white shadow-2xl flex flex-col animate-enter overflow-hidden">
        {/* Header */}
        <div className="flex items-start gap-3 p-5 border-b border-gray-100 shrink-0">
          {customer.avatar_url ? (
            <img src={customer.avatar_url} alt="" className="w-12 h-12 rounded-full object-cover shrink-0" />
          ) : (
            <div className="w-12 h-12 rounded-full bg-brand-50 flex items-center justify-center text-[15px] font-bold text-brand-600 shrink-0">
              {initials(customer)}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-[16px] font-bold text-gray-900 truncate">{displayName(customer)}</h2>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${TONE_CLASSES[segment.tone]}`}>
                {segment.label}
              </span>
            </div>
            <div className="flex items-center gap-3 mt-1 text-[12px] text-gray-500">
              {customer.phone_masked && (
                <span className="flex items-center gap-1"><Phone size={11} /> {customer.phone_masked}</span>
              )}
              <span className="flex items-center gap-1"><CalendarDays size={11} /> Since {memberSince}</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors shrink-0"
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {/* Stats grid */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Card progress', value: `${customer.current_stamps} / ${stampGoal}` },
              { label: 'Lifetime stamps', value: String(customer.total_stamps_earned) },
              { label: 'Rewards earned', value: String(customer.total_rewards_earned) },
              { label: 'Last visit', value: customer.last_stamp_at ? timeAgo(customer.last_stamp_at) : 'Never' },
            ].map(({ label, value }) => (
              <div key={label} className="border border-gray-200 rounded-xl p-3">
                <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">{label}</p>
                <p className="text-[16px] font-bold text-gray-900 mt-0.5">{value}</p>
              </div>
            ))}
          </div>

          {(customer.pending_rewards > 0 || pendingRewards.length > 0) && (
            <div>
              <p className="text-[13px] font-bold text-gray-900 mb-2">Pending rewards</p>
              {!isActive && (
                <p className="text-[12px] text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 mb-2">
                  Available after your account is approved.
                </p>
              )}
              <div className="space-y-2">
                {(pendingRewards.length > 0 ? pendingRewards : [{ id: 'pending', reward_title: 'Unredeemed reward', created_at: '' }]).map(r => (
                  r.id === 'pending' ? (
                    <div key={r.id} className="flex items-center gap-2 p-3 rounded-xl bg-accent-50 border border-accent-100">
                      <Gift size={15} className="text-accent-500 shrink-0" />
                      <p className="text-[12px] font-medium text-accent-500 flex-1">
                        Customer has {customer.pending_rewards} unredeemed reward{customer.pending_rewards !== 1 ? 's' : ''} in their wallet
                      </p>
                    </div>
                  ) : (
                    <div key={r.id} className="flex items-center gap-2 p-3 rounded-xl bg-accent-50 border border-accent-100">
                      <Gift size={15} className="text-accent-500 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-[12px] font-semibold text-gray-800 truncate">{r.reward_title}</p>
                        <p className="text-[11px] text-gray-500">Show voucher at counter, then confirm</p>
                      </div>
                      <button
                        onClick={() => redeemReward(r.id)}
                        disabled={!isActive || redeemingId === r.id}
                        className="px-3 py-1.5 rounded-lg bg-brand-500 text-white text-[11px] font-semibold hover:bg-brand-600 disabled:opacity-60 shrink-0"
                      >
                        {redeemingId === r.id ? '…' : 'Redeem'}
                      </button>
                    </div>
                  )
                ))}
              </div>
              {redeemSuccess && (
                <p className="flex items-center gap-1.5 text-[12px] text-green-700 mt-2">
                  <CheckCircle2 size={13} /> {redeemSuccess}
                </p>
              )}
            </div>
          )}

          {/* Nudge */}
          <div>
            <p className="text-[13px] font-bold text-gray-900 mb-2">Bring them back</p>
            {!isActive && (
              <p className="text-[12px] text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 mb-2">
                Available after your account is approved.
              </p>
            )}
            {nudgeResult ? (
              <div className="p-3 rounded-xl bg-green-50 border border-green-200">
                <p className="flex items-center gap-1.5 text-[12px] font-semibold text-green-700">
                  <Check size={13} /> Nudge sent
                </p>
                <p className="text-[12px] text-green-700/80 mt-1">"{nudgeResult.body}"</p>
                {!nudgeResult.delivered && (
                  <p className="text-[11px] text-green-700/60 mt-1">
                    They don't have push notifications set up yet — it's saved for when they do.
                  </p>
                )}
              </div>
            ) : canNudge(customer) ? (
              <>
                <button
                  onClick={sendNudge}
                  disabled={!isActive || nudging}
                  className="flex w-full items-center justify-center gap-2 py-2.5 rounded-xl bg-brand-500 text-white text-[13px] font-semibold hover:bg-brand-600 transition-colors disabled:opacity-60"
                >
                  <BellRing size={14} />
                  {nudging ? 'Sending…' : 'Send a "we miss you" nudge'}
                </button>
                <p className="text-[11px] text-gray-400 mt-1.5">
                  Sends a push reminding them how close they are to their next reward. Max one every 14 days.
                </p>
              </>
            ) : (
              <div className="p-3 rounded-xl bg-gray-50 border border-gray-200">
                <p className="text-[12px] text-gray-500">
                  Nudged {customer.last_nudged_at ? timeAgo(customer.last_nudged_at) : 'recently'} — next one available{' '}
                  {nextNudgeAt(customer)?.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}.
                </p>
              </div>
            )}
            {nudgeError && <p className="text-[12px] text-red-500 mt-1.5">{nudgeError}</p>}
          </div>

          {/* Notes */}
          <div>
            <p className="text-[13px] font-bold text-gray-900 mb-2">Notes</p>
            {!isActive && (
              <p className="text-[12px] text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 mb-2">
                Available after your account is approved.
              </p>
            )}
            <textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              disabled={!isActive}
              placeholder="Anything worth remembering — “prefers oat milk”, “birthday in June”…"
              rows={3}
              className="w-full px-3 py-2 rounded-xl border border-gray-200 text-[13px] resize-none focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/20 transition-all placeholder:text-gray-400"
            />
            <div className="flex justify-end mt-2">
              <button
                onClick={saveNote}
                disabled={!isActive || noteSaving || note.trim() === customer.note}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-brand-500 text-white text-[12px] font-semibold hover:bg-brand-600 transition-colors disabled:opacity-40"
              >
                {noteSaved ? <><Check size={13} /> Saved</> : noteSaving ? 'Saving…' : 'Save note'}
              </button>
            </div>
          </div>

          {/* Timeline */}
          <div>
            <p className="text-[13px] font-bold text-gray-900 mb-3">Activity</p>
            {timelineLoading ? (
              <div className="flex justify-center py-8">
                <div className="w-5 h-5 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : timeline.length === 0 ? (
              <p className="text-[12px] text-gray-400 py-4 text-center">No activity yet.</p>
            ) : (
              <div className="space-y-1">
                {timeline.map(ev => (
                  <div key={ev.id} className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                      ev.kind === 'stamp'
                        ? 'bg-brand-50 text-brand-600'
                        : ev.kind === 'reward_earned'
                        ? 'bg-accent-50 text-accent-500'
                        : 'bg-green-50 text-green-600'
                    }`}>
                      {ev.kind === 'stamp' ? <Stamp size={13} /> : <Gift size={13} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-medium text-gray-800">
                        {ev.label}
                        {ev.detail && <span className="font-normal text-gray-500"> · {ev.detail}</span>}
                      </p>
                    </div>
                    <span className="text-[11px] text-gray-400 shrink-0">{timeAgo(ev.date)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </aside>
    </>
  )
}
