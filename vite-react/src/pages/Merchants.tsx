import { WifiOff, Check, ArrowRight, MessageCircle, X } from 'lucide-react'
import {
  MarketingNav, MarketingFooter, MiniStampCard, MiniPinCells, MiniNotification, MiniDashboard,
} from '@/components/marketing'
import { WaitlistForm } from '@/components/WaitlistForm'
import { FiftyDollars } from '@/components/FiftyDollars'
import { whatsappHref } from '@/lib/support'

const PHONE_DISPLAY = '(242) 533-0878'

// The page reads like a conversation at the counter: what goes wrong at most
// shops, then what Stampd does about each one, in the same order.
const PROBLEMS = [
  {
    title: 'They come once and forget.',
    body:
      "Someone comes in, likes it, and you don't see them again for two months. Nothing went wrong. Life got busy and you slipped their mind. That's the customer you lose the most of, and you never even know it happened.",
  },
  {
    title: 'Your specials reach strangers.',
    body:
      "When you run a sale, you post it on Facebook and Instagram. The people who see it are mostly people who've never been in. Your regulars, the ones who would actually come down, scroll past it or never see it at all.",
  },
  {
    title: 'You know your regulars by face, not by phone.',
    body:
      "You've got people who've been coming for years. But you have no list, no numbers, and no way to say \"come by today.\" The customers who like you most are the ones you can't reach.",
  },
]

const SOLUTIONS = [
  {
    title: 'Every visit earns a stamp.',
    body:
      "The card is on their phone, so it's never lost or left at home. Watching it fill up is the reason they pick you over the place next door when they can't decide. Fill the card, get the reward, start again.",
  },
  {
    title: 'Post a special once and the right people see it.',
    body:
      "When you've got something on, you type one line in your dashboard and add a flyer if you have one. It lands on your regulars' phones. It also goes on the island board in the app, where everyone else sees what you've got.",
  },
  {
    title: "Your regulars are on a list you didn't have to build.",
    body:
      "Everyone who's ever earned a stamp from you is there. No sign-up sheet, no collecting numbers. The more you stamp, the bigger it gets.",
  },
]

const ADS = [
  'Finds people who have never been in',
  'You pay again every time you post',
  'Your regulars scroll past it',
  'Nothing brings them back after',
]

const STAMPD = [
  "Reaches people who've already paid you",
  'One flat price, post as often as you like',
  "Lands on your regulars' phones first",
  'Every visit after that earns a stamp',
]

const NETWORK = [
  'The Discover tab in the app lists every business on Stampd.',
  'Someone collecting stamps at the coffee shop sees your barbershop.',
  "Anything you post goes on the island board under Today, where everyone looks.",
]

const PROOF = [
  { big: '600+', small: 'customers in Grand Bahama already carrying cards' },
  { big: '3 in 10', small: 'customers come back for repeat visits' },
  { big: '79', small: 'customers stamped at one shop in a single week' },
]

