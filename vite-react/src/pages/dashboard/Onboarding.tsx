import { useEffect, useState, useRef } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import {
  Store, User, CreditCard, Smartphone, Clock, Check, Gift,
  MessageCircle, Apple, Play, Scissors,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { whatsappHref, contactHref, APP_STORE_URL, PLAY_STORE_URL } from '@/lib/support'
import { BUSINESS_CATEGORIES, INDIVIDUAL_TRADES, normalizeCategory } from '@/lib/categories'
import { getStampIcon } from '@/lib/stampIcons'
import { shade, isLightColor } from '@/lib/cardPreview'
import { pluralizeLabel } from '@/lib/visitLabel'
import { resizeImage } from '@/lib/resizeImage'
import { MerchantLogoBadge } from '@/components/MerchantLogo'

// ─── Types ────────────────────────────────────────────────────
type Tier = { stamps: string; reward: string }

type RewardTier = {
  id: string
  stamp_threshold: number
  reward_title: string
  reward_description: string | null
  sort_order: number
}

type LoyaltyCard = {
  id: string
  visit_label?: string | null
  reward_tiers: RewardTier[]
}

type Merchant = {
  id: string
  owner_id: string
  business_name: string | null
  category: string | null
  address: string | null
  phone: string | null
  description: string | null
  logo_url: string | null
  is_active: boolean
  subscription_tier: string | null
  trial_ends_at: string | null
  merchant_type: 'business' | 'individual' | null
  trade: string | null
  workplace: string | null
  loyalty_cards: LoyaltyCard[]
}

// ─── Constants ────────────────────────────────────────────────
const STAMP_OPTIONS = [5, 6, 7, 8, 10, 12, 15, 20]

const VISIT_LABELS = [
  'stamp', 'visit', 'order', 'purchase',
  'cut', 'session', 'class', 'wash',
  'meal', 'drink', 'service', 'treatment',
]

const inputCls = "w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-[13px] text-gray-900 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-all placeholder:text-gray-400"

// ─── Step indicator ───────────────────────────────────────────
function StepBar({ current }: { current: number }) {
  const steps = ['Welcome', 'Your card', 'Profile', 'Download']
  return (
    <div className="mb-10">
      <div className="flex items-center justify-between">
        {steps.map((label, i) => {
          const n = i + 1
          const done = n < current
          const active = n === current
          return (
            <div key={n} className="flex items-center flex-1 last:flex-none">
              <div className="flex flex-col items-center gap-1.5 shrink-0">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[13px] font-bold transition-all ${
                  done
                    ? 'bg-brand-500 text-white'
                    : active
                    ? 'bg-brand-500 text-white shadow-[0_0_0_4px_rgba(0,96,90,0.15)]'
                    : 'bg-gray-100 text-gray-400 border border-gray-200'
                }`}>
                  {done ? <Check size={14} /> : n}
                </div>
                <span className={`text-[11px] font-semibold whitespace-nowrap hidden sm:block ${
                  active ? 'text-gray-900' : done ? 'text-brand-500' : 'text-gray-400'
                }`}>
                  {label}
                </span>
              </div>
              {i < steps.length - 1 && (
                <div className={`flex-1 h-px mx-3 mb-5 transition-colors ${done ? 'bg-brand-500' : 'bg-gray-200'}`} />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Card preview ─────────────────────────────────────────────
// Faithful replica of the mobile StampCard, so the merchant's first look
// at "their card" matches what customers actually see in the app.
function CardPreview({
  name, category, tiers, fallbackGoal, visitLabel, isIndividual, logo,
}: {
  name: string
  category: string
  tiers: Tier[]
  fallbackGoal: number
  visitLabel: string
  isIndividual: boolean
  logo?: string | null
}) {
  // Both from the Card page's preset palette: brand Teal (the DB default
  // card_color) for businesses, Navy for individuals.
  const bg = isIndividual ? '#1e3a5f' : '#00605a'
  const dark = shade(bg, 0.3)
  const light = isLightColor(bg)
  const textOnBrand = light ? dark : '#ffffff'
  const StampIcon = getStampIcon('star')

  const tiersWithStamps = tiers.filter(t => t.stamps && parseInt(t.stamps) > 0)
  const goal = tiersWithStamps.length
    ? Math.max(...tiersWithStamps.map(t => parseInt(t.stamps)))
    : fallbackGoal
  const sortedValid = tiers
    .filter(t => t.stamps && parseInt(t.stamps) > 0 && t.reward.trim())
    .sort((a, b) => parseInt(a.stamps) - parseInt(b.stamps))
  const finalReward = sortedValid.length
    ? sortedValid[sortedValid.length - 1].reward.trim()
    : 'your reward'
  const filled = Math.max(1, Math.floor(goal / 2))
  const left = Math.max(0, goal - filled)
  const shown = Math.min(goal, 20)
  const initials = (name || 'Your Business').split(' ').slice(0, 2).map(w => w[0]?.toUpperCase() ?? '').join('')

  return (
    <div>
      {/* Cream backdrop = the app's sheet background */}
      <div className="rounded-2xl p-4" style={{ backgroundColor: '#F7F2E8' }}>
        <div className="rounded-[18px] overflow-hidden shadow-md" style={{ backgroundColor: bg }}>
          {/* Header */}
          <div className="flex items-center gap-2.5 px-3.5 pt-3.5 pb-1">
            <div className="h-9 w-9 rounded-lg bg-white flex items-center justify-center overflow-hidden shrink-0">
              {logo ? (
                <img src={logo} alt="" className="h-full w-full object-contain" />
              ) : (
                <span className="text-[13px] font-extrabold" style={{ color: dark }}>{initials}</span>
              )}
            </div>
            <div className="min-w-0">
              <p className="text-[14px] font-extrabold tracking-[-0.02em] truncate" style={{ color: textOnBrand }}>
                {name || 'Your business name'}
              </p>
              <p className="text-[11px] font-medium truncate" style={{ color: textOnBrand, opacity: 0.75 }}>
                {category || 'Loyalty Card'}
              </p>
            </div>
          </div>

          {/* Stamp field */}
          <div className="flex flex-wrap gap-1.5 px-3.5 py-3">
            {Array.from({ length: shown }).map((_, i) => {
              const isReward = i === shown - 1 && goal <= 20
              const isFilled = i < filled
              if (isReward) {
                return (
                  <div key={i} className="h-7 w-7 rounded-full flex items-center justify-center" style={{ backgroundColor: 'rgba(255,255,255,0.92)' }}>
                    <Gift size={13} style={{ color: dark }} />
                  </div>
                )
              }
              return (
                <div key={i} className="h-7 w-7 rounded-full flex items-center justify-center" style={{ backgroundColor: isFilled ? dark : 'rgba(0,0,0,0.12)' }}>
                  <StampIcon
                    size={12}
                    strokeWidth={2.2}
                    color={isFilled ? '#fff' : (light ? 'rgba(0,0,0,0.30)' : 'rgba(255,255,255,0.40)')}
                  />
                </div>
              )
            })}
            {goal > 20 && (
              <span className="text-[10px] self-center" style={{ color: textOnBrand, opacity: 0.6 }}>
                +{goal - 20}
              </span>
            )}
          </div>

          {/* Caption */}
          <p className="px-3 pb-3 text-center text-[12px] font-bold truncate" style={{ color: textOnBrand }}>
            {left} more {pluralizeLabel(visitLabel, left)} to get {finalReward}
          </p>
        </div>
        <p className="text-center text-[10px] text-gray-400 mt-3">
          Shown with {filled} of {goal} earned
        </p>
      </div>

      {/* Milestone tiers appear in the app's card detail, not on the card face */}
      {sortedValid.length > 1 && (
        <div className="mt-3 px-1 space-y-1.5">
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Milestones</p>
          {sortedValid.map((t, i) => (
            <div key={i} className="flex items-center justify-between text-[12px]">
              <span className="text-gray-500">{t.stamps} {pluralizeLabel(visitLabel, parseInt(t.stamps))}</span>
              <span className="font-semibold text-gray-700 truncate max-w-[60%]">{t.reward}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────
export default function Onboarding() {
  const navigate = useNavigate()
  const fileRef = useRef<HTMLInputElement>(null)

  // ── Loading state ──
  const [pageLoading, setPageLoading] = useState(true)
  const [wrongDoor, setWrongDoor] = useState(false)
  const [merchant, setMerchant] = useState<Merchant | null>(null)
  const [existingCard, setExistingCard] = useState<LoyaltyCard | null>(null)
  const [hasCard, setHasCard] = useState(false)
  const [hasProfile, setHasProfile] = useState(false)
  const [isApproved, setIsApproved] = useState(false)

  // ── Step state ──
  const [step, setStep] = useState(2)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [logoWarning, setLogoWarning] = useState('')

  // ── Account type (business vs individual) ──
  const [chosenType, setChosenType] = useState<'business' | 'individual'>('business')
  const [typeSaving, setTypeSaving] = useState(false)

  // ── Card setup state ──
  const [stampCount, setStampCount] = useState(10)
  const [visitLabel, setVisitLabel] = useState('stamp')
  const [tiers, setTiers] = useState<Tier[]>([{ stamps: '10', reward: '' }])

  // ── Profile state ──
  const [profile, setProfile] = useState({
    business_name: '',
    category: '',
    address: '',
    phone: '',
    description: '',
    workplace: '',
  })
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)

  // ── Data fetch ────────────────────────────────────────────────
  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { navigate('/login'); return }

      const merchantSelect = `
          id, owner_id, business_name, category,
          address, phone, description, logo_url,
          is_active, subscription_tier, trial_ends_at,
          merchant_type, trade, workplace,
          loyalty_cards (
            id, visit_label,
            reward_tiers (
              id, stamp_threshold, reward_title,
              reward_description, sort_order
            )
          )
        `

      let { data } = await supabase
        .from('merchants')
        .select(merchantSelect)
        .eq('owner_id', user.id)
        .maybeSingle()

      // Self-heal: if the merchant row is missing (e.g. trigger didn't fire),
      // create one so the user isn't stuck bouncing between routes.
      // ONLY for accounts that signed up as merchants — consumer accounts
      // from the mobile app can land here with a web session (e.g. after a
      // password reset) and must never be silently turned into merchants.
      if (!data) {
        if (user.user_metadata?.role !== 'merchant') {
          setWrongDoor(true)
          setPageLoading(false)
          return
        }
        const businessName =
          (user.user_metadata?.business_name as string | undefined)?.trim() || 'My Business'
        const { data: created } = await supabase
          .from('merchants')
          .insert({ owner_id: user.id, business_name: businessName, is_active: false })
          .select(merchantSelect)
          .maybeSingle()
        data = created
      }

      if (!data) { setError('Could not load your account. Please refresh.'); setPageLoading(false); return }

      const card = data.loyalty_cards?.[0] ?? null
      const cardHasTiers = !!(card && card.reward_tiers?.length > 0)
      // Address is only required for businesses — must match saveProfile's rule
      // (and ProtectedRoute's), or individuals get stuck in an onboarding loop.
      const profileComplete = !!(
        data.business_name &&
        data.category &&
        (data.merchant_type === 'individual' || data.address)
      )

      // Pre-fill card form
      if (card?.reward_tiers?.length) {
        const sorted = [...card.reward_tiers].sort((a, b) => a.sort_order - b.sort_order)
        setStampCount(sorted[sorted.length - 1].stamp_threshold)
        setTiers(sorted.map(t => ({ stamps: String(t.stamp_threshold), reward: t.reward_title })))
      }
      if (card?.visit_label) setVisitLabel(card.visit_label)

      // Pre-fill profile form
      setProfile({
        business_name: data.business_name ?? '',
        category: normalizeCategory(data.category) || (data.merchant_type === 'individual' ? data.trade ?? '' : ''),
        address: data.address ?? '',
        phone: data.phone ?? '',
        description: data.description ?? '',
        workplace: data.workplace ?? '',
      })
      setLogoPreview(data.logo_url)

      setMerchant(data as unknown as Merchant)
      setExistingCard(card)
      setHasCard(cardHasTiers)
      setHasProfile(profileComplete)
      setIsApproved(data.is_active)
      setChosenType(data.merchant_type === 'individual' ? 'individual' : 'business')

      // Brand-new merchants start on Welcome (orientation + account type choice);
      // returning incomplete merchants jump straight to their first unfinished step.
      const freshStart = !cardHasTiers && !profileComplete
      setStep(freshStart ? 1 : !cardHasTiers ? 2 : !profileComplete ? 3 : 4)
      setPageLoading(false)
    }
    load()
  }, [navigate])

  // ── Helpers ───────────────────────────────────────────────────
  function updateTier(index: number, field: keyof Tier, value: string) {
    setTiers(prev => prev.map((t, i) => i === index ? { ...t, [field]: value } : t))
  }

  function addTier() {
    setTiers(prev => [...prev, { stamps: '', reward: '' }])
  }

  function removeTier(index: number) {
    if (tiers.length === 1) return
    setTiers(prev => prev.filter((_, i) => i !== index))
  }

  async function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    // Downscale camera-roll originals client-side; only reject if something
    // is still enormous after resizing (e.g. an undecodable format)
    const resized = await resizeImage(file, 512, { trimWhitespace: true })
    if (resized.size > 2 * 1024 * 1024) {
      setError('Photo is too large — try a smaller image.')
      e.target.value = ''
      return
    }
    setError('')
    setLogoFile(resized)
    setLogoPreview(URL.createObjectURL(resized))
  }

  // Persist the business/individual choice (if changed) and advance
  async function handleLetsGo() {
    if (!merchant) return
    if (chosenType !== (merchant.merchant_type ?? 'business')) {
      setTypeSaving(true)
      const supabase = createClient()
      await supabase.from('merchants').update({ merchant_type: chosenType }).eq('id', merchant.id)
      setMerchant(prev => prev ? { ...prev, merchant_type: chosenType } : prev)
      setTypeSaving(false)
    }
    setStep(hasCard ? (hasProfile ? 4 : 3) : 2)
  }

  // ── Save card ─────────────────────────────────────────────────
  async function saveCard() {
    const validTiers = tiers.filter(t => t.stamps && t.reward.trim())
    if (!validTiers.length) { setError('Add at least one reward tier'); return }

    const sorted = [...validTiers].sort((a, b) => parseInt(a.stamps) - parseInt(b.stamps))
    const hasDescending = sorted.some((t, i) =>
      i > 0 && parseInt(t.stamps) <= parseInt(sorted[i - 1].stamps)
    )
    if (hasDescending) { setError('Stamp thresholds must be in increasing order'); return }

    setLoading(true)
    setError('')
    const supabase = createClient()

    // Keep the flat loyalty_cards columns in sync with the tiers so the
    // rest of the web app (Stamp, Customers, Card) and the mobile app agree.
    const finalTier = sorted[sorted.length - 1]
    const cardFields = {
      stamp_count_required: parseInt(finalTier.stamps),
      reward_title: finalTier.reward.trim(),
      visit_label: visitLabel,
    }

    try {
      let cardId = existingCard?.id
      if (!cardId) {
        // Match the onboarding preview; merchants can change it later on /card
        const card_color = merchant!.merchant_type === 'individual' ? '#1e3a5f' : '#00605a'
        const { data, error } = await supabase
          .from('loyalty_cards')
          .insert({ merchant_id: merchant!.id, card_color, ...cardFields })
          .select()
          .single()
        if (error) throw error
        cardId = data.id
      } else {
        const { error: cardError } = await supabase
          .from('loyalty_cards')
          .update(cardFields)
          .eq('id', cardId)
        if (cardError) throw cardError
      }

      await supabase.from('reward_tiers').delete().eq('loyalty_card_id', cardId)

      const { error: tierError } = await supabase.from('reward_tiers').insert(
        sorted.map((t, i) => ({
          loyalty_card_id: cardId,
          stamp_threshold: parseInt(t.stamps),
          reward_title: t.reward.trim(),
          sort_order: i + 1,
        }))
      )
      if (tierError) throw tierError

      setHasCard(true)
      setStep(3)
    } catch (e: unknown) {
      setError((e as Error).message ?? 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  // ── Save profile ──────────────────────────────────────────────
  async function saveProfile() {
    if (!profile.business_name.trim()) { setError('Business name is required'); return }
    if (!profile.category.trim()) { setError('Please select a category'); return }
    if (!isIndividual && !profile.address.trim()) { setError('Address is required'); return }

    setLoading(true)
    setError('')
    const supabase = createClient()

    try {
      let logo_url = merchant?.logo_url ?? null
      let uploadFailed = false

      if (logoFile) {
        const ext = (logoFile.name.split('.').pop() || 'png').toLowerCase()
        const path = `merchants/${merchant!.id}/logo.${ext}`
        const { error: uploadError } = await supabase.storage
          .from('merchant-assets')
          .upload(path, logoFile, { upsert: true, contentType: logoFile.type || undefined })
        if (uploadError) {
          uploadFailed = true
        } else {
          const { data: { publicUrl } } = supabase.storage
            .from('merchant-assets')
            .getPublicUrl(path)
          logo_url = publicUrl
        }
      }

      const updates: Record<string, unknown> = {
        business_name: profile.business_name.trim(),
        category: profile.category.trim(),
        address: profile.address.trim() || null,
        phone: profile.phone.trim() || null,
        description: profile.description.trim() || null,
        logo_url,
      }
      if (isIndividual) {
        updates.trade = profile.category.trim()
        updates.workplace = profile.workplace.trim() || null
      }

      const { error } = await supabase.from('merchants').update(updates).eq('id', merchant!.id)
      if (error) throw error

      // Don't block completion on a failed photo upload — just tell them.
      setLogoWarning(uploadFailed
        ? 'Your profile was saved, but the photo upload failed — you can try again from Settings.'
        : '')

      setHasProfile(true)
      // Card + profile both done — tell the layout to unlock the sidebar,
      // since the step-4 summary has no dashboard button of its own.
      if (hasCard) window.dispatchEvent(new Event('stampd:setup-complete'))
      setStep(4)
    } catch (e: unknown) {
      setError((e as Error).message ?? 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  // Consumer account signed into the merchant dashboard — point them back
  // to the app instead of onboarding them as a business.
  if (wrongDoor) {
    return (
      <div className="animate-enter w-full max-w-[480px]">
        <div className="bg-white border border-gray-200 rounded-2xl p-8">
          <div className="w-12 h-12 rounded-xl bg-brand-50 flex items-center justify-center text-brand-600 mb-4">
            <Smartphone size={22} strokeWidth={1.75} />
          </div>
          <h1 className="text-[20px] font-bold text-gray-900 mb-2">This dashboard is for businesses</h1>
          <p className="text-[13px] text-gray-500 leading-relaxed mb-6">
            Your account is a Stampd customer account. Open the Stampd app on your
            phone to see your cards and rewards. If you want to run a loyalty
            program for your business, you can create a merchant account.
          </p>
          <div className="flex flex-col gap-2">
            <button
              onClick={async () => {
                await createClient().auth.signOut()
                navigate('/')
              }}
              className="w-full py-3 rounded-xl bg-brand-500 text-white text-[13px] font-bold hover:bg-brand-600 transition-colors"
            >
              Sign out
            </button>
            <Link
              to="/merchants"
              className="w-full py-3 rounded-xl border border-gray-200 text-center text-[13px] font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Learn about Stampd for merchants
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // ── Derived ───────────────────────────────────────────────────
  if (pageLoading || !merchant) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const isIndividual = merchant.merchant_type === 'individual'
  const categories = isIndividual ? INDIVIDUAL_TRADES : BUSINESS_CATEGORIES
  const trialDays = merchant.trial_ends_at
    ? Math.max(0, Math.ceil((new Date(merchant.trial_ends_at).getTime() - Date.now()) / 86400000))
    : 90

  // ── Render ────────────────────────────────────────────────────
  return (
    <div className="animate-enter w-full">
      <div className="mb-2">
        <h1 className="text-[22px] font-bold text-gray-900 tracking-tight">Get started</h1>
        <p className="text-[13px] text-gray-400 mt-0.5">Set up your loyalty program in a few steps.</p>
      </div>
      <div className="mt-8">
        <StepBar current={step} />
      </div>

      {/* ── STEP 1: WELCOME ─────────────────────────── */}
      {step === 1 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white border border-gray-200 rounded-2xl p-6 space-y-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-brand-50 flex items-center justify-center shrink-0 text-brand-600">
                {isIndividual ? <User size={22} strokeWidth={1.75} /> : <Store size={22} strokeWidth={1.75} />}
              </div>
              <div>
                <h1 className="text-[20px] font-bold text-gray-900">
                  Welcome, {merchant.business_name ?? 'there'}
                </h1>
                <p className="text-[13px] text-gray-500">
                  {isIndividual ? merchant.trade ?? 'Professional' : 'Business'} · Free trial · {trialDays} days remaining
                </p>
              </div>
            </div>

            <p className="text-[13px] text-gray-500 leading-relaxed">
              {hasCard || hasProfile
                ? 'Welcome back — pick up where you left off. Just a couple of steps remain.'
                : "You're 4 steps away from launching your loyalty program. This takes about 5 minutes."}
            </p>

            {/* Account type chooser */}
            <div>
              <p className="text-[12px] font-semibold text-gray-700 mb-2">First, which best describes you?</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {([
                  {
                    value: 'business' as const, icon: Store, title: 'I run a business',
                    sub: 'A storefront, restaurant or shop — possibly with staff',
                  },
                  {
                    value: 'individual' as const, icon: Scissors, title: 'I work for myself',
                    sub: 'Barber, nail tech, trainer — you are the brand',
                  },
                ]).map(({ value, icon: Icon, title, sub }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setChosenType(value)}
                    className={`text-left p-4 rounded-xl border-2 transition-all ${
                      chosenType === value
                        ? 'border-brand-500 bg-brand-50'
                        : 'border-gray-200 bg-white hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Icon size={16} strokeWidth={1.75} className={chosenType === value ? 'text-brand-600' : 'text-gray-500'} />
                      <span className={`text-[13px] font-bold ${chosenType === value ? 'text-brand-700' : 'text-gray-900'}`}>
                        {title}
                      </span>
                      {chosenType === value && <Check size={15} className="ml-auto text-brand-600" />}
                    </div>
                    <p className="text-[12px] text-gray-500 leading-snug">{sub}</p>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              {[
                {
                  icon: CreditCard, title: 'Set up your loyalty card',
                  sub: 'Choose stamps, tiers and what customers earn',
                  done: hasCard, badge: hasCard ? 'Done' : 'To do',
                },
                {
                  icon: User, title: 'Complete your profile',
                  sub: isIndividual ? 'Your name, trade and workplace' : 'Business details, address, description',
                  done: hasProfile, badge: hasProfile ? 'Done' : 'To do',
                },
                {
                  icon: Smartphone, title: 'Download Stampd Business',
                  sub: 'Issue stamps at your counter from your phone',
                  done: false, badge: 'To do',
                },
                {
                  icon: Clock, title: 'Wait for approval',
                  sub: "We'll activate your card in the consumer app within 24 hours",
                  done: isApproved, badge: isApproved ? 'Active' : 'Automatic', auto: true,
                },
              ].map(({ icon: Icon, title, sub, done, badge, auto }) => (
                <div key={title} className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                  done ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-gray-50'
                }`}>
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                    done ? 'bg-green-100 text-green-700' : 'bg-white border border-gray-200 text-gray-500'
                  }`}>
                    {done ? <Check size={16} /> : <Icon size={16} strokeWidth={1.75} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-[13px] font-semibold ${done ? 'text-green-700' : 'text-gray-900'}`}>{title}</p>
                    <p className="text-[12px] text-gray-500">{sub}</p>
                  </div>
                  <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full shrink-0 ${
                    done
                      ? 'text-green-700 bg-green-100'
                      : auto
                      ? 'text-brand-600 bg-brand-50'
                      : 'text-gray-500 bg-white border border-gray-200'
                  }`}>
                    {badge}
                  </span>
                </div>
              ))}
            </div>

            <div className="pt-2">
              <button
                onClick={handleLetsGo}
                disabled={typeSaving}
                className="w-full py-3 rounded-xl bg-brand-500 text-white text-[13px] font-bold hover:bg-brand-600 transition-colors disabled:opacity-60"
              >
                {typeSaving ? 'Saving…' : "Let's go →"}
              </button>
            </div>
          </div>

          <div className="space-y-4">
            <div className="bg-white border border-gray-200 rounded-2xl p-5">
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-3">Your plan</p>
              <p className="text-[30px] font-black text-gray-900">Free</p>
              <p className="text-[12px] text-gray-500 mt-1 mb-4">90-day trial · no credit card needed</p>
              <div className="space-y-2">
                {['Unlimited stamps', 'Loyalty card builder', 'Web dashboard', 'Mobile app'].map(f => (
                  <div key={f} className="flex items-center gap-2 text-[12px] text-gray-500">
                    <Check size={13} className="text-green-600 shrink-0" /> {f}
                  </div>
                ))}
              </div>
            </div>

            {(whatsappHref || contactHref) && (
              <div className="bg-white border border-gray-200 rounded-2xl p-5">
                <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Need help?</p>
                <p className="text-[12px] text-gray-500 leading-relaxed mb-3">
                  {whatsappHref
                    ? "WhatsApp us and we'll walk you through your setup."
                    : "Reach out and we'll walk you through your setup."}
                </p>
                <a
                  href={whatsappHref || contactHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex w-full items-center justify-center gap-1.5 py-2 rounded-lg border border-gray-200 text-[12px] font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <MessageCircle size={14} strokeWidth={1.75} /> Chat with us
                </a>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── STEP 2: CARD SETUP ──────────────────────── */}
      {step === 2 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white border border-gray-200 rounded-2xl p-6 space-y-5">
            <div>
              <h2 className="text-[20px] font-bold text-gray-900">Set up your loyalty card</h2>
              <p className="text-[13px] text-gray-500 mt-1">
                Configure what customers need to earn — and what they get when they do.
              </p>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-[13px] text-red-700">
                {error}
              </div>
            )}

            {/* Stamp count */}
            <div className="space-y-2">
              <div>
                <label className="block text-[13px] font-semibold text-gray-900">
                  {tiers.length > 1 ? 'Stamps for the first reward' : 'How many stamps to earn a reward?'}
                </label>
                {tiers.length > 1 && (
                  <p className="text-[12px] text-gray-500 mt-0.5">
                    Your highest tier below sets the full card size.
                  </p>
                )}
              </div>
              <div className="flex gap-2 flex-wrap">
                {STAMP_OPTIONS.map(n => {
                  const selected = parseInt(tiers[0]?.stamps || '0') === n
                  return (
                    <button
                      key={n}
                      onClick={() => {
                        setStampCount(n)
                        // Only update the first tier's threshold — never discard
                        // tiers the merchant has already added below.
                        setTiers(prev => [{ ...prev[0], stamps: String(n) }, ...prev.slice(1)])
                      }}
                      className={`w-11 h-10 rounded-xl text-[13px] font-bold border transition-all ${
                        selected
                          ? 'border-brand-500 bg-brand-50 text-brand-600 border-[1.5px]'
                          : 'border-gray-200 text-gray-500 hover:border-brand-500 hover:text-brand-600'
                      }`}
                    >
                      {n}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Reward tiers */}
            <div className="space-y-2">
              <div>
                <label className="block text-[13px] font-semibold text-gray-900">Reward tiers</label>
                <p className="text-[12px] text-gray-500 mt-0.5">
                  One tier = simple program. Add more for milestones (e.g. 5 = 25% off, 10 = 50% off).
                </p>
              </div>
              <div className="space-y-2">
                {tiers.map((tier, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5"
                  >
                    <div className="w-6 h-6 rounded-full bg-brand-500 text-white text-[11px] font-bold flex items-center justify-center shrink-0">
                      {i + 1}
                    </div>
                    <input
                      type="number"
                      min={1}
                      max={50}
                      value={tier.stamps}
                      onChange={e => {
                        const val = e.target.value
                        if (val === '' || (parseInt(val) >= 1 && parseInt(val) <= 50)) updateTier(i, 'stamps', val)
                      }}
                      placeholder="Stamps"
                      className="w-20 bg-white border border-gray-200 rounded-lg px-2 py-1.5 text-[13px] text-gray-900 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/20 shrink-0"
                    />
                    <input
                      type="text"
                      value={tier.reward}
                      onChange={e => updateTier(i, 'reward', e.target.value)}
                      placeholder="Reward (e.g. Free Haircut, 25% off)"
                      className="flex-1 bg-white border border-gray-200 rounded-lg px-2 py-1.5 text-[13px] text-gray-900 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/20"
                    />
                    {tiers.length > 1 && (
                      <button
                        onClick={() => removeTier(i)}
                        className="text-gray-400 hover:text-red-500 transition-colors p-1 text-[12px]"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <button
                onClick={addTier}
                className="flex items-center gap-1.5 text-[12px] text-brand-500 font-semibold mt-1 hover:opacity-70 transition-opacity"
              >
                + Add another tier
              </button>
            </div>

            {/* Visit label */}
            <div className="space-y-2">
              <div>
                <label className="block text-[13px] font-semibold text-gray-900">
                  What do you call a visit? <span className="font-normal text-gray-400">(optional)</span>
                </label>
                <p className="text-[12px] text-gray-500 mt-0.5">
                  Their card reads "3 more {pluralizeLabel(visitLabel, 3)} to get your reward."
                </p>
              </div>
              <div className="flex gap-2 flex-wrap">
                {VISIT_LABELS.map(l => (
                  <button
                    key={l}
                    onClick={() => setVisitLabel(l)}
                    className={`px-3 py-1.5 rounded-lg text-[12px] font-semibold border transition-all ${
                      visitLabel === l
                        ? 'border-brand-500 bg-brand-50 text-brand-600 border-[1.5px]'
                        : 'border-gray-200 text-gray-500 hover:border-brand-500 hover:text-brand-600'
                    }`}
                  >
                    {l}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setStep(1)}
                className="px-5 py-3 rounded-xl border border-gray-200 text-[13px] text-gray-500 hover:bg-gray-50 transition-colors"
              >
                ← Back
              </button>
              <button
                onClick={saveCard}
                disabled={loading}
                className="flex-1 py-3 rounded-xl bg-brand-500 text-white text-[13px] font-bold hover:bg-brand-600 transition-colors disabled:opacity-50"
              >
                {loading ? 'Saving…' : 'Save & continue →'}
              </button>
            </div>
          </div>

          {/* Live preview */}
          <div className="space-y-4">
            <div className="bg-white border border-gray-200 rounded-2xl p-5">
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-3">Live preview</p>
              <CardPreview
                name={merchant.business_name ?? ''}
                category={isIndividual ? merchant.trade ?? '' : merchant.category ?? ''}
                tiers={tiers}
                fallbackGoal={stampCount}
                visitLabel={visitLabel}
                isIndividual={isIndividual}
                logo={logoPreview}
              />
            </div>
            <div className="bg-white border border-gray-200 rounded-2xl p-5">
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Tip</p>
              <p className="text-[12px] text-gray-500 leading-relaxed">
                Start simple — one tier is fine. You can add more milestones later from the My Card page.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── STEP 3: PROFILE ─────────────────────────── */}
      {step === 3 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white border border-gray-200 rounded-2xl p-6 space-y-5">
            <div>
              <h2 className="text-[20px] font-bold text-gray-900">Complete your profile</h2>
              <p className="text-[13px] text-gray-500 mt-1">
                Customers see this when they find you in the Stampd app. More detail = more trust.
              </p>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-[13px] text-red-700">
                {error}
              </div>
            )}

            <div>
              <label className="block text-[13px] font-semibold text-gray-900 mb-1">
                {isIndividual ? 'Your name' : 'Business name'}
              </label>
              <input
                type="text"
                value={profile.business_name}
                onChange={e => setProfile(p => ({ ...p, business_name: e.target.value }))}
                placeholder={isIndividual ? 'Marcus Brown' : "Roscoe's Restaurant"}
                className={inputCls}
              />
            </div>

            <div>
              <label className="block text-[13px] font-semibold text-gray-900 mb-2">
                {isIndividual ? 'Your trade' : 'Category'}
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {categories.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setProfile(p => ({ ...p, category: cat }))}
                    className={`py-2 px-3 rounded-xl text-[12px] font-semibold border transition-all text-left ${
                      profile.category === cat
                        ? 'border-brand-500 bg-brand-50 text-brand-600 border-[1.5px]'
                        : 'border-gray-200 text-gray-500 hover:border-brand-500 hover:text-brand-600'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {isIndividual && (
              <div>
                <label className="block text-[13px] font-semibold text-gray-900 mb-1">
                  Where do you currently work? <span className="font-normal text-gray-400">(optional)</span>
                </label>
                <input
                  type="text"
                  value={profile.workplace}
                  onChange={e => setProfile(p => ({ ...p, workplace: e.target.value }))}
                  placeholder="@ Magnificent Barbershop, Freeport"
                  className={inputCls}
                />
                <p className="text-[12px] text-gray-400 mt-1">
                  Shown under your name in the app, so customers know where to find you. Update anytime if you move.
                </p>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[13px] font-semibold text-gray-900 mb-1">
                  {isIndividual ? 'Area / Location' : 'Address'}
                </label>
                <input
                  type="text"
                  value={profile.address}
                  onChange={e => setProfile(p => ({ ...p, address: e.target.value }))}
                  placeholder="East Mall Drive, Freeport"
                  className={inputCls}
                />
              </div>
              <div>
                <label className="block text-[13px] font-semibold text-gray-900 mb-1">
                  Phone <span className="font-normal text-gray-400">(optional)</span>
                </label>
                <input
                  type="tel"
                  value={profile.phone}
                  onChange={e => setProfile(p => ({ ...p, phone: e.target.value }))}
                  placeholder="(242) 000-0000"
                  className={inputCls}
                />
              </div>
            </div>

            <div>
              <label className="block text-[13px] font-semibold text-gray-900 mb-1">
                Description <span className="font-normal text-gray-400">(optional)</span>
              </label>
              <textarea
                value={profile.description}
                onChange={e => setProfile(p => ({ ...p, description: e.target.value }))}
                rows={3}
                placeholder={isIndividual
                  ? 'Tell customers about your style, specialties…'
                  : 'Tell customers what makes your business special…'}
                className={`${inputCls} resize-none`}
              />
            </div>

            {/* Logo upload */}
            <div>
              <label className="block text-[13px] font-semibold text-gray-900 mb-2">
                {isIndividual ? 'Profile photo' : 'Logo'} <span className="font-normal text-gray-400">(optional)</span>
              </label>
              <div className="flex items-center gap-4">
                {logoPreview ? (
                  <MerchantLogoBadge
                    src={logoPreview}
                    size={64}
                    className={`border border-gray-200 bg-white ${isIndividual ? 'rounded-full' : 'rounded-xl'}`}
                  />
                ) : (
                  <div className={`w-16 h-16 bg-gray-100 border border-gray-200 flex items-center justify-center text-[22px] font-bold text-brand-500 ${isIndividual ? 'rounded-full' : 'rounded-xl'}`}>
                    {(profile.business_name || '?')[0]?.toUpperCase()}
                  </div>
                )}
                <div>
                  <button
                    onClick={() => fileRef.current?.click()}
                    className="px-4 py-2 rounded-xl border border-gray-200 text-[13px] text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Upload photo
                  </button>
                  <p className="text-[12px] text-gray-400 mt-1">PNG or JPG, max 2MB</p>
                </div>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/png,image/jpeg"
                  className="hidden"
                  onChange={handleLogoChange}
                />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setStep(2)}
                className="px-5 py-3 rounded-xl border border-gray-200 text-[13px] text-gray-500 hover:bg-gray-50 transition-colors"
              >
                ← Back
              </button>
              <button
                onClick={saveProfile}
                disabled={loading}
                className="flex-1 py-3 rounded-xl bg-brand-500 text-white text-[13px] font-bold hover:bg-brand-600 transition-colors disabled:opacity-50"
              >
                {loading ? 'Saving…' : 'Save & continue →'}
              </button>
            </div>
          </div>

          {/* Profile completeness */}
          <div>
            <div className="bg-white border border-gray-200 rounded-2xl p-5">
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-3">Completeness</p>
              <div className="space-y-2.5 mb-3">
                {[
                  { label: 'Name', done: !!profile.business_name.trim() },
                  { label: 'Category', done: !!profile.category.trim() },
                  { label: 'Address', done: !!profile.address.trim() },
                  { label: 'Phone', done: !!profile.phone.trim() },
                  { label: 'Description', done: !!profile.description.trim() },
                  { label: 'Logo / Photo', done: !!logoPreview },
                ].map(({ label, done }) => (
                  <div key={label} className="flex items-center gap-2 text-[13px]">
                    {done
                      ? <Check size={13} className="text-green-600 shrink-0" />
                      : <span className="w-3 h-3 rounded-full border-[1.5px] border-gray-200 shrink-0" />}
                    <span className={done ? 'text-gray-800' : 'text-gray-400'}>{label}</span>
                  </div>
                ))}
              </div>
              {(() => {
                const fields = [
                  profile.business_name, profile.category, profile.address,
                  profile.phone, profile.description, logoPreview,
                ]
                const done = fields.filter(Boolean).length
                const pct = Math.round((done / fields.length) * 100)
                return (
                  <>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-brand-500 rounded-full transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <p className="text-[12px] text-gray-400 mt-1.5">{done} of {fields.length} fields complete</p>
                  </>
                )
              })()}
            </div>
          </div>
        </div>
      )}

      {/* ── STEP 4: DOWNLOAD + DONE ──────────────────── */}
      {step === 4 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white border border-gray-200 rounded-2xl p-6 space-y-6">
            {logoWarning && (
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-[12px] text-amber-800">
                {logoWarning}
              </div>
            )}
            <div>
              <h2 className="text-[20px] font-bold text-gray-900">Download the app</h2>
              <p className="text-[13px] text-gray-500 mt-1">
                Install Stampd Business on your phone to issue stamps at the counter. Your web dashboard handles everything else.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {[
                { icon: Apple, name: 'App Store', sub: 'iPhone & iPad', href: APP_STORE_URL },
                { icon: Play, name: 'Google Play', sub: 'Android', href: PLAY_STORE_URL },
              ].map(({ icon: Icon, name, sub, href }) => {
                const available = !!href
                const Wrapper = available ? 'a' : 'div'
                return (
                  <Wrapper
                    key={name}
                    {...(available ? { href, target: '_blank', rel: 'noopener noreferrer' } : {})}
                    className={`border border-gray-200 rounded-2xl p-5 flex flex-col items-center gap-3 text-center transition-colors ${
                      available ? 'hover:bg-gray-50' : 'opacity-70'
                    }`}
                  >
                    <div className="w-12 h-12 rounded-2xl bg-gray-100 border border-gray-200 flex items-center justify-center text-gray-700">
                      <Icon size={22} strokeWidth={1.5} />
                    </div>
                    <div>
                      <p className="text-[13px] font-bold text-gray-900">{name}</p>
                      <p className="text-[12px] text-gray-500">{sub}</p>
                    </div>
                    <span className={`w-full py-2 rounded-xl border border-gray-200 text-[12px] font-semibold ${
                      available ? 'text-gray-700 hover:bg-gray-100' : 'text-gray-400'
                    }`}>
                      {available ? 'Download' : 'Coming soon'}
                    </span>
                  </Wrapper>
                )
              })}
            </div>

            <div className="border-t border-gray-100 pt-5">
              <p className="text-[13px] font-bold text-gray-900 mb-3">Setup summary</p>
              <div className="space-y-2">
                {[
                  {
                    title: 'Card configured',
                    sub: (() => {
                      const t = existingCard?.reward_tiers
                      if (!t?.length) return 'No tiers set'
                      const sorted = [...t].sort((a, b) => a.sort_order - b.sort_order)
                      return sorted.map(r => `${r.stamp_threshold} stamps → ${r.reward_title}`).join(' · ')
                    })(),
                    done: hasCard,
                  },
                  {
                    title: 'Profile complete',
                    sub: merchant.business_name ?? 'Not set',
                    done: hasProfile,
                  },
                  {
                    title: 'Pending approval',
                    sub: "We'll be in touch when you're live",
                    done: isApproved,
                    pending: !isApproved,
                  },
                ].map(({ title, sub, done, pending }) => (
                  <div key={title} className={`flex items-center gap-3 p-3 rounded-xl border ${
                    done
                      ? 'border-green-200 bg-green-50'
                      : pending
                      ? 'border-amber-200 bg-amber-50'
                      : 'border-gray-200 bg-gray-50'
                  }`}>
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-[13px] shrink-0 ${
                      done ? 'bg-green-100 text-green-700' :
                      pending ? 'bg-amber-100 text-amber-600' :
                      'bg-white border border-gray-200 text-gray-400'
                    }`}>
                      {done ? <Check size={14} /> : pending ? <Clock size={14} /> : '○'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-semibold text-gray-900">{title}</p>
                      <p className="text-[12px] text-gray-500 truncate">{sub}</p>
                    </div>
                    <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full shrink-0 ${
                      done ? 'text-green-700 bg-green-100' :
                      pending ? 'text-amber-700 bg-amber-100' :
                      'text-gray-500 bg-white border border-gray-200'
                    }`}>
                      {done ? 'Done' : pending ? '~24 hrs' : 'To do'}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={() => {
                window.dispatchEvent(new Event('stampd:setup-complete'))
                navigate('/dashboard')
              }}
              className="w-full py-3 rounded-xl bg-brand-500 text-white text-[13px] font-bold hover:bg-brand-600 transition-colors focus-ring"
            >
              Go to Dashboard →
            </button>
          </div>

          {/* What's next */}
          <div className="space-y-3">
            <div className="bg-white border border-gray-200 rounded-2xl p-5 space-y-4">
              <div>
                <p className="text-[13px] font-bold text-gray-900 mb-1">You're in the queue</p>
                <p className="text-[12px] text-gray-500 leading-relaxed">
                  We'll review and activate your card in the consumer app — usually within 24 hours. We'll be in touch when you're live.
                </p>
              </div>
              <div className="space-y-2.5">
                {[
                  { step: '1', text: 'We review your business details' },
                  { step: '2', text: 'Your card goes live in the Stampd app' },
                  { step: '3', text: 'Customers can find and join your program' },
                ].map(({ step, text }) => (
                  <div key={step} className="flex items-start gap-3">
                    <div className="w-5 h-5 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center shrink-0 mt-0.5">
                      <span className="text-[10px] font-bold text-gray-500">{step}</span>
                    </div>
                    <p className="text-[12px] text-gray-600 leading-relaxed">{text}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-2xl p-5">
              <p className="text-[12px] font-semibold text-gray-700 mb-2.5">Explore while you wait</p>
              <div className="space-y-1.5">
                {[
                  { label: 'Add your staff', to: '/settings' },
                  { label: 'Configure your card', to: '/card' },
                  { label: 'View analytics', to: '/analytics' },
                  { label: 'See live activity', to: '/notifications' },
                ].map(({ label, to }) => (
                  <Link
                    key={label}
                    to={to}
                    className="flex items-center justify-between py-2 px-3 rounded-lg border border-gray-100 text-[12px] text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors"
                  >
                    {label}
                    <span className="text-gray-300">→</span>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
