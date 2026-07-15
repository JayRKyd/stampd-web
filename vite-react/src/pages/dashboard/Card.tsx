import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Gift, Upload, X, Plus } from 'lucide-react'
import { getStampIcon, STAMP_ICON_GROUPS } from '@/lib/stampIcons'
import { shade, isLightColor } from '@/lib/cardPreview'
import { resizeImage } from '@/lib/resizeImage'
import { MerchantLogoBadge } from '@/components/MerchantLogo'

const PRESET_COLORS = [
  { name: 'Teal', value: '#00605a' },
  { name: 'Navy', value: '#1e3a5f' },
  { name: 'Forest', value: '#2d5a3f' },
  { name: 'Charcoal', value: '#2c2c2c' },
  { name: 'Wine', value: '#6b2d4a' },
  { name: 'Indigo', value: '#3d3d8e' },
  { name: 'Slate', value: '#4a5568' },
  { name: 'Espresso', value: '#3e2723' },
]

type Tier = { stamps: string; reward: string }

export default function Card() {
  const [merchantId, setMerchantId] = useState('')
  const [cardId, setCardId] = useState('')
  const [businessName, setBusinessName] = useState('Your Business')

  const [tiers, setTiers] = useState<Tier[]>([{ stamps: '10', reward: 'Free Coffee' }])
  const [tierError, setTierError] = useState('')
  const [rewardDescription, setRewardDescription] = useState('Get a free coffee of any size on us!')
  const [cardColor, setCardColor] = useState('#00605a')
  const [stampIcon, setStampIcon] = useState('star')
  const [logo, setLogo] = useState<string | null>(null)
  const [logoFile, setLogoFile] = useState<File | null>(null)

  const [pageLoading, setPageLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setPageLoading(false); return }

      const { data: merchant } = await supabase
        .from('merchants')
        .select('id, business_name, logo_url')
        .eq('owner_id', user.id)
        .maybeSingle()

      if (!merchant) { setPageLoading(false); return }
      setMerchantId(merchant.id)
      setBusinessName(merchant.business_name ?? 'Your Business')
      if (merchant.logo_url) setLogo(merchant.logo_url)

      const { data: card } = await supabase
        .from('loyalty_cards')
        .select('id, stamp_count_required, reward_title, reward_description, card_color, stamp_icon')
        .eq('merchant_id', merchant.id)
        .maybeSingle()

      if (card) {
        setCardId(card.id)
        setRewardDescription(card.reward_description ?? '')
        if (card.card_color) setCardColor(card.card_color)
        if (card.stamp_icon) setStampIcon(card.stamp_icon)

        // Tiers are the source of truth; the flat card fields only mirror
        // the final tier. Fall back to them for legacy cards with no tiers.
        const { data: tierRows } = await supabase
          .from('reward_tiers')
          .select('stamp_threshold, reward_title')
          .eq('loyalty_card_id', card.id)
          .order('stamp_threshold', { ascending: true })

        if (tierRows && tierRows.length > 0) {
          setTiers(tierRows.map(t => ({ stamps: String(t.stamp_threshold), reward: t.reward_title })))
        } else {
          setTiers([{ stamps: String(card.stamp_count_required ?? 10), reward: card.reward_title ?? '' }])
        }
      }

      setPageLoading(false)
    }
    load()
  }, [])

  const updateTier = (index: number, field: keyof Tier, value: string) => {
    setTiers(prev => prev.map((t, i) => i === index ? { ...t, [field]: value } : t))
    setTierError('')
  }

  const addTier = () => setTiers(prev => [...prev, { stamps: '', reward: '' }])

  const removeTier = (index: number) => {
    if (tiers.length === 1) return
    setTiers(prev => prev.filter((_, i) => i !== index))
    setTierError('')
  }

  const handleSave = async () => {
    if (!merchantId) return

    const validTiers = tiers.filter(t => t.stamps && parseInt(t.stamps) > 0 && t.reward.trim())
    if (!validTiers.length) { setTierError('Add at least one reward tier'); return }
    const sorted = [...validTiers].sort((a, b) => parseInt(a.stamps) - parseInt(b.stamps))
    const hasDescending = sorted.some((t, i) =>
      i > 0 && parseInt(t.stamps) <= parseInt(sorted[i - 1].stamps)
    )
    if (hasDescending) { setTierError('Each tier needs more stamps than the one before it'); return }

    setTierError('')
    setSaving(true)
    const supabase = createClient()

    setUploadError('')
    try {
      if (logoFile) {
        const ext = (logoFile.name.split('.').pop() || 'png').toLowerCase()
        const path = `merchants/${merchantId}/logo.${ext}`
        const { error: storageErr } = await supabase.storage
          .from('merchant-assets')
          .upload(path, logoFile, { upsert: true, contentType: logoFile.type || undefined })
        if (storageErr) {
          setUploadError(`Logo upload failed: ${storageErr.message}`)
          setSaving(false)
          return
        }
        const { data: { publicUrl } } = supabase.storage
          .from('merchant-assets')
          .getPublicUrl(path)
        await supabase.from('merchants').update({ logo_url: publicUrl }).eq('id', merchantId)
        setLogo(publicUrl)
        setLogoFile(null)
      }

      // Flat card columns mirror the FINAL tier (full card size + top reward);
      // the stamp trigger awards every intermediate tier from reward_tiers.
      const finalTier = sorted[sorted.length - 1]
      const cardData = {
        merchant_id: merchantId,
        stamp_count_required: parseInt(finalTier.stamps),
        reward_title: finalTier.reward.trim(),
        reward_description: rewardDescription || null,
        card_color: cardColor,
        stamp_icon: stampIcon,
      }

      let activeCardId = cardId

      if (cardId) {
        await supabase.from('loyalty_cards').update(cardData).eq('id', cardId)
      } else {
        const { data } = await supabase.from('loyalty_cards')
          .insert(cardData).select('id').maybeSingle()
        if (data) {
          activeCardId = data.id
          setCardId(data.id)
        }
      }

      // Replace the tier set wholesale — same strategy as onboarding.
      // (rewards.reward_tier_id is ON DELETE SET NULL, so earned rewards survive.)
      if (activeCardId) {
        const { error: delError } = await supabase
          .from('reward_tiers').delete().eq('loyalty_card_id', activeCardId)
        if (delError) { setTierError('Could not save tiers — try again.'); return }

        const { error: insError } = await supabase.from('reward_tiers').insert(
          sorted.map((t, i) => ({
            loyalty_card_id: activeCardId,
            stamp_threshold: parseInt(t.stamps),
            reward_title: t.reward.trim(),
            sort_order: i + 1,
          }))
        )
        if (insError) { setTierError('Could not save tiers — try again.'); return }
      }

      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } finally {
      setSaving(false)
    }
  }

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const resized = await resizeImage(file, 512)
      setLogoFile(resized)
      const reader = new FileReader()
      reader.onloadend = () => setLogo(reader.result as string)
      reader.readAsDataURL(resized)
    }
  }

  if (pageLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  // Card size + headline reward derive from the tiers: the highest threshold
  // is the full card, the highest complete tier is the reward shown on the face
  const tiersWithStamps = tiers.filter(t => t.stamps && parseInt(t.stamps) > 0)
  const stampsRequired = tiersWithStamps.length
    ? Math.max(...tiersWithStamps.map(t => parseInt(t.stamps)))
    : 10
  const sortedValidTiers = tiers
    .filter(t => t.stamps && parseInt(t.stamps) > 0 && t.reward.trim())
    .sort((a, b) => parseInt(a.stamps) - parseInt(b.stamps))
  const rewardTitle = sortedValidTiers.length
    ? sortedValidTiers[sortedValidTiers.length - 1].reward.trim()
    : ''

  // Preview state, mirroring mobile StampCard: adaptive text on the brand
  // color, half-filled stamps, gift in the last slot
  const dark = shade(cardColor, 0.3)
  const light = isLightColor(cardColor)
  const textOnBrand = light ? dark : '#ffffff'
  const previewFilled = Math.max(1, Math.floor(stampsRequired / 2))
  const previewLeft = stampsRequired - previewFilled
  const initials = businessName.split(' ').slice(0, 2).map(w => w[0]?.toUpperCase() ?? '').join('')
  const PreviewStampIcon = getStampIcon(stampIcon)

  return (
    <div className="animate-enter">
      <div className="mb-6">
        <h1 className="text-[22px] font-semibold text-gray-900 tracking-[-0.02em]">My Card</h1>
        <p className="text-[13px] text-gray-500 mt-0.5">Design the card your customers carry — changes go live in the app when you save.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Live preview — exact replica of the mobile StampCard */}
        <div>
          <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">
            Live preview · what customers see
          </p>
          {/* Cream backdrop = the app's sheet background */}
          <div className="rounded-2xl p-6 sm:p-8" style={{ backgroundColor: '#F7F2E8' }}>
            <div
              className="rounded-[20px] overflow-hidden shadow-md max-w-[360px] mx-auto"
              style={{ backgroundColor: cardColor }}
            >
              {/* Header */}
              <div className="flex items-center gap-3 px-4 pt-4 pb-1">
                <div className="h-11 w-11 rounded-xl bg-white flex items-center justify-center overflow-hidden shrink-0">
                  {logo ? (
                    <img src={logo} alt="" className="h-full w-full object-contain" />
                  ) : (
                    <span className="text-[15px] font-extrabold" style={{ color: dark }}>{initials}</span>
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-[16px] font-extrabold tracking-[-0.02em] truncate" style={{ color: textOnBrand }}>
                    {businessName}
                  </p>
                  <p className="text-[12px] font-medium truncate" style={{ color: textOnBrand, opacity: 0.75 }}>
                    Loyalty Card
                  </p>
                </div>
              </div>

              {/* Stamp field */}
              <div className="flex flex-wrap gap-2.5 px-4 py-4">
                {Array.from({ length: stampsRequired }).map((_, i) => {
                  const filled = i < previewFilled
                  const isReward = i === stampsRequired - 1
                  if (isReward) {
                    return (
                      <div
                        key={i}
                        className="h-[42px] w-[42px] rounded-full flex items-center justify-center"
                        style={{ backgroundColor: 'rgba(255,255,255,0.92)' }}
                      >
                        <Gift size={18} style={{ color: dark }} />
                      </div>
                    )
                  }
                  return (
                    <div
                      key={i}
                      className="h-[42px] w-[42px] rounded-full flex items-center justify-center"
                      style={{ backgroundColor: filled ? dark : 'rgba(0,0,0,0.12)' }}
                    >
                      <PreviewStampIcon
                        size={18}
                        strokeWidth={2.2}
                        color={filled ? '#fff' : (light ? 'rgba(0,0,0,0.30)' : 'rgba(255,255,255,0.40)')}
                      />
                    </div>
                  )
                })}
              </div>

              {/* Caption */}
              <p className="px-3.5 pb-3.5 text-center text-[13px] font-bold truncate" style={{ color: textOnBrand }}>
                {previewLeft} more stamp{previewLeft !== 1 ? 's' : ''} to get {rewardTitle || 'your reward'}
              </p>
            </div>

            <p className="text-center text-[11px] text-gray-400 mt-4">
              Shown with {previewFilled} of {stampsRequired} stamps earned
            </p>
          </div>

          {/* Milestones live in the app's card detail, not on the card face */}
          {sortedValidTiers.length > 1 && (
            <div className="mt-3 px-1 space-y-1.5">
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Milestones</p>
              {sortedValidTiers.map((t, i) => (
                <div key={i} className="flex items-center justify-between text-[12px]">
                  <span className="text-gray-500">{t.stamps} stamps</span>
                  <span className="font-semibold text-gray-700 truncate max-w-[60%]">{t.reward}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Settings */}
        <div>
          <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Settings</p>
          <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-5">
            {/* Color picker */}
            <div>
              <label className="block text-[12px] font-medium text-gray-600 mb-2">
                Card Color
              </label>
              <div className="flex items-center gap-2 flex-wrap">
                {PRESET_COLORS.map((color) => (
                  <button
                    key={color.value}
                    onClick={() => setCardColor(color.value)}
                    className="h-8 w-8 rounded-full transition-all hover:scale-110"
                    style={{
                      backgroundColor: color.value,
                      boxShadow: cardColor === color.value
                        ? `0 0 0 2px white, 0 0 0 4px ${color.value}`
                        : 'none',
                    }}
                    title={color.name}
                  />
                ))}
                <div className="relative">
                  <input
                    type="color"
                    value={cardColor}
                    onChange={(e) => setCardColor(e.target.value)}
                    className="absolute inset-0 opacity-0 cursor-pointer w-8 h-8"
                  />
                  <div className="h-8 w-8 rounded-full border-2 border-dashed border-gray-300 flex items-center justify-center cursor-pointer hover:border-gray-400 transition-colors">
                    <Plus size={12} className="text-gray-400" />
                  </div>
                </div>
              </div>
            </div>

            {/* Stamp Icon */}
            <div>
              <label className="block text-[12px] font-medium text-gray-600 mb-2">
                Stamp Icon
              </label>
              <div className="max-h-52 overflow-y-auto space-y-3 pr-1">
                {STAMP_ICON_GROUPS.map((group) => (
                  <div key={group.label}>
                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
                      {group.label}
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {group.keys.map((key) => {
                        const IconComp = getStampIcon(key)
                        const isSelected = stampIcon === key
                        return (
                          <button
                            key={key}
                            onClick={() => setStampIcon(key)}
                            title={key}
                            className="h-9 w-9 rounded-lg flex items-center justify-center transition-all hover:scale-110"
                            style={{
                              backgroundColor: isSelected ? cardColor : '#f3f4f6',
                              boxShadow: isSelected
                                ? `0 0 0 2px white, 0 0 0 3.5px ${cardColor}`
                                : 'none',
                            }}
                          >
                            <IconComp
                              size={16}
                              strokeWidth={1.8}
                              color={isSelected ? '#fff' : '#6b7280'}
                            />
                          </button>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Logo upload */}
            <div>
              <label className="block text-[12px] font-medium text-gray-600 mb-1.5">
                Logo
              </label>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                onChange={handleLogoUpload}
                className="hidden"
              />
              {logo ? (
                <div className="flex items-center gap-3">
                  <MerchantLogoBadge src={logo} size={40} className="border border-gray-200 bg-white" />
                  <button
                    onClick={() => fileRef.current?.click()}
                    className="text-[12px] text-gray-600 font-medium hover:underline"
                  >
                    Replace
                  </button>
                  <button
                    onClick={() => { setLogo(null); setLogoFile(null) }}
                    className="text-[12px] text-red-600 font-medium hover:underline flex items-center gap-1"
                  >
                    <X size={12} />
                    Remove
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => fileRef.current?.click()}
                  className="flex items-center gap-2 px-3 py-2.5 rounded-lg border border-dashed border-gray-300 hover:border-gray-400 hover:bg-gray-50 transition-all text-[12px] text-gray-500"
                >
                  <Upload size={14} />
                  Upload logo
                </button>
              )}
            </div>

            {/* Reward tiers */}
            <div>
              <label className="block text-[12px] font-medium text-gray-600 mb-1">
                Reward Tiers
              </label>
              <p className="text-[11px] text-gray-400 mb-2">
                One tier = simple program. Add more for milestones (e.g. 5 = 25% off, 10 = free item).
                Your highest tier sets the full card size.
              </p>
              <div className="space-y-2">
                {tiers.map((tier, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-2"
                  >
                    <div className="w-5 h-5 rounded-full bg-brand-500 text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                      {i + 1}
                    </div>
                    <input
                      type="number"
                      min={1}
                      max={50}
                      value={tier.stamps}
                      onChange={(e) => {
                        const val = e.target.value
                        if (val === '' || (parseInt(val) >= 1 && parseInt(val) <= 50)) {
                          updateTier(i, 'stamps', val)
                        }
                      }}
                      placeholder="Stamps"
                      className="w-[70px] bg-white border border-gray-200 rounded-lg px-2 py-1.5 text-[13px] text-gray-900 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/20 shrink-0"
                    />
                    <input
                      type="text"
                      value={tier.reward}
                      onChange={(e) => updateTier(i, 'reward', e.target.value)}
                      placeholder="Reward (e.g. Free Coffee, 25% off)"
                      className="flex-1 min-w-0 bg-white border border-gray-200 rounded-lg px-2 py-1.5 text-[13px] text-gray-900 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/20"
                    />
                    {tiers.length > 1 && (
                      <button
                        onClick={() => removeTier(i)}
                        className="text-gray-400 hover:text-red-500 transition-colors p-1"
                        aria-label="Remove tier"
                      >
                        <X size={13} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <button
                onClick={addTier}
                className="flex items-center gap-1 text-[12px] text-brand-500 font-semibold mt-2 hover:opacity-70 transition-opacity"
              >
                <Plus size={13} /> Add another tier
              </button>
              {tierError && (
                <p className="text-[12px] text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2.5 mt-2">
                  {tierError}
                </p>
              )}
            </div>

            {/* Reward description */}
            <div>
              <label className="block text-[12px] font-medium text-gray-600 mb-1.5">
                Reward Description <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <textarea
                value={rewardDescription}
                onChange={(e) => setRewardDescription(e.target.value)}
                rows={2}
                placeholder="Any size, any style — on us."
                className="w-full px-3 py-2.5 rounded-lg border border-gray-200 bg-gray-50 text-[13px] focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/20 transition-all resize-none placeholder:text-gray-300"
              />
            </div>

            {uploadError && (
              <p className="text-[12px] text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2.5">
                {uploadError}
              </p>
            )}

            <button
              onClick={handleSave}
              disabled={saving || !merchantId}
              className={`w-full py-3 rounded-xl text-[14px] font-semibold transition-colors disabled:opacity-50 focus-ring ${
                saved
                  ? 'bg-green-600 text-white'
                  : 'bg-brand-500 text-white hover:bg-brand-600'
              }`}
            >
              {saving ? 'Saving…' : saved ? 'Saved ✓' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