const INCLUDED = [
  'Unlimited stamps and customers',
  'Your card, your colors, your reward',
  'Post specials and updates to your regulars',
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
          <h1 className="text-[36px] md:text-[50px] lg:text-[58px] xl:text-[66px] font-extrabold tracking-[-0.03em] leading-[1.06]">
            Your customers already like you.
            <br />
            Stampd brings them back more often.
          </h1>
          <p className="mt-6 text-[17px] md:text-[19px] lg:text-[20px] text-[#556570] leading-relaxed max-w-md lg:max-w-lg">
            A loyalty card that lives on their phone, and a way to tell them
            what's on today. Fifty dollars a month. Nothing extra to spend on ads.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <a
              href="#founding"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#00605A] text-white text-[14px] font-bold hover:bg-[#024D48] transition-colors"
            >
              Become a founding shop <ArrowRight size={15} />
            </a>
            <a
              href="#problems"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full border border-[#1A2B2A]/15 text-[14px] font-bold hover:bg-white transition-colors"
            >
              See how it helps
            </a>
          </div>
          <p className="mt-4 text-[12.5px] text-[#74807E]">
            Live in Grand Bahama · Nassau this November · 10 founding spots at $50 a month, for life
          </p>
        </div>

        {/* Their card and a post, as customers see them */}
        <div className="relative flex justify-center" aria-hidden>
          <div className="relative">
            <MiniStampCard
              className="rotate-2"
              name="Your Business" category="Your Category" color="#00605a"
              icon="star" filled={7} total={10} reward="Your Reward"
            />
            <MiniNotification
              initials="YB" color="#00605a" badge="stamp"
              title="Your Business" body="Half price until 3pm. Stop by!"
              time="now" className="-rotate-1 -mt-3 translate-x-4 relative z-10"
            />
            <p className="mt-5 text-center text-[12px] text-[#74807E]">
              Your card and your post, exactly as customers see them
            </p>
          </div>
        </div>
      </section>

      {/* ── The problems ── */}
      <section id="problems" className="bg-white border-y border-black/5 scroll-mt-16">
        <div className="w-[80%] max-w-[1600px] mx-auto py-20 lg:py-24">
          <p className="text-[13px] md:text-[14px] font-extrabold tracking-[0.18em] text-[#00605A] mb-4">THE PROBLEM</p>
          <h2 className="text-[30px] md:text-[38px] lg:text-[44px] xl:text-[48px] font-extrabold tracking-[-0.03em] leading-tight max-w-[18ch]">
            Here's what happens at most shops.
          </h2>
          <p className="mt-4 text-[15.5px] lg:text-[17px] text-[#556570] leading-relaxed max-w-lg">
            None of this is your fault. It's just how it goes when the only way
            to reach customers is to hope they walk past.
          </p>
          <div className="mt-12 grid lg:grid-cols-3 gap-6">
            {PROBLEMS.map((p, i) => (
              <div key={p.title} className="rounded-3xl bg-[#F7F2E8] p-7 lg:p-8 flex flex-col gap-3">
                <p className="text-[13px] font-extrabold tracking-widest text-[#74807E]">0{i + 1}</p>
                <h3 className="text-[22px] lg:text-[24px] font-extrabold tracking-tight leading-snug">{p.title}</h3>
                <p className="text-[15px] lg:text-[16px] text-[#556570] leading-relaxed">{p.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── The solutions, same order ── */}
      <section className="w-[80%] max-w-[1600px] mx-auto py-20 lg:py-24">
        <p className="text-[13px] md:text-[14px] font-extrabold tracking-[0.18em] text-[#00605A] mb-4">WHAT STAMPD DOES ABOUT IT</p>
        <h2 className="text-[30px] md:text-[38px] lg:text-[44px] xl:text-[48px] font-extrabold tracking-[-0.03em] leading-tight max-w-[18ch]">
          One app. Three things fixed.
        </h2>
        <p className="mt-4 text-[15.5px] lg:text-[17px] text-[#556570] leading-relaxed max-w-lg">
          Same three problems, in the same order. Your customers download one
          app, and everything below happens inside it.
        </p>
        <div className="mt-12 grid lg:grid-cols-3 gap-6">
          {SOLUTIONS.map((s, i) => (
            <div key={s.title} className="rounded-3xl bg-white border border-black/5 p-7 lg:p-8 flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <span className="w-7 h-7 rounded-full bg-[#00605A] flex items-center justify-center shrink-0">
                  <Check size={14} className="text-white" strokeWidth={3} />
                </span>
                <p className="text-[13px] font-extrabold tracking-widest text-[#00605A]">FIXES 0{i + 1}</p>
              </div>
              <h3 className="text-[22px] lg:text-[24px] font-extrabold tracking-tight leading-snug">{s.title}</h3>
              <p className="text-[15px] lg:text-[16px] text-[#556570] leading-relaxed">{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── How it works: three steps, each shown with the real thing ── */}
      <section id="how" className="bg-white border-y border-black/5 scroll-mt-16">
        <div className="w-[80%] max-w-[1600px] mx-auto py-20 lg:py-24">
          <p className="text-[13px] md:text-[14px] font-extrabold tracking-[0.18em] text-[#00605A] mb-4">HOW IT WORKS</p>
          <h2 className="text-[30px] md:text-[38px] lg:text-[44px] xl:text-[48px] font-extrabold tracking-[-0.03em] leading-tight max-w-[20ch]">
            You get a card. They get a PIN. You stamp it when they pay.
          </h2>
          <div className="mt-12 grid lg:grid-cols-3 gap-6">
            {/* 1 · Your card */}
            <div className="rounded-3xl bg-[#F7F2E8] p-7 flex flex-col gap-5">
              <div>
                <p className="text-[13px] font-extrabold tracking-widest text-[#00605A]/60 mb-2">01</p>
                <h3 className="text-[22px] font-extrabold tracking-tight">We set up your card with you.</h3>
                <p className="mt-2 text-[15px] text-[#556570] leading-relaxed">
                  You pick the reward. Buy 9 get the 10th free, a free cut after 7, whatever fits your shop. It takes about ten minutes and your card is in the app the same day.
                </p>
              </div>
              <div className="flex justify-center py-2" aria-hidden>
                <MiniStampCard
                  className="rotate-1 scale-[0.92] origin-center"
                  name="Your Business" category="Your Category" color="#00605a"
                  icon="star" filled={7} total={10} reward="Your Reward"
                />
              </div>
              <p className="text-[12.5px] text-[#74807E] text-center">Your card, exactly as customers carry it</p>
            </div>

            {/* 2 · The counter */}
            <div className="rounded-3xl bg-[#F7F2E8] p-7 flex flex-col gap-5">
              <div>
                <p className="text-[13px] font-extrabold tracking-widest text-[#00605A]/60 mb-2">02</p>
                <h3 className="text-[22px] font-extrabold tracking-tight">Customers say their PIN when they pay.</h3>
                <p className="mt-2 text-[15px] text-[#556570] leading-relaxed">
                  Every customer has a six-digit code in the app. Your staff type it on any phone or tablet and the stamp is on. No scanner, no hardware, no paper cards to lose.
                </p>
              </div>
              <div className="flex justify-center py-2" aria-hidden>
                <div className="bg-white rounded-3xl p-6 -rotate-1">
                  <p className="text-[11px] font-semibold text-[#74807E] tracking-wider mb-3 text-center">CUSTOMER PIN</p>
                  <MiniPinCells />
                  <p className="text-[11px] text-[#74807E] mt-4 text-center">
                    <span className="font-semibold text-[#1A2B2A]">Tania Rolle</span> · 7/10 stamps · stamped
                  </p>
                </div>
              </div>
              <p className="text-[12.5px] text-[#74807E] text-center">First-timers join on their first stamp</p>
            </div>

            {/* 3 · They come back */}
            <div className="rounded-3xl bg-[#F7F2E8] p-7 flex flex-col gap-5">
              <div>
                <p className="text-[13px] font-extrabold tracking-widest text-[#00605A]/60 mb-2">03</p>
                <h3 className="text-[22px] font-extrabold tracking-tight">Their phone does the reminding.</h3>
                <p className="mt-2 text-[15px] text-[#556570] leading-relaxed">
                  Kayla is two stamps from her reward, so she picks you. Marco hasn't been in three weeks, so his phone nudges him. You post a special, and both of them see it. You text nobody.
                </p>
              </div>
              <div className="flex justify-center py-2" aria-hidden>
                <div className="space-y-3 scale-[0.92] origin-center">
                  <MiniNotification
                    initials="YB" color="#00605a" badge="stamp"
                    title="Stamp at Your Business" body="8 of 10. Two more for Your Reward."
                    time="Tue" className="-rotate-1"
                  />
                  <MiniNotification
                    initials="YB" color="#b8922e" badge="reward"
                    title="It's been a while" body="You're close to a reward at Your Business. Stop by."
                    time="now" className="rotate-1 translate-x-3"
                  />
                </div>
              </div>
              <p className="text-[12.5px] text-[#74807E] text-center">Reminders go out on their own</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Versus ads ── */}
      <section className="w-[80%] max-w-[1600px] mx-auto py-20 lg:py-24">
        <p className="text-[13px] md:text-[14px] font-extrabold tracking-[0.18em] text-[#00605A] mb-4">WHAT ABOUT FACEBOOK ADS?</p>
        <h2 className="text-[30px] md:text-[38px] lg:text-[44px] xl:text-[48px] font-extrabold tracking-[-0.03em] leading-tight max-w-[20ch]">
          Ads find new people. Stampd brings back the ones you have.
        </h2>
        <p className="mt-4 text-[15.5px] lg:text-[17px] text-[#556570] leading-relaxed max-w-xl">
          Both have a place. But only one of them is talking to customers who
          already know your name, and that's the cheaper visit to win.
        </p>
        <div className="mt-12 grid md:grid-cols-2 gap-6">
          <div className="rounded-3xl bg-white border border-black/5 p-7 lg:p-8">
            <p className="text-[12px] font-extrabold tracking-[0.16em] text-[#74807E] mb-5">FACEBOOK AND INSTAGRAM ADS</p>
            <ul className="space-y-3">
              {ADS.map(item => (
                <li key={item} className="flex items-start gap-3 text-[15.5px] leading-snug text-[#556570]">
                  <span className="w-6 h-6 rounded-full bg-[#F7F2E8] flex items-center justify-center shrink-0 mt-0.5">
                    <X size={13} className="text-[#74807E]" strokeWidth={3} />
                  </span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-3xl bg-[#00605A] text-[#F7F2E8] p-7 lg:p-8">
            <p className="text-[12px] font-extrabold tracking-[0.16em] text-[#F7F2E8]/70 mb-5">STAMPD</p>
            <ul className="space-y-3">
              {STAMPD.map(item => (
                <li key={item} className="flex items-start gap-3 text-[15.5px] leading-snug">
                  <span className="w-6 h-6 rounded-full bg-[#d4a843] flex items-center justify-center shrink-0 mt-0.5">
                    <Check size={13} className="text-[#0C2E29]" strokeWidth={3} />
                  </span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* ── What $50 buys ── */}
      <div className="bg-white border-y border-black/5">
        <FiftyDollars />
      </div>

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
            Already happening in Grand Bahama.
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
            actually pays your rent, and how many people came in after your last post.
            Plain words and real numbers.
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
