import { useState, useEffect, useMemo } from 'react'
import { Stamp, Gift, ChevronDown, ChevronUp } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { timeAgo, dateLabel } from '@/lib/timeAgo'

interface ActivityItem {
  type: 'stamp' | 'reward'
  name: string
  initials: string
  action: string
  staffName?: string
  exactTime: string
  relativeTime: string
  date: string
  createdAt: string
  isRecent: boolean
}

type Filter = 'all' | 'stamp' | 'reward'

const COLLAPSED_SHOW = 6
// Above this many events, Today switches from a flat list to an hourly digest
const HOURLY_DIGEST_MIN = 12

function getInitials(name: string) {
  const parts = name.trim().split(' ').filter(Boolean)
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  return (name.slice(0, 2) || '?').toUpperCase()
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
}

function hourKey(iso: string) {
  const d = new Date(iso)
  d.setMinutes(0, 0, 0)
  return d.getTime()
}

function hourLabel(key: number) {
  return new Date(key).toLocaleTimeString('en-US', { hour: 'numeric', hour12: true })
}

function ActivityRow({ item, isToday, withBorder }: { item: ActivityItem; isToday: boolean; withBorder: boolean }) {
  return (
    <div
      className={`flex items-center gap-3 px-4 py-3 transition-colors ${
        item.isRecent ? 'bg-brand-50/50' : 'hover:bg-gray-50/60'
      } ${withBorder ? 'border-b border-gray-100' : ''}`}
    >
      <div className="relative shrink-0">
        <div className={`h-8 w-8 rounded-full flex items-center justify-center text-[11px] font-bold ${
          item.type === 'stamp'
            ? 'bg-brand-100 text-brand-700'
            : 'bg-amber-50 text-amber-600'
        }`}>
          {item.initials}
        </div>
        {item.isRecent && (
          <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-brand-500 ring-2 ring-white" />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-[13px] truncate">
          <span className="font-semibold text-gray-900">{item.name}</span>
          <span className="text-gray-500"> {item.action}</span>
        </p>
        {item.staffName && (
          <p className="text-[11px] text-gray-400 mt-0.5">via {item.staffName}</p>
        )}
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        {item.type === 'stamp'
          ? <Stamp size={11} className="text-brand-400" strokeWidth={2} />
          : <Gift  size={11} className="text-amber-400"  strokeWidth={2} />
        }
        <span className="text-[11px] text-gray-400 tabular-nums min-w-[52px] text-right">
          {isToday ? item.exactTime : item.relativeTime}
        </span>
      </div>
    </div>
  )
}

export default function Notifications() {
  const [items, setItems] = useState<ActivityItem[]>([])
  const [filter, setFilter] = useState<Filter>('all')
  const [loading, setLoading] = useState(true)
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())
  const [expandedHours, setExpandedHours] = useState<Set<number>>(new Set())

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

      const fiveMinAgo = Date.now() - 5 * 60 * 1000

      const [stampsRes, rewardsRes] = await Promise.all([
        supabase
          .from('stamp_events')
          .select('created_at, quantity, users(first_name, last_name), staff(name)')
          .eq('merchant_id', merchant.id)
          .order('created_at', { ascending: false })
          .limit(200),
        supabase
          .from('rewards')
          .select('created_at, reward_title, status, users(first_name, last_name)')
          .eq('merchant_id', merchant.id)
          .order('created_at', { ascending: false })
          .limit(200),
      ])

      const stampItems: ActivityItem[] = (stampsRes.data ?? []).map((s) => {
        const u = s.users as unknown as { first_name: string | null; last_name: string | null } | null
        const staff = s.staff as unknown as { name: string } | null
        const qty = s.quantity ?? 1
        const name = `${u?.first_name ?? ''} ${u?.last_name ?? ''}`.trim() || 'Customer'
        return {
          type: 'stamp',
          name,
          initials: getInitials(name),
          action: qty > 1 ? `earned ${qty} stamps` : 'earned a stamp',
          staffName: staff?.name,
          exactTime: fmtTime(s.created_at),
          relativeTime: timeAgo(s.created_at),
          date: dateLabel(s.created_at),
          createdAt: s.created_at,
          isRecent: new Date(s.created_at).getTime() > fiveMinAgo,
        }
      })

      const rewardItems: ActivityItem[] = (rewardsRes.data ?? []).map((r) => {
        const u = r.users as unknown as { first_name: string | null; last_name: string | null } | null
        const verb = r.status === 'redeemed' ? 'redeemed' : 'earned'
        const name = `${u?.first_name ?? ''} ${u?.last_name ?? ''}`.trim() || 'Customer'
        return {
          type: 'reward',
          name,
          initials: getInitials(name),
          action: `${verb} "${r.reward_title ?? 'reward'}"`,
          exactTime: fmtTime(r.created_at),
          relativeTime: timeAgo(r.created_at),
          date: dateLabel(r.created_at),
          createdAt: r.created_at,
          isRecent: new Date(r.created_at).getTime() > fiveMinAgo,
        }
      })

      setItems(
        [...stampItems, ...rewardItems].sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        )
      )
      setLoading(false)
    }
    load()
  }, [])

  const counts = useMemo(() => ({
    all: items.length,
    stamp: items.filter(i => i.type === 'stamp').length,
    reward: items.filter(i => i.type === 'reward').length,
  }), [items])

  const todayItems = useMemo(() => items.filter(i => i.date === 'Today'), [items])

  const groups = useMemo(() => {
    const visible = filter === 'all' ? items : items.filter(i => i.type === filter)
    const grouped: Record<string, ActivityItem[]> = {}
    for (const item of visible) {
      if (!grouped[item.date]) grouped[item.date] = []
      grouped[item.date].push(item)
    }
    return grouped
  }, [items, filter])

  function toggleGroup(date: string) {
    setExpandedGroups(prev => {
      const next = new Set(prev)
      if (next.has(date)) next.delete(date)
      else next.add(date)
      return next
    })
  }

  function toggleHour(key: number) {
    setExpandedHours(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const isEmpty = Object.keys(groups).length === 0

  const FILTERS: { id: Filter; label: string; count: number }[] = [
    { id: 'all',    label: 'All activity', count: counts.all },
    { id: 'stamp',  label: 'Stamps',       count: counts.stamp },
    { id: 'reward', label: 'Rewards',      count: counts.reward },
  ]

  return (
    <div className="animate-enter">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-[22px] font-semibold text-gray-900 tracking-[-0.02em]">Activity</h1>
        <p className="text-[13px] text-gray-500 mt-0.5">Every stamp and reward, in real time.</p>
      </div>

      {/* Today summary — only shows when there's data */}
      {!loading && todayItems.length > 0 && (
        <div className="grid grid-cols-3 gap-3 mb-5">
          {[
            { label: "Today's stamps",  value: todayItems.filter(i => i.type === 'stamp').length,  color: 'text-brand-600' },
            { label: 'Rewards today',   value: todayItems.filter(i => i.type === 'reward').length, color: 'text-accent-500' },
            { label: 'Total activity',  value: todayItems.length,                                  color: 'text-gray-900' },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-white border border-gray-200 rounded-xl px-4 py-3">
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">{label}</p>
              <p className={`text-[26px] font-bold tracking-tight leading-none ${color}`}>{value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Filter tabs */}
      {!loading && counts.all > 0 && (
        <div className="flex gap-1.5 mb-5">
          {FILTERS.map(({ id, label, count }) => (
            <button
              key={id}
              onClick={() => setFilter(id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-colors ${
                filter === id
                  ? 'bg-brand-500 text-white'
                  : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              {label}
              <span className={`text-[11px] tabular-nums ${filter === id ? 'text-white/70' : 'text-gray-400'}`}>
                {count}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-24">
          <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : isEmpty ? (
        <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
          {filter === 'reward'
            ? <Gift size={32} className="text-gray-200 mx-auto mb-3" />
            : <Stamp size={32} className="text-gray-200 mx-auto mb-3" />
          }
          <p className="text-[13px] font-medium text-gray-500">
            {counts.all === 0 ? 'No activity yet' : `No ${filter === 'stamp' ? 'stamps' : 'rewards'} to show`}
          </p>
          <p className="text-[12px] text-gray-400 mt-1">
            {counts.all === 0 ? 'Stamps and rewards will appear here.' : 'Try a different filter.'}
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          {Object.entries(groups).map(([date, dateItems]) => {
            const isToday = date === 'Today'
            const dayStamps  = dateItems.filter(i => i.type === 'stamp').length
            const dayRewards = dateItems.filter(i => i.type === 'reward').length

            // Busy today → hourly digest: each hour is one scannable line,
            // latest hour open, older hours expand on demand
            const useHourly = isToday && dateItems.length >= HOURLY_DIGEST_MIN

            let hourGroups: { key: number; items: ActivityItem[]; stamps: number; rewards: number }[] = []
            if (useHourly) {
              const byHour = new Map<number, ActivityItem[]>()
              for (const item of dateItems) {
                const k = hourKey(item.createdAt)
                if (!byHour.has(k)) byHour.set(k, [])
                byHour.get(k)!.push(item)
              }
              hourGroups = [...byHour.entries()]
                .sort((a, b) => b[0] - a[0])
                .map(([key, hItems]) => ({
                  key,
                  items: hItems,
                  stamps: hItems.filter(i => i.type === 'stamp').length,
                  rewards: hItems.filter(i => i.type === 'reward').length,
                }))
            }
            const latestHourKey = hourGroups[0]?.key

            const isExpanded = isToday || expandedGroups.has(date)
            const visibleItems = isExpanded ? dateItems : dateItems.slice(0, COLLAPSED_SHOW)
            const hiddenCount = dateItems.length - COLLAPSED_SHOW
            const hiddenRewards = isExpanded ? 0 : dateItems.slice(COLLAPSED_SHOW).filter(i => i.type === 'reward').length

            return (
              <div key={date}>
                {/* Group header */}
                <div className="flex items-center justify-between mb-2 px-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold text-gray-500 uppercase tracking-widest">{date}</span>
                    <span className="text-[11px] text-gray-300">·</span>
                    <span className="text-[11px] text-gray-400 tabular-nums">
                      {dateItems.length} event{dateItems.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    {dayStamps > 0 && (
                      <span className="flex items-center gap-1 text-[11px] font-medium text-brand-500">
                        <Stamp size={11} strokeWidth={2} />
                        <span className="tabular-nums">{dayStamps}</span>
                      </span>
                    )}
                    {dayRewards > 0 && (
                      <span className="flex items-center gap-1 text-[11px] font-medium text-accent-500">
                        <Gift size={11} strokeWidth={2} />
                        <span className="tabular-nums">{dayRewards}</span>
                      </span>
                    )}
                  </div>
                </div>

                {useHourly ? (
                  /* ── Hourly digest ── */
                  <div className="bg-white border border-gray-200 rounded-xl overflow-hidden divide-y divide-gray-100">
                    {hourGroups.map(h => {
                      const open = h.key === latestHourKey || expandedHours.has(h.key)
                      const canToggle = h.key !== latestHourKey
                      return (
                        <div key={h.key}>
                          <button
                            onClick={() => canToggle && toggleHour(h.key)}
                            disabled={!canToggle}
                            className={`w-full flex items-center gap-3 px-4 py-2.5 bg-gray-50/70 text-left ${
                              canToggle ? 'hover:bg-gray-50 cursor-pointer' : 'cursor-default'
                            }`}
                          >
                            <span className="text-[11px] font-bold text-gray-600 uppercase tabular-nums w-14">
                              {hourLabel(h.key)}
                            </span>
                            <span className="flex items-center gap-1 text-[11px] font-medium text-brand-500">
                              <Stamp size={11} strokeWidth={2} />
                              <span className="tabular-nums">{h.stamps}</span>
                            </span>
                            {h.rewards > 0 && (
                              <span className="flex items-center gap-1 text-[11px] font-semibold text-accent-500">
                                <Gift size={11} strokeWidth={2} />
                                <span className="tabular-nums">{h.rewards} reward{h.rewards !== 1 ? 's' : ''}</span>
                              </span>
                            )}
                            <span className="flex-1" />
                            {h.key === latestHourKey ? (
                              <span className="text-[10px] font-semibold text-brand-500 uppercase tracking-wider">Now</span>
                            ) : (
                              open ? <ChevronUp size={13} className="text-gray-400" /> : <ChevronDown size={13} className="text-gray-400" />
                            )}
                          </button>
                          {open && h.items.map((item, i) => (
                            <ActivityRow
                              key={i}
                              item={item}
                              isToday
                              withBorder={i !== h.items.length - 1}
                            />
                          ))}
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  /* ── Flat list (quiet days & past days) ── */
                  <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                    {visibleItems.map((item, i) => (
                      <ActivityRow
                        key={i}
                        item={item}
                        isToday={isToday}
                        withBorder={i !== visibleItems.length - 1 || (!isToday && hiddenCount > 0)}
                      />
                    ))}

                    {!isToday && dateItems.length > COLLAPSED_SHOW && (
                      <button
                        onClick={() => toggleGroup(date)}
                        className="w-full flex items-center justify-center gap-1.5 px-4 py-2.5 text-[12px] font-medium text-gray-500 hover:bg-gray-50 hover:text-gray-700 transition-colors"
                      >
                        {isExpanded
                          ? <><ChevronUp size={13} /> Show less</>
                          : (
                            <>
                              <ChevronDown size={13} />
                              Show {hiddenCount} more
                              {hiddenRewards > 0 && (
                                <span className="flex items-center gap-1 text-accent-500 font-semibold">
                                  · <Gift size={11} strokeWidth={2} /> {hiddenRewards}
                                </span>
                              )}
                            </>
                          )
                        }
                      </button>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
