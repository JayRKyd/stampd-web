import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Check, ArrowRight, ArrowDown, MessageCircle, Gift, Star } from 'lucide-react'
import { MarketingNav, MarketingFooter } from '@/components/marketing'
import { WaitlistForm } from '@/components/WaitlistForm'
import { whatsappHref } from '@/lib/support'

const PHONE_DISPLAY = '(242) 533-0878'

// Kept short on purpose: how it works shown on three screens, the price, what
// is in it, and how to start. Anything longer belongs in the live demo.

const INCLUDED = [
  'Unlimited stamps and customers',
  'Your card, your colors, your reward',
  'Specials sent to your regulars’ phones',
  'Gift cards you sell at the counter',
  'Staff logins, so you know who stamped',
  'Reminders to customers who drift off',
  'Works when the wifi drops',
  'Your shop listed in the app for everyone',
]

const PROOF = [
  { big: '600+', small: 'customers in Grand Bahama already carrying cards' },
  { big: '3 in 10', small: 'customers come back for repeat visits' },
  { big: '79', small: 'customers stamped at one shop in a single week' },
]

// ── The three screens ──

function Phone({ children }: { children: ReactNode }) {
  return (
    <div className="w-[196px] h-[392px] rounded-[36px] bg-[#1A2B2A] p-[7px] shadow-[0_30px_50px_-28px_rgba(26,43,42,0.6)] shrink-0 select-none">
      <div className="relative w-full h-full rounded-[30px] bg-[#F7F2E8] overflow-hidden">
        <div className="absolute top-2 left-1/2 -translate-x-1/2 w-14 h-[14px] rounded-full bg-[#1A2B2A]" />
        <div className="pt-10 px-3 text-left">{children}</div>
      </div>
    </div>
  )
}

function Tablet({ children }: { children: ReactNode }) {
  return (
    <div className="w-[300px] h-[236px] rounded-[24px] bg-[#1A2B2A] p-[9px] shadow-[0_30px_50px_-28px_rgba(26,43,42,0.6)] shrink-0 select-none">
      <div className="w-full h-full rounded-[16px] bg-white overflow-hidden px-4 py-3.5 text-left">{children}</div>
    </div>
  )
}

function ScreenLabel({ children }: { children: ReactNode }) {
  return <p className="text-[8.5px] font-extrabold tracking-[0.14em] text-[#74807E] mb-1.5">{children}</p>
}

// The shop's stamp card at phone-screen size. `fresh` marks the stamp just added.
function ScreenCard({ filled, fresh }: { filled: number; fresh?: boolean }) {
  const total = 10
  return (
    <div className="rounded-[14px] bg-[#00605A] p-3">
      <div className="flex items-center gap-2 mb-2.5">
        <div className="w-6 h-6 rounded-md bg-white flex items-center justify-center text-[8.5px] font-extrabold text-[#00433F]">YB</div>
        <p className="text-[10.5px] font-extrabold text-white tracking-tight">Your Business</p>
      </div>
      <div className="grid grid-cols-5 gap-[5px]">
        {Array.from({ length: total }).map((_, i) => {
          if (i === total - 1) {
            return (
              <span key={i} className="aspect-square rounded-full bg-white/90 flex items-center justify-center">
                <Gift size={11} className="text-[#00433F]" />
              </span>
            )
          }
          const on = i < filled
          const isFresh = fresh && i === filled - 1
          return (
            <span
              key={i}
              className={`aspect-square rounded-full flex items-center justify-center ${
                isFresh ? 'bg-[#d4a843]' : on ? 'bg-[#00433F]' : 'bg-black/15'
              }`}
            >
              <Star size={10} strokeWidth={2.4} className={isFresh ? 'text-[#0C2E29]' : on ? 'text-white' : 'text-white/40'} />
            </span>
          )
        })}
      </div>
      <p className="mt-2.5 text-center text-[9.5px] font-bold text-white">
        {total - filled} more to get Your Reward
      </p>
    </div>
  )
}

function CustomerPinScreen() {
  return (
    <Phone>
      <ScreenLabel>MY PIN</ScreenLabel>
      <div className="rounded-[14px] p-3 mb-4" style={{ background: 'linear-gradient(135deg, #0F8A7E 0%, #03635B 55%, #02322E 100%)' }}>
        <div className="flex items-center justify-between">
          <span className="text-[8.5px] font-semibold text-white/85">Member Pass</span>
          <span className="text-[8.5px] font-extrabold text-white tracking-[0.2em]">STAMPD</span>
        </div>
        <p className="mt-3 text-[23px] font-extrabold text-white tracking-[0.14em] leading-none">421 867</p>
        <p className="mt-3 text-[8px] font-bold text-white/60 tracking-[0.14em]">TANIA ROLLE</p>
      </div>
      <ScreenLabel>MY CARDS</ScreenLabel>
      <ScreenCard filled={6} />
    </Phone>
  )
}

