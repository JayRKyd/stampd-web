import { useState, useEffect, useMemo } from 'react'
import { TrendingUp, Calendar, BarChart3, Users, Activity } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { timeAgo } from '@/lib/timeAgo'

interface StaffActivityRow {
  staffId: string | null
  name: string
  today: number
  week: number
}

interface StaffEvent {
  id: string
  staffName: string
  customerName: string
  quantity: number
  createdAt: string
}

interface DayBucket {
  date: Date
  count: number
}

interface StatItem {
  label: string
  value: string
  change: string
  changeTone: 'up' | 'flat'
  icon: typeof Calendar
  tone: string
}

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

export default function Analytics() {
  const [days, setDays] = useState<DayBucket[]>([])
  const [hoverDay, setHoverDay] = useState<number | null>(null)
  const [hoverWeekday, setHoverWeekday] = useState<number | null>(null)
  const [stats, setStats] = useState<StatItem[]>([
    { label: 'This Week', value: '—', change: '', changeTone: 'flat', icon: Calendar, tone: 'text-brand-600 bg-brand-50' },
    { label: 'This Month', value: '—', change: '', changeTone: 'flat', icon: BarChart3, tone: 'text-green-600 bg-green-50' },
    { label: 'All Time', value: '—', change: '', changeTone: 'flat', icon: TrendingUp, tone: 'text-gray-500 bg-gray-100' },
    { label: 'Daily Average', value: '—', change: 'last 30 days', changeTone: 'flat', icon: Activity, tone: 'text-accent-500 bg-accent-50' },
  ])
  const [staffActivity, setStaffActivity] = useState<StaffActivityRow[]>([])
  const [staffEvents, setStaffEvents] = useState<StaffEvent[]>([])
  const [hasStaff, setHasStaff] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoading(false); return }

      const { data: merchant } = await supabase
        .from('merchants')
        .select('id')
        .eq('owner_id', user.id)
        .maybeSingle()
      if (!merchant) { setLoading(false); return }

      const now = new Date()
      const thirtyDaysAgo = new Date(now)
      thirtyDaysAgo.setDate(now.getDate() - 29)
      thirtyDaysAgo.setHours(0, 0, 0, 0)

      const weekStart = new Date(now)
      weekStart.setDate(now.getDate() - 6)
      weekStart.setHours(0, 0, 0, 0)

      const prevWeekStart = new Date(weekStart)
      prevWeekStart.setDate(prevWeekStart.getDate() - 7)

      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

      const [allRes, weekRes, prevWeekRes, monthRes, allTimeRes] = await Promise.all([
        supabase
          .from('stamp_events')
          .select('created_at')
          .eq('merchant_id', merchant.id)
          .gte('created_at', thirtyDaysAgo.toISOString())
          .order('created_at', { ascending: true }),
        supabase
          .from('stamp_events')
          .select('id', { count: 'exact', head: true })
          .eq('merchant_id', merchant.id)
          .gte('created_at', weekStart.toISOString()),
        supabase
          .from('stamp_events')
          .select('id', { count: 'exact', head: true })
          .eq('merchant_id', merchant.id)
          .gte('created_at', prevWeekStart.toISOString())
          .lt('created_at', weekStart.toISOString()),
        supabase
          .from('stamp_events')
          .select('id', { count: 'exact', head: true })
          .eq('merchant_id', merchant.id)
          .gte('created_at', monthStart.toISOString()),
        supabase
          .from('stamp_events')
          .select('id', { count: 'exact', head: true })
          .eq('merchant_id', merchant.id),
      ])

      // Build 30-day buckets
      const buckets: DayBucket[] = []
      const keyIndex: Record<string, number> = {}
      for (let i = 0; i < 30; i++) {
        const d = new Date(thirtyDaysAgo)
        d.setDate(thirtyDaysAgo.getDate() + i)
        keyIndex[d.toDateString()] = i
        buckets.push({ date: d, count: 0 })
      }
      for (const row of allRes.data ?? []) {
        const key = new Date(row.created_at).toDateString()
        if (key in keyIndex) buckets[keyIndex[key]].count++
      }
      setDays(buckets)

      const weekCount = weekRes.count ?? 0
      const prevWeekCount = prevWeekRes.count ?? 0
      const weekDelta = weekCount - prevWeekCount
      // Absolute deltas — percentages mislead at small-business volume
      const weekChange = weekDelta > 0 ? `+${weekDelta} vs prior week`
        : weekDelta < 0 ? `${weekDelta} vs prior week`
        : weekCount > 0 ? 'same as prior week' : ''

      const total30 = buckets.reduce((s, d) => s + d.count, 0)
      const avg = total30 / 30
      const avgLabel = total30 === 0 ? '0' : avg >= 10 ? String(Math.round(avg)) : avg.toFixed(1)

      setStats([
        { label: 'This Week', value: String(weekCount), change: weekChange, changeTone: weekDelta > 0 ? 'up' : 'flat', icon: Calendar, tone: 'text-brand-600 bg-brand-50' },
        { label: 'This Month', value: String(monthRes.count ?? 0), change: '', changeTone: 'flat', icon: BarChart3, tone: 'text-green-600 bg-green-50' },
        { label: 'All Time', value: String(allTimeRes.count ?? 0), change: '', changeTone: 'flat', icon: TrendingUp, tone: 'text-gray-500 bg-gray-100' },
        { label: 'Daily Average', value: avgLabel, change: 'last 30 days', changeTone: 'flat', icon: Activity, tone: 'text-accent-500 bg-accent-50' },
      ])

      // ── Staff activity (last 7 days) ──
      const todayStart = new Date(now)
      todayStart.setHours(0, 0, 0, 0)

      const [staffRes, eventsRes] = await Promise.all([
        supabase
          .from('staff')
          .select('id, name')
          .eq('merchant_id', merchant.id)
          .order('created_at'),
        supabase
          .from('stamp_events')
          .select('id, staff_id, quantity, created_at, users(first_name, last_name)')
          .eq('merchant_id', merchant.id)
          .gte('created_at', weekStart.toISOString())
          .order('created_at', { ascending: false }),
      ])

      const staffRows = staffRes.data ?? []
      const events = eventsRes.data ?? []
      setHasStaff(staffRows.length > 0)

      if (staffRows.length > 0 || events.some(e => e.staff_id)) {
        const staffNames = new Map(staffRows.map(s => [s.id, s.name]))
        const byStaff = new Map<string, StaffActivityRow>()

        // Seed rows for every staff member so zero-activity staff still show
        for (const s of staffRows) {
          byStaff.set(s.id, { staffId: s.id, name: s.name, today: 0, week: 0 })
        }

        for (const ev of events) {
          const key = ev.staff_id ?? 'owner'
          if (!byStaff.has(key)) {
            byStaff.set(key, {
              staffId: ev.staff_id,
              name: ev.staff_id ? staffNames.get(ev.staff_id) ?? 'Former staff' : 'Owner / unassigned',
              today: 0,
              week: 0,
            })
          }
          const row = byStaff.get(key)!
          const qty = ev.quantity ?? 1
          row.week += qty
          if (new Date(ev.created_at) >= todayStart) row.today += qty
        }

        setStaffActivity([...byStaff.values()].sort((a, b) => b.week - a.week))

        setStaffEvents(events.slice(0, 12).map(ev => {
          const u = (Array.isArray(ev.users) ? ev.users[0] : ev.users) as
            { first_name: string | null; last_name: string | null } | null
          return {
            id: ev.id,
            staffName: ev.staff_id
              ? staffNames.get(ev.staff_id) ?? 'Former staff'
              : 'Owner / unassigned',
            customerName: [u?.first_name, u?.last_name].filter(Boolean).join(' ') || 'Customer',
            quantity: ev.quantity ?? 1,
            createdAt: ev.created_at,
          }
        }))
      }

      setLoading(false)
    }
    load()
  }, [])

  const maxDay = useMemo(() => Math.max(...days.map(d => d.count), 1), [days])
  const total30 = useMemo(() => days.reduce((s, d) => s + d.count, 0), [days])

  // Day-of-week profile, Monday-first
  const weekdayTotals = useMemo(() => {
    const totals = Array(7).fill(0) as number[]
    for (const d of days) totals[(d.date.getDay() + 6) % 7] += d.count
    return totals
  }, [days])
  const maxWeekday = useMemo(() => Math.max(...weekdayTotals, 1), [weekdayTotals])
  const busiestIdx = useMemo(
    () => (total30 === 0 ? -1 : weekdayTotals.indexOf(Math.max(...weekdayTotals))),
    [weekdayTotals, total30]
  )

  const fmtDay = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  const fmtDayLong = (d: Date) => d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })

  return (
    <div className="animate-enter">
      <div className="mb-6">
        <h1 className="text-[22px] font-semibold text-gray-900 tracking-[-0.02em]">Analytics</h1>
        <p className="text-[13px] text-gray-500 mt-0.5">How stamps are flowing through your business.</p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-white border border-gray-200 rounded-xl p-4 hover:border-gray-300 transition-colors">
            <div className="flex items-center justify-between mb-3">
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${stat.tone}`}>
                <stat.icon size={16} strokeWidth={1.75} />
              </div>
              {stat.change && (
                <span className={`text-[11px] font-medium text-right ${stat.changeTone === 'up' ? 'text-green-600' : 'text-gray-400'}`}>
                  {stat.change}
                </span>
              )}
            </div>
            <p className={`text-[22px] font-bold text-gray-900 tracking-[-0.02em] leading-none ${loading ? 'opacity-30' : ''}`}>
              {stat.value}
            </p>
            <p className="text-[12px] text-gray-500 mt-1.5">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 mb-6">
        {/* 30-day trend */}
        <div className="lg:col-span-3 bg-white border border-gray-200 rounded-xl p-5">
          <div className="flex items-baseline justify-between mb-5">
            <h3 className="text-[13px] font-semibold text-gray-900">Daily stamps</h3>
            <span className="text-[11px] text-gray-400">
              {loading ? '' : `${total30} stamp${total30 !== 1 ? 's' : ''} · last 30 days`}
            </span>
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-40">
              <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : total30 === 0 ? (
            <div className="flex items-center justify-center h-40 text-center">
              <div>
                <p className="text-[13px] text-gray-400 font-medium">No stamps yet</p>
                <p className="text-[12px] text-gray-300 mt-1">Start issuing stamps to see your chart.</p>
              </div>
            </div>
          ) : (
            <div className="relative">
              {hoverDay !== null && days[hoverDay] && (
                <div
                  className="absolute -top-9 z-10 pointer-events-none px-2.5 py-1.5 rounded-lg bg-gray-900 text-white text-[11px] font-medium whitespace-nowrap shadow-md"
                  style={{
                    left: `${((hoverDay + 0.5) / 30) * 100}%`,
                    transform: hoverDay < 4 ? 'translateX(-10%)' : hoverDay > 25 ? 'translateX(-90%)' : 'translateX(-50%)',
                  }}
                >
                  {fmtDayLong(days[hoverDay].date)} · {days[hoverDay].count} stamp{days[hoverDay].count !== 1 ? 's' : ''}
                </div>
              )}

              <div className="flex items-end gap-[2px] h-40">
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
                          style={{ height: `${Math.max(6, (d.count / maxDay) * 100)}%` }}
                        />
                      )}
                    </div>
                  )
                })}
              </div>

              <div className="border-t border-gray-100 mt-1 pt-1.5 flex justify-between">
                <span className="text-[10px] text-gray-400">{days[0] ? fmtDay(days[0].date) : ''}</span>
                <span className="text-[10px] text-gray-400">{days[14] ? fmtDay(days[14].date) : ''}</span>
                <span className="text-[10px] font-medium text-gray-500">Today</span>
              </div>
            </div>
          )}
        </div>

        {/* Day-of-week profile */}
        <div className="lg:col-span-2 bg-white border border-gray-200 rounded-xl p-5">
          <div className="flex items-baseline justify-between mb-5">
            <h3 className="text-[13px] font-semibold text-gray-900">By day of week</h3>
            <span className="text-[11px] text-gray-400">last 30 days</span>
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-40">
              <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : total30 === 0 ? (
            <div className="flex items-center justify-center h-40 text-center">
              <p className="text-[13px] text-gray-400 font-medium">No data yet</p>
            </div>
          ) : (
            <>
              <div className="relative">
                {hoverWeekday !== null && (
                  <div
                    className="absolute -top-9 z-10 pointer-events-none px-2.5 py-1.5 rounded-lg bg-gray-900 text-white text-[11px] font-medium whitespace-nowrap shadow-md"
                    style={{
                      left: `${((hoverWeekday + 0.5) / 7) * 100}%`,
                      transform: hoverWeekday === 0 ? 'translateX(-15%)' : hoverWeekday === 6 ? 'translateX(-85%)' : 'translateX(-50%)',
                    }}
                  >
                    {WEEKDAYS[hoverWeekday]}s · {weekdayTotals[hoverWeekday]} stamp{weekdayTotals[hoverWeekday] !== 1 ? 's' : ''}
                  </div>
                )}

                <div className="flex items-end gap-[6px] h-32">
                  {weekdayTotals.map((count, i) => {
                    const isBusiest = i === busiestIdx
                    const dimmed = hoverWeekday !== null && hoverWeekday !== i
                    return (
                      <div
                        key={i}
                        className="flex-1 h-full flex flex-col justify-end cursor-default"
                        onMouseEnter={() => setHoverWeekday(i)}
                        onMouseLeave={() => setHoverWeekday(null)}
                      >
                        {count === 0 ? (
                          <div className="h-[3px] rounded-full bg-gray-200" />
                        ) : (
                          <div
                            className={`rounded-t-[4px] transition-opacity ${isBusiest ? 'bg-brand-600' : 'bg-brand-500'} ${dimmed ? 'opacity-50' : ''}`}
                            style={{ height: `${Math.max(6, (count / maxWeekday) * 100)}%` }}
                          />
                        )}
                      </div>
                    )
                  })}
                </div>

                <div className="border-t border-gray-100 mt-1 pt-1.5 flex gap-[6px]">
                  {WEEKDAYS.map((w, i) => (
                    <span
                      key={w}
                      className={`flex-1 text-center text-[10px] ${i === busiestIdx ? 'font-semibold text-gray-600' : 'text-gray-400'}`}
                    >
                      {w[0]}
                    </span>
                  ))}
                </div>
              </div>

              {busiestIdx >= 0 && (
                <p className="text-[12px] text-gray-500 mt-4">
                  <span className="font-semibold text-gray-700">{WEEKDAYS[busiestIdx]}s</span> are your busiest day.
                </p>
              )}
            </>
          )}
        </div>
      </div>

      {/* Staff activity */}
      {!loading && (hasStaff || staffActivity.length > 0) && (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="p-5 pb-4">
            <div className="flex items-center gap-2 mb-1">
              <Users size={15} className="text-gray-400" />
              <h3 className="text-[13px] font-semibold text-gray-900">Staff activity</h3>
            </div>
            <p className="text-[12px] text-gray-500">
              Stamps issued per team member. Watch for clusters of rapid stamps to the same customer.
            </p>
          </div>

          {/* Per-staff table */}
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-y border-gray-200">
                <th className="text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider px-5 py-2.5">Team member</th>
                <th className="text-right text-[11px] font-semibold text-gray-500 uppercase tracking-wider px-4 py-2.5 w-20">Today</th>
                <th className="text-right text-[11px] font-semibold text-gray-500 uppercase tracking-wider px-5 py-2.5 w-24">7 days</th>
              </tr>
            </thead>
            <tbody>
              {staffActivity.map((row, i) => (
                <tr
                  key={row.staffId ?? 'owner'}
                  className={i !== staffActivity.length - 1 ? 'border-b border-gray-100' : ''}
                >
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-brand-100 flex items-center justify-center shrink-0">
                        <span className="text-[12px] font-semibold text-brand-600">
                          {row.name[0]?.toUpperCase()}
                        </span>
                      </div>
                      <span className="text-[13px] font-medium text-gray-800 truncate">{row.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="text-[13px] font-semibold text-gray-900">{row.today}</span>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <span className="text-[13px] font-semibold text-gray-900">{row.week}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Recent events */}
          {staffEvents.length > 0 && (
            <div className="px-5 py-4 border-t border-gray-100">
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Recent stamps</p>
              <div className="divide-y divide-gray-50">
                {staffEvents.map(ev => (
                  <div key={ev.id} className="flex items-center gap-2 py-2">
                    <p className="flex-1 text-[12px] text-gray-600 truncate">
                      <span className="font-medium text-gray-900">{ev.staffName}</span>
                      {' stamped '}
                      <span className="font-medium text-gray-900">{ev.customerName}</span>
                      {ev.quantity > 1 && (
                        <span className="ml-1.5 text-[11px] font-semibold text-brand-600 bg-brand-50 px-1.5 py-0.5 rounded">
                          +{ev.quantity}
                        </span>
                      )}
                    </p>
                    <span className="text-[11px] text-gray-400 shrink-0">{timeAgo(ev.createdAt)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
