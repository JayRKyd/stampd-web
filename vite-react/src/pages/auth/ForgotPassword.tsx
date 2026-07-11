import { useState } from 'react'
import { Link } from 'react-router-dom'
import { MailCheck } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) { setError('Please enter your email'); return }

    setLoading(true)
    setError('')
    const supabase = createClient()
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    setLoading(false)
    if (error) { setError(error.message); return }
    setSent(true)
  }

  return (
    <div className="min-h-dvh flex items-center justify-center bg-gray-50 px-6 py-10">
      <div className="w-full max-w-[400px] bg-white border border-gray-200 rounded-2xl shadow-sm px-8 py-10">
        <div className="h-16 overflow-hidden flex items-center mb-6">
          <img src="/icon-banner.png" alt="Stampd Bahamas" className="h-28 w-auto max-w-none -ml-3" />
        </div>

        {sent ? (
          <div>
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-brand-50">
              <MailCheck size={24} className="text-brand-500" />
            </div>
            <h1 className="text-[24px] font-bold text-gray-900 tracking-[-0.02em] mb-2">Check your email</h1>
            <p className="text-[14px] text-gray-600 mb-6 leading-relaxed">
              If an account exists for <span className="font-semibold text-gray-900">{email}</span>, we've sent a
              link to reset your password.
            </p>
            <Link
              to="/login"
              className="block w-full py-3.5 rounded-lg bg-brand-500 text-center text-[15px] font-semibold text-white hover:bg-brand-600 transition-colors"
            >
              Back to sign in
            </Link>
          </div>
        ) : (
          <>
            <h1 className="text-[24px] font-bold text-gray-900 tracking-[-0.02em] mb-1">Forgot password?</h1>
            <p className="text-[14px] text-gray-600 mb-6">Enter your email and we'll send you a reset link.</p>

            {error && (
              <div className="mb-4 px-3 py-2.5 rounded-lg bg-red-50 border border-red-200 text-red-600 text-[13px]">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email"
                required
                autoFocus
                className="w-full px-4 py-3.5 rounded-lg border border-gray-300 bg-white text-[15px] text-gray-900 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all placeholder:text-gray-500"
              />
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 rounded-lg bg-brand-500 text-[15px] font-semibold text-white hover:bg-brand-600 transition-colors disabled:opacity-50"
              >
                {loading ? 'Sending…' : 'Send reset link'}
              </button>
            </form>

            <p className="text-center text-[14px] text-gray-600 mt-6">
              Remembered it?{' '}
              <Link to="/login" className="text-brand-500 font-semibold hover:underline">Sign in</Link>
            </p>
          </>
        )}
      </div>
    </div>
  )
}
