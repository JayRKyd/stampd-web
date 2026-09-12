import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Gift, Check, ChevronRight, Fingerprint, Plus, ArrowRight } from 'lucide-react'
import { getStampIcon } from '@/lib/stampIcons'
import { shade, isLightColor } from '@/lib/cardPreview'
import { whatsappHref, contactHref } from '@/lib/support'
import { supabase } from '@/lib/supabase/client'

// Shared pieces for the public marketing pages (Landing, Merchants).
// Palette mirrors the mobile app: cream #F7F2E8, teal #00605A, gold accents.

export function MarketingNav({ active }: { active?: 'home' | 'merchants' }) {
  return (
    <nav className="sticky top-0 z-40 backdrop-blur-md bg-[#F7F2E8]/90 border-b border-black/5">
      <div className="w-[92%] lg:w-[80%] max-w-[1600px] mx-auto h-16 flex items-center gap-3 sm:gap-6">
        <Link to="/" className="text-[22px] font-extrabold tracking-tight text-[#1A2B2A]">
          Stampd
        </Link>
        <div className="flex-1" />
        <Link
          to="/"
          className={`hidden sm:block text-[13px] font-semibold transition-colors ${
            active === 'home' ? 'text-[#00605A]' : 'text-[#74807E] hover:text-[#1A2B2A]'
          }`}
        >
          For customers
        </Link>
        <Link
          to="/merchants"
          className={`text-[13px] font-semibold transition-colors whitespace-nowrap ${
            active === 'merchants' ? 'text-[#00605A]' : 'text-[#74807E] hover:text-[#1A2B2A]'
          }`}
        >
          For merchants
        </Link>
        <a
          href="#waitlist"
          className="text-[13px] font-bold text-white bg-[#00605A] hover:bg-[#024D48] px-4 py-2 rounded-full transition-colors whitespace-nowrap shrink-0"
        >
          Join waitlist
        </a>
      </div>
    </nav>
  )
}

