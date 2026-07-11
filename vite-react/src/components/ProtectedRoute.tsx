import { useEffect, useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { createClient } from '@/lib/supabase/client'
import type { Session } from '@supabase/supabase-js'

// Routes where the onboarding gate is bypassed
const SKIP_ONBOARDING = ['/onboarding']

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation()
  const skipCheck = SKIP_ONBOARDING.some(r => pathname.startsWith(r))

  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [needsOnboarding, setNeedsOnboarding] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    let cancelled = false

    async function run() {
      const { data: { session: s } } = await supabase.auth.getSession()
      if (cancelled) return
      setSession(s)

      if (s && !skipCheck) {
        const { data: merchant } = await supabase
          .from('merchants')
          .select('id, business_name, category, address, merchant_type, loyalty_cards(reward_tiers(id))')
          .eq('owner_id', s.user.id)
          .maybeSingle()

        if (!cancelled) {
          if (merchant) {
            const hasCard = (merchant.loyalty_cards as { reward_tiers: { id: string }[] }[])
              ?.some(c => c.reward_tiers?.length > 0)
            // Address is only required for businesses — individuals (barbers etc.)
            // may work out of someone else's shop. Must match saveProfile's rule.
            const hasProfile = !!(
              merchant.business_name &&
              merchant.category &&
              (merchant.merchant_type === 'individual' || merchant.address)
            )
            setNeedsOnboarding(!hasCard || !hasProfile)
          } else {
            // Authenticated but no merchant row yet — send them through onboarding
            // (Onboarding self-heals by creating the row if missing).
            setNeedsOnboarding(true)
          }
        }
      } else if (skipCheck) {
        // Entering /onboarding — reset so returning to dashboard re-checks cleanly
        setNeedsOnboarding(false)
      }

      if (!cancelled) setLoading(false)
    }

    run()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => {
      if (!cancelled) setSession(s)
    })

    return () => {
      cancelled = true
      subscription.unsubscribe()
    }
  }, [skipCheck]) // re-run when moving to/from /onboarding

  if (loading) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-white">
        <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!session) return <Navigate to="/login" replace />
  if (needsOnboarding && !skipCheck) return <Navigate to="/onboarding" replace />
  return <>{children}</>
}
