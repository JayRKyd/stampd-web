import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Eye, EyeOff } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { contactHref } from '@/lib/support'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error } = await createClient().auth.signInWithPassword({ email, password })
    if (error) { setError(error.message); setLoading(false) }
    else navigate('/dashboard')
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

          <h1 className="text-[26px] font-bold text-gray-900 tracking-[-0.02em] leading-tight mb-1">
            Welcome back
          </h1>
          <p className="text-[14px] text-gray-600 mb-6">Let's get you signed in.</p>

          {error && (
            <div className="mb-4 px-3 py-2.5 rounded-lg bg-red-50 border border-red-200 text-red-600 text-[13px]">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email"
                required
                autoFocus
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

            {/* Forgot password */}
            <div className="pt-1">
              <Link
                to="/forgot-password"
                className="text-[14px] font-semibold text-brand-500 hover:underline"
              >
                Forgot password?
              </Link>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-lg bg-brand-500 text-[15px] font-semibold text-white hover:bg-brand-600 transition-colors disabled:opacity-50 mt-2"
            >
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          <p className="text-center text-[15px] text-gray-600 mt-6">
            New to Stampd?{' '}
            <Link to="/register" className="text-brand-500 font-semibold hover:underline">
              Sign up
            </Link>
          </p>
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
          src="/signin-img.png"
          alt=""
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
        />
      </div>
    </div>
  )
}
