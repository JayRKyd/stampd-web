import { Link } from 'react-router-dom'
import { Apple, Play, ArrowRight } from 'lucide-react'
import {
  MarketingNav, MarketingFooter, MiniStampCard,
  MiniPinCard, MiniTicket, MiniNotification, MiniPinCells,
} from '@/components/marketing'
import { WaitlistForm } from '@/components/WaitlistForm'
import { APP_STORE_URL, PLAY_STORE_URL } from '@/lib/support'

const FAQS = [
  {
    q: 'Is Stampd free?',
    a: 'Completely free for customers, no subscription, no card required, ever. Merchants pay for the dashboard; you just collect the rewards.',
  },
  {
    q: 'What if my favourite spot isn\'t on Stampd yet?',
    a: 'Tell them about us! Any business, or independent pro, can join in about five minutes, and there\'s a free 90-day trial waiting for them.',
  },
  {
    q: 'Do I need internet at the counter?',
    a: 'Just your PIN. Even if the shop\'s wifi is down, the merchant can take your PIN and your stamp arrives when they\'re back online.',
  },
  {
    q: 'What happens if my barber moves shops?',
    a: 'Nothing changes, your card follows the person, not the chair. Pros on Stampd take their whole book of regulars with them wherever they work.',
  },
]

function StoreBadge({ icon: Icon, store, sub, href }: { icon: typeof Apple; store: string; sub: string; href?: string }) {
  const available = !!href
  const inner = (
    <>
      <Icon size={22} strokeWidth={1.5} />
      <span className="text-left leading-tight">
        <span className="block text-[10px] font-medium opacity-70">{available ? sub : 'Coming soon to'}</span>
        <span className="block text-[14px] font-bold">{store}</span>
      </span>
    </>
  )
  const cls = `flex items-center gap-2.5 px-5 py-2.5 rounded-xl transition-all ${
    available
      ? 'bg-[#1A2B2A] text-white hover:bg-black'
      : 'bg-[#1A2B2A]/10 text-[#1A2B2A]/60 cursor-default'
  }`
  return available
    ? <a href={href} target="_blank" rel="noopener noreferrer" className={cls}>{inner}</a>
    : <div className={cls}>{inner}</div>
}

