import { WifiOff, Check, ArrowRight, MessageCircle } from 'lucide-react'
import {
  MarketingNav, MarketingFooter, MiniStampCard, MiniPinCells, MiniNotification, MiniDashboard,
} from '@/components/marketing'
import { WaitlistForm } from '@/components/WaitlistForm'
import { whatsappHref } from '@/lib/support'

const PHONE_DISPLAY = '(242) 533-0878'

const STEPS = [
  {
    num: '01',
    title: 'Pick your reward',
    desc: 'Buy 9, get the 10th free. Or any reward you choose. We set up the card with you in about ten minutes, and it is live in the app the same day.',
  },
  {
    num: '02',
    title: 'Staff type the PIN',
    desc: 'Every customer has a 6-digit code in their app. A customer pays, your staff type the code on any phone or tablet. Stamped. First-timers join on that first stamp.',
  },
  {
    num: '03',
    title: 'Customers come back',
    desc: 'Their card fills on their phone, their reward shows up on their phone, and when they drift off, their phone reminds them. You do nothing extra.',
  },
]

const NETWORK = [
  'The Discover tab in the app lists every business on Stampd.',
  'Someone collecting stamps at the coffee shop sees your barbershop.',
  'Every new shop that joins makes your listing worth more.',
]

const PROOF = [
  { big: '500+', small: 'customers in our first month' },
  { big: '3 in 10', small: 'customers come back for repeat visits' },
  { big: '79', small: 'customers stamped at one shop in a single week' },
]

const INCLUDED = [
  'Unlimited stamps and customers',
  'Your card, your colors, your reward',
  'Staff accounts, so you know who stamped',
  'Reminders to customers who drift off',
  'Plain-language dashboard',
  'Offline stamping when the wifi drops',
  'Your shop in the Discover tab for every Stampd user',
]

