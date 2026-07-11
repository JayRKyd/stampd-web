import { useState, useEffect, useMemo } from 'react'
import { Link, Navigate } from 'react-router-dom'
import {
  Shield,
  CheckCircle2,
  XCircle,
  Store,
  Search,
  Clock,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ArrowLeft,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

const PAGE_SIZE = 25

type TabId = 'pending' | 'active' | 'all'
type SortKey = 'created_at' | 'business_name'

interface AdminMerchant {
  id: string
  business_name: string
  merchant_type: string | null
  category: string | null
  is_active: boolean
  created_at: string
  has_active_card: boolean
  owner_email: string | null
}

const TABS: { id: TabId; label: string }[] = [
  { id: 'pending', label: 'Pending' },
  { id: 'active', label: 'Active' },
  { id: 'all', label: 'All' },
]

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export default function Admin() {
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null)
  const [merchants, setMerchants] = useState<AdminMerchant[]>([])
  const [loading, setLoading] = useState(true)
  const [acting, setActing] = useState<string | null>(null)
  const [tab, setTab] = useState<TabId>('pending')
  const [search, setSearch] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('created_at')
  const [sortDesc, setSortDesc] = useState(true)
  const [page, setPage] = useState(1)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: adminFlag } = await supabase.rpc('admin_is_admin')
      if (!adminFlag) {
        setIsAdmin(false)
        setLoading(false)
        return
      }
      setIsAdmin(true)

      const { data, error } = await supabase.rpc('admin_list_merchants')
      if (!error && data) setMerchants(data as AdminMerchant[])
      setLoading(false)
    }
    load()
  }, [])

  useEffect(() => {
    setPage(1)
  }, [tab, search, sortKey, sortDesc])

  const stats = useMemo(() => ({
    pending: merchants.filter(m => !m.is_active).length,
    active: merchants.filter(m => m.is_active).length,
    total: merchants.length,
  }), [merchants])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    let rows = merchants

    if (tab === 'pending') rows = rows.filter(m => !m.is_active)
    else if (tab === 'active') rows = rows.filter(m => m.is_active)

    if (q) {
      rows = rows.filter(m =>
        m.business_name.toLowerCase().includes(q) ||
        (m.owner_email?.toLowerCase().includes(q) ?? false)
      )
    }

    const dir = sortDesc ? -1 : 1
    return [...rows].sort((a, b) => {
      if (sortKey === 'business_name') {
        return a.business_name.localeCompare(b.business_name) * dir
      }
      return (new Date(a.created_at).getTime() - new Date(b.created_at).getTime()) * dir
    })
  }, [merchants, tab, search, sortKey, sortDesc])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const pageStart = (safePage - 1) * PAGE_SIZE
  const visible = filtered.slice(pageStart, pageStart + PAGE_SIZE)
  const showPagination = filtered.length > PAGE_SIZE

  async function setActive(merchantId: string, active: boolean) {
    setActing(merchantId)
    const supabase = createClient()
    const { data } = await supabase.rpc('admin_set_merchant_active', {
      p_merchant_id: merchantId,
      p_active: active,
    })
    if (data?.ok) {
      setMerchants(prev => prev.map(m => m.id === merchantId ? { ...m, is_active: active } : m))
    }
    setActing(null)
  }

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDesc(d => !d)
    else {
      setSortKey(key)
      setSortDesc(key === 'created_at')
    }
  }

  function sortIcon(key: SortKey) {
    if (sortKey !== key) return null
    return sortDesc
      ? <ChevronDown size={11} className="inline-block" />
      : <ChevronUp size={11} className="inline-block" />
  }

  function tabCount(id: TabId) {
    if (id === 'pending') return stats.pending
    if (id === 'active') return stats.active
    return stats.total
  }

  if (loading) {
    return (
      <div className="min-h-dvh w-full flex items-center justify-center bg-gray-50">
        <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!isAdmin) return <Navigate to="/" replace />

  return (
    <div className="min-h-dvh w-full min-w-0 flex flex-col bg-gray-50">
      <header className="sticky top-0 z-10 w-full bg-white border-b border-gray-200 shrink-0">
        <div className="w-full px-4 lg:px-8 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-brand-500 flex items-center justify-center shrink-0">
              <Shield size={20} className="text-white" />
            </div>
            <div className="min-w-0">
              <h1 className="text-[22px] font-semibold text-gray-900 tracking-[-0.02em] truncate">
                Stampd Admin
              </h1>
              <p className="text-[13px] text-gray-500 truncate">
                Approve merchants for Discover visibility
              </p>
            </div>
          </div>
          <Link
            to="/dashboard"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 text-[12px] font-semibold hover:bg-gray-50 shrink-0 transition-colors"
          >
            <ArrowLeft size={14} />
            Back to dashboard
          </Link>
        </div>
      </header>

      <main className="w-full flex-1 overflow-y-auto">
        <div className="w-full px-4 lg:px-8 py-6 lg:py-8">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6 w-full">
            {[
              { icon: Clock, label: 'Pending approval', value: stats.pending, tone: 'text-amber-600 bg-amber-50' },
              { icon: Store, label: 'Active on Discover', value: stats.active, tone: 'text-brand-600 bg-brand-50' },
              { icon: Shield, label: 'Total merchants', value: stats.total, tone: 'text-gray-600 bg-gray-100' },
            ].map(({ icon: Icon, label, value, tone }) => (
              <div key={label} className="border border-gray-200 rounded-xl p-4 flex items-center gap-3 bg-white">
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

          <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4 w-full">
            <div className="flex gap-1.5 overflow-x-auto shrink-0">
              {TABS.map(({ id, label }) => (
                <button
                  key={id}
                  onClick={() => setTab(id)}
                  className={`px-3 py-1.5 rounded-lg text-[12px] font-semibold whitespace-nowrap transition-colors ${
                    tab === id
                      ? 'bg-brand-500 text-white'
                      : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {label} ({tabCount(id)})
                </button>
              ))}
            </div>
            <div className="relative w-full sm:w-80 sm:ml-auto">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search business or email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-lg border border-gray-200 bg-white text-[13px] focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/20 transition-all placeholder:text-gray-400"
              />
            </div>
          </div>

          {filtered.length === 0 ? (
            <div className="border border-gray-200 rounded-xl p-12 text-center bg-white">
              {tab === 'pending' ? (
                <>
                  <CheckCircle2 size={32} className="text-green-500 mx-auto mb-3" />
                  <p className="text-[13px] font-medium text-gray-500">
                    {search ? 'No merchants match your search' : 'No merchants waiting for approval'}
                  </p>
                </>
              ) : tab === 'active' ? (
                <>
                  <Store size={32} className="text-gray-200 mx-auto mb-3" />
                  <p className="text-[13px] font-medium text-gray-500">
                    {search ? 'No merchants match your search' : 'No active merchants yet'}
                  </p>
                </>
              ) : (
                <>
                  <Shield size={32} className="text-gray-200 mx-auto mb-3" />
                  <p className="text-[13px] font-medium text-gray-500">
                    {search ? 'No merchants match your search' : 'No merchants yet'}
                  </p>
                </>
              )}
            </div>
          ) : (
            <div className="w-full border border-gray-200 rounded-xl overflow-hidden bg-white">
              <div className="w-full overflow-x-auto">
                <table className="w-full table-fixed">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th
                        onClick={() => toggleSort('business_name')}
                        className="w-[26%] text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider px-4 py-2.5 cursor-pointer select-none hover:text-gray-700 sticky top-0 bg-gray-50"
                      >
                        Business {sortIcon('business_name')}
                      </th>
                      <th className="w-[10%] text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider px-4 py-2.5 hidden md:table-cell sticky top-0 bg-gray-50">
                        Type
                      </th>
                      <th className="w-[14%] text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider px-4 py-2.5 hidden lg:table-cell sticky top-0 bg-gray-50">
                        Category
                      </th>
                      <th className="w-[22%] text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider px-4 py-2.5 hidden sm:table-cell sticky top-0 bg-gray-50">
                        Email
                      </th>
                      <th
                        onClick={() => toggleSort('created_at')}
                        className="w-[12%] text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider px-4 py-2.5 cursor-pointer select-none hover:text-gray-700 sticky top-0 bg-gray-50"
                      >
                        Signed up {sortIcon('created_at')}
                      </th>
                      <th className="w-[8%] text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider px-4 py-2.5 sticky top-0 bg-gray-50">
                        Status
                      </th>
                      <th className="w-[8%] text-right text-[11px] font-semibold text-gray-500 uppercase tracking-wider px-4 py-2.5 sticky top-0 bg-gray-50">
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {visible.map((merchant, i) => (
                      <tr
                        key={merchant.id}
                        className={`hover:bg-gray-50/50 transition-colors ${
                          i !== visible.length - 1 ? 'border-b border-gray-100' : ''
                        }`}
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-[13px] font-medium text-gray-800 truncate">
                              {merchant.business_name}
                            </span>
                            {!merchant.has_active_card && (
                              <span className="shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded bg-amber-50 text-amber-700">
                                No card
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 hidden md:table-cell">
                          <span className="text-[13px] text-gray-600 capitalize">
                            {merchant.merchant_type ?? 'merchant'}
                          </span>
                        </td>
                        <td className="px-4 py-3 hidden lg:table-cell">
                          <span className="text-[13px] text-gray-600">
                            {merchant.category ?? 'Uncategorized'}
                          </span>
                        </td>
                        <td className="px-4 py-3 hidden sm:table-cell">
                          <span className="text-[13px] text-gray-500 truncate block">
                            {merchant.owner_email ?? '—'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-[13px] text-gray-600 whitespace-nowrap">
                            {formatDate(merchant.created_at)}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {merchant.is_active ? (
                            <span className="inline-flex text-[11px] font-semibold px-2 py-0.5 rounded-full bg-green-50 text-green-700">
                              Active
                            </span>
                          ) : (
                            <span className="inline-flex text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700">
                              Pending
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {merchant.is_active ? (
                            <button
                              onClick={() => setActive(merchant.id, false)}
                              disabled={acting === merchant.id}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 text-[12px] font-semibold hover:bg-gray-50 disabled:opacity-60 transition-colors"
                            >
                              <XCircle size={14} />
                              {acting === merchant.id ? 'Updating…' : 'Deactivate'}
                            </button>
                          ) : (
                            <button
                              onClick={() => setActive(merchant.id, true)}
                              disabled={acting === merchant.id}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-500 text-white text-[12px] font-semibold hover:bg-brand-600 disabled:opacity-60 transition-colors"
                            >
                              <CheckCircle2 size={14} />
                              {acting === merchant.id ? 'Approving…' : 'Approve'}
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {showPagination && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-gray-100 bg-gray-50/50">
                  <p className="text-[12px] text-gray-500">
                    Showing {pageStart + 1}–{Math.min(pageStart + PAGE_SIZE, filtered.length)} of {filtered.length}
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={safePage <= 1}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-gray-200 bg-white text-[12px] font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronLeft size={14} />
                      Previous
                    </button>
                    <span className="text-[12px] text-gray-600 font-medium px-1">
                      Page {safePage} of {totalPages}
                    </span>
                    <button
                      onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                      disabled={safePage >= totalPages}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-gray-200 bg-white text-[12px] font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      Next
                      <ChevronRight size={14} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
