import { useState } from 'react'
import { ArrowRight, Check, Printer, MessageCircle, HelpCircle, User } from 'lucide-react'

const MONTHLY = 50
const PER_DAY = (MONTHLY / 30.4).toFixed(2)

// Fifty first-time customers; 3 in 10 come back; 5 of those cover the fee.
const PROOF_DOTS = Array.from({ length: 50 }, (_, i) => (i < 5 ? 'need' : i < 15 ? 'back' : 'new'))

const REPLACES = [
  { icon: Printer, title: 'Printing punch cards', desc: 'Printed, handed out, lost, reprinted. Every month.' },
  { icon: MessageCircle, title: 'A texting tool', desc: "And the spreadsheet of numbers you'd need to use it." },
  { icon: HelpCircle, title: 'Guessing', desc: 'Who your regulars are. Who stopped coming. Which day pays the rent.' },
]

export function FiftyDollars() {
  const [sale, setSale] = useState(12)
  const visits = Math.ceil(MONTHLY / sale)

  return (
    <section className="w-[80%] max-w-[1600px] mx-auto py-20 lg:py-24 flex flex-col gap-8">
      <div>
        <p className="text-[13px] md:text-[14px] font-extrabold tracking-[0.18em] text-[#00605A] mb-4">WHAT $50 A MONTH BUYS</p>
        <h2 className="text-[30px] md:text-[38px] lg:text-[44px] xl:text-[48px] font-extrabold tracking-[-0.03em] leading-tight max-w-[16ch]">
          Five extra visits pays for it.
        </h2>
        <p className="mt-4 text-[15.5px] lg:text-[17px] text-[#556570] leading-relaxed max-w-lg">
          Stampd costs $50 a month. Here is what that is in your numbers, not ours.
        </p>
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        {/* Per day */}
        <div className="rounded-3xl bg-[#00605A] text-[#F7F2E8] p-7 lg:p-8 flex flex-col gap-4">
          <p className="text-[12px] font-extrabold tracking-[0.16em] text-[#F7F2E8]/70">PER DAY</p>
          <p className="text-[64px] lg:text-[84px] font-extrabold tracking-[-0.04em] leading-[0.95]" style={{ fontVariantNumeric: 'tabular-nums' }}>
            ${PER_DAY}<span className="text-[22px] font-bold tracking-tight ml-2">a day</span>
          </p>
          <p className="text-[17px] text-[#F7F2E8]/85 max-w-[28ch]">Less than one smoothie. Less than one coffee. One stamp-earning sale covers it.</p>
          <div className="grid grid-cols-[repeat(15,minmax(0,1fr))] gap-[5px] mt-1" aria-hidden>
            {Array.from({ length: 30 }, (_, i) => (
              <span key={i} className={`block aspect-square rounded-[4px] ${i === 0 ? 'bg-[#F7F2E8]' : 'bg-[#F7F2E8]/20'}`} />
            ))}
          </div>
          <p className="text-[12.5px] text-[#F7F2E8]/70">30 days. One of them pays for the lot.</p>
        </div>

        {/* Break-even */}
        <div className="rounded-3xl bg-white border border-black/5 p-7 lg:p-8 flex flex-col gap-5">
          <p className="text-[12px] font-extrabold tracking-[0.16em] text-[#74807E]">BREAK-EVEN</p>
          <div className="flex items-center gap-4">
            <label htmlFor="avg-sale" className="text-[14px] font-bold whitespace-nowrap">Your average sale</label>
            <input
              id="avg-sale"
              type="range"
              min={5}
              max={50}
              step={1}
              value={sale}
              onChange={(e) => setSale(Number(e.target.value))}
              className="flex-1 min-w-0 h-7 accent-[#00605A]"
              aria-describedby="break-even-answer"
            />
            <span className="text-[22px] font-extrabold tracking-tight min-w-[3.2ch] text-right" style={{ fontVariantNumeric: 'tabular-nums' }}>${sale}</span>
          </div>
          <p id="break-even-answer" className="text-[24px] lg:text-[30px] font-extrabold tracking-[-0.025em] leading-[1.15]">
            If Stampd brings back <span className="text-[#00605A]">{visits} {visits === 1 ? 'customer' : 'customers'}</span> for one extra visit this month, it has paid for itself.
          </p>
          <div className="flex flex-wrap gap-2" aria-hidden>
            {Array.from({ length: 10 }, (_, i) => (
              <span
                key={i}
                className={`w-11 h-11 rounded-full flex items-center justify-center transition-colors ${
                  i < visits ? 'bg-[#00605A] text-[#F7F2E8]' : 'bg-[#F7F2E8] border-2 border-dashed border-[#E8E0CD] text-[#1A2B2A]/35'
                }`}
              >
                <User size={20} strokeWidth={2.2} />
              </span>
            ))}
          </div>
          <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1" style={{ fontVariantNumeric: 'tabular-nums' }} aria-live="polite">
            <span className="text-[26px] font-extrabold tracking-tight">${sale}</span>
            <span className="text-[18px] font-semibold text-[#74807E]">×</span>
            <span className="text-[26px] font-extrabold tracking-tight">{visits} {visits === 1 ? 'visit' : 'visits'}</span>
            <span className="text-[18px] font-semibold text-[#74807E]">=</span>
            <span className="text-[26px] font-extrabold tracking-tight">${visits * sale}</span>
            <span className="ml-auto inline-flex items-center gap-1.5 h-[30px] px-3 rounded-full bg-[#00605A]/10 text-[#00605A] text-[13px] font-extrabold">
              <Check size={14} strokeWidth={3} /> Covers $50
            </span>
          </div>
          <p className="text-[13px] text-[#74807E]">Everything after that is yours. Move the slider to your own ticket size.</p>
        </div>
      </div>

      {/* What it replaces */}
      <div>
        <p className="text-[12px] font-extrabold tracking-[0.16em] text-[#74807E] mb-3">WHAT IT REPLACES</p>
        <div className="grid sm:grid-cols-3 gap-4">
          {REPLACES.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="rounded-3xl bg-white border border-black/5 p-6 flex flex-col gap-3">
              <span className="relative w-12 h-12 rounded-2xl bg-[#00605A]/10 flex items-center justify-center">
                <Icon size={24} className="text-[#00605A]" strokeWidth={2} />
                <span className="absolute left-2.5 right-2.5 top-1/2 h-[3px] bg-[#c99a2e] rounded-full -rotate-[35deg]" aria-hidden />
              </span>
              <h3 className="text-[17px] font-extrabold tracking-tight">{title}</h3>
              <p className="text-[14px] text-[#556570]">{desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Proof as dots */}
      <div className="rounded-3xl bg-white border border-black/5 p-7 lg:p-8 flex flex-col gap-4">
        <p className="text-[12px] font-extrabold tracking-[0.16em] text-[#74807E]">AT THE RATE WE'RE SEEING</p>
        <p className="text-[20px] lg:text-[26px] font-extrabold tracking-[-0.025em] leading-[1.2] max-w-[34ch]">
          Stamp <span className="text-[#00605A]">50</span> first-time customers this month. At 3 in 10, <span className="text-[#00605A]">15</span> come back. You needed <span className="text-[#00605A]">5</span>.
        </p>
        <div className="grid grid-cols-10 gap-[7px] max-w-[520px]" aria-hidden>
          {PROOF_DOTS.map((kind, i) => (
            <span
              key={i}
              className={`block aspect-square rounded-full ${
                kind === 'need' ? 'bg-[#00605A] ring-[3px] ring-[#c99a2e]' : kind === 'back' ? 'bg-[#00605A]' : 'bg-[#E8E0CD]'
              }`}
            />
          ))}
        </div>
        <div className="flex flex-wrap gap-x-5 gap-y-2 text-[13.5px] text-[#556570]">
          <span className="inline-flex items-center gap-2"><i className="w-3 h-3 rounded-full bg-[#E8E0CD]" />First-time customer</span>
          <span className="inline-flex items-center gap-2"><i className="w-3 h-3 rounded-full bg-[#00605A]" />Comes back (3 in 10, Grand Bahama, month one)</span>
          <span className="inline-flex items-center gap-2"><i className="w-3 h-3 rounded-full bg-[#00605A] ring-2 ring-[#c99a2e]" />Enough to cover $50</span>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <a
          href="#founding"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#00605A] text-white text-[14px] font-bold hover:bg-[#024D48] transition-colors"
        >
          Claim a founding spot <ArrowRight size={15} />
        </a>
        <span className="text-[13.5px] text-[#74807E]">10 founding shops at $50 a month, for life. $75 after.</span>
      </div>
    </section>
  )
}