function CounterScreen() {
  return (
    <Tablet>
      <div className="flex items-center justify-between mb-3">
        <p className="text-[13px] font-extrabold tracking-tight text-[#1A2B2A]">Issue Stamp</p>
        <span className="text-[9.5px] font-semibold text-[#556570] bg-[#F7F2E8] rounded-full px-2 py-1">Marcus is stamping</span>
      </div>
      <ScreenLabel>CUSTOMER PIN</ScreenLabel>
      <div className="flex gap-1.5">
        {'421867'.split('').map((d, i) => (
          <span
            key={i}
            className="flex-1 h-11 rounded-[10px] border-[1.5px] border-[#00605A] bg-[#00605A]/5 flex items-center justify-center text-[18px] font-bold text-[#00605A]"
          >
            {d}
          </span>
        ))}
      </div>
      <div className="mt-3.5 rounded-[12px] bg-[#00605A] px-3 py-2.5 flex items-center gap-2.5">
        <span className="w-7 h-7 rounded-full bg-[#d4a843] flex items-center justify-center shrink-0">
          <Check size={15} className="text-[#0C2E29]" strokeWidth={3} />
        </span>
        <div className="min-w-0">
          <p className="text-[12px] font-extrabold text-white leading-tight">Stamp added</p>
          <p className="text-[10px] text-white/75 leading-tight mt-0.5">Tania Rolle · 7 of 10</p>
        </div>
      </div>
    </Tablet>
  )
}

function ComeBackScreen() {
  return (
    <Phone>
      <div className="bg-white rounded-[14px] shadow-md px-2.5 py-2.5 flex gap-2 items-start mb-4">
        <div className="w-7 h-7 rounded-lg bg-[#00605A]/10 flex items-center justify-center shrink-0 text-[9px] font-extrabold text-[#00605A]">YB</div>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-1">
            <p className="flex-1 text-[10px] font-bold text-[#1A2B2A] truncate">Your Business</p>
            <span className="text-[8px] text-[#74807E]">now</span>
          </div>
          <p className="text-[9.5px] text-[#556570] leading-snug mt-0.5">Half price until 3pm. Stop by!</p>
        </div>
      </div>
      <ScreenLabel>MY CARDS</ScreenLabel>
      <ScreenCard filled={7} fresh />
      <div className="mt-3 bg-white rounded-[14px] shadow-md px-2.5 py-2.5 flex gap-2 items-center">
        <div className="w-7 h-7 rounded-lg bg-[#d4a843]/20 flex items-center justify-center shrink-0">
          <Gift size={13} className="text-[#b8922e]" />
        </div>
        <p className="text-[9.5px] text-[#556570] leading-snug">
          <span className="font-bold text-[#1A2B2A]">Almost there.</span> 3 more for your reward.
        </p>
      </div>
    </Phone>
  )
}

const STEPS = [
  { screen: <CustomerPinScreen />, title: 'They say their PIN', sub: 'It’s in the free app on their phone.' },
  { screen: <CounterScreen />, title: 'You type it in', sub: 'Any phone or tablet. No scanner.' },
  { screen: <ComeBackScreen />, title: 'They come back', sub: 'For the reward, and for the specials you post.' },
]

