import { useState, useEffect } from 'react'
import { TrendingUp } from 'lucide-react'
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
    <div className="mb-6 rounded-2xl p-5 sm:p-6 text-white bg-gradient-to-br from-[#00655E] to-[#023B37]">
      <div className="flex items-center gap-2 mb-5">
        <TrendingUp size={14} className="text-white/70" />
        <p className="text-[11.5px] font-semibold uppercase tracking-[0.12em] text-white/65">
          Your Stampd impact · {month}
        </p>
      </div>

      {!hasActivity ? (
        <div>
          <p className="text-[19px] font-bold tracking-[-0.01em]">Your impact starts this month.</p>
          <p className="text-[13.5px] text-white/70 mt-1.5 max-w-md leading-relaxed">
            Once you start stamping, this is where you'll see the regulars Stampd
            brings back, and what those repeat visits are worth to you.
          </p>
        </div>
      ) : (
        <div className="flex flex-col lg:flex-row lg:items-stretch gap-5">
          {/* Activity — the loyalty proof */}
          <div className="flex items-end gap-8 flex-1">
            <div>
              <p className="text-[44px] font-bold leading-[0.9] tracking-[-0.03em]">{repeatVisits}</p>
              <p className="text-[12.5px] text-white/75 mt-2.5">
                repeat {repeatVisits === 1 ? 'visit' : 'visits'} from regulars
              </p>
            </div>
            <div className="pb-1">
              <p className="text-[22px] font-bold leading-none">{newRegulars}</p>
              <p className="text-[11.5px] text-white/60 mt-1.5">new {newRegulars === 1 ? 'regular' : 'regulars'}</p>
            </div>
            <div className="pb-1">
              <p className="text-[22px] font-bold leading-none">{rewardsRedeemed}</p>
              <p className="text-[11.5px] text-white/60 mt-1.5">rewards redeemed</p>
            </div>
          </div>

          {/* Value — the money story, in its own readable panel */}
          <div className="rounded-xl bg-white/10 border border-white/15 px-4 py-3.5 lg:w-[260px] flex flex-col justify-center">
            {repeatVisits > 0 ? (
              <>
                <p className="text-[11.5px] text-white/60">Estimated repeat business</p>
                <p className="text-[28px] font-bold leading-none mt-1">${estValue.toLocaleString()}</p>
              </>
            ) : (
              <p className="text-[13px] text-white/75 leading-relaxed">
                Your repeat business value appears here as regulars return.
              </p>
            )}
            <label className="flex items-center gap-1.5 text-[11px] text-white/50 mt-2.5">
              based on $
              <input
                type="number"
                min={1}
                value={avgTicket}
                onChange={(e) => updateTicket(Number(e.target.value))}
                className="w-11 bg-white/10 border border-white/20 rounded px-1 py-0.5 text-center text-white text-[11.5px] focus:outline-none focus:border-white/50"
              />
              avg sale
            </label>
          </div>
        </div>
      )}
    </div>
  )
}
