import { useState, useEffect, useCallback } from 'react'

// One-time guided tour for freshly onboarded merchants. Spotlights sidebar
// targets (elements tagged with data-tour) with a pulsing ring and a
// what-to-click-next tooltip. Skippable at every step; never shows again
// once finished or skipped.

const PENDING_KEY = 'stampd_tour_pending'
const DONE_KEY = 'stampd_dashboard_tour_done'

const STEPS = [
  {
    target: 'stamp',
    title: 'This is your day-to-day',
    body: 'Issue Stamp is where every visit gets counted: type the customer\'s 6-digit PIN, tap once, done. It unlocks the moment your account is approved.',
  },
  {
    target: 'customers',
    title: 'Know who\'s coming back',
    body: 'Every stamped customer shows up here — visits, rewards, and who\'s gone quiet. Open anyone to nudge them back with a message to their phone.',
  },
  {
    target: 'card',
    title: 'Your card, your rules',
    body: 'Change your reward, stamp count or colors anytime — no reprinting, and every customer sees the update instantly.',
  },
  {
    target: 'settings',
    title: 'Staff and counter mode',
    body: 'Add your staff so stamps are accounted for, and lock a shared counter device to stamping only. That\'s the whole setup — you\'re ready.',
  },
] as const

export function shouldStartDashboardTour(): boolean {
  return (
    typeof window !== 'undefined' &&
    window.innerWidth >= 1024 &&
    localStorage.getItem(PENDING_KEY) === '1' &&
    localStorage.getItem(DONE_KEY) !== '1'
  )
}

export function DashboardTour({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState(0)
  const [rect, setRect] = useState<DOMRect | null>(null)

  // Strictly once: the moment the tour has shown, it never shows again —
  // even if the merchant refreshes or leaves mid-tour instead of clicking
  // Done or Skip.
  useEffect(() => {
    localStorage.setItem(DONE_KEY, '1')
    localStorage.removeItem(PENDING_KEY)
  }, [])

  const finish = useCallback(() => {
    localStorage.setItem(DONE_KEY, '1')
    localStorage.removeItem(PENDING_KEY)
    onClose()
  }, [onClose])

  const measure = useCallback(() => {
    const el = document.querySelector(`[data-tour="${STEPS[step].target}"]`)
    if (!el) { finish(); return }
    setRect(el.getBoundingClientRect())
  }, [step, finish])

  useEffect(() => {
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [measure])

  if (!rect) return null

  const pad = 6
  const isLast = step === STEPS.length - 1
  const tipTop = Math.min(Math.max(rect.top - 10, 16), window.innerHeight - 240)

  return (
    <div className="fixed inset-0 z-[100]" role="dialog" aria-label="Dashboard tour">
      {/* Spotlight: the hole is the target; everything else dims */}
      <div
        className="absolute rounded-xl transition-all duration-300"
        style={{
          top: rect.top - pad,
          left: rect.left - pad,
          width: rect.width + pad * 2,
          height: rect.height + pad * 2,
          boxShadow: '0 0 0 9999px rgba(8, 42, 37, 0.55)',
        }}
      />
      {/* Pulsing ring on what to click next */}
      <div
        className="absolute rounded-xl border-2 border-accent-400 animate-pulse pointer-events-none transition-all duration-300"
        style={{
          top: rect.top - pad,
          left: rect.left - pad,
          width: rect.width + pad * 2,
          height: rect.height + pad * 2,
        }}
      />

      {/* Tooltip to the right of the sidebar target */}
      <div
        className="absolute w-[320px] bg-white rounded-2xl shadow-2xl p-5 transition-all duration-300"
        style={{ top: tipTop, left: rect.right + pad + 16 }}
      >
        <p className="text-[11px] font-bold text-accent-500 uppercase tracking-wider mb-1.5">
          {step + 1} of {STEPS.length}
        </p>
        <h3 className="text-[15px] font-bold text-gray-900 mb-1.5">{STEPS[step].title}</h3>
        <p className="text-[13px] text-gray-500 leading-relaxed mb-4">{STEPS[step].body}</p>
        <div className="flex items-center justify-between">
          <button
            onClick={finish}
            className="text-[12px] font-medium text-gray-400 hover:text-gray-600 transition-colors"
          >
            Skip tour
          </button>
          <button
            onClick={() => (isLast ? finish() : setStep(s => s + 1))}
            className="px-4 py-2 rounded-lg bg-brand-500 text-[13px] font-semibold text-white hover:bg-brand-600 transition-colors"
          >
            {isLast ? 'Done' : 'Next'}
          </button>
        </div>
      </div>
    </div>
  )
}
