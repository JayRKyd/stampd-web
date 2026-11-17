import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { exitDemo } from '@/lib/demo/mode'

// The public demo's walk-through (/demo). One short card per screen that
// takes the visitor there itself, so they are shown the platform a page at a
// time instead of being dropped into a full dashboard. It sits in a corner
// and never blocks the page: everything behind it can be clicked.

const STEPS = [
  {
    to: '/dashboard',
    title: 'Your shop at a glance',
    body: 'Bay Street Coffee is a made-up shop. This is what you would open each morning: today’s stamps, how the week is going, and which customers need attention.',
  },
  {
    to: '/stamp',
    title: 'Stamping takes seconds',
    body: 'Watch: pick who is stamping, type the customer’s 6-digit PIN, add the stamp. That is the whole job at the counter. Try it yourself after with any six digits.',
    samplePin: '123456',
  },
  {
    to: '/customers',
    title: 'Know your regulars',
    body: 'Everyone you have stamped: who is new, who is close to a reward and who has stopped coming. Open anyone to send a message to their phone.',
  },
  {
    to: '/card',
    title: 'Your card, your rules',
    body: 'Choose the reward, the number of stamps and your colours. Change it any time and every customer’s card updates straight away.',
  },
  {
    to: '/gift-cards/issue',
    title: 'Sell gift cards',
    body: 'Take the money at your counter, type the amount, and the gift card goes to their phone. Nothing to print or order.',
  },
  {
    to: '/specials',
    title: 'Your regulars hear first',
    body: 'Post today’s special and it goes to the phone of every customer who holds your card.',
  },
] as const

export function DemoBar({ onTour }: { onTour: () => void }) {
  return (
    <div className="flex items-center gap-3 px-4 lg:px-8 py-2 shrink-0 text-[12px]" style={{ background: '#0A322D', color: '#F7F2E8' }}>
      <p className="min-w-0 flex-1 truncate">
        <span className="font-semibold">Demo shop.</span> <span className="opacity-80">Nothing here is real, and nothing you change is saved.</span>
      </p>
      <button onClick={onTour} className="hidden sm:block shrink-0 font-medium underline underline-offset-2 opacity-90 hover:opacity-100">
        Restart tour
      </button>
      <Link
        to="/register"
        onClick={() => exitDemo()}
        className="shrink-0 rounded-full px-3 py-1.5 font-semibold text-gray-900 bg-accent-400 hover:bg-accent-500 hover:text-white transition-colors"
      >
        <span className="sm:hidden">Sign up</span>
        <span className="hidden sm:inline">Get your shop on Stampd</span>
      </Link>
    </div>
  )
}

export function DemoTour({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState(0)
  const navigate = useNavigate()
  const done = step >= STEPS.length
  const samplePin = !done && 'samplePin' in STEPS[step] ? (STEPS[step] as { samplePin: string }).samplePin : null

  useEffect(() => {
    if (step < STEPS.length) navigate(STEPS[step].to)
  }, [step, navigate])

  // On a step with a sample PIN, the screen plays itself once it has loaded
  const [plays, setPlays] = useState(0)
  useEffect(() => {
    if (!samplePin) return
    const t = setTimeout(() => {
      document.querySelector('main')?.scrollTo({ top: 0, behavior: 'smooth' })
      window.dispatchEvent(new CustomEvent('stampd:demo-play', { detail: samplePin }))
    }, 600)
    return () => clearTimeout(t)
  }, [samplePin, step, plays])

  return (
    <div
      role="dialog"
      aria-label="Demo tour"
      className="fixed z-[90] inset-x-3 bottom-3 sm:inset-x-auto sm:right-6 sm:bottom-6 sm:w-[360px] bg-white rounded-2xl shadow-2xl border border-gray-200 p-5"
    >
      {done ? (
        <>
          <h3 className="text-[16px] font-bold text-gray-900 mb-1.5">That’s Stampd</h3>
          <p className="text-[13px] text-gray-500 leading-relaxed mb-4">
            Look around for as long as you like. When you are ready, someone from Stampd will set your shop up with you. Call (242) 533-0878 or sign up below.
          </p>
          <div className="flex items-center justify-between gap-3">
            <button onClick={onClose} className="text-[12px] font-medium text-gray-500 hover:text-gray-800 transition-colors">
              Keep exploring
            </button>
            <Link
              to="/register"
              onClick={() => exitDemo()}
              className="px-4 py-2 rounded-lg bg-brand-500 text-[13px] font-semibold text-white hover:bg-brand-600 transition-colors"
            >
              Get your shop on Stampd
            </Link>
          </div>
        </>
      ) : (
        <>
          <div className="flex items-center gap-1.5 mb-3">
            {STEPS.map((_, i) => (
              <span key={i} className={`h-1.5 flex-1 rounded-full ${i <= step ? 'bg-brand-500' : 'bg-gray-100'}`} />
            ))}
          </div>
          <p className="text-[11px] font-bold text-accent-500 uppercase tracking-wider mb-1">
            {step + 1} of {STEPS.length}
          </p>
          <h3 className="text-[16px] font-bold text-gray-900 mb-1.5">{STEPS[step].title}</h3>
          <p className="text-[13px] text-gray-500 leading-relaxed mb-4">{STEPS[step].body}</p>
          <div className="flex items-center justify-between">
            <button onClick={onClose} className="text-[12px] font-medium text-gray-400 hover:text-gray-600 transition-colors">
              Skip tour
            </button>
            <div className="flex items-center gap-2">
              {samplePin && (
                <button
                  onClick={() => setPlays(n => n + 1)}
                  className="px-3 py-2 text-[13px] font-medium text-brand-600 hover:text-brand-700 transition-colors"
                >
                  Replay
                </button>
              )}
              {step > 0 && (
                <button
                  onClick={() => setStep(s => s - 1)}
                  className="px-3.5 py-2 rounded-lg border border-gray-200 text-[13px] font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  Back
                </button>
              )}
              <button
                onClick={() => setStep(s => s + 1)}
                className="px-4 py-2 rounded-lg bg-brand-500 text-[13px] font-semibold text-white hover:bg-brand-600 transition-colors"
              >
                {step === STEPS.length - 1 ? 'Finish' : 'Next'}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
