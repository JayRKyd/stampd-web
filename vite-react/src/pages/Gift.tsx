import { useParams } from 'react-router-dom'
import { Gift as GiftIcon, Smartphone } from 'lucide-react'
import { APP_STORE_URL, PLAY_STORE_URL } from '@/lib/support'

// The link in a shared gift card message. Shows the code, points at the app.
export default function Gift() {
  const { code = '' } = useParams<{ code: string }>()
  const clean = code.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8)
  const pretty = clean.length > 4 ? `${clean.slice(0, 4)}-${clean.slice(4)}` : clean
  const deepLink = `stampd://gift/claim?code=${clean}`

  return (
    <div className="min-h-dvh bg-[#F7F2E8] text-[#1A2B2A] flex flex-col items-center px-6 py-14">
      <div className="w-full max-w-md">
        <div className="flex items-center gap-3 mb-10">
          <div className="w-10 h-10 rounded-xl bg-[#00605A] flex items-center justify-center"><GiftIcon size={20} className="text-[#F7F2E8]" /></div>
          <span className="text-[14px] font-extrabold tracking-[0.3em] text-[#0C2E29]">STAMPD</span>
        </div>

        <p className="text-[13px] font-bold tracking-widest text-[#00605A] mb-3">YOU'VE GOT A GIFT CARD</p>
        <h1 className="text-[34px] font-extrabold tracking-[-0.03em] leading-[1.08] mb-4">Someone sent you a gift card on Stampd.</h1>
        <p className="text-[15px] text-[#556570] leading-relaxed mb-8">
          Add it to the Stampd app and it's yours. Show your code at the counter and the shop takes it off your balance, one visit at a time.
        </p>

        {clean && (
          <div className="rounded-3xl bg-white border border-black/5 p-6 text-center mb-6">
            <p className="text-[11px] font-bold tracking-widest text-[#74807E] mb-2">YOUR CODE</p>
            <p className="text-[36px] font-extrabold tracking-[0.18em] text-[#0C2E29] font-mono select-all">{pretty}</p>
          </div>
        )}

        <div className="rounded-3xl bg-white border border-black/5 p-6 mb-6">
          <p className="text-[11px] font-bold tracking-widest text-[#00605A] mb-4">HOW TO ADD IT</p>
          <ol className="space-y-3 text-[14.5px] leading-relaxed">
            <li className="flex gap-3"><span className="w-6 h-6 rounded-full bg-[#00605A] text-white text-[12px] font-extrabold flex items-center justify-center shrink-0 mt-0.5">1</span>Get the Stampd app below and sign up. It takes a minute.</li>
            <li className="flex gap-3"><span className="w-6 h-6 rounded-full bg-[#00605A] text-white text-[12px] font-extrabold flex items-center justify-center shrink-0 mt-0.5">2</span>Open <b>Rewards</b> and tap <b>Have a gift card code?</b></li>
            <li className="flex gap-3"><span className="w-6 h-6 rounded-full bg-[#00605A] text-white text-[12px] font-extrabold flex items-center justify-center shrink-0 mt-0.5">3</span>Type the code. The card appears with your balance.</li>
          </ol>
        </div>

        <div className="flex flex-col gap-3">
          <a href={deepLink} className="h-12 rounded-full bg-[#00605A] text-white text-[14px] font-bold flex items-center justify-center gap-2 hover:bg-[#024D48]">
            <Smartphone size={16} /> Already have Stampd? Open it
          </a>
          <div className="grid grid-cols-2 gap-3">
            <a href={APP_STORE_URL} target="_blank" rel="noopener noreferrer" className="h-12 rounded-full border border-[#1A2B2A]/15 bg-white text-[14px] font-bold flex items-center justify-center hover:bg-[#F7F2E8]">App Store</a>
            <a href={PLAY_STORE_URL} target="_blank" rel="noopener noreferrer" className="h-12 rounded-full border border-[#1A2B2A]/15 bg-white text-[14px] font-bold flex items-center justify-center hover:bg-[#F7F2E8]">Google Play</a>
          </div>
        </div>

        <p className="mt-8 text-[12px] text-[#74807E] leading-relaxed">
          The shop that sold the card keeps the money and honours the balance. Stampd keeps the record. Questions about the card go to the shop.
        </p>
      </div>
    </div>
  )
}