export default function Merchants() {
  return (
    <div className="min-h-dvh bg-[#F7F2E8] text-[#1A2B2A] overflow-x-hidden">
      <MarketingNav active="merchants" />

      {/* ── Hero ── */}
      <section className="w-[80%] max-w-[1600px] mx-auto pt-16 pb-20 lg:pt-24 grid lg:grid-cols-2 gap-14 items-center">
        <div>
          <p className="text-[13px] md:text-[14px] font-bold tracking-widest text-[#00605A] mb-4">FOR SHOP OWNERS</p>
          <h1 className="text-[40px] md:text-[58px] lg:text-[72px] xl:text-[80px] font-extrabold tracking-[-0.03em] leading-[1.05]">
            Your loyalty card,
            <br />
            on their phone.
          </h1>
          <p className="mt-6 text-[17px] md:text-[19px] lg:text-[20px] text-[#556570] leading-relaxed max-w-md lg:max-w-lg">
            Stampd is one app that holds loyalty cards for local shops. Your
            customers carry your card in their pocket, your staff stamp it with a
            six-digit PIN, and Stampd brings people back for you.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <a
              href="#founding"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#00605A] text-white text-[14px] font-bold hover:bg-[#024D48] transition-colors"
            >
              Become a founding shop <ArrowRight size={15} />
            </a>
            <a
              href="#how"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full border border-[#1A2B2A]/15 text-[14px] font-bold hover:bg-white transition-colors"
            >
              How it works
            </a>
          </div>
          <p className="mt-4 text-[12.5px] text-[#74807E]">
            Live in Grand Bahama · Nassau this November · 10 founding spots at $50 a month, for life
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

      {/* ── How it works ── */}
      <section id="how" className="bg-white border-y border-black/5 scroll-mt-16">
        <div className="w-[80%] max-w-[1600px] mx-auto py-20 lg:py-28">
          <p className="text-[13px] md:text-[14px] font-extrabold tracking-[0.18em] text-[#00605A] mb-4">HOW IT WORKS</p>
          <h2 className="text-[30px] md:text-[38px] lg:text-[44px] xl:text-[48px] font-extrabold tracking-[-0.03em] leading-tight mb-12 max-w-[18ch]">
            Three steps. The third one runs itself.
          </h2>
          <div className="grid md:grid-cols-3 gap-10">
            {STEPS.map(({ num, title, desc }) => (
              <div key={num} className="rounded-3xl bg-[#F7F2E8] p-8">
                <p className="text-[14px] font-extrabold tracking-widest mb-3" style={{ color: 'rgba(0,96,90,0.5)' }}>{num}</p>
                <h3 className="text-[22px] font-extrabold tracking-tight mb-3">{title}</h3>
                <p className="text-[15px] text-[#556570] leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── The counter ── */}
      <section className="w-[80%] max-w-[1600px] mx-auto py-20 lg:py-28 grid lg:grid-cols-2 gap-16 items-center">
        <div>
          <p className="text-[13px] md:text-[14px] font-extrabold tracking-[0.18em] text-[#00605A] mb-4">AT THE COUNTER</p>
          <h2 className="text-[30px] md:text-[38px] lg:text-[44px] xl:text-[48px] font-extrabold tracking-[-0.03em] leading-tight mb-5">
            One tap per visit.
            <br />
            That's it.
          </h2>
          <p className="text-[15.5px] lg:text-[17px] text-[#556570] leading-relaxed max-w-md lg:max-w-lg">
            No scanner, no hardware, no training beyond one sentence. It runs on
            whatever is already at your counter: a phone, a tablet, the till. No
            cards to print, hand out, find, lose, or forge.
          </p>
        </div>
        <div className="flex justify-center" aria-hidden>
          <div className="bg-white rounded-3xl p-8 rotate-1 shadow-sm">
            <p className="text-[11px] font-semibold text-[#74807E] tracking-wider mb-3 text-center">CUSTOMER PIN</p>
            <MiniPinCells />
            <p className="text-[11px] text-[#74807E] mt-4 text-center">
              <span className="font-semibold text-[#1A2B2A]">Tania Rolle</span> · 7/10 stamps · stamped
            </p>
          </div>
        </div>
      </section>

      {/* ── Brings them back ── */}
      <section className="bg-white border-y border-black/5">
        <div className="w-[80%] max-w-[1600px] mx-auto py-20 lg:py-28 grid lg:grid-cols-2 gap-16 items-center">
          <div className="relative flex justify-center py-6 order-last lg:order-first" aria-hidden>
            <div className="space-y-3">
              <MiniNotification
                initials="YB" color="#00605a" badge="stamp"
                title="Stamp at Your Business" body="8 of 10. Two more for Your Reward."
                time="Tue" className="-rotate-1"
              />
              <MiniNotification
                initials="YB" color="#b8922e" badge="reward"
                title="It's been a while" body="You're close to a reward at Your Business. Stop by."
                time="now" className="rotate-1 translate-x-4"
              />
            </div>
          </div>
          <div>
            <p className="text-[13px] md:text-[14px] font-extrabold tracking-[0.18em] text-[#00605A] mb-4">WEEK THREE</p>
            <h2 className="text-[30px] md:text-[38px] lg:text-[44px] xl:text-[48px] font-extrabold tracking-[-0.03em] leading-tight mb-5">
              Stampd brings them
              <br />
              back for you.
            </h2>
            <p className="text-[15.5px] lg:text-[17px] text-[#556570] leading-relaxed max-w-md lg:max-w-lg">
              Kayla is two stamps from her reward, so she picks you over the shop
              next door. Marco hasn't visited in three weeks, so his phone reminds
              him. No texting customers yourself. It just happens.
            </p>
          </div>
        </div>
      </section>

      {/* ── The network ── */}
      <section className="w-[80%] max-w-[1600px] mx-auto py-20 lg:py-24">
        <div className="rounded-[32px] bg-[#0B3B34] text-white px-8 py-12 lg:px-14 lg:py-16 grid lg:grid-cols-2 gap-12 items-center overflow-hidden">
          <div>
            <p className="text-[13px] md:text-[14px] font-extrabold tracking-[0.18em] text-[#d4a843] mb-4">EVERY DAY</p>
            <h2 className="text-[28px] md:text-[36px] lg:text-[42px] xl:text-[46px] font-extrabold tracking-[-0.03em] leading-tight mb-5">
              Other shops' customers
              <br />
              find you.
            </h2>
            <p className="text-[15px] lg:text-[17px] text-white/70 leading-relaxed max-w-md lg:max-w-lg">
              This is the part a paper card can never do. Every Stampd user sees
              every shop on Stampd, so joining puts you in front of people who have
              never walked past your door.
            </p>
          </div>
          <ul className="space-y-3">
            {NETWORK.map(item => (
              <li key={item} className="flex items-start gap-3 rounded-2xl bg-white/[0.08] border border-white/10 px-5 py-4 text-[15px] leading-snug">
                <span className="w-6 h-6 rounded-full bg-[#d4a843] flex items-center justify-center shrink-0 mt-0.5">
                  <Check size={13} className="text-[#0C2E29]" strokeWidth={3} />
                </span>
                {item}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ── Proof ── */}
      <section className="bg-white border-y border-black/5">
        <div className="w-[80%] max-w-[1600px] mx-auto py-20 lg:py-24">
          <p className="text-[13px] md:text-[14px] font-extrabold tracking-[0.18em] text-[#00605A] mb-4">ALREADY WORKING</p>
          <h2 className="text-[30px] md:text-[38px] lg:text-[44px] font-extrabold tracking-[-0.03em] leading-tight mb-10 max-w-[20ch]">
            One month in Grand Bahama.
          </h2>
          <div className="grid sm:grid-cols-3 gap-6">
            {PROOF.map(({ big, small }) => (
              <div key={big} className="rounded-3xl bg-[#F7F2E8] p-8">
                <p className="text-[48px] lg:text-[60px] font-extrabold tracking-[-0.04em] leading-none text-[#00605A]" style={{ fontVariantNumeric: 'tabular-nums' }}>{big}</p>
                <p className="mt-3 text-[15px] text-[#556570] leading-snug">{small}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Dashboard + offline ── */}
      <section className="w-[80%] max-w-[1600px] mx-auto py-20 grid lg:grid-cols-2 gap-16 items-center">
        <div className="flex justify-center order-last lg:order-first" aria-hidden>
          <MiniDashboard className="-rotate-1" />
        </div>
        <div>
          <p className="text-[13px] md:text-[14px] font-extrabold tracking-[0.18em] text-[#00605A] mb-4">YOUR DASHBOARD</p>
          <h2 className="text-[30px] md:text-[38px] lg:text-[44px] font-extrabold tracking-[-0.03em] leading-tight mb-5">
            See it working.
          </h2>
          <p className="text-[15.5px] lg:text-[17px] text-[#556570] leading-relaxed max-w-md lg:max-w-lg mb-6">
            Who came in today, who is one stamp from a reward, which day of the week
            actually pays your rent. Plain words and real numbers.
          </p>
          <div className="rounded-2xl bg-[#1A2B2A] text-white p-6 flex gap-4 items-start max-w-lg">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
              <WifiOff size={18} strokeWidth={1.75} />
            </div>
            <div>
              <p className="text-[15px] font-extrabold tracking-tight mb-1">Island wifi? We planned for it.</p>
              <p className="text-[13.5px] text-white/70 leading-relaxed">
                Keep taking PINs when the connection drops. Stamps queue on your
                device and send themselves when you're back online.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Pricing ── */}
      <section className="bg-white border-y border-black/5">
        <div className="w-[80%] max-w-[1600px] mx-auto py-20 lg:py-24 grid lg:grid-cols-2 gap-10 items-start">
          <div>
            <p className="text-[13px] md:text-[14px] font-extrabold tracking-[0.18em] text-[#00605A] mb-4">THE FOUNDING OFFER</p>
            <h2 className="text-[30px] md:text-[38px] lg:text-[44px] xl:text-[48px] font-extrabold tracking-[-0.03em] leading-tight mb-5">
              10 founding shops.
              <br />
              $50 a month, for life.
            </h2>
            <p className="text-[15.5px] lg:text-[17px] text-[#556570] leading-relaxed max-w-md lg:max-w-lg">
              The first ten shops lock in $50 a month and never pay more, no matter
              what Stampd adds later. After the founding spots are gone, the price
              is $75 a month. No contract, no hardware, no setup fee.
            </p>
            <a
              href="#founding"
              className="mt-8 inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#00605A] text-white text-[14px] font-bold hover:bg-[#024D48] transition-colors"
            >
              Claim a founding spot <ArrowRight size={15} />
            </a>
          </div>
          <div className="rounded-3xl bg-[#F7F2E8] p-8 lg:p-10">
            <div className="flex items-baseline gap-2 mb-6">
              <span className="text-[44px] font-extrabold tracking-[-0.04em] text-[#00605A]">$50</span>
              <span className="text-[15px] text-[#556570]">a month · founding shops</span>
            </div>
            <ul className="space-y-3">
              {INCLUDED.map(item => (
                <li key={item} className="flex items-center gap-3 text-[14.5px] text-[#1A2B2A]">
                  <span className="w-5 h-5 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: 'rgba(0,96,90,0.12)' }}>
                    <Check size={12} className="text-[#00605A]" strokeWidth={3} />
                  </span>
                  {item}
                </li>
              ))}
            </ul>
            <p className="mt-6 text-[12.5px] text-[#74807E]">$75 a month once the ten founding spots are taken.</p>
          </div>
        </div>
      </section>

      {/* ── Founding CTA ── */}
      <section id="founding" className="bg-[#00605A] scroll-mt-16">
        <div className="w-[80%] max-w-[1600px] mx-auto py-16 lg:py-20 text-center flex flex-col items-center">
          <h2 className="text-[30px] md:text-[38px] lg:text-[44px] font-extrabold tracking-tight text-white mb-3">
            Become a founding shop.
          </h2>
          <p className="text-[15px] lg:text-[17px] text-white/75 max-w-lg mx-auto mb-8">
            Call or message and we'll set up your card together. Or leave your
            details and Jordy will reach out within a day.
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
