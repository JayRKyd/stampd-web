import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Eye, EyeOff, MailCheck } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { contactHref } from '@/lib/support'

export default function Register() {
  const [businessName, setBusinessName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [emailSent, setEmailSent] = useState(false)
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!businessName.trim()) {
      setError('Business name is required')
      return
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    setLoading(true)
    setError('')
    const supabase = createClient()

    // The merchant row is created server-side by the `handle_new_merchant_user`
    // trigger, which fires when role === 'merchant' in the user metadata. This
    // bypasses RLS and avoids the no-session problem when email confirmation is on.
    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { role: 'merchant', business_name: businessName.trim() },
        emailRedirectTo: `${window.location.origin}/login`,
      },
    })

    if (signUpError) { setError(signUpError.message); setLoading(false); return }

    // If email confirmation is required, there is no active session yet.
    if (!data.session) {
      setEmailSent(true)
      setLoading(false)
      return
    }

    navigate('/dashboard')
  }

  return (
    <div className="min-h-dvh flex w-full">
      {/* ── Left panel ── */}
      <div className="flex flex-col w-full lg:flex-1 bg-white px-8 py-8 lg:px-12 lg:py-8 overflow-y-auto">

        {/* Main Content — Centered */}
        <div className="flex-1 flex flex-col justify-center max-w-[380px] w-full mx-auto">
          
          {/* Logo */}
          <div className="mb-0 mt-4 h-20 overflow-hidden flex items-center">
            <img 
              src="/icon-banner.png" 
              alt="Stampd Bahamas" 
              className="h-32 w-auto max-w-none -ml-3"
            />
          </div>

          {emailSent ? (
            <div>
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-brand-50">
                <MailCheck size={24} className="text-brand-500" />
              </div>
              <h1 className="text-[26px] font-bold text-gray-900 tracking-[-0.02em] leading-tight mb-2">
                Check your email
              </h1>
              <p className="text-[14px] text-gray-600 mb-6 leading-relaxed">
                We sent a confirmation link to <span className="font-semibold text-gray-900">{email}</span>.
                Click it to verify your account, then sign in.
              </p>
              <Link
                to="/login"
                className="block w-full py-3.5 rounded-lg bg-brand-500 text-center text-[15px] font-semibold text-white hover:bg-brand-600 transition-colors"
              >
                Go to sign in
              </Link>
              <p className="text-center text-[13px] text-gray-500 mt-5">
                Didn't get it? Check spam, or{' '}
                <button
                  onClick={() => { setEmailSent(false); setError('') }}
                  className="text-brand-500 font-semibold hover:underline"
                >
                  try again
                </button>
              </p>
            </div>
          ) : (
          <>
          <h1 className="text-[26px] font-bold text-gray-900 tracking-[-0.02em] leading-tight mb-1">
            Create your account
          </h1>
          <p className="text-[14px] text-gray-600 mb-6">Start building customer loyalty.</p>

          {error && (
            <div className="mb-4 px-3 py-2.5 rounded-lg bg-red-50 border border-red-200 text-red-600 text-[13px]">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Business name */}
            <div>
              <input
                type="text"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                placeholder="Business Name"
                autoFocus
                className="w-full px-4 py-3.5 rounded-lg border border-gray-300 bg-white text-[15px] text-gray-900 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all placeholder:text-gray-500"
              />
            </div>

            {/* Email */}
            <div>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email"
                required
                className="w-full px-4 py-3.5 rounded-lg border border-gray-300 bg-white text-[15px] text-gray-900 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all placeholder:text-gray-500"
              />
            </div>

            {/* Password */}
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                required
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

            {/* Confirm Password */}
            <div className="relative">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm Password"
                required
                className="w-full px-4 py-3.5 pr-11 rounded-lg border border-gray-300 bg-white text-[15px] text-gray-900 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all placeholder:text-gray-500"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                tabIndex={-1}
              >
                {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-lg bg-brand-500 text-[15px] font-semibold text-white hover:bg-brand-600 transition-colors disabled:opacity-50 mt-2"
            >
              {loading ? 'Creating account…' : 'Create Account'}
            </button>
          </form>

          <p className="text-center text-[15px] text-gray-600 mt-6">
            Already have an account?{' '}
            <Link to="/login" className="text-brand-500 font-semibold hover:underline">
              Sign in
            </Link>
          </p>
          </>
          )}
        </div>

        {/* Footer */}
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-between text-[13px] text-gray-500 gap-4 w-full">
          <span>© 2026 Stampd Bahamas.</span>
          {contactHref && (
            <div className="flex items-center gap-6 font-medium text-brand-500">
              <a href={contactHref} className="hover:underline transition-all">Contact Us</a>
            </div>
          )}
        </div>
      </div>

      {/* ── Right panel ── */}
      <div className="hidden lg:block flex-1" style={{ position: 'relative' }}>
        <img
          src="/signup-img.png"
          alt=""
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
        />
      </div>
    </div>
  )
}
