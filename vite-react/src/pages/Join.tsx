import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Check, Copy, Smartphone, Users } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

// The link in a staff invite. A shop owner sends it from the Stampd Business
// app; the staff member taps it on their phone. It shows whose invite it is,
// opens the app with the code filled in, and shows the code to type if the
// app isn't installed yet. The invite works once and runs out after 24 hours.

interface Preview { staff_name: string; business_name: string; logo_url: string | null }

export default function Join() {
  const { code = '' } = useParams<{ code: string }>()
  const clean = code.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8)
  const pretty = clean.length > 4 ? `${clean.slice(0, 4)}-${clean.slice(4)}` : clean
  const deepLink = `stampdbusiness://join?code=${clean}`
  const [preview, setPreview] = useState<Preview | null | 'missing'>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (clean.length !== 8) { setPreview('missing'); return }
    createClient().rpc('staff_invite_preview', { p_code: clean }).then(({ data }) => {
      setPreview(data?.ok ? (data as Preview) : 'missing')
    })
  }, [clean])

  const p = preview && preview !== 'missing' ? preview : null

  async function copy() {
    try {
      await navigator.clipboard.writeText(pretty)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch { /* the code is selectable on the page */ }
  }

  return (
    <div className="min-h-dvh bg-[#F7F2E8] text-[#1A2B2A] flex flex-col items-center px-6 py-12">
      <div className="w-full max-w-md">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-9 h-9 rounded-xl bg-[#024D48] flex items-center justify-center"><Users size={18} className="text-[#F7F2E8]" /></div>
          <span className="text-[13px] font-extrabold tracking-[0.3em] text-[#0C2E29]">STAMPD</span>
          <span className="text-[10px] font-extrabold tracking-[0.12em] text-[#024D48] bg-[#E9C766] rounded px-1.5 py-0.5">BUSINESS</span>
        </div>

        {preview === null && (
          <div className="flex justify-center py-16">
            <div className="w-6 h-6 border-2 border-[#00605A] border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {preview === 'missing' && (
          <>
            <h1 className="text-[28px] font-extrabold tracking-[-0.03em] leading-[1.15] mb-3">This invite doesn't work anymore.</h1>
            <p className="text-[14.5px] text-[#556570] leading-relaxed">
              An invite works once and runs out after 24 hours. Ask the shop owner to send you a new one from the Stampd Business app.
            </p>
          </>
        )}

        {p && (
          <>
            <p className="text-[12px] font-bold tracking-widest text-[#00605A] mb-3">YOU'VE BEEN INVITED</p>
            <h1 className="text-[28px] font-extrabold tracking-[-0.03em] leading-[1.15] mb-5">
              Work the counter at {p.business_name}.
            </h1>

            <div className="rounded-2xl bg-[#024D48] text-white p-5 flex items-center gap-4 mb-6">
              {p.logo_url
                ? <img src={p.logo_url} alt="" className="w-14 h-14 rounded-2xl bg-white object-cover shrink-0" />
                : <div className="w-14 h-14 rounded-2xl bg-white/15 flex items-center justify-center text-[18px] font-extrabold shrink-0">{p.business_name.slice(0, 2).toUpperCase()}</div>}
              <div className="min-w-0">
                <p className="text-[17px] font-extrabold leading-tight truncate">{p.business_name}</p>
                <p className="text-[13px] text-[#BFDAD6] mt-0.5">Joining as {p.staff_name}</p>
              </div>
            </div>

            <ol className="space-y-3 mb-6 text-[14.5px] text-[#556570] leading-relaxed list-none">
              <li><span className="font-bold text-[#1A2B2A]">1.</span> Install the <span className="font-bold text-[#1A2B2A]">Stampd Business</span> app on this phone.</li>
              <li><span className="font-bold text-[#1A2B2A]">2.</span> Tap the button below. The app opens with your invite filled in.</li>
              <li><span className="font-bold text-[#1A2B2A]">3.</span> Tap Join. No email or password needed.</li>
            </ol>

            <a href={deepLink} className="h-12 rounded-full bg-[#00605A] text-white text-[14px] font-bold flex items-center justify-center gap-2 hover:bg-[#024D48]">
              <Smartphone size={16} /> Open in Stampd Business
            </a>

            <div className="rounded-2xl bg-white border border-black/5 p-4 mt-6">
              <p className="text-[11px] font-bold tracking-widest text-[#74807E] mb-1.5">BUTTON DIDN'T OPEN THE APP?</p>
              <p className="text-[13px] text-[#556570] leading-relaxed mb-3">
                Open Stampd Business, tap <b>Staff invite</b>, and type this code:
              </p>
              <div className="flex items-center justify-between gap-3">
                <span className="font-mono text-[22px] font-extrabold tracking-[0.12em] text-[#0C2E29] select-all">{pretty}</span>
                <button onClick={copy} className="h-9 px-3 rounded-full border border-[#1A2B2A]/15 text-[12.5px] font-bold flex items-center gap-1.5 hover:bg-[#F7F2E8]">
                  {copied ? <><Check size={14} className="text-[#1E7A4C]" /> Copied</> : <><Copy size={14} /> Copy</>}
                </button>
              </div>
            </div>

            <p className="mt-8 text-[12px] text-[#74807E] leading-relaxed">
              This invite works once and runs out 24 hours after it was sent. You'll be able to stamp customers, handle gift cards and look customers up for {p.business_name}.
            </p>
          </>
        )}
      </div>
    </div>
  )
}