export default function Merchants() {
  return (
    <div className="min-h-dvh bg-[#F7F2E8] text-[#1A2B2A] overflow-x-hidden">
      <MarketingNav active="merchants" />

      {/* ── How it works, shown ── */}
      <section className="w-[90%] max-w-[1200px] mx-auto pt-12 pb-16 lg:pt-20 lg:pb-24 text-center">
        <p className="text-[13px] md:text-[14px] font-bold tracking-widest text-[#00605A] mb-4">FOR SHOP OWNERS</p>
        <h1 className="text-[34px] md:text-[50px] lg:text-[60px] font-extrabold tracking-[-0.03em] leading-[1.06] max-w-[14ch] md:max-w-[20ch] mx-auto">
          A loyalty card on your customers’ phones.
        </h1>
        <p className="mt-5 text-[17px] md:text-[20px] text-[#556570]">
          Here is how it works. All of it for <span className="font-extrabold text-[#1A2B2A] whitespace-nowrap">$50 a month</span>.
        </p>

        <div className="mt-12 lg:mt-16 flex flex-col lg:flex-row items-center lg:items-stretch justify-center gap-5 lg:gap-6">
          {STEPS.map((s, i) => (
            <div key={s.title} className="contents">
              <div className="flex flex-col items-center">
                <div className="lg:h-[392px] flex items-center justify-center">{s.screen}</div>
                <div className="mt-6 flex items-center gap-2.5">
                  <span className="w-8 h-8 rounded-full bg-[#00605A] text-white text-[14px] font-extrabold flex items-center justify-center shrink-0">
                    {i + 1}
                  </span>
                  <h2 className="text-[21px] md:text-[23px] font-extrabold tracking-tight">{s.title}</h2>
                </div>
                <p className="mt-1.5 text-[14.5px] text-[#556570] max-w-[34ch] lg:max-w-[24ch] text-balance">{s.sub}</p>
              </div>
              {i < STEPS.length - 1 && (
                <div className="flex items-center justify-center lg:h-[392px] py-1 text-[#00605A]/45" aria-hidden>
                  <ArrowRight size={30} strokeWidth={2.5} className="hidden lg:block" />
                  <ArrowDown size={26} strokeWidth={2.5} className="lg:hidden" />
                </div>
              )}
            </div>
          ))}
        </div>

        {/* The price, right under the picture */}
        <div className="mt-14 lg:mt-16 rounded-[32px] bg-[#0B3B34] text-white px-6 py-10 lg:py-12">
          <p className="text-[30px] md:text-[44px] lg:text-[52px] font-extrabold tracking-[-0.03em] leading-[1.08]">
            All this for <span className="text-[#d4a843] whitespace-nowrap">$50 a month</span>.
          </p>
          <p className="mt-3 text-[15px] md:text-[17px] text-white/70">No contract. No hardware. No setup fee.</p>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <a
              href="#founding"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#d4a843] text-[#0C2E29] text-[14px] font-bold hover:bg-[#e0b95a] transition-colors"
            >
              Get your shop on Stampd <ArrowRight size={15} />
            </a>
            <Link
              to="/demo"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full border border-white/25 text-[14px] font-bold hover:bg-white/10 transition-colors"
            >
              Try the live demo
            </Link>
          </div>
        </div>
      </section>

      {/* ── What you get ── */}
      <section className="bg-white border-y border-black/5">
        <div className="w-[90%] max-w-[1200px] mx-auto py-16 lg:py-20 grid lg:grid-cols-[1fr_1.25fr] gap-10 lg:gap-16 items-center">
          <div>
            <p className="text-[13px] md:text-[14px] font-extrabold tracking-[0.18em] text-[#00605A] mb-4">WHAT YOU GET</p>
            <h2 className="text-[30px] md:text-[38px] lg:text-[44px] font-extrabold tracking-[-0.03em] leading-tight">
              One price.
              <br />
              Everything in it.
            </h2>
            <p className="mt-4 text-[15.5px] lg:text-[17px] text-[#556570] leading-relaxed max-w-md">
              The first 10 shops keep $50 a month for life. After that it is $75.
              We set your card up with you, and it is in the app the same day.
            </p>
          </div>
          <ul className="grid sm:grid-cols-2 gap-x-8 gap-y-3.5">
            {INCLUDED.map(item => (
              <li key={item} className="flex items-start gap-3 text-[15px] leading-snug">
                <span className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 bg-[#00605A]/10">
                  <Check size={12} className="text-[#00605A]" strokeWidth={3} />
                </span>
                {item}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ── Proof ── */}
      <section className="w-[90%] max-w-[1200px] mx-auto py-16 lg:py-20">
        <p className="text-[13px] md:text-[14px] font-extrabold tracking-[0.18em] text-[#00605A] mb-6 text-center">
          ALREADY WORKING IN GRAND BAHAMA
        </p>
        <div className="grid sm:grid-cols-3 gap-4 lg:gap-6">
          {PROOF.map(({ big, small }) => (
            <div key={big} className="rounded-3xl bg-white border border-black/5 p-7 text-center">
              <p className="text-[44px] lg:text-[56px] font-extrabold tracking-[-0.04em] leading-none text-[#00605A]" style={{ fontVariantNumeric: 'tabular-nums' }}>{big}</p>
              <p className="mt-3 text-[14.5px] text-[#556570] leading-snug">{small}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Start ── */}
      <section id="founding" className="bg-[#00605A] scroll-mt-16">
        <div className="w-[90%] max-w-[1200px] mx-auto py-16 lg:py-20 text-center flex flex-col items-center">
          <h2 className="text-[30px] md:text-[38px] lg:text-[44px] font-extrabold tracking-tight text-white mb-3">
            Get your shop on Stampd.
          </h2>
          <p className="text-[15px] lg:text-[17px] text-white/75 max-w-lg mx-auto mb-8">
            Call or message and we'll set up your card together. Or leave your
            details and someone from Stampd will reach out within a day.
          </p>
          <div className="flex flex-wrap justify-center items-center gap-3 mb-8">
            {whatsappHref ? (
              <a
                href={whatsappHref}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#F7F2E8] text-[#1A2B2A] text-[14px] font-bold hover:bg-white transition-colors"
              >
                <MessageCircle size={16} /> WhatsApp {PHONE_DISPLAY}
              </a>
            ) : (
              <span className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#F7F2E8] text-[#1A2B2A] text-[14px] font-bold select-all">
                Call or WhatsApp {PHONE_DISPLAY}
              </span>
            )}
          </div>
          <WaitlistForm audience="merchant" dark />
        </div>
      </section>

      <MarketingFooter />
    </div>
  )
}