export function MarketingFooter() {
  const contact = whatsappHref || contactHref
  return (
    <footer className="border-t border-black/5 bg-[#F7F2E8]">
      <div className="w-[80%] max-w-[1600px] mx-auto py-10 flex flex-col sm:flex-row items-center gap-4">
        <p className="text-[18px] font-extrabold tracking-tight text-[#1A2B2A]">Stampd</p>
        <div className="flex-1" />
        <Link to="/merchants" className="text-[13px] font-medium text-[#74807E] hover:text-[#1A2B2A] transition-colors">
          For merchants
        </Link>
        <Link to="/privacy" className="text-[13px] font-medium text-[#74807E] hover:text-[#1A2B2A] transition-colors">
          Privacy
        </Link>
        <Link to="/terms" className="text-[13px] font-medium text-[#74807E] hover:text-[#1A2B2A] transition-colors">
          Terms
        </Link>
        {contact && (
          <a
            href={contact}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[13px] font-medium text-[#74807E] hover:text-[#1A2B2A] transition-colors"
          >
            Contact
          </a>
        )}
        <p className="text-[12px] text-[#74807E]">
          © {new Date().getFullYear()} Stampd Bahamas · Product of Rykno Tech Solutions
        </p>
      </div>
    </footer>
  )
}

// A faithful CSS rendering of the app's StampCard — real product as hero art.
export function MiniStampCard({
  name, category, color, icon, filled, total, reward, className = '',
}: {
  name: string
  category: string
  color: string
  icon: string
  filled: number
  total: number
  reward: string
  className?: string
}) {
  const dark = shade(color, 0.3)
  const light = isLightColor(color)
  const textOnBrand = light ? dark : '#ffffff'
  const StampIcon = getStampIcon(icon)
  const left = total - filled
  const initials = name.split(' ').slice(0, 2).map(w => w[0]?.toUpperCase() ?? '').join('')

  return (
    <div
      className={`w-[300px] rounded-[20px] overflow-hidden shadow-xl select-none ${className}`}
      style={{ backgroundColor: color }}
    >
      <div className="flex items-center gap-2.5 px-4 pt-4 pb-1">
        <div className="h-9 w-9 rounded-lg bg-white flex items-center justify-center shrink-0">
          <span className="text-[13px] font-extrabold" style={{ color: dark }}>{initials}</span>
        </div>
        <div className="min-w-0">
          <p className="text-[14px] font-extrabold tracking-tight truncate" style={{ color: textOnBrand }}>{name}</p>
          <p className="text-[11px] font-medium truncate" style={{ color: textOnBrand, opacity: 0.75 }}>{category}</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5 px-4 py-3">
        {Array.from({ length: total }).map((_, i) => {
          const isReward = i === total - 1
          const isFilled = i < filled
          if (isReward) {
            return (
              <div key={i} className="h-8 w-8 rounded-full flex items-center justify-center" style={{ backgroundColor: 'rgba(255,255,255,0.92)' }}>
                <Gift size={14} style={{ color: dark }} />
              </div>
            )
          }
          return (
            <div key={i} className="h-8 w-8 rounded-full flex items-center justify-center" style={{ backgroundColor: isFilled ? dark : 'rgba(0,0,0,0.12)' }}>
              <StampIcon
                size={13}
                strokeWidth={2.2}
                color={isFilled ? '#fff' : (light ? 'rgba(0,0,0,0.30)' : 'rgba(255,255,255,0.40)')}
              />
            </div>
          )
        })}
      </div>

      <p className="px-3 pb-3.5 text-center text-[12px] font-bold truncate" style={{ color: textOnBrand }}>
        {left} more to get {reward}
      </p>
    </div>
  )
}

// The Member Pass — the app's credit-card-style PIN card, faithfully in CSS:
// faceted teal, gold chip, holder line. The one card every customer carries.
export function MiniPinCard({ className = '' }: { className?: string }) {
  return (
    <div
      className={`relative w-[330px] max-w-full aspect-[1.586] rounded-[20px] overflow-hidden shadow-2xl select-none ${className}`}
      style={{ background: 'linear-gradient(135deg, #0F8A7E 0%, #03635B 55%, #02322E 100%)' }}
    >
      {/* light facets */}
      <div className="absolute w-[300px] h-[300px] -top-[140px] -right-[120px] rotate-45" style={{ background: 'rgba(255,255,255,0.06)' }} />
      <div className="absolute w-[220px] h-[220px] -bottom-[150px] left-[30px] rotate-45" style={{ background: 'rgba(255,255,255,0.04)' }} />
      <div className="absolute w-[180px] h-[180px] top-[40px] -right-[110px] rotate-45" style={{ background: 'rgba(0,0,0,0.10)' }} />

      <div className="relative h-full p-5 flex flex-col">
        <div className="flex items-center justify-between">
          <span className="text-[13px] font-semibold text-white/85">Member Pass</span>
          <span className="text-[13px] font-extrabold text-white tracking-[0.22em]">STAMPD</span>
        </div>

        {/* chip */}
        <div
          className="relative w-11 h-8 rounded-[7px] mt-4 overflow-hidden"
          style={{ background: 'linear-gradient(135deg, #F0D78A, #D4A843, #B8922E)' }}
        >
          <div className="absolute left-0 right-0 h-px bg-black/20" style={{ top: '38%' }} />
          <div className="absolute left-0 right-0 h-px bg-black/20" style={{ top: '72%' }} />
          <div className="absolute top-0 bottom-0 w-px bg-black/20 left-1/2" />
        </div>

        <p className="mt-3 text-[26px] font-extrabold text-white tracking-[0.3em]">421 867</p>

        <div className="flex-1" />

        <div className="flex items-end justify-between">
          <div>
            <p className="text-[8px] font-bold text-white/50 tracking-[0.15em] mb-0.5">MEMBER</p>
            <p className="text-[12px] font-bold text-white tracking-wider">TANIA ROLLE</p>
          </div>
          <div className="text-right">
            <p className="text-[8px] font-bold text-white/50 tracking-[0.15em] mb-0.5">SINCE</p>
            <p className="text-[12px] font-bold text-white tracking-wider">08/26</p>
          </div>
        </div>
      </div>
    </div>
  )
}

// The reward voucher — ticket with punched notches and a perforation line,
// exactly as it renders on the app's Rewards screen.
export function MiniTicket({ className = '' }: { className?: string }) {
  const color = '#6b2d4a'
  return (
    <div className={`w-[280px] rounded-[20px] overflow-hidden shadow-xl select-none ${className}`} style={{ backgroundColor: color }}>
      <div className="px-5 pt-5 pb-3">
        <p className="text-[10px] font-bold tracking-[0.12em] text-white/75 mb-1">THE DONUT SHOPPE</p>
        <p className="text-[22px] font-extrabold tracking-tight text-white leading-tight">Free Donuts</p>
        <p className="text-[11px] font-medium text-white/65 mt-1">Expires Aug 12</p>
      </div>
      {/* perforation with notches */}
      <div className="relative h-4 flex items-center">
        <div className="absolute -left-2 w-4 h-4 rounded-full bg-[#F7F2E8]" />
        <div className="flex-1 mx-4 border-t-[1.5px] border-dashed border-white/35" />
        <div className="absolute -right-2 w-4 h-4 rounded-full bg-[#F7F2E8]" />
      </div>
      <div className="flex items-center gap-2 px-5 pt-1 pb-4">
        <Gift size={14} className="text-[#d4a843]" />
        <span className="flex-1 text-[13px] font-bold text-white">Tap to redeem</span>
        <ChevronRight size={14} className="text-white/70" />
      </div>
    </div>
  )
}

// Notification rows exactly as they appear in the app — merchant avatar with
// a type badge punched into the corner.
export function MiniNotification({
  initials, color, badge, title, body, time, className = '',
}: {
  initials: string
  color: string
  badge: 'stamp' | 'reward'
  title: string
  body: string
  time: string
  className?: string
}) {
  return (
    <div className={`w-[340px] max-w-full bg-white rounded-2xl shadow-lg px-4 py-3.5 flex gap-3 items-start select-none ${className}`}>
      <div className="relative shrink-0">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center border border-black/5"
          style={{ backgroundColor: `${color}14` }}
        >
          <span className="text-[13px] font-extrabold" style={{ color }}>{initials}</span>
        </div>
        <div
          className="absolute -bottom-1 -right-1 w-[18px] h-[18px] rounded-full border-2 border-white flex items-center justify-center"
          style={{ backgroundColor: badge === 'reward' ? '#b8922e' : '#00605A' }}
        >
          {badge === 'reward' ? <Gift size={9} className="text-white" /> : <Check size={9} className="text-white" strokeWidth={3} />}
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2">
          <p className="flex-1 text-[13.5px] font-semibold text-[#1A2B2A] truncate">{title}</p>
          <span className="text-[10.5px] font-medium text-[#74807E] shrink-0">{time}</span>
        </div>
        <p className="text-[12.5px] text-[#74807E] leading-snug mt-0.5">{body}</p>
      </div>
    </div>
  )
}

// The six PIN cells from the merchant counter, mid-entry.
export function MiniPinCells({ className = '' }: { className?: string }) {
  const digits = ['4', '2', '1', '8', '', '']
  return (
    <div className={`flex gap-2 select-none ${className}`}>
      {digits.map((d, i) => (
        <div
          key={i}
          className={`w-10 h-12 rounded-xl border-[1.5px] flex items-center justify-center text-[18px] font-bold ${
            d
              ? 'border-[#00605A] bg-[#00605A]/5 text-[#00605A]'
              : i === 4
              ? 'border-[#00605A]/60 bg-white'
              : 'border-black/10 bg-white text-black/20'
          }`}
        >
          {d || (i === 4 ? <span className="w-0.5 h-5 bg-[#00605A]/60 rounded-full animate-pulse" /> : '')}
        </div>
      ))}
    </div>
  )
}

// A slice of the merchant dashboard — stat cards + a live activity row.
export function MiniDashboard({ className = '' }: { className?: string }) {
  return (
    <div className={`w-[360px] max-w-full space-y-3 select-none ${className}`}>
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white rounded-2xl shadow-lg p-4">
          <div className="flex items-center justify-between mb-2.5">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'rgba(0,96,90,0.08)' }}>
              <Fingerprint size={15} className="text-[#00605A]" strokeWidth={1.75} />
            </div>
            <span className="text-[10.5px] font-semibold text-green-600">+6 vs yesterday</span>
          </div>
          <p className="text-[24px] font-extrabold tracking-tight text-[#1A2B2A] leading-none">23</p>
          <p className="text-[11px] text-[#74807E] mt-1.5">Today's stamps</p>
        </div>
        <div className="bg-white rounded-2xl shadow-lg p-4">
          <div className="flex items-center justify-between mb-2.5">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'rgba(212,168,67,0.15)' }}>
              <Gift size={15} className="text-[#b8922e]" strokeWidth={1.75} />
            </div>
            <span className="text-[10.5px] font-medium text-[#74807E]">this month</span>
          </div>
          <p className="text-[24px] font-extrabold tracking-tight text-[#1A2B2A] leading-none">12</p>
          <p className="text-[11px] text-[#74807E] mt-1.5">Rewards redeemed</p>
        </div>
      </div>
      <div className="bg-white rounded-2xl shadow-lg px-4 py-3 flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: 'rgba(0,96,90,0.08)' }}>
          <Check size={14} className="text-[#00605A]" strokeWidth={2.5} />
        </div>
        <p className="flex-1 text-[12.5px] text-[#556570] truncate">
          <span className="font-semibold text-[#1A2B2A]">Keisha B.</span> earned a stamp
          <span className="text-[#74807E]"> · by Marcus</span>
        </p>
        <span className="text-[10.5px] text-[#74807E] shrink-0">2m ago</span>
      </div>
    </div>
  )
}

