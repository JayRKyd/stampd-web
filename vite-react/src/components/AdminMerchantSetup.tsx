import { useState, useEffect, useRef, useCallback } from 'react'
import { X, Upload, Image as ImageIcon, Plus, Trash2, Store, Check } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { resizeImage } from '@/lib/resizeImage'

interface Tier { stamps: string; reward: string }

interface Props {
  merchantId: string
  merchantName: string
  onClose: () => void
  onSaved: () => void
}

// Read a File as base64 (no data: prefix) for the upload edge function
function fileToB64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onerror = () => reject(new Error('read failed'))
    r.onloadend = () => resolve(String(r.result).split(',')[1] ?? '')
    r.readAsDataURL(file)
  })
}

export function AdminMerchantSetup({ merchantId, merchantName, onClose, onSaved }: Props) {
  const [loading, setLoading] = useState(true)
  const [logoUrl, setLogoUrl] = useState<string | null>(null)
  const [coverUrl, setCoverUrl] = useState<string | null>(null)
  const [uploading, setUploading] = useState<'logo' | 'cover' | null>(null)
  const [tiers, setTiers] = useState<Tier[]>([{ stamps: '10', reward: '' }])
  const [visitLabel, setVisitLabel] = useState('')
  const [saving, setSaving] = useState(false)
  const [savedOk, setSavedOk] = useState(false)
  const [error, setError] = useState('')

  const logoInput = useRef<HTMLInputElement>(null)
  const coverInput = useRef<HTMLInputElement>(null)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data } = await supabase.rpc('admin_get_merchant_setup', { p_merchant_id: merchantId })
      if (data?.ok) {
        setLogoUrl(data.merchant?.logo_url ?? null)
        setCoverUrl(data.merchant?.cover_image_url ?? null)
        setVisitLabel(data.merchant?.merchant_type === 'individual' ? '' : '')
        if (data.card) {
          setVisitLabel(data.card.visit_label ?? '')
          const t = (data.card.tiers ?? []) as { stamp_threshold: number; reward_title: string }[]
          if (t.length) setTiers(t.map(x => ({ stamps: String(x.stamp_threshold), reward: x.reward_title })))
        }
      } else {
        setError('Could not load this merchant.')
      }
      setLoading(false)
    }
    load()
  }, [merchantId])

  const upload = useCallback(async (kind: 'logo' | 'cover', file: File) => {
    setUploading(kind)
    setError('')
    try {
      const resized = await resizeImage(file, kind === 'logo' ? 512 : 1600,
        kind === 'logo' ? { trimWhitespace: true } : undefined)
      const b64 = await fileToB64(resized)
      const supabase = createClient()
      const { data, error: fnErr } = await supabase.functions.invoke('admin-upload-merchant-asset', {
        body: { merchant_id: merchantId, kind, contentType: resized.type, b64 },
      })
      if (fnErr || !data?.ok) { setError(`Could not upload ${kind}.`); return }
      if (kind === 'logo') setLogoUrl(data.url); else setCoverUrl(data.url)
    } catch {
      setError(`Could not process the ${kind} image.`)
    } finally {
      setUploading(null)
    }
  }, [merchantId])

  const saveCard = async () => {
    const clean = tiers
      .map(t => ({ stamps: parseInt(t.stamps), reward: t.reward.trim() }))
      .filter(t => t.stamps > 0 && t.reward)
    if (!clean.length) { setError('Add at least one reward tier (stamps + what they earn).'); return }
    setSaving(true)
    setError('')
    const supabase = createClient()
    const top = clean.reduce((a, b) => (b.stamps > a.stamps ? b : a))
    const { data, error: rpcErr } = await supabase.rpc('admin_save_merchant_card', {
      p_merchant_id: merchantId,
      p_stamp_count: top.stamps,
      p_visit_label: visitLabel.trim() || null,
      p_card_color: '#00605a',
      p_tiers: clean,
    })
    setSaving(false)
    if (rpcErr || !data?.ok) { setError('Could not save the card.'); return }
    setSavedOk(true)
    onSaved()
    setTimeout(() => setSavedOk(false), 2500)
  }

  return (
    <>
      <div className="fixed inset-0 z-40 bg-gray-950/30" onClick={onClose} />
      <aside className="fixed inset-y-0 right-0 z-50 w-full max-w-[460px] bg-white shadow-2xl flex flex-col animate-enter">
        <div className="flex items-center gap-3 p-5 border-b border-gray-100 shrink-0">
          <div className="w-10 h-10 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center shrink-0">
            <Store size={18} />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-[16px] font-bold text-gray-900 truncate">{merchantName}</h2>
            <p className="text-[12px] text-gray-500">Set up on their behalf</p>
          </div>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-700 transition-colors">
            <X size={18} />
          </button>
        </div>

        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-5 space-y-6">
            {/* Cover */}
            <div>
              <p className="text-[13px] font-semibold text-gray-800 mb-1.5">Cover photo</p>
              <div
                onClick={() => coverInput.current?.click()}
                className="relative h-32 rounded-xl border border-gray-200 bg-gray-50 overflow-hidden cursor-pointer hover:border-brand-400 transition-colors flex items-center justify-center"
              >
                {coverUrl ? (
                  <img src={coverUrl} alt="cover" className="w-full h-full object-cover" />
                ) : (
                  <div className="text-center text-gray-400">
                    <ImageIcon size={22} className="mx-auto mb-1" />
                    <span className="text-[12px]">Tap to upload cover</span>
                  </div>
                )}
                {uploading === 'cover' && (
                  <div className="absolute inset-0 bg-white/70 flex items-center justify-center">
                    <div className="w-5 h-5 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
                  </div>
                )}
              </div>
              <input ref={coverInput} type="file" accept="image/*" className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) upload('cover', f); e.target.value = '' }} />
            </div>

            {/* Logo */}
            <div>
              <p className="text-[13px] font-semibold text-gray-800 mb-1.5">Logo</p>
              <div className="flex items-center gap-4">
                <div
                  onClick={() => logoInput.current?.click()}
                  className="relative w-20 h-20 rounded-xl border border-gray-200 bg-gray-50 overflow-hidden cursor-pointer hover:border-brand-400 transition-colors flex items-center justify-center shrink-0"
                >
                  {logoUrl ? (
                    <img src={logoUrl} alt="logo" className="w-full h-full object-contain p-1.5" />
                  ) : (
                    <ImageIcon size={20} className="text-gray-400" />
                  )}
                  {uploading === 'logo' && (
                    <div className="absolute inset-0 bg-white/70 flex items-center justify-center">
                      <div className="w-5 h-5 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
                    </div>
                  )}
                </div>
                <button
                  onClick={() => logoInput.current?.click()}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 text-[13px] font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <Upload size={14} /> {logoUrl ? 'Replace logo' : 'Upload logo'}
                </button>
              </div>
              <p className="text-[11px] text-gray-400 mt-1.5">Whitespace is trimmed automatically so it fills the tile.</p>
              <input ref={logoInput} type="file" accept="image/*" className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) upload('logo', f); e.target.value = '' }} />
            </div>

            {/* Card */}
            <div className="pt-2 border-t border-gray-100">
              <p className="text-[13px] font-semibold text-gray-800 mb-1">Loyalty card</p>
              <p className="text-[12px] text-gray-500 mb-3">One tier is a simple program. Add more for milestones.</p>
              <div className="space-y-2">
                {tiers.map((t, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <div className="flex items-center gap-1 shrink-0">
                      <input
                        type="number" min="1" value={t.stamps}
                        onChange={e => setTiers(prev => prev.map((x, j) => j === i ? { ...x, stamps: e.target.value } : x))}
                        className="w-14 px-2 py-2 rounded-lg border border-gray-200 text-[13px] text-center focus:outline-none focus:border-brand-500"
                      />
                      <span className="text-[12px] text-gray-400">→</span>
                    </div>
                    <input
                      type="text" value={t.reward} placeholder="What they earn (e.g. Free smoothie)"
                      onChange={e => setTiers(prev => prev.map((x, j) => j === i ? { ...x, reward: e.target.value } : x))}
                      className="flex-1 min-w-0 px-3 py-2 rounded-lg border border-gray-200 text-[13px] focus:outline-none focus:border-brand-500"
                    />
                    {tiers.length > 1 && (
                      <button onClick={() => setTiers(prev => prev.filter((_, j) => j !== i))}
                        className="p-1.5 text-gray-300 hover:text-red-500 transition-colors shrink-0">
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <button onClick={() => setTiers(prev => [...prev, { stamps: '', reward: '' }])}
                className="flex items-center gap-1 text-[12px] font-semibold text-brand-600 hover:text-brand-700 mt-2.5 transition-colors">
                <Plus size={13} /> Add another tier
              </button>

              <div className="mt-4">
                <p className="text-[12px] text-gray-600 mb-1">What do you call a visit? <span className="text-gray-400">(optional)</span></p>
                <input
                  type="text" value={visitLabel} placeholder="stamp, visit, cut, order…"
                  onChange={e => setVisitLabel(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 text-[13px] focus:outline-none focus:border-brand-500"
                />
              </div>
            </div>

            {error && <p className="text-[12px] text-red-600 bg-red-50 rounded-lg px-3 py-2.5">{error}</p>}
          </div>
        )}

        {!loading && (
          <div className="p-5 border-t border-gray-100 shrink-0">
            <button
              onClick={saveCard}
              disabled={saving}
              className={`w-full py-3 rounded-xl text-[14px] font-bold transition-colors disabled:opacity-60 ${
                savedOk ? 'bg-green-600 text-white' : 'bg-brand-500 text-white hover:bg-brand-600'
              }`}
            >
              {saving ? 'Saving…' : savedOk ? <span className="inline-flex items-center gap-1.5"><Check size={15} /> Saved</span> : 'Save card'}
            </button>
            <p className="text-[11px] text-gray-400 text-center mt-2">
              Images save the moment you upload. This button saves the card.
            </p>
          </div>
        )}
      </aside>
    </>
  )
}
