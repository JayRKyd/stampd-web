import { useState, useEffect } from 'react'
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, Stamp, Users, BarChart3,
  CreditCard, Bell, Settings, LogOut, Menu, ChevronRight, BookOpen, Clock, Lock,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { MerchantStatusProvider } from '@/lib/merchantStatus'

const NAV_ITEMS = [
  { to: '/dashboard',     icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/stamp',         icon: Stamp,           label: 'Issue Stamp', requiresApproval: true },
  { to: '/customers',     icon: Users,           label: 'Customers' },
  { to: '/analytics',     icon: BarChart3,       label: 'Analytics' },
  { to: '/card',          icon: CreditCard,      label: 'My Card' },
  { to: '/notifications', icon: Bell,            label: 'Notifications' },
  { to: '/settings',      icon: Settings,        label: 'Settings' },
] as const

export default function DashboardLayout() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [isActive, setIsActive] = useState(true)
  const [statusLoading, setStatusLoading] = useState(true)
  // Optimistic default so a completed merchant never sees a locked flash;
  // incomplete merchants are on /onboarding anyway while this resolves.
  const [setupComplete, setSetupComplete] = useState(true)
  const navigate = useNavigate()
  const location = useLocation()

  const allNavItems = [...NAV_ITEMS, { to: '/onboarding', icon: BookOpen, label: 'Setup Guide' }]
  const currentPage = allNavItems.find(item => location.pathname.startsWith(item.to))

  useEffect(() => {
    let cancelled = false
    async function checkMerchant() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: merchant } = await supabase
        .from('merchants')
        .select('is_active, business_name, category, address, merchant_type, loyalty_cards(reward_tiers(id))')
        .eq('owner_id', user.id)
        .maybeSingle()
      if (cancelled) return
      setIsActive(merchant?.is_active ?? false)
      setStatusLoading(false)
      if (merchant) {
        // Same completion rule as ProtectedRoute: card with tiers + profile,
        // address optional for individual merchants.
        const hasCard = (merchant.loyalty_cards as { reward_tiers: { id: string }[] }[])
          ?.some(c => c.reward_tiers?.length > 0)
        const hasProfile = !!(
          merchant.business_name &&
          merchant.category &&
          (merchant.merchant_type === 'individual' || merchant.address)
        )
        setSetupComplete(hasCard && hasProfile)
      } else {
        setSetupComplete(false)
      }
    }
    checkMerchant()

    const unlock = () => setSetupComplete(true)
    window.addEventListener('stampd:setup-complete', unlock)
    const onApproved = () => setIsActive(true)
    window.addEventListener('stampd:merchant-approved', onApproved)
    return () => {
      cancelled = true
      window.removeEventListener('stampd:setup-complete', unlock)
      window.removeEventListener('stampd:merchant-approved', onApproved)
    }
  }, [])

  async function handleSignOut() {
    await createClient().auth.signOut()
    navigate('/login')
  }

  return (
    <div className="flex h-dvh w-full overflow-hidden bg-white">
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-gray-950/10 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[240px] flex-col bg-gray-50 border-r border-gray-200 transition-transform duration-200 lg:relative lg:translate-x-0 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand */}
        <div className="flex items-center gap-2.5 px-5 h-14 shrink-0">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-500">
            <div className="grid grid-cols-2 gap-[3px]">
              <div className="h-[5px] w-[5px] rounded-full bg-white/90" />
              <div className="h-[5px] w-[5px] rounded-full bg-white/90" />
              <div className="h-[5px] w-[5px] rounded-full bg-white/90" />
              <div className="h-[5px] w-[5px] rounded-full bg-accent-400" />
            </div>
          </div>
          <span className="text-[15px] font-semibold text-gray-900 tracking-[-0.01em]">Stampd</span>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-3 pt-2 pb-4">
          <ul className="space-y-0.5">
            {NAV_ITEMS.map((item) => {
              const lockedBySetup = !setupComplete
              const lockedByApproval = setupComplete && 'requiresApproval' in item && item.requiresApproval && !isActive
              const locked = lockedBySetup || lockedByApproval
              const lockTitle = lockedBySetup
                ? 'Finish setup to unlock'
                : 'Available after your account is approved'

              return (
              <li key={item.to}>
                {!locked ? (
                  <NavLink
                    to={item.to}
                    onClick={() => setMobileOpen(false)}
                    className={({ isActive: active }) =>
                      `flex items-center gap-2.5 rounded-md px-2.5 py-[7px] text-[13px] font-medium transition-colors ${
                        active
                          ? 'bg-brand-500 text-white'
                          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                      }`
                    }
                  >
                    {({ isActive: active }) => (
                      <>
                        <item.icon size={16} strokeWidth={active ? 2 : 1.75} />
                        {item.label}
                      </>
                    )}
                  </NavLink>
                ) : (
                  <div
                    title={lockTitle}
                    className="flex items-center gap-2.5 rounded-md px-2.5 py-[7px] text-[13px] font-medium text-gray-300 cursor-not-allowed select-none"
                  >
                    <item.icon size={16} strokeWidth={1.75} />
                    {item.label}
                    <Lock size={12} className="ml-auto" />
                  </div>
                )}
              </li>
              )
            })}
          </ul>

          <div className="mt-3 pt-3 border-t border-gray-200">
            <NavLink
              to="/onboarding"
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-2.5 rounded-md px-2.5 py-[7px] text-[13px] font-medium transition-colors ${
                  isActive
                    ? 'bg-brand-500 text-white'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <BookOpen size={16} strokeWidth={isActive ? 2 : 1.75} />
                  Setup Guide
                </>
              )}
            </NavLink>
          </div>
        </nav>

        {/* Footer */}
        <div className="border-t border-gray-200 px-3 py-3">
          <button
            onClick={handleSignOut}
            className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-[7px] text-[13px] font-medium text-gray-500 hover:text-red-600 hover:bg-red-100/60 transition-colors"
          >
            <LogOut size={16} strokeWidth={1.75} />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="flex items-center h-14 px-4 lg:px-8 border-b border-gray-100 shrink-0">
          <button
            onClick={() => setMobileOpen(true)}
            className="lg:hidden mr-3 flex h-8 w-8 items-center justify-center rounded-md hover:bg-gray-100 transition-colors"
          >
            <Menu size={18} className="text-gray-700" />
          </button>
          <div className="flex items-center gap-1.5 text-[13px]">
            <span className="text-gray-400">Stampd</span>
            <ChevronRight size={12} className="text-gray-300" />
            <span className="text-gray-700 font-medium">{currentPage?.label || 'Dashboard'}</span>
          </div>
        </header>

        {/* Pending approval — customer-facing ops disabled until verified */}
        {!statusLoading && !isActive && (
          <div className="flex items-center gap-2 px-4 lg:px-8 py-2 bg-amber-50 border-b border-amber-200 shrink-0">
            <Clock size={14} className="text-amber-600 shrink-0" />
            <p className="text-[12px] text-amber-800">
              Your account is pending approval — you can finish setup and preview your dashboard, but stamping and customer actions are disabled until we verify your business.
            </p>
          </div>
        )}

        {/* Content */}
        <main className="flex-1 overflow-y-auto">
          <div className="px-4 lg:px-8 py-6 lg:py-8">
            <MerchantStatusProvider isActive={isActive} loading={statusLoading}>
              <Outlet />
            </MerchantStatusProvider>
          </div>
        </main>
      </div>
    </div>
  )
}
