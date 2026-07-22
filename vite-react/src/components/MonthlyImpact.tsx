import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

// The conversion panel: shows a merchant, in their own money, what Stampd did
// for them this month — repeat visits driven, new regulars, rewards redeemed,
// and an estimated dollar value. The whole point is that when the trial ends,
// paying is obvious because the value is already on the screen.

const DEFAULT_TICKET = 15

type Data = {
  repeatVisits: number
  totalVisits: number
  newRegulars: number
  rewardsRedeemed: number
}

export function MonthlyImpact() {
  const [data, setData] = useState<Data | null>(null)
  const [merchantId, setMerchantId] = useState<string | null>(null)
  const [avgTicket, setAvgTicket] = useState(DEFAULT_TICKET)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: merchant } = await supabase
        .from('merchants').select('id').eq('owner_id', user.id).maybeSingle()
      if (!merchant) return
      setMerchantId(merchant.id)

      const saved = localStorage.getItem(`stampd_avg_ticket_${merchant.id}`)
      if (saved) setAvgTicket(Math.max(1, Number(saved) || DEFAULT_TICKET))

      const monthStart = new Date()
      monthStart.setDate(1)
      monthStart.setHours(0, 0, 0, 0)
      const iso = monthStart.toISOString()

      const [eventsRes, membersRes, rewardsRes] = await Promise.all([
        supabase.from('stamp_events').select('membership_id')
          .eq('merchant_id', merchant.id).gte('created_at', iso),
        supabase.from('memberships').select('id, created_at').eq('merchant_id', merchant.id),
        supabase.from('rewards').select('id', { count: 'exact', head: true })
          .eq('merchant_id', merchant.id).eq('status', 'redeemed').gte('redeemed_at', iso),
      ])

      const events = eventsRes.data ?? []
      const members = membersRes.data ?? []
      // A visit counts as "repeat" when the customer joined before this month —
      // i.e. Stampd brought an existing regular back, rather than a first-timer.
      const joinedBeforeMonth = new Set(
        members.filter(m => new Date(m.created_at) < monthStart).map(m => m.id)
      )
      const repeatVisits = events.filter(e => joinedBeforeMonth.has(e.membership_id)).length
      const newRegulars = members.filter(m => new Date(m.created_at) >= monthStart).length

      setData({
        repeatVisits,
        totalVisits: events.length,
        newRegulars,
        rewardsRedeemed: rewardsRes.count ?? 0,
      })
    }
    load()
  }, [])

  function updateTicket(v: number) {
    const clean = Math.max(1, Math.min(9999, Math.round(v) || DEFAULT_TICKET))
    setAvgTicket(clean)
    if (merchantId) localStorage.setItem(`stampd_avg_ticket_${merchantId}`, String(clean))
  }

  const month = new Date().toLocaleDateString('en-US', { month: 'long' })

  // Loading / not a merchant — render nothing rather than an empty shell
  if (!data) return null

  const { repeatVisits, totalVisits, newRegulars, rewardsRedeemed } = data
  const estValue = repeatVisits * avgTicket
  const hasActivity = totalVisits > 0 || newRegulars > 0

  return (
    <div className="mb-6 rounded-2xl px-6 py-6 sm:px-8 sm:py-7 text-white bg-[#024D48] relative overflow-hidden">
      {/* Quiet brand texture: oversized stamp ring bleeding off the corner */}
      <div
        aria-hidden
        className="absolute -right-16 -top-20 w-64 h-64 rounded-full border-[22px] border-white/[0.05] pointer-events-none"
      />

      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#F5A623] mb-5">
        {month} with Stampd
      </p>

      {!hasActivity ? (
        <div className="relative">
          <p className="text-[20px] font-bold tracking-[-0.01em]">Your first regulars start here.</p>
          <p className="text-[13.5px] text-white/65 mt-1.5 max-w-md leading-relaxed">
            Stamp your first customers and this becomes your monthly report: who
            came back, and what those visits were worth.
          </p>
        </div>
      ) : (
        <div className="relative">
          {/* The story, told as a sentence */}
          {repeatVisits > 0 ? (
            <p className="text-[26px] sm:text-[30px] font-bold tracking-[-0.02em] leading-[1.25] max-w-2xl">
              Your regulars came back{' '}
              <span className="text-[#F5A623]">{repeatVisits} times</span> this
              month — about{' '}
              <span className="text-[#F5A623]">${estValue.toLocaleString()}</span>{' '}
              in repeat business.
            </p>
          ) : (
            <p className="text-[26px] sm:text-[30px] font-bold tracking-[-0.02em] leading-[1.25] max-w-2xl">
              <span className="text-[#F5A623]">{newRegulars}</span> new{' '}
              {newRegulars === 1 ? 'regular' : 'regulars'} joined your card this
              month — their return visits will show up here.
            </p>
          )}

          {/* Supporting facts: one quiet line, hairline-separated */}
          <div className="mt-6 pt-4 border-t border-white/10 flex flex-wrap items-center gap-x-8 gap-y-3">
            <p className="text-[13px] text-white/80">
              <span className="font-bold text-white">{repeatVisits}</span>{' '}
              repeat {repeatVisits === 1 ? 'visit' : 'visits'}
            </p>
            <p className="text-[13px] text-white/80">
              <span className="font-bold text-white">{newRegulars}</span>{' '}
              new {newRegulars === 1 ? 'regular' : 'regulars'}
            </p>
            <p className="text-[13px] text-white/80">
              <span className="font-bold text-white">{rewardsRedeemed}</span>{' '}
              {rewardsRedeemed === 1 ? 'reward' : 'rewards'} redeemed
            </p>
            <label className="ml-auto flex items-center gap-1 text-[12px] text-white/45">
              average sale&nbsp;$
              <input
                type="number"
                min={1}
                value={avgTicket}
                onChange={(e) => updateTicket(Number(e.target.value))}
                className="w-10 bg-transparent border-0 border-b border-white/25 px-0 py-0 text-center text-white/85 text-[12.5px] font-semibold focus:outline-none focus:border-[#F5A623] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
            </label>
          </div>
        </div>
      )}
    </div>
  )
}
