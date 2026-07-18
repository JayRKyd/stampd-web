import { Link } from 'react-router-dom'
import { Gift, MessageCircle, Check, ChevronRight, Fingerprint } from 'lucide-react'
import { getStampIcon } from '@/lib/stampIcons'
import { shade, isLightColor } from '@/lib/cardPreview'
import { whatsappHref, contactHref } from '@/lib/support'

// Shared pieces for the public marketing pages (Landing, Merchants).
// Palette mirrors the mobile app: cream #F7F2E8, teal #00605A, gold accents.

export function MarketingNav({ active }: { active?: 'home' | 'merchants' }) {
  return (
    <nav className="sticky top-0 z-40 backdrop-blur-md bg-[#F7F2E8]/90 border-b border-black/5">
      <div className="w-[80%] max-w-[1600px] mx-auto h-16 flex items-center gap-6">
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
          className={`text-[13px] font-semibold transition-colors ${
            active === 'merchants' ? 'text-[#00605A]' : 'text-[#74807E] hover:text-[#1A2B2A]'
          }`}
        >
          For merchants
        </Link>
        <Link
          to="/login"
          className="text-[13px] font-bold text-white bg-[#00605A] hover:bg-[#024D48] px-4 py-2 rounded-full transition-colors"
        >
          Sign in
        </Link>
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
            className="flex items-center gap-1.5 text-[13px] font-medium text-[#74807E] hover:text-[#1A2B2A] transition-colors"
          >
            <MessageCircle size={14} /> Contact
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
