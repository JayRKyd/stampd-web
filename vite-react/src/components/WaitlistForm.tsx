import { useState } from 'react'
import { Check } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

type Audience = 'customer' | 'merchant'

// Email capture for the pre-launch waitlist. Writes to the `waitlist` table
// (anon insert only). A repeat email resolves to the same "you're in" state.
export function WaitlistForm({
  audience,
  dark = false,
}: {
  audience: Audience
  dark?: boolean
}) {
  const [email, setEmail] = useState('')
  const [business, setBusiness] = useState('')
  const [state, setState] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const cleaned = email.trim()
    if (!cleaned || !cleaned.includes('@')) {
      setError('Enter a valid email')
      return
    }
    setState('loading')
    setError('')

    const supabase = createClient()
    const { error: insErr } = await supabase.from('waitlist').insert({
      email: cleaned,
      business_name: audience === 'merchant' ? (business.trim() || null) : null,
      audience,
    })

    // 23505 = already on the list; treat as success, not an error
    if (insErr && insErr.code !== '23505') {
      setState('error')
      setError('Something went wrong. Please try again.')
      return
    }
    setState('done')
  }

  if (state === 'done') {
    return (
      <div className={`flex items-center gap-3 rounded-2xl px-5 py-4 ${
        dark ? 'bg-white/10 text-white' : 'bg-[#00605A]/8 text-[#1A2B2A]'
      }`}>
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#00605A] text-white shrink-0">
          <Check size={18} />
        </div>
        <div>
          <p className="text-[15px] font-bold">You're on the list.</p>
          <p className={`text-[13px] ${dark ? 'text-white/70' : 'text-[#556570]'}`}>
            We'll email you the moment {audience === 'merchant' ? 'merchant sign-ups open' : 'Stampd launches'}.
          </p>
        </div>
      </div>
    )
  }

  const inputCls = `w-full px-4 py-3.5 rounded-full text-[15px] focus:outline-none transition-all ${
    dark
      ? 'bg-white/10 border border-white/20 text-white placeholder:text-white/50 focus:border-white/50'
      : 'bg-white border border-[#1A2B2A]/12 text-[#1A2B2A] placeholder:text-[#94aab1] focus:border-[#00605A]'
  }`

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-md">
      <div className="flex flex-col sm:flex-row gap-2.5">
        {audience === 'merchant' && (
          <input
            type="text"
            value={business}
            onChange={(e) => setBusiness(e.target.value)}
            placeholder="Business name"
            className={`${inputCls} sm:flex-1`}
          />
        )}
        <input
          type="email"
          value={email}
          onChange={(e) => { setEmail(e.target.value); setError('') }}
          placeholder="you@email.com"
          className={`${inputCls} sm:flex-1`}
        />
        <button
          type="submit"
          disabled={state === 'loading'}
          className={`shrink-0 px-6 py-3.5 rounded-full text-[14px] font-bold transition-colors disabled:opacity-60 ${
            dark
              ? 'bg-[#F7F2E8] text-[#1A2B2A] hover:bg-white'
              : 'bg-[#00605A] text-white hover:bg-[#024D48]'
          }`}
        >
          {state === 'loading' ? 'Joining…' : 'Join waitlist'}
        </button>
      </div>
      {error && (
        <p className={`mt-2 text-[13px] ${dark ? 'text-red-200' : 'text-red-600'}`}>{error}</p>
      )}
    </form>
  )
}
