import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { CheckCircle2, Smartphone } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

type State = 'checking' | 'consumer' | 'merchant' | 'expired'

// Landing page for signup confirmation emails. Mobile signups point their
// emailRedirectTo here because a phone has no page to receive the link —
// clicking it from any device (laptop included) still confirms the account.
export default function Confirmed() {
  const [state, setState] = useState<State>('checking')
  const navigate = useNavigate()

  useEffect(() => {
    // Expired or already-used links come back as error params, not a session
    const params = new URLSearchParams(
      window.location.hash.slice(1) || window.location.search.slice(1)
    )
    if (params.get('error') || params.get('error_description')) {
      setState('expired')
      return
    }

    const supabase = createClient()
    let settled = false
    const settle = (session: { user: { user_metadata?: { role?: string } } } | null) => {
      if (settled || !session) return
      settled = true
      if (session.user.user_metadata?.role === 'merchant') {
        setState('merchant')
      } else {
        setState('consumer')
        // Consumer sessions belong in the app, not this browser — and a
        // lingering one here would trip merchant-dashboard routing.
        supabase.auth.signOut()
      }
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => settle(session)
    )
    supabase.auth.getSession().then(({ data }) => settle(data.session))

    // No session and no error params = someone opened the URL bare
    const timer = setTimeout(() => {
      if (!settled) { settled = true; setState('expired') }
    }, 6000)

    return () => { subscription.unsubscribe(); clearTimeout(timer) }
  }, [])

  return (
    <div className="min-h-dvh flex items-center justify-center bg-gray-50 px-6 py-10">
      <div className="w-full max-w-[400px] bg-white border border-gray-200 rounded-2xl shadow-sm px-8 py-10">
        <div className="h-16 overflow-hidden flex items-center mb-6">
          <img src="/icon-banner.png" alt="Stampd Bahamas" className="h-28 w-auto max-w-none -ml-3" />
        </div>

        {state === 'checking' && (
          <div>
            <div className="mb-4 h-8 w-8 rounded-full border-2 border-brand-500 border-t-transparent animate-spin" />
            <h1 className="text-[24px] font-bold text-gray-900 tracking-[-0.02em] mb-2">Confirming your email…</h1>
            <p className="text-[14px] text-gray-600">This only takes a moment.</p>
          </div>
        )}

        {state === 'consumer' && (
          <div>
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
              <CheckCircle2 size={24} className="text-green-600" />
            </div>
            <h1 className="text-[24px] font-bold text-gray-900 tracking-[-0.02em] mb-2">Email confirmed</h1>
            <p className="text-[14px] text-gray-600 mb-5">
              You're all set. Head back to the Stampd app and sign in to start earning rewards.
            </p>
            {/* The app registers the stampd:// scheme, so this reopens it
                directly. If the OS blocks the custom scheme (rare), the note
                below still tells them to open it manually. */}
            <a
              href="stampd://"
              className="flex items-center justify-center gap-2 w-full py-3.5 rounded-lg bg-brand-500 text-center text-[15px] font-semibold text-white hover:bg-brand-600 transition-colors"
            >
              <Smartphone size={18} className="shrink-0" />
              Open Stampd
            </a>
            <p className="text-[13px] text-gray-500 text-center mt-3">
              Not opening? Just reopen the Stampd app on your phone.
            </p>
          </div>
        )}

        {state === 'merchant' && (
          <div>
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
              <CheckCircle2 size={24} className="text-green-600" />
            </div>
            <h1 className="text-[24px] font-bold text-gray-900 tracking-[-0.02em] mb-2">Email confirmed</h1>
            <p className="text-[14px] text-gray-600 mb-6">
              Your account is verified. Let's finish setting up your loyalty program.
            </p>
            <button
              onClick={() => navigate('/dashboard')}
              className="block w-full py-3.5 rounded-lg bg-brand-500 text-center text-[15px] font-semibold text-white hover:bg-brand-600 transition-colors"
            >
              Continue to dashboard
            </button>
          </div>
        )}

        {state === 'expired' && (
          <div>
            <h1 className="text-[24px] font-bold text-gray-900 tracking-[-0.02em] mb-2">Link expired</h1>
            <p className="text-[14px] text-gray-600">
              This confirmation link is invalid or has already been used. Try signing in from
              the Stampd app — if your email is already confirmed, it will work.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
