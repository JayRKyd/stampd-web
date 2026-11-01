import { money } from '@/lib/giftCards'

// The gift card as it looks everywhere on the web: the shop's colour, a gold
// ribbon across the top corner, the amount, who it's for and from, the note.
// Mirrors components/GiftCardFace.tsx in the app.

export function GiftCardFace({
  businessName, logoUrl, color, amountCents, amountNote, forName, fromName, note, className = '',
}: {
  businessName: string; logoUrl: string | null; color: string; amountCents: number; amountNote?: string
  forName?: string | null; fromName?: string | null; note?: string | null; className?: string
}) {
  const who = [forName ? `FOR ${forName.toUpperCase()}` : null, fromName ? `FROM ${fromName.toUpperCase()}` : null].filter(Boolean).join(' · ')
  return (
    <div
      className={`relative overflow-hidden rounded-[22px] text-white shadow-[0_14px_30px_rgba(0,0,0,0.28)] ${className}`}
      style={{ background: `linear-gradient(135deg, ${color} 0%, ${shade(color, 0.72)} 100%)`, aspectRatio: '1 / 0.68' }}
    >
      <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse 70% 60% at 100% 0%, rgba(212,168,67,0.26) 0%, rgba(212,168,67,0) 70%)' }} />
      <div
        className="absolute flex items-center justify-center text-[#0C2E29] text-[11px] font-extrabold tracking-[3px] shadow-[0_4px_8px_rgba(0,0,0,0.25)]"
        style={{ top: 22, right: -48, width: 180, height: 26, transform: 'rotate(45deg)', background: 'linear-gradient(135deg, #e9cd74, #d4a843 55%, #c09a35)' }}
      >GIFT</div>

      <div className="relative flex h-full flex-col p-[18px]">
        <div className="flex items-center gap-2.5 pr-14">
          <div className="w-[38px] h-[38px] rounded-[11px] bg-[#F7F2E8] flex items-center justify-center overflow-hidden shrink-0">
            {logoUrl
              ? <img src={logoUrl} alt="" className="w-full h-full object-contain p-1" />
              : <span className="text-[13px] font-extrabold" style={{ color }}>{businessName.slice(0, 2).toUpperCase()}</span>}
          </div>
          <div className="min-w-0">
            <p className="text-[15px] font-extrabold truncate leading-tight">{businessName}</p>
            <p className="text-[11px] text-white/70">Gift card</p>
          </div>
        </div>

        <p className="text-[40px] font-extrabold tracking-[-1.5px] leading-none mt-3.5">{money(amountCents)}</p>
        {amountNote && <p className="text-[11px] font-semibold text-white/70 mt-0.5">{amountNote}</p>}
        {who && <p className="text-[10px] font-bold tracking-[1px] text-white/80 mt-1.5 truncate">{who}</p>}

        {note && (
          <div className="flex gap-2.5 mt-2.5">
            <div className="w-[3px] rounded bg-[#d4a843] self-stretch shrink-0" />
            <p className="text-[12.5px] italic text-white/90 leading-[17px] line-clamp-2">“{note}”</p>
          </div>
        )}

        <div className="mt-auto flex items-center justify-between gap-2 text-[9.5px] font-bold tracking-[1px] text-white/50">
          <span className="truncate">GIFT CARD · {businessName.toUpperCase()} ONLY</span>
          <span>STAMPD</span>
        </div>
      </div>
    </div>
  )
}

function shade(hex: string, factor: number): string {
  if (!/^#[0-9a-fA-F]{6}$/.test(hex)) return hex
  const n = parseInt(hex.slice(1), 16)
  const r = Math.round(((n >> 16) & 255) * factor), g = Math.round(((n >> 8) & 255) * factor), b = Math.round((n & 255) * factor)
  return `#${[r, g, b].map(v => v.toString(16).padStart(2, '0')).join('')}`
}