export default function Landing() {
  return (
    <div className="min-h-dvh bg-[#F7F2E8] text-[#1A2B2A] overflow-x-hidden">
      <MarketingNav active="home" />

      {/* ── Hero ── */}
      <section className="w-[80%] max-w-[1600px] mx-auto pt-16 pb-20 lg:pt-24 lg:pb-28 grid lg:grid-cols-2 gap-14 items-center">
        <div>
          <h1 className="text-[44px] md:text-[64px] lg:text-[76px] xl:text-[88px] font-extrabold tracking-[-0.03em] leading-[1.02]">
            Full price?
            <br />
            <span className="text-[#c99a2e]">Every visit?</span>
          </h1>
          <p className="mt-6 text-[17px] md:text-[19px] lg:text-[20px] text-[#556570] leading-relaxed max-w-md lg:max-w-lg">
            Stampd turns your loyalty into free stuff at the local spots you already
            love. One PIN. Every shop. No punch cards.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <StoreBadge icon={Apple} store="App Store" sub="Download on the" href={APP_STORE_URL} />
            <StoreBadge icon={Play} store="Google Play" sub="Get it on" href={PLAY_STORE_URL} />
          </div>
          <p className="mt-6 text-[13px] text-[#74807E]">
            Free forever for customers · Starting in Grand Bahama
          </p>
        </div>

        {/* Real cards, wallet-style stack on phones, wide fan on desktop */}
        <div className="relative h-[420px] sm:h-[380px]" aria-hidden>
          <MiniStampCard
            className="absolute left-1/2 top-0 -translate-x-1/2 -rotate-3 sm:top-6 sm:-translate-x-[75%] sm:-rotate-6"
            name="The Donut Shoppe" category="Food & Dining" color="#6b2d4a"
            icon="donut" filled={4} total={8} reward="Free Donuts"
          />
          <MiniStampCard
            className="absolute left-1/2 top-[104px] -translate-x-1/2 rotate-2 sm:top-32 sm:-translate-x-[25%] sm:rotate-3"
            name="Marcus Brown" category="Barber · @ Magnificent Barbershop" color="#1e3a5f"
            icon="scissors" filled={6} total={8} reward="Free Haircut"
          />
          <MiniStampCard
            className="absolute left-1/2 top-[208px] -translate-x-1/2 -rotate-1 sm:top-60 sm:-translate-x-[60%] sm:-rotate-2"
            name="Tide & Tin Café" category="Coffee & Drinks" color="#00605a"
            icon="star" filled={9} total={10} reward="Free Coffee"
          />
        </div>
      </section>

      {/* ── Statement ── */}
      <section className="bg-white border-y border-black/5">
        <div className="w-[80%] max-w-[1400px] mx-auto py-20 lg:py-28">
          <p className="text-[34px] md:text-[48px] lg:text-[64px] xl:text-[72px] font-extrabold tracking-[-0.035em] leading-[1.08]">
            Paper punch cards get washed,
            <br className="hidden sm:block" />
            {' '}left in the truck, and{' '}
            <span className="text-[#c99a2e]">"lost"</span> by your cousin.
          </p>
          <p className="mt-6 text-[17px] lg:text-[19px] text-[#556570] max-w-lg leading-relaxed">
            Stampd keeps the count, so nobody else has to. Here's the whole system:
          </p>
        </div>
      </section>

      {/* ── One PIN ── */}
      <section id="how" className="w-[80%] max-w-[1600px] mx-auto py-20 lg:py-28 grid lg:grid-cols-2 gap-16 items-center">
        <div>
          <p className="text-[13px] md:text-[14px] font-extrabold tracking-[0.18em] text-[#00605A] mb-4">01 · YOUR PIN</p>
          <h2 className="text-[30px] md:text-[38px] lg:text-[44px] xl:text-[48px] font-extrabold tracking-[-0.03em] leading-tight mb-5">
            Six digits.
            <br />
            That's the whole system.
          </h2>
          <p className="text-[15.5px] lg:text-[17px] text-[#556570] leading-relaxed max-w-md lg:max-w-lg">
            Say your PIN when you pay, at the coffee spot, the deli truck, or your
            barber's chair. The cashier types it, your card fills itself. First
            time somewhere? That first stamp signs you up on the spot. No app
            fumbling in line, no wallet full of soggy cardboard.
          </p>
        </div>
        <div className="relative flex justify-center py-8" aria-hidden>
          <MiniPinCard className="-rotate-2" />
          <div className="absolute -bottom-2 left-1/2 -translate-x-[15%] bg-white rounded-2xl shadow-xl p-3 rotate-2">
            <MiniPinCells />
            <p className="text-[10px] text-[#74807E] font-medium mt-2 text-center">…as the cashier types it</p>
          </div>
        </div>
      </section>

      {/* ── Rewards ── */}
      <section className="bg-white border-y border-black/5">
        <div className="w-[80%] max-w-[1600px] mx-auto py-20 lg:py-28 grid lg:grid-cols-2 gap-16 items-center">
          <div className="relative flex justify-center py-6 order-last lg:order-first" aria-hidden>
            <div className="space-y-3">
              <MiniNotification
                initials="TT" color="#00605a" badge="stamp"
                title="Stamp at Tide & Tin Café" body="9 of 10, one more for Free Coffee"
                time="Tue" className="-rotate-1"
              />
              <MiniNotification
                initials="TT" color="#b8922e" badge="reward"
                title="Reward earned!" body="Your Free Coffee is ready to claim"
                time="now" className="rotate-1 translate-x-4"
              />
            </div>
            <MiniTicket className="absolute -bottom-10 -right-2 lg:right-6 rotate-6 hidden sm:block" />
          </div>
          <div>
            <p className="text-[13px] md:text-[14px] font-extrabold tracking-[0.18em] text-[#00605A] mb-4">02 · THE PAYOFF</p>
            <h2 className="text-[30px] md:text-[38px] lg:text-[44px] xl:text-[48px] font-extrabold tracking-[-0.03em] leading-tight mb-5">
              You don't chase the reward.
              <br />
              It chases you.
            </h2>
            <p className="text-[15.5px] lg:text-[17px] text-[#556570] leading-relaxed max-w-md lg:max-w-lg">
              Hit the last stamp and the voucher's on your phone before your
              change hits your hand. Show it at the counter, tear the ticket,
              enjoy. Nothing to print, nothing to remember, nothing to argue about.
            </p>
          </div>
        </div>
      </section>

      {/* ── Pros ── */}
      <section className="w-[80%] max-w-[1600px] mx-auto py-20 lg:py-24">
        <div className="rounded-[32px] bg-[#1e3a5f] text-white px-8 py-12 lg:px-14 lg:py-16 grid lg:grid-cols-2 gap-12 items-center overflow-hidden">
          <div>
            <p className="text-[13px] md:text-[14px] font-extrabold tracking-[0.18em] text-white/50 mb-4">03 · THE PROS</p>
            <h2 className="text-[28px] md:text-[36px] lg:text-[42px] xl:text-[46px] font-extrabold tracking-[-0.03em] leading-tight mb-5">
              The card follows the pro,
              <br />
              not the address.
            </h2>
            <p className="text-[15px] lg:text-[17px] text-white/70 leading-relaxed max-w-md lg:max-w-lg">
              When Marcus moves chairs, his card, and every regular on it, moves
              with him. Same for every braider, nail tech, and trainer on Stampd.
              Find yours under the <span className="font-bold text-white">Pros</span> tab.
            </p>
          </div>
          <div className="flex justify-center" aria-hidden>
            <MiniStampCard
              className="rotate-3 !shadow-2xl"
              name="Marcus Brown" category="Barber · @ Magnificent Barbershop" color="#1e3a5f"
              icon="scissors" filled={6} total={8} reward="Free Haircut"
            />
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="w-[80%] max-w-[900px] mx-auto py-20 lg:py-24">
        <p className="text-[13px] md:text-[14px] font-extrabold tracking-[0.18em] text-[#00605A] mb-4 text-center">BEFORE YOU ASK</p>
        <h2 className="text-[30px] md:text-[38px] lg:text-[42px] font-extrabold tracking-[-0.03em] text-center mb-10">Straight answers</h2>
        <div className="space-y-3">
          {FAQS.map(({ q, a }) => (
            <details key={q} className="group bg-white rounded-2xl border border-black/5 px-6 py-4 open:pb-5">
              <summary className="flex items-center justify-between cursor-pointer list-none text-[15px] font-bold tracking-tight">
                {q}
                <span className="text-[#74807E] transition-transform group-open:rotate-45 text-[20px] font-medium ml-4">+</span>
              </summary>
              <p className="mt-3 text-[14px] text-[#556570] leading-relaxed">{a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* ── Closing CTA / waitlist ── */}
      <section id="waitlist" className="bg-white border-t border-black/5 scroll-mt-16">
        <div className="w-[80%] max-w-[1100px] mx-auto py-20 lg:py-28 text-center flex flex-col items-center">
          <h2 className="text-[36px] md:text-[48px] lg:text-[64px] xl:text-[72px] font-extrabold tracking-[-0.035em] leading-[1.05]">
            Your favourite spots
            <br />
            <span className="text-[#c99a2e]">owe you one.</span>
          </h2>
          <p className="mt-5 text-[16px] lg:text-[18px] text-[#556570] max-w-md lg:max-w-lg mx-auto">
            Stampd is launching soon on Grand Bahama. Drop your email and we'll
            tell you the moment it's ready to download.
          </p>
          <div className="mt-8 w-full flex justify-center">
            <WaitlistForm audience="customer" />
          </div>
          <div className="mt-8 flex flex-wrap justify-center gap-3 opacity-70">
            <StoreBadge icon={Apple} store="App Store" sub="Download on the" href={APP_STORE_URL} />
            <StoreBadge icon={Play} store="Google Play" sub="Get it on" href={PLAY_STORE_URL} />
          </div>
        </div>
      </section>

      {/* Quiet path for the other audience */}
      <div className="border-t border-black/5">
        <Link
          to="/merchants"
          className="w-[80%] max-w-[1600px] mx-auto py-5 flex items-center justify-center gap-2 text-[13px] font-semibold text-[#74807E] hover:text-[#00605A] transition-colors"
        >
          Own a spot? Loyalty that runs itself <ArrowRight size={14} />
        </Link>
      </div>

      <MarketingFooter />
    </div>
  )
}
