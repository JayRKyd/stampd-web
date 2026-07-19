import { useState, useEffect, useMemo } from 'react'
import { Stamp, Users, Gift, TrendingUp, ArrowRight, BarChart3, CreditCard, AlertTriangle, Moon } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { createClient } from '@/lib/supabase/client'
import { timeAgo } from '@/lib/timeAgo'
import { isRewardReady, isSlipping, type CrmCustomer } from '@/lib/crm'
import { MonthlyImpact } from '@/components/MonthlyImpact'

interface ActivityItem {
  name: string
  action: string
  time: string
  type: 'stamp' | 'reward'
  staffName?: string
}

interface StatItem {
  label: string
  value: string
  change: string
  changeTone: 'up' | 'flat'
  icon: typeof Stamp
  tone: string
}

interface DayBucket {
  date: Date
  count: number
}

export default function Dashboard() {
  const navigate = useNavigate()
  const [businessName, setBusinessName] = useState('Dashboard')
  const [stats, setStats] = useState<StatItem[]>([
    { label: "Today's Stamps", value: '—', change: '', changeTone: 'flat', icon: Stamp, tone: 'text-brand-600 bg-brand-50' },
    { label: 'Total Customers', value: '—', change: '', changeTone: 'flat', icon: Users, tone: 'text-green-600 bg-green-50' },
    { label: 'Rewards Redeemed', value: '—', change: 'this month', changeTone: 'flat', icon: Gift, tone: 'text-accent-500 bg-accent-50' },
    { label: 'All-Time Stamps', value: '—', change: '', changeTone: 'flat', icon: TrendingUp, tone: 'text-gray-500 bg-gray-100' },
  ])
  const [days, setDays] = useState<DayBucket[]>([])
  const [hoverDay, setHoverDay] = useState<number | null>(null)
  const [activity, setActivity] = useState<ActivityItem[]>([])
  const [attention, setAttention] = useState({ rewardReady: 0, slipping: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoading(false); return }

      const { data: merchant } = await supabase
        .from('merchants')
        .select('id, business_name')
        .eq('owner_id', user.id)
        .maybeSingle()
      if (!merchant) { setLoading(false); return }

      setBusinessName(merchant.business_name ?? 'Dashboard')

      const todayStart = new Date()
      todayStart.setHours(0, 0, 0, 0)
      const yesterdayStart = new Date(todayStart)
      yesterdayStart.setDate(yesterdayStart.getDate() - 1)
      const weekStart = new Date(todayStart)
      weekStart.setDate(weekStart.getDate() - 6)
      const prevWeekStart = new Date(weekStart)
      prevWeekStart.setDate(prevWeekStart.getDate() - 7)
      const monthStart = new Date()
      monthStart.setDate(1)
      monthStart.setHours(0, 0, 0, 0)
      const fourteenDaysAgo = new Date(todayStart)
      fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 13)

      const [
        todayRes, yesterdayRes, totalCustomersRes, prevWeekCustomersRes,
        monthRewardsRes, allStampsRes, weekStampsRes, prevWeekStampsRes,
        cardRes, customersRes, recentStampsRes, recentRewardsRes, sparkRes,
      ] = await Promise.all([
        supabase.from('stamp_events').select('id', { count: 'exact', head: true })
          .eq('merchant_id', merchant.id).gte('created_at', todayStart.toISOString()),
        supabase.from('stamp_events').select('id', { count: 'exact', head: true })
          .eq('merchant_id', merchant.id).gte('created_at', yesterdayStart.toISOString()).lt('created_at', todayStart.toISOString()),
        supabase.from('memberships').select('id', { count: 'exact', head: true }).eq('merchant_id', merchant.id),
        supabase.from('memberships').select('id', { count: 'exact', head: true })
          .eq('merchant_id', merchant.id).lt('created_at', weekStart.toISOString()),
        supabase.from('rewards').select('id', { count: 'exact', head: true })
          .eq('merchant_id', merchant.id).eq('status', 'redeemed').gte('redeemed_at', monthStart.toISOString()),
        supabase.from('stamp_events').select('id', { count: 'exact', head: true }).eq('merchant_id', merchant.id),
        supabase.from('stamp_events').select('id', { count: 'exact', head: true })
          .eq('merchant_id', merchant.id).gte('created_at', weekStart.toISOString()),
        supabase.from('stamp_events').select('id', { count: 'exact', head: true })
          .eq('merchant_id', merchant.id).gte('created_at', prevWeekStart.toISOString()).lt('created_at', weekStart.toISOString()),
        supabase.from('loyalty_cards').select('stamp_count_required').eq('merchant_id', merchant.id).maybeSingle(),
        supabase.rpc('get_merchant_customers'),
        supabase.from('stamp_events').select('created_at, quantity, users(first_name, last_name), staff(name)')
          .eq('merchant_id', merchant.id).order('created_at', { ascending: false }).limit(8),
        supabase.from('rewards').select('created_at, reward_title, users(first_name, last_name)')
          .eq('merchant_id', merchant.id).order('created_at', { ascending: false }).limit(5),
        supabase.from('stamp_events').select('created_at')
          .eq('merchant_id', merchant.id).gte('created_at', fourteenDaysAgo.toISOString()),
      ])

      const goal = cardRes.data?.stamp_count_required ?? 10

      const customers = (customersRes.data ?? []) as CrmCustomer[]
      const rewardReady = customers.filter(c => isRewardReady(c, goal)).length
      const slipping = customers.filter(c => isSlipping(c)).length
      setAttention({ rewardReady, slipping })

      const todayCount = todayRes.count ?? 0
      const yesterdayCount = yesterdayRes.count ?? 0
      const weekCount = weekStampsRes.count ?? 0
      const prevWeekCount = prevWeekStampsRes.count ?? 0
      const totalCustomers = totalCustomersRes.count ?? 0
      const prevCustomers = prevWeekCustomersRes.count ?? 0

      // Small businesses have small numbers — percentages on them ("-100% vs
      // prior") read as alarms. Use plain absolute deltas, and never paint a
      // slow morning red.
      const todayDelta = todayCount - yesterdayCount
      const todayChange = todayDelta > 0 ? `+${todayDelta} vs yesterday`
        : todayDelta < 0 ? `${todayDelta} vs yesterday`
        : todayCount > 0 ? 'same as yesterday' : ''

      const newCustomers = totalCustomers - prevCustomers
      const customersChange = newCustomers > 0 ? `+${newCustomers} this week` : ''

      const weekChange = prevWeekCount >= 10
        ? (() => {
            const d = Math.round(((weekCount - prevWeekCount) / prevWeekCount) * 100)
            return d === 0 ? '' : `${d > 0 ? '+' : ''}${d}% this week`
          })()
        : weekCount > 0 ? `+${weekCount} this week` : ''

      setStats([
        { label: "Today's Stamps", value: String(todayCount), change: todayChange, changeTone: todayDelta > 0 ? 'up' : 'flat', icon: Stamp, tone: 'text-brand-600 bg-brand-50' },
        { label: 'Total Customers', value: String(totalCustomers), change: customersChange, changeTone: newCustomers > 0 ? 'up' : 'flat', icon: Users, tone: 'text-green-600 bg-green-50' },
        { label: 'Rewards Redeemed', value: String(monthRewardsRes.count ?? 0), change: 'this month', changeTone: 'flat', icon: Gift, tone: 'text-accent-500 bg-accent-50' },
        { label: 'All-Time Stamps', value: String(allStampsRes.count ?? 0), change: weekChange, changeTone: weekChange.startsWith('+') ? 'up' : 'flat', icon: TrendingUp, tone: 'text-gray-500 bg-gray-100' },
      ])

      const buckets: DayBucket[] = []
      const keyIndex: Record<string, number> = {}
      for (let i = 0; i < 14; i++) {
        const d = new Date(fourteenDaysAgo)
        d.setDate(fourteenDaysAgo.getDate() + i)
        keyIndex[d.toDateString()] = i
        buckets.push({ date: d, count: 0 })
      }
      for (const row of sparkRes.data ?? []) {
        const key = new Date(row.created_at).toDateString()
        if (key in keyIndex) buckets[keyIndex[key]].count++
      }
      setDays(buckets)

      const stampItems: ActivityItem[] = (recentStampsRes.data ?? []).map((s) => {
        const u = s.users as unknown as { first_name: string | null; last_name: string | null } | null
        const staff = s.staff as unknown as { name: string } | null
        const qty = s.quantity ?? 1
        return {
          name: `${u?.first_name ?? ''} ${u?.last_name ?? ''}`.trim() || 'Customer',
          action: qty > 1 ? `earned ${qty} stamps` : 'earned a stamp',
          time: timeAgo(s.created_at),
          type: 'stamp' as const,
          staffName: staff?.name,
        }
      })

      const rewardItems: ActivityItem[] = (recentRewardsRes.data ?? []).map((r) => {
        const u = r.users as unknown as { first_name: string | null; last_name: string | null } | null
        return {
          name: `${u?.first_name ?? ''} ${u?.last_name ?? ''}`.trim() || 'Customer',
          action: `earned ${r.reward_title ?? 'reward'}`,
          time: timeAgo(r.created_at),
          type: 'reward' as const,
        }
      })

      setActivity([...stampItems, ...rewardItems].slice(0, 6))
      setLoading(false)
    }
    load()
  }, [])

  const maxDay = useMemo(() => Math.max(...days.map(d => d.count), 1), [days])
  const fourteenDayTotal = useMemo(() => days.reduce((s, d) => s + d.count, 0), [days])

  const fmtDay = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  const fmtDayLong = (d: Date) => d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })

  return (
    <div className="animate-enter">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[22px] font-semibold text-gray-900 tracking-[-0.02em]">{businessName}</h1>
          <p className="text-[13px] text-gray-500 mt-0.5">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })} — here's what's happening
          </p>
        </div>
        <button
          onClick={() => navigate('/stamp')}
          className="hidden sm:flex items-center gap-2 bg-brand-500 text-white text-[13px] font-medium px-4 py-2 rounded-lg hover:bg-brand-600 transition-colors focus-ring"
        >
          <Stamp size={15} />
          Issue Stamp
        </button>
      </div>

      {/* Monthly impact — the value story, front and center */}
      <MonthlyImpact />

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-white border border-gray-200 rounded-xl p-4 hover:border-gray-300 transition-colors">
            <div className="flex items-center justify-between mb-3">
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${stat.tone}`}>
                <stat.icon size={16} strokeWidth={1.75} />
              </div>
              {stat.change && (
                <span className={`text-[11px] font-medium ${stat.changeTone === 'up' ? 'text-green-600' : 'text-gray-400'}`}>
                  {stat.change}
                </span>
              )}
            </div>
            <p className={`text-[24px] font-bold text-gray-900 tracking-[-0.02em] leading-none ${loading ? 'opacity-30' : ''}`}>
              {stat.value}
            </p>
            <p className="text-[12px] text-gray-500 mt-1.5">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Needs attention */}
      {(attention.rewardReady > 0 || attention.slipping > 0) && (
        <div className="mb-6 border border-amber-100 bg-amber-50/60 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle size={15} className="text-amber-600" />
            <h2 className="text-[13px] font-semibold text-gray-900">Needs attention</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            {attention.rewardReady > 0 && (
              <button
                onClick={() => navigate('/customers?segment=reward_ready')}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white border border-amber-200 text-[12px] font-semibold text-amber-800 hover:bg-amber-50 transition-colors"
              >
                <Gift size={13} className="text-accent-500" />
                {attention.rewardReady} reward ready
                <ArrowRight size={12} className="text-amber-400" />
              </button>
            )}
            {attention.slipping > 0 && (
              <button
                onClick={() => navigate('/customers?segment=slipping')}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white border border-amber-200 text-[12px] font-semibold text-amber-800 hover:bg-amber-50 transition-colors"
              >
                <Moon size={13} className="text-gray-500" />
                {attention.slipping} slipping away
                <ArrowRight size={12} className="text-amber-400" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Stamp activity — last 14 days */}
      <div className="mb-6 bg-white border border-gray-200 rounded-xl p-4">
        <div className="flex items-baseline justify-between mb-4">
          <h2 className="text-[13px] font-semibold text-gray-900">Stamp activity</h2>
          <span className="text-[11px] text-gray-400">
            {loading ? '' : `${fourteenDayTotal} stamp${fourteenDayTotal !== 1 ? 's' : ''} · last 14 days`}
          </span>
        </div>

        <div className="relative">
          {/* Tooltip */}
          {hoverDay !== null && days[hoverDay] && (
            <div
              className="absolute -top-9 z-10 pointer-events-none px-2.5 py-1.5 rounded-lg bg-gray-900 text-white text-[11px] font-medium whitespace-nowrap shadow-md"
              style={{
                left: `${((hoverDay + 0.5) / 14) * 100}%`,
                transform: hoverDay < 2 ? 'translateX(-10%)' : hoverDay > 11 ? 'translateX(-90%)' : 'translateX(-50%)',
              }}
            >
              {fmtDayLong(days[hoverDay].date)} · {days[hoverDay].count} stamp{days[hoverDay].count !== 1 ? 's' : ''}
            </div>
          )}

          {/* Bars — zero days get an honest gray stub, never a faked-height bar */}
          <div className="flex items-end gap-[3px] h-20">
            {days.map((d, i) => {
              const isToday = i === days.length - 1
              const dimmed = hoverDay !== null && hoverDay !== i
              return (
                <div
                  key={i}
                  className="flex-1 h-full flex flex-col justify-end cursor-default"
                  onMouseEnter={() => setHoverDay(i)}
                  onMouseLeave={() => setHoverDay(null)}
                >
                  {d.count === 0 ? (
                    <div className="h-[3px] rounded-full bg-gray-200" />
                  ) : (
                    <div
                      className={`rounded-t-[4px] transition-opacity ${isToday ? 'bg-brand-600' : 'bg-brand-500'} ${dimmed ? 'opacity-50' : ''}`}
                      style={{ height: `${Math.max(8, (d.count / maxDay) * 100)}%` }}
                    />
                  )}
                </div>
              )
            })}
          </div>

          {/* Baseline + recessive date labels */}
          <div className="border-t border-gray-100 mt-1 pt-1.5 flex justify-between">
            <span className="text-[10px] text-gray-400">{days[0] ? fmtDay(days[0].date) : ''}</span>
            <span className="text-[10px] text-gray-400">{days[6] ? fmtDay(days[6].date) : ''}</span>
            <span className="text-[10px] font-medium text-gray-500">Today</span>
          </div>
        </div>
      </div>

      {/* Activity + quick actions */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-[13px] font-semibold text-gray-900">Recent Activity</h2>
            <button onClick={() => navigate('/notifications')} className="text-[12px] text-gray-500 hover:text-brand-500 transition-colors">
              View all
            </button>
          </div>
          <div className="border border-gray-200 rounded-xl overflow-hidden bg-white">
            {activity.length === 0 ? (
              <div className="px-4 py-10 text-center">
                <Stamp size={28} className="text-gray-200 mx-auto mb-3" />
                <p className="text-[13px] font-medium text-gray-500">{loading ? 'Loading…' : 'No activity yet'}</p>
                {!loading && (
                  <button
                    onClick={() => navigate('/stamp')}
                    className="mt-3 inline-flex items-center gap-1.5 text-[12px] font-semibold text-brand-600 hover:text-brand-500 transition-colors"
                  >
                    Issue your first stamp
                    <ArrowRight size={12} />
                  </button>
                )}
              </div>
            ) : (
              activity.map((item, i) => (
                <div key={i} className={`flex items-center gap-3 px-4 py-3 ${i !== activity.length - 1 ? 'border-b border-gray-100' : ''}`}>
                  <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${
                    item.type === 'stamp' ? 'bg-brand-50 text-brand-600' : 'bg-accent-50 text-accent-500'
                  }`}>
                    {item.type === 'stamp' ? <Stamp size={14} strokeWidth={1.75} /> : <Gift size={14} strokeWidth={1.75} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] text-gray-800 truncate">
                      <span className="font-medium">{item.name}</span>
                      <span className="text-gray-500"> {item.action}</span>
                      {item.staffName && <span className="text-gray-400"> · {item.staffName}</span>}
                    </p>
                  </div>
                  <span className="text-[11px] text-gray-400 shrink-0">{item.time}</span>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="lg:col-span-2">
          <h2 className="text-[13px] font-semibold text-gray-900 mb-3">Quick Actions</h2>
          <div className="space-y-2">
            {[
              { label: 'View Customers', desc: `${stats[1].value} members`, icon: Users, to: '/customers', tone: 'bg-brand-50 text-brand-600' },
              { label: 'Analytics', desc: 'Stamp activity', icon: BarChart3, to: '/analytics', tone: 'bg-green-50 text-green-600' },
              { label: 'Configure Card', desc: 'Loyalty settings', icon: CreditCard, to: '/card', tone: 'bg-accent-50 text-accent-500' },
            ].map((action) => (
              <button
                key={action.label}
                onClick={() => navigate(action.to)}
                className="flex items-center w-full gap-3 p-3 rounded-xl border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-all group text-left bg-white"
              >
                <div className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ${action.tone}`}>
                  <action.icon size={16} strokeWidth={1.75} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-medium text-gray-800">{action.label}</p>
                  <p className="text-[11px] text-gray-400">{action.desc}</p>
                </div>
                <ArrowRight size={14} className="text-gray-300 group-hover:text-gray-500 transition-colors" />
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
