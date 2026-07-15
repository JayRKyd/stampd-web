import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Eye, EyeOff, CheckCircle2, Smartphone } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export default function ResetPassword() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  // 'merchant' continues to the dashboard; consumers are sent back to the app
  const [done, setDone] = useState<false | 'merchant' | 'consumer'>(false)
  const [hasSession, setHasSession] = useState<boolean | null>(null)
  const navigate = useNavigate()

  // When arriving from the reset email, Supabase establishes a recovery session.
  useEffect(() => {
    const supabase = createClient()
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' || session) setHasSession(true)
    })
    supabase.auth.getSession().then(({ data }) => {
      setHasSession((prev) => prev ?? !!data.session)
    })
    return () => subscription.unsubscribe()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password.length < 6) { setError('Password must be at least 6 characters'); return }
    if (password !== confirmPassword) { setError('Passwords do not match'); return }

    setLoading(true)
    setError('')
    const supabase = createClient()
    const { data, error } = await supabase.auth.updateUser({ password })
    setLoading(false)
    if (error) { setError(error.message); return }

    // Mobile users reset here too (phones have no page to catch the email
    // link) — but only merchants belong in this dashboard. Consumers get
    // sent back to the app, and their recovery session is closed so it
    // can't wander into merchant onboarding.
    if (data.user?.user_metadata?.role === 'merchant') {
      setDone('merchant')
      setTimeout(() => navigate('/dashboard'), 1500)
    } else {
      setDone('consumer')
      supabase.auth.signOut()
    }
  }

  return (
    <div className="min-h-dvh flex items-center justify-center bg-gray-50 px-6 py-10">
      <div className="w-full max-w-[400px] bg-white border border-gray-200 rounded-2xl shadow-sm px-8 py-10">
        <div className="h-16 overflow-hidden flex items-center mb-6">
          <img src="/icon-banner.png" alt="Stampd Bahamas" className="h-28 w-auto max-w-none -ml-3" />
        </div>

        {done ? (
          <div>
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
              <CheckCircle2 size={24} className="text-green-600" />
            </div>
            <h1 className="text-[24px] font-bold text-gray-900 tracking-[-0.02em] mb-2">Password updated</h1>
            {done === 'merchant' ? (
              <p className="text-[14px] text-gray-600">Redirecting you to your dashboard…</p>
            ) : (
              <>
                <p className="text-[14px] text-gray-600 mb-5">
                  You're all set. Open the Stampd app on your phone and sign in with your new password.
                </p>
                <div className="flex items-center gap-2.5 px-4 py-3 rounded-lg bg-gray-50 border border-gray-200">
                  <Smartphone size={18} className="text-gray-500 shrink-0" />
                  <p className="text-[13px] text-gray-600">You can close this page.</p>
                </div>
              </>
            )}
          </div>
        ) : hasSession === false ? (
          <div>
            <h1 className="text-[24px] font-bold text-gray-900 tracking-[-0.02em] mb-2">Link expired</h1>
            <p className="text-[14px] text-gray-600 mb-6">
              This password reset link is invalid or has expired. Request a new one.
            </p>
            <Link
              to="/forgot-password"
              className="block w-full py-3.5 rounded-lg bg-brand-500 text-center text-[15px] font-semibold text-white hover:bg-brand-600 transition-colors"
            >
              Request new link
            </Link>
          </div>
        ) : (
          <>
            <h1 className="text-[24px] font-bold text-gray-900 tracking-[-0.02em] mb-1">Set a new password</h1>
            <p className="text-[14px] text-gray-600 mb-6">Choose a strong password you'll remember.</p>

            {error && (
              <div className="mb-4 px-3 py-2.5 rounded-lg bg-red-50 border border-red-200 text-red-600 text-[13px]">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="New password"
                  required
                  autoFocus
                  className="w-full px-4 py-3.5 pr-11 rounded-lg border border-gray-300 bg-white text-[15px] text-gray-900 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all placeholder:text-gray-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                required
                className="w-full px-4 py-3.5 rounded-lg border border-gray-300 bg-white text-[15px] text-gray-900 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all placeholder:text-gray-500"
              />
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 rounded-lg bg-brand-500 text-[15px] font-semibold text-white hover:bg-brand-600 transition-colors disabled:opacity-50"
              >
                {loading ? 'Updating…' : 'Update password'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