// ── "Now on Stampd" public directory ──
// Real, live merchants pulled from get_public_directory() (active shops only,
// display-safe columns). Logos sit on the cream well with mix-blend-multiply,
// so white-background uploads read as transparent without touching the file —
// the brand color lives in each shop's own stamp strip, not a decorative rail.

type DirEntry = {
  business_name: string
  category: string | null
  description: string | null
  logo_url: string | null
  card_color: string | null
  stamp_icon: string | null
  stamp_count_required: number | null
  reward_title: string | null
}

function DirectoryTile({ m }: { m: DirEntry }) {
  const color = m.card_color || '#00605A'
  const total = Math.min(Math.max(m.stamp_count_required ?? 10, 3), 12)
  const initials = m.business_name
    .split(/[\s/]+/).filter(Boolean).slice(0, 2)
    .map(w => w[0]?.toUpperCase() ?? '').join('')

  return (
    <div className="group bg-white border border-black/5 rounded-[20px] overflow-hidden transition-all hover:-translate-y-1 hover:shadow-[0_22px_40px_-22px_rgba(26,43,42,0.35)]">
      <div className="h-[104px] flex items-center justify-center px-6 bg-[#FBF8F1] border-b border-black/5">
        {m.logo_url ? (
          <img
            src={m.logo_url}
            alt={m.business_name}
            loading="lazy"
            className="max-h-[62px] max-w-full object-contain mix-blend-multiply"
          />
        ) : (
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center text-[18px] font-extrabold text-white"
            style={{ backgroundColor: color }}
          >
            {initials}
          </div>
        )}
      </div>

      <div className="p-[18px]">
        <p className="text-[17px] font-extrabold tracking-[-0.02em] leading-tight">{m.business_name}</p>
        {m.category && (
          <p className="mt-1.5 text-[10.5px] font-extrabold tracking-[0.13em] uppercase text-[#74807E]">{m.category}</p>
        )}
        {m.description && (
          <p
            className="mt-2 text-[12.5px] text-[#556570] leading-snug overflow-hidden"
            style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', minHeight: '2.6em' }}
          >
            {m.description}
          </p>
        )}

        <div className="mt-4 pt-4 border-t border-black/5">
          <div className="flex flex-wrap items-center gap-1.5">
            {Array.from({ length: total - 1 }).map((_, i) => (
              <span
                key={i}
                className="w-[14px] h-[14px] rounded-full border-[1.6px]"
                style={{ borderColor: color, opacity: 0.4 }}
              />
            ))}
            <span
              className="w-[19px] h-[19px] rounded-full flex items-center justify-center ml-px"
              style={{ backgroundColor: color }}
            >
              <Gift size={10} className="text-white" />
            </span>
          </div>
          {m.reward_title && (
            <p className="mt-3 text-[12.5px] font-extrabold tracking-[-0.01em] text-[#1A2B2A]">
              <span className="font-semibold text-[#74807E]">Full card →</span> {m.reward_title}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

export function MerchantDirectory() {
  const [rows, setRows] = useState<DirEntry[] | null>(null)

  useEffect(() => {
    let alive = true
    supabase
      .rpc('get_public_directory')
      .then(({ data }) => { if (alive) setRows((data as DirEntry[] | null) ?? []) })
    return () => { alive = false }
  }, [])

  // Nothing to show (still loading, or no live merchants) → render nothing,
  // so the page never shows an empty band.
  if (!rows || rows.length === 0) return null

  const shown = rows.slice(0, 7) // homepage keeps it tight; a /directory page can show all later

  return (
    <section className="bg-[#F7F2E8] border-t border-black/5">
      <div className="w-[80%] max-w-[1600px] mx-auto py-20 lg:py-24">
        <p className="text-[13px] md:text-[14px] font-extrabold tracking-[0.2em] text-[#00605A] mb-4">NOW ON STAMPD</p>
        <h2 className="text-[30px] md:text-[38px] lg:text-[44px] xl:text-[48px] font-extrabold tracking-[-0.03em] leading-tight max-w-[16ch]">
          Your PIN already <span className="text-[#c99a2e]">works here.</span>
        </h2>
        <p className="mt-5 text-[15.5px] lg:text-[18px] text-[#556570] leading-relaxed max-w-lg">
          These Grand Bahama spots are live on Stampd today. Walk in, say your six
          digits, and your card starts filling on the first visit.
        </p>
        <span className="mt-4 inline-flex items-center gap-2 text-[12.5px] font-bold text-[#00605A] bg-[#00605A]/[0.08] px-3 py-1.5 rounded-full">
          <span className="w-[7px] h-[7px] rounded-full bg-[#00605A]" />
          {rows.length} {rows.length === 1 ? 'spot' : 'spots'} live · more joining every week
        </span>

        <div className="mt-9 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-[18px]">
          {shown.map((m, i) => <DirectoryTile key={i} m={m} />)}

          <Link
            to="/merchants"
            className="rounded-[20px] border-[1.6px] border-dashed border-[#00605A]/40 bg-[#00605A]/[0.03] flex flex-col items-center justify-center text-center p-7 min-h-[220px] transition-colors hover:bg-[#00605A]/[0.06]"
          >
            <span className="w-11 h-11 rounded-full bg-[#00605A]/10 flex items-center justify-center mb-3.5">
              <Plus size={20} className="text-[#00605A]" />
            </span>
            <span className="text-[15px] font-extrabold tracking-[-0.01em] text-[#1A2B2A]">Your spot here</span>
            <span className="mt-1.5 text-[12.5px] text-[#556570]">Get set up free, live in a day.</span>
            <span className="mt-3 inline-flex items-center gap-1 text-[12.5px] font-extrabold text-[#00605A]">
              List your business <ArrowRight size={13} />
            </span>
          </Link>
        </div>
      </div>
    </section>
  )
}
