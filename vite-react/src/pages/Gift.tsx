import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Gift as GiftIcon, Smartphone } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { APP_STORE_URL, PLAY_STORE_URL } from '@/lib/support'
import { GiftCardFace } from '@/components/GiftCardFace'

// The link in the gift card email or message. Shows the gift before anyone is
// asked to sign up, then points at the app.

interface Preview {
  business_name: string; logo_url: string | null; card_color: string
  for_name: string | null; from_name: string | null; note: string | null
  amount_cents: number; status: string; expires_at: string | null
}

const money = (cents: number) => `$${(cents / 100).toFixed(2)}`

export default function Gift() {
  const { code = '' } = useParams<{ code: string }>()
  const clean = code.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8)
  const pretty = clean.length > 4 ? `${clean.slice(0, 4)}-${clean.slice(4)}` : clean
  const deepLink = `stampd://g/${clean}`
  const [preview, setPreview] = useState<Preview | null | 'missing'>(null)

  useEffect(() => {
    if (clean.length !== 8) { setPreview('missing'); return }
    createClient().rpc('gift_card_preview', { p_code: clean }).then(({ data }) => {
      setPreview(data?.ok ? (data as Preview) : 'missing')
    })
  }, [clean])

  const p = preview && preview !== 'missing' ? preview : null
  const claimed = p ? p.status !== 'unclaimed' : false
  const title = p
    ? claimed
      ? 'This gift card has already been added.'
      : `${money(p.amount_cents)} at ${p.business_name}, waiting for you.`
    : 'Someone sent you a gift card on Stampd.'

  return (
    <div className="min-h-dvh bg-[#F7F2E8] text-[#1A2B2A] flex flex-col items-center px-6 py-12">
      <div className="w-full max-w-md">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-9 h-9 rounded-xl bg-[#00605A] flex items-center justify-center"><GiftIcon size={18} className="text-[#F7F2E8]" /></div>
          <span className="text-[13px] font-extrabold tracking-[0.3em] text-[#0C2E29]">STAMPD</span>
        </div>

        <p className="text-[12px] font-bold tracking-widest text-[#00605A] mb-3">
          {p?.from_name ? `${p.from_name.toUpperCase()} SENT YOU A GIFT CARD` : "YOU'VE GOT A GIFT CARD"}
        </p>
        <h1 className="text-[30px] font-extrabold tracking-[-0.03em] leading-[1.1] mb-5">{title}</h1>

        {p && (
          <GiftCardFace
            className="mb-5"
            businessName={p.business_name} logoUrl={p.logo_url} color={p.card_color}
            amountCents={p.amount_cents} forName={p.for_name} fromName={p.from_name} note={p.note}
          />
        )}

        {!claimed && (
          <p className="text-[14.5px] text-[#556570] leading-relaxed mb-6">
            Add it to the Stampd app to use it. Show your code at the counter and {p?.business_name ?? 'the shop'} takes it off your balance, a bit at a time.
          </p>
        )}

        {!claimed && (
          <div className="flex flex-col gap-3">
            <a href={deepLink} className="h-12 rounded-full bg-[#00605A] text-white text-[14px] font-bold flex items-center justify-center gap-2 hover:bg-[#024D48]">
              <Smartphone size={16} /> Open in Stampd
            </a>
            <div className="grid grid-cols-2 gap-3">
              <a href={APP_STORE_URL} target="_blank" rel="noopener noreferrer" className="h-12 rounded-full border border-[#1A2B2A]/15 bg-white text-[14px] font-bold flex items-center justify-center hover:bg-[#F7F2E8]">App Store</a>
              <a href={PLAY_STORE_URL} target="_blank" rel="noopener noreferrer" className="h-12 rounded-full border border-[#1A2B2A]/15 bg-white text-[14px] font-bold flex items-center justify-center hover:bg-[#F7F2E8]">Google Play</a>
            </div>
          </div>
        )}

        {!claimed && clean && (
          <div className="rounded-2xl bg-white border border-black/5 p-4 mt-6">
            <p className="text-[11px] font-bold tracking-widest text-[#74807E] mb-1.5">NEW TO STAMPD?</p>
            <p className="text-[13px] text-[#556570] leading-relaxed">
              Get the app, sign up, then open <b>Rewards</b> and tap <b>Have a gift card code?</b> Your code is{' '}
              <span className="font-mono font-extrabold text-[#0C2E29] select-all">{pretty}</span>.
            </p>
          </div>
        )}

        {preview === 'missing' && (
          <p className="text-[13px] text-[#74807E] mt-2">We couldn't find a gift card for this link. Check the code in your message, or ask the shop that sold it.</p>
        )}

        <p className="mt-8 text-[12px] text-[#74807E] leading-relaxed">
          The shop that sold the card keeps the money and honours the balance. Stampd keeps the record. Questions about the card go to the shop.
        </p>
      </div>
    </div>
  )
}
