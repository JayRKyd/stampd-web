import { WifiOff, Check, ArrowRight } from 'lucide-react'
import {
  MarketingNav, MarketingFooter, MiniStampCard, MiniPinCells, MiniDashboard,
} from '@/components/marketing'
import { WaitlistForm } from '@/components/WaitlistForm'

const INCLUDED = [
  'Unlimited stamps & customers',
  'Your card, your colors, your reward',
  'Staff accounts with accountability',
  'Customer CRM & win-back nudges',
  'Plain-language analytics',
  'Offline stamp queue at the counter',
]

const STEPS = [
  { num: '01', title: 'Set up your card', desc: 'Pick your colors, your stamp icon, and what a full card earns. Five minutes, from your phone.' },
  { num: '02', title: 'We flip the switch', desc: 'Quick review, then your card goes live in the Stampd app — usually within 24 hours.' },
  { num: '03', title: 'Stamp your first regular', desc: 'They say their PIN, you type it. Their card fills, your name stays top of mind.' },
]

export default function Merchants() {
  return (
    <div className="min-h-dvh bg-[#F7F2E8] text-[#1A2B2A] overflow-x-hidden">
      <MarketingNav active="merchants" />

      {/* ── Hero ── */}
      <section className="w-[80%] max-w-[1600px] mx-auto pt-16 pb-20 lg:pt-24 grid lg:grid-cols-2 gap-14 items-center">
        <div>
          <p className="text-[13px] md:text-[14px] font-bold tracking-widest text-[#00605A] mb-4">FOR MERCHANTS & PROS</p>
          <h1 className="text-[40px] md:text-[58px] lg:text-[72px] xl:text-[80px] font-extrabold tracking-[-0.03em] leading-[1.05]">
            Loyalty that
            <br />
            runs itself.
          </h1>
          <p className="mt-6 text-[17px] md:text-[19px] lg:text-[20px] text-[#556570] leading-relaxed max-w-md lg:max-w-lg">
            Paper punch cards get lost, forgotten, and forged. Stampd puts your
            loyalty card in your customers' pockets — and puts your regulars'
            names, habits, and next visit in front of you.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <a
              href="#waitlist"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#00605A] text-white text-[14px] font-bold hover:bg-[#024D48] transition-colors"
            >
              Join the waitlist <ArrowRight size={15} />
            </a>
          </div>
          <p className="mt-4 text-[12.5px] text-[#74807E]">
            Launching soon on Grand Bahama · Free for early merchants
          </p>
        </div>

        {/* Their card, as customers see it */}
        <div className="relative flex justify-center" aria-hidden>
          <div className="relative">
            <MiniStampCard
              className="rotate-2"
              name="Your Business" category="Your Category" color="#00605a"
              icon="star" filled={7} total={10} reward="Your Reward"
            />
            <p className="mt-4 text-center text-[12px] text-[#74807E]">
              Your card, exactly as customers carry it
            </p>
          </div>
        </div>
      </section>

      {/* ── The counter flow ── */}
      <section className="bg-white border-y border-black/5">
        <div className="w-[80%] max-w-[1600px] mx-auto py-20 lg:py-28 grid lg:grid-cols-2 gap-16 items-center">
          <div>
            <p className="text-[13px] md:text-[14px] font-extrabold tracking-[0.18em] text-[#00605A] mb-4">THE COUNTER FLOW</p>
            <h2 className="text-[30px] md:text-[38px] lg:text-[44px] xl:text-[48px] font-extrabold tracking-[-0.03em] leading-tight mb-5">
              They say six digits.
              <br />
              You type them. Done.
            </h2>
            <p className="text-[15.5px] lg:text-[17px] text-[#556570] leading-relaxed max-w-md lg:max-w-lg">
              No scanner, no hardware, no training beyond one sentence. It runs on
              whatever's already at your counter — a phone, a tablet, the till. First-time
              customers join automatically with their first stamp, and your staff's
              name rides along on every one they issue.
            </p>
          </div>
          <div className="flex justify-center" aria-hidden>
            <div className="bg-[#F7F2E8] rounded-3xl p-8 rotate-1 shadow-sm">
              <p className="text-[11px] font-semibold text-[#74807E] tracking-wider mb-3 text-center">CUSTOMER PIN</p>
              <MiniPinCells />
              <p className="text-[11px] text-[#74807E] mt-4 text-center">
                <span className="font-semibold text-[#1A2B2A]">Tania Rolle</span> · 7/10 stamps · found in 0.3s
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Know your regulars ── */}
      <section className="w-[80%] max-w-[1600px] mx-auto py-20 lg:py-28 grid lg:grid-cols-2 gap-16 items-center">
        <div className="flex justify-center order-last lg:order-first" aria-hidden>
          <MiniDashboard className="-rotate-1" />
        </div>
        <div>
          <p className="text-[13px] md:text-[14px] font-extrabold tracking-[0.18em] text-[#00605A] mb-4">THE MORNING GLANCE</p>
          <h2 className="text-[30px] md:text-[38px] lg:text-[44px] xl:text-[48px] font-extrabold tracking-[-0.03em] leading-tight mb-5">
            Know your regulars
            <br />
            better than they do.
          </h2>
          <p className="text-[15.5px] lg:text-[17px] text-[#556570] leading-relaxed max-w-md lg:max-w-lg">
            Who's one stamp from a reward. Who hasn't been in since last month.
            Which day of the week actually pays your rent. The dashboard says it
            in plain words and absolute numbers — never "-100% vs prior" nonsense
            when yesterday was simply a slow Tuesday.
          </p>
        </div>
      </section>

      {/* ── Getting started ── */}
      <section className="w-[80%] max-w-[1600px] mx-auto py-20">
        <h2 className="text-[32px] md:text-[40px] lg:text-[44px] font-extrabold tracking-tight text-center mb-12">Live in a day</h2>
        <div className="grid sm:grid-cols-3 gap-10 max-w-4xl mx-auto">
          {STEPS.map(({ num, title, desc }) => (
            <div key={num}>
              <p className="text-[15px] font-extrabold tracking-widest mb-2" style={{ color: 'rgba(0,96,90,0.4)' }}>{num}</p>
              <h3 className="text-[18px] font-bold tracking-tight mb-2">{title}</h3>
              <p className="text-[14px] text-[#556570] leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── What's included + counter resilience ── */}
      <section className="w-[80%] max-w-[1600px] mx-auto pb-20 grid lg:grid-cols-2 gap-6">
        <div className="rounded-3xl bg-white border border-black/5 p-8 lg:p-10">
          <h3 className="text-[20px] font-extrabold tracking-tight mb-5">Everything's included</h3>
          <ul className="space-y-3">
            {INCLUDED.map(item => (
              <li key={item} className="flex items-center gap-3 text-[14px] text-[#556570]">
                <span className="w-5 h-5 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: 'rgba(0,96,90,0.1)' }}>
                  <Check size={12} className="text-[#00605A]" strokeWidth={3} />
                </span>
                {item}
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-3xl bg-[#1A2B2A] text-white p-8 lg:p-10 flex flex-col">
          <div className="w-11 h-11 rounded-xl bg-white/10 flex items-center justify-center mb-5">
            <WifiOff size={20} strokeWidth={1.75} />
          </div>
          <h3 className="text-[20px] font-extrabold tracking-tight mb-3">Island wifi? We planned for it.</h3>
          <p className="text-[14px] text-white/70 leading-relaxed flex-1">
            When your connection drops mid-rush, keep taking PINs like nothing
            happened. Stamps queue on your device and deliver themselves the
            moment you're back online — verified, attributed to your staff,
            nothing lost.
          </p>
        </div>
      </section>

      {/* ── Final CTA / waitlist ── */}
      <section id="waitlist" className="bg-[#00605A] scroll-mt-16">
        <div className="w-[80%] max-w-[1600px] mx-auto py-16 text-center flex flex-col items-center">
          <h2 className="text-[30px] md:text-[38px] lg:text-[44px] font-extrabold tracking-tight text-white mb-3">
            Your regulars are out there.
          </h2>
          <p className="text-[15px] lg:text-[17px] text-white/75 max-w-lg mx-auto mb-8">
            We're onboarding Grand Bahama businesses in small batches. Join the
            waitlist and we'll reach out when it's your turn — early merchants get
            set up free.
          </p>
          <WaitlistForm audience="merchant" dark />
        </div>
      </section>

      <MarketingFooter />
    </div>
  )
}
