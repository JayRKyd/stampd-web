import { useState, useEffect, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Search, Users, UserPlus, Gift, Moon, ChevronUp, ChevronDown, BellRing } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useMerchantStatus } from '@/lib/merchantStatus'
import { timeAgo } from '@/lib/timeAgo'
import CustomerDrawer from '@/components/CustomerDrawer'
import {
  type CrmCustomer, type SegmentId,
  inSegment, isNew, isRewardReady, isSlipping,
  displayName, initials,
} from '@/lib/crm'

type SortKey = 'last_visit' | 'stamps' | 'rewards'

const SEGMENTS: { id: SegmentId; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'new', label: 'New' },
  { id: 'reward_ready', label: 'Reward ready' },
  { id: 'slipping', label: 'Slipping away' },
  { id: 'vip', label: 'VIPs' },
]

export default function Customers() {
  const { isActive } = useMerchantStatus()
  const [searchParams] = useSearchParams()
  const initialSegment = (searchParams.get('segment') as SegmentId) || 'all'
  const [customers, setCustomers] = useState<CrmCustomer[]>([])
  const [merchantId, setMerchantId] = useState('')
  const [stampGoal, setStampGoal] = useState(10)
  const [search, setSearch] = useState('')
  const [segment, setSegment] = useState<SegmentId>(
    ['all', 'new', 'reward_ready', 'slipping', 'vip'].includes(initialSegment) ? initialSegment : 'all'
  )
  const [sortKey, setSortKey] = useState<SortKey>('last_visit')
  const [sortDesc, setSortDesc] = useState(true)
  const [selected, setSelected] = useState<CrmCustomer | null>(null)
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
      setMerchantId(merchant.id)

      const [{ data: card }, { data: rows }] = await Promise.all([
        supabase
          .from('loyalty_cards')
          .select('stamp_count_required')
          .eq('merchant_id', merchant.id)
          .maybeSingle(),
        supabase.rpc('get_merchant_customers'),
      ])

      if (card) setStampGoal(card.stamp_count_required ?? 10)
      if (rows) setCustomers(rows as CrmCustomer[])
      setLoading(false)
    }
    load()
  }, [])

  const stats = useMemo(() => ({
    total: customers.length,
    newThisMonth: customers.filter(isNew).length,
    rewardReady: customers.filter(c => isRewardReady(c, stampGoal)).length,
    slipping: customers.filter(isSlipping).length,
  }), [customers, stampGoal])

  const visible = useMemo(() => {
    const q = search.toLowerCase()
    const filtered = customers.filter(c =>
      inSegment(c, segment, stampGoal) && displayName(c).toLowerCase().includes(q)
    )
    const dir = sortDesc ? -1 : 1
    return [...filtered].sort((a, b) => {
      if (sortKey === 'stamps') return (a.current_stamps - b.current_stamps) * dir
      if (sortKey === 'rewards') return (a.total_rewards_earned - b.total_rewards_earned) * dir
      const at = a.last_stamp_at ? new Date(a.last_stamp_at).getTime() : 0
      const bt = b.last_stamp_at ? new Date(b.last_stamp_at).getTime() : 0
      return (at - bt) * dir
    })
  }, [customers, segment, search, sortKey, sortDesc, stampGoal])

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDesc(d => !d)
    else { setSortKey(key); setSortDesc(true) }
  }

  function handleNoteSaved(userId: string, note: string) {
    setCustomers(prev => prev.map(c => c.user_id === userId ? { ...c, note } : c))
    setSelected(prev => prev && prev.user_id === userId ? { ...prev, note } : prev)
  }

  function handleNudged(userId: string, at: string) {
    setCustomers(prev => prev.map(c => c.user_id === userId ? { ...c, last_nudged_at: at } : c))
    setSelected(prev => prev && prev.user_id === userId ? { ...prev, last_nudged_at: at } : prev)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const sortIcon = (key: SortKey) =>
    sortKey === key
      ? (sortDesc ? <ChevronDown size={11} className="inline-block" /> : <ChevronUp size={11} className="inline-block" />)
      : null

  return (
    <div className="animate-enter">
      <div className="mb-6">
        <h1 className="text-[22px] font-semibold text-gray-900 tracking-[-0.02em]">Customers</h1>
        <p className="text-[13px] text-gray-500 mt-0.5">Know your regulars — and who's about to stop being one.</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {[
          { icon: Users, label: 'Total members', value: stats.total, tone: 'text-brand-600 bg-brand-50' },
          { icon: UserPlus, label: 'First visit', value: stats.newThisMonth, tone: 'text-green-600 bg-green-50' },
          { icon: Gift, label: 'Reward ready', value: stats.rewardReady, tone: 'text-accent-500 bg-accent-50' },
          { icon: Moon, label: 'Slipping away', value: stats.slipping, tone: 'text-gray-500 bg-gray-100' },
        ].map(({ icon: Icon, label, value, tone }) => (
          <div key={label} className="border border-gray-200 rounded-xl p-4 flex items-center gap-3">
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${tone}`}>
              <Icon size={16} strokeWidth={1.75} />
            </div>
            <div className="min-w-0">
              <p className="text-[18px] font-bold text-gray-900 leading-tight">{value}</p>
              <p className="text-[11px] text-gray-500 truncate">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Segment chips + search */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="flex gap-1.5 overflow-x-auto">
          {SEGMENTS.map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setSegment(id)}
              className={`px-3 py-1.5 rounded-lg text-[12px] font-semibold whitespace-nowrap transition-colors ${
                segment === id
                  ? 'bg-brand-500 text-white'
                  : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search customers..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-lg border border-gray-200 bg-white text-[13px] focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/20 transition-all placeholder:text-gray-400"
          />
        </div>
      </div>

      {visible.length === 0 ? (
        <div className="border border-gray-200 rounded-xl p-12 text-center">
          <Users size={32} className="text-gray-200 mx-auto mb-3" />
          <p className="text-[13px] font-medium text-gray-500">
            {customers.length === 0 ? 'No customers yet' : 'No customers match'}
          </p>
          <p className="text-[12px] text-gray-400 mt-1">
            {customers.length === 0
              ? 'Customers appear here after you stamp them for the first time.'
              : 'Try a different segment or search term.'}
          </p>
        </div>
      ) : (
        <div className="border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider px-4 py-2.5">Customer</th>
                <th
                  onClick={() => toggleSort('stamps')}
                  className="text-center text-[11px] font-semibold text-gray-500 uppercase tracking-wider px-4 py-2.5 hidden sm:table-cell cursor-pointer select-none hover:text-gray-700"
                >
                  Stamps {sortIcon('stamps')}
                </th>
                <th
                  onClick={() => toggleSort('rewards')}
                  className="text-center text-[11px] font-semibold text-gray-500 uppercase tracking-wider px-4 py-2.5 hidden sm:table-cell cursor-pointer select-none hover:text-gray-700"
                >
                  Rewards {sortIcon('rewards')}
                </th>
                <th className="text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider px-4 py-2.5 hidden md:table-cell">Member since</th>
                <th
                  onClick={() => toggleSort('last_visit')}
                  className="text-right text-[11px] font-semibold text-gray-500 uppercase tracking-wider px-4 py-2.5 cursor-pointer select-none hover:text-gray-700"
                >
                  Last visit {sortIcon('last_visit')}
                </th>
              </tr>
            </thead>
            <tbody>
              {visible.map((customer, i) => {
                const rewardReady = isRewardReady(customer, stampGoal)
                const slipping = isSlipping(customer)
                return (
                  <tr
                    key={customer.user_id}
                    onClick={() => setSelected(customer)}
                    className={`hover:bg-gray-50/50 transition-colors cursor-pointer ${
                      i !== visible.length - 1 ? 'border-b border-gray-100' : ''
                    }`}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {customer.avatar_url ? (
                          <img src={customer.avatar_url} alt="" className="h-8 w-8 rounded-full object-cover shrink-0" />
                        ) : (
                          <div className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center text-[11px] font-semibold text-gray-600 shrink-0">
                            {initials(customer)}
                          </div>
                        )}
                        <span className="text-[13px] font-medium text-gray-800">{displayName(customer)}</span>
                        {rewardReady && (
                          <span title="Reward ready" className="w-1.5 h-1.5 rounded-full bg-accent-400 shrink-0" />
                        )}
                        {!rewardReady && slipping && (
                          <span title="Slipping away" className="w-1.5 h-1.5 rounded-full bg-gray-300 shrink-0" />
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center hidden sm:table-cell">
                      <span className="text-[13px] font-medium text-gray-700">{customer.current_stamps}</span>
                      <span className="text-[11px] text-gray-400">/{stampGoal}</span>
                    </td>
                    <td className="px-4 py-3 text-center hidden sm:table-cell">
                      <span className={`inline-block text-[12px] font-medium px-2 py-0.5 rounded ${
                        customer.total_rewards_earned > 0 ? 'bg-accent-50 text-accent-500' : 'text-gray-400'
                      }`}>
                        {customer.total_rewards_earned}
                      </span>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <span className="text-[12px] text-gray-400">
                        {new Date(customer.member_since).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <span className="text-[12px] text-gray-400">
                          {customer.last_stamp_at ? timeAgo(customer.last_stamp_at) : 'Never'}
                        </span>
                        {slipping && (
                          <button
                            title="Send a we-miss-you nudge"
                            onClick={(e) => { e.stopPropagation(); setSelected(customer) }}
                            className="w-6 h-6 rounded-md flex items-center justify-center text-gray-300 hover:text-brand-600 hover:bg-brand-50 transition-colors shrink-0"
                          >
                            <BellRing size={13} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {selected && merchantId && (
        <CustomerDrawer
          customer={selected}
          merchantId={merchantId}
          stampGoal={stampGoal}
          isActive={isActive}
          onClose={() => setSelected(null)}
          onNoteSaved={handleNoteSaved}
          onNudged={handleNudged}
        />
      )}
    </div>
  )
}
