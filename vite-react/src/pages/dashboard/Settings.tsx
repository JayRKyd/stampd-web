import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Trash2, Lock, KeyRound, Upload, X, Monitor, Smartphone, Share } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { BUSINESS_CATEGORIES, normalizeCategory } from '@/lib/categories'
import { resizeImage } from '@/lib/resizeImage'
import { enterKioskMode } from '@/lib/kioskMode'

interface StaffMember {
  id: string
  name: string
  // presence only — PINs are hashed server-side and never sent to the client
  has_pin: boolean
  is_active: boolean
}

export default function Settings() {
  const navigate = useNavigate()
  const [merchantId, setMerchantId] = useState('')
  const [form, setForm] = useState({
    businessName: '',
    category: '',
    address: '',
    phone: '',
    website: '',
    description: '',
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  // PWA install: Chrome/Android hand us a deferred prompt we can trigger from
  // a button; iOS Safari has no API, so we show Add-to-Home-Screen steps
  const [installPrompt, setInstallPrompt] = useState<{ prompt: () => Promise<unknown> } | null>(null)
  const [justInstalled, setJustInstalled] = useState(false)
  const isStandalone = typeof window !== 'undefined' &&
    window.matchMedia?.('(display-mode: standalone)').matches
  const isIOS = typeof navigator !== 'undefined' && /iphone|ipad|ipod/i.test(navigator.userAgent)

  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault()
      setInstallPrompt(e as unknown as { prompt: () => Promise<unknown> })
    }
    const onInstalled = () => { setJustInstalled(true); setInstallPrompt(null) }
    window.addEventListener('beforeinstallprompt', onPrompt)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  // Cover photo: the hero image across the top of the merchant page in the app
  const [coverUrl, setCoverUrl] = useState<string | null>(null)
  const [coverFile, setCoverFile] = useState<File | null>(null)
  const [coverLocalPreview, setCoverLocalPreview] = useState<string | null>(null)
  const [coverError, setCoverError] = useState('')
  const coverRef = useRef<HTMLInputElement>(null)

  // Staff & stamping settings
  const [staff, setStaff] = useState<StaffMember[]>([])
  const [newStaffName, setNewStaffName] = useState('')
  const [newStaffPin, setNewStaffPin] = useState('')
  const [addingStaff, setAddingStaff] = useState(false)
  const [staffError, setStaffError] = useState('')
  const [firstStaffAdded, setFirstStaffAdded] = useState(false)

  // PIN reset: PINs are hashed, so a forgotten one can't be shown — the
  // owner sets a fresh one here instead of removing and re-adding the person
  const [resetPinId, setResetPinId] = useState<string | null>(null)
  const [resetPinValue, setResetPinValue] = useState('')
  const [savingResetPin, setSavingResetPin] = useState(false)

  const handleResetPin = async (id: string) => {
    if (resetPinValue.length < 4 || savingResetPin) return
    setSavingResetPin(true)
    setStaffError('')
    const supabase = createClient()
    const { data, error } = await supabase
      .from('staff')
      .update({ pin: resetPinValue })
      .eq('id', id)
      .select('id, name, has_pin, is_active')
      .single()
    setSavingResetPin(false)
    if (error || !data) {
      setStaffError(error?.message ?? 'Could not update the PIN')
      return
    }
    setStaff(prev => prev.map(s => (s.id === id ? data : s)))
    setResetPinId(null)
    setResetPinValue('')
  }
  const [requirePin, setRequirePin] = useState(false)
  const [cooldown, setCooldown] = useState(5)
  const [savingStamping, setSavingStamping] = useState(false)
  const [savedStamping, setSavedStamping] = useState(false)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoading(false); return }

      const { data: merchant } = await supabase
        .from('merchants')
        .select('id, business_name, category, address, phone, website, description, cover_image_url, require_staff_pin, stamp_cooldown_minutes')
        .eq('owner_id', user.id)
        .maybeSingle()

      if (merchant) {
        setMerchantId(merchant.id)
        setForm({
          businessName: merchant.business_name ?? '',
          category: normalizeCategory(merchant.category),
          address: merchant.address ?? '',
          phone: merchant.phone ?? '',
          website: merchant.website ?? '',
          description: merchant.description ?? '',
        })
        setCoverUrl(merchant.cover_image_url ?? null)
        setRequirePin(!!merchant.require_staff_pin)
        setCooldown(merchant.stamp_cooldown_minutes ?? 5)

        const { data: staffRows } = await supabase
          .from('staff')
          .select('id, name, has_pin, is_active')
          .eq('merchant_id', merchant.id)
          .eq('is_active', true)
          .order('created_at')
        setStaff(staffRows ?? [])
      }
      setLoading(false)
    }
    load()
  }, [])

  const handleCoverChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    // Covers are hero images — keep more resolution than a logo
    const resized = await resizeImage(file, 1600)
    if (resized.size > 4 * 1024 * 1024) {
      setCoverError('Photo is too large — try a smaller image.')
      e.target.value = ''
      return
    }
    setCoverError('')
    setCoverFile(resized)
    setCoverLocalPreview(URL.createObjectURL(resized))
  }

  const handleRemoveCover = () => {
    setCoverUrl(null)
    setCoverFile(null)
    setCoverLocalPreview(null)
    setCoverError('')
  }

  const handleSave = async () => {
    if (!merchantId) return
    setSaving(true)
    const supabase = createClient()

    let cover_image_url = coverUrl
    if (coverFile) {
      const ext = (coverFile.name.split('.').pop() || 'jpg').toLowerCase()
      const path = `merchants/${merchantId}/cover.${ext}`
      const { error: upErr } = await supabase.storage
        .from('merchant-assets')
        .upload(path, coverFile, { upsert: true, contentType: coverFile.type || undefined })
      if (upErr) {
        setCoverError('Cover photo upload failed — your other changes were still saved.')
      } else {
        const { data: { publicUrl } } = supabase.storage
          .from('merchant-assets')
          .getPublicUrl(path)
        // Cache-bust: the app caches images by URL, and replacing the file
        // at the same path would otherwise keep showing the old photo
        cover_image_url = `${publicUrl}?v=${Date.now()}`
        setCoverUrl(cover_image_url)
        setCoverFile(null)
        setCoverLocalPreview(null)
      }
    }

    await supabase.from('merchants').update({
      business_name: form.businessName,
      category: form.category || null,
      address: form.address || null,
      phone: form.phone || null,
      website: form.website || null,
      description: form.description || null,
      cover_image_url,
    }).eq('id', merchantId)
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const handleAddStaff = async () => {
    const name = newStaffName.trim()
    if (!name || !merchantId) return
    if (newStaffPin && newStaffPin.length !== 4) {
      setStaffError('Staff PIN must be exactly 4 digits')
      return
    }
    setAddingStaff(true)
    setStaffError('')
    setFirstStaffAdded(false)
    const supabase = createClient()
    const { data, error } = await supabase
      .from('staff')
      .insert({ merchant_id: merchantId, name, pin: newStaffPin || null })
      .select('id, name, has_pin, is_active')
      .single()
    setAddingStaff(false)
    if (error || !data) {
      setStaffError(error?.message ?? 'Could not add staff member')
      return
    }
    if (staff.length === 0) setFirstStaffAdded(true)
    setStaff(prev => [...prev, data])
    setNewStaffName('')
    setNewStaffPin('')
  }

  const handleRemoveStaff = async (id: string) => {
    const supabase = createClient()
    // Deactivate instead of delete so historical stamp events keep attribution
    const { error } = await supabase.from('staff').update({ is_active: false }).eq('id', id)
    if (!error) setStaff(prev => prev.filter(s => s.id !== id))
  }

  const handleSaveStamping = async () => {
    if (!merchantId) return
    setSavingStamping(true)
    const supabase = createClient()
    await supabase.from('merchants').update({
      require_staff_pin: requirePin,
      stamp_cooldown_minutes: Math.min(60, Math.max(0, cooldown)),
    }).eq('id', merchantId)
    setSavingStamping(false)
    setSavedStamping(true)
    setTimeout(() => setSavedStamping(false), 2000)
  }

  const inputClass = "w-full px-3 py-2.5 rounded-lg border border-gray-200 bg-gray-50 text-[13px] text-gray-900 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/20 transition-all placeholder:text-gray-300"

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="animate-enter">
      <div className="mb-6">
        <h1 className="text-[22px] font-semibold text-gray-900 tracking-[-0.02em]">Settings</h1>
        <p className="text-[13px] text-gray-500 mt-0.5">Your business profile, team, and stamping guardrails.</p>
      </div>

      <div className="space-y-10">
        {/* ── Business profile ── */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-8">
          <div>
            <h2 className="text-[15px] font-semibold text-gray-900">Business profile</h2>
            <p className="text-[12px] text-gray-500 mt-1 leading-relaxed">
              This is your page in the Stampd app. The address and phone power
              the Directions and Call buttons customers see — keep them current.
            </p>
          </div>

          <div className="lg:col-span-2 bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[12px] font-medium text-gray-600 mb-1.5">Business Name</label>
                <input
                  type="text"
                  value={form.businessName}
                  onChange={(e) => setForm({ ...form, businessName: e.target.value })}
                  className={inputClass}
                />
              </div>

              <div>
                <label className="block text-[12px] font-medium text-gray-600 mb-1.5">Category</label>
                <select
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  className={inputClass}
                >
                  <option value="" disabled>Select a category</option>
                  {/* Individual merchants store a trade (e.g. "Barber") here — keep it selectable */}
                  {form.category && !BUSINESS_CATEGORIES.includes(form.category) && (
                    <option value={form.category}>{form.category}</option>
                  )}
                  {BUSINESS_CATEGORIES.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[12px] font-medium text-gray-600 mb-1.5">Phone</label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="+1 (242) 555-0123"
                  className={inputClass}
                />
              </div>

              <div>
                <label className="block text-[12px] font-medium text-gray-600 mb-1.5">Website</label>
                <input
                  type="url"
                  value={form.website}
                  onChange={(e) => setForm({ ...form, website: e.target.value })}
                  placeholder="https://example.com"
                  className={inputClass}
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-[12px] font-medium text-gray-600 mb-1.5">Address</label>
                <input
                  type="text"
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  placeholder="123 Main St, Nassau"
                  className={inputClass}
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-[12px] font-medium text-gray-600 mb-1.5">Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={3}
                  placeholder="Tell customers about your business…"
                  className={`${inputClass} resize-none`}
                />
              </div>

              {/* Cover photo */}
              <div className="sm:col-span-2">
                <label className="block text-[12px] font-medium text-gray-600 mb-1.5">Cover Photo</label>
                <p className="text-[12px] text-gray-400 mb-2">
                  Shown across the top of your page in the app. A landscape photo of your
                  shop, your work, or your products works best.
                </p>
                <input
                  ref={coverRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={handleCoverChange}
                  className="hidden"
                />
                {(coverLocalPreview || coverUrl) ? (
                  <div>
                    <div className="relative rounded-xl overflow-hidden border border-gray-200 bg-gray-100 aspect-[2.2/1]">
                      <img
                        src={coverLocalPreview || coverUrl!}
                        alt="Cover preview"
                        className="absolute inset-0 h-full w-full object-cover"
                      />
                    </div>
                    <div className="flex items-center gap-4 mt-2">
                      <button
                        onClick={() => coverRef.current?.click()}
                        className="text-[12px] text-gray-600 font-medium hover:underline"
                      >
                        Replace
                      </button>
                      <button
                        onClick={handleRemoveCover}
                        className="text-[12px] text-red-600 font-medium hover:underline flex items-center gap-1"
                      >
                        <X size={12} /> Remove
                      </button>
                      {coverFile && (
                        <span className="text-[12px] text-gray-400">Saved when you click Save Changes</span>
                      )}
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => coverRef.current?.click()}
                    className="w-full flex flex-col items-center justify-center gap-2 py-8 rounded-xl border border-dashed border-gray-300 hover:border-gray-400 hover:bg-gray-50 transition-all text-gray-500"
                  >
                    <Upload size={18} />
                    <span className="text-[12px]">Upload a cover photo</span>
                  </button>
                )}
                {coverError && (
                  <p className="text-[12px] text-red-600 mt-2">{coverError}</p>
                )}
              </div>
            </div>

            <div className="px-5 py-4 bg-gray-50/60 border-t border-gray-100 flex justify-end">
              <button
                onClick={handleSave}
                disabled={saving || !merchantId}
                className={`px-5 py-2.5 rounded-lg text-[13px] font-semibold transition-colors disabled:opacity-50 focus-ring ${
                  saved ? 'bg-green-600 text-white' : 'bg-brand-500 text-white hover:bg-brand-600'
                }`}
              >
                {saving ? 'Saving…' : saved ? 'Saved ✓' : 'Save Changes'}
              </button>
            </div>
          </div>
        </section>

        {/* ── Staff ── */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-8">
          <div>
            <h2 className="text-[15px] font-semibold text-gray-900">Staff</h2>
            <p className="text-[12px] text-gray-500 mt-1 leading-relaxed">
              Add your team so every stamp is logged with who issued it.
              The 4-digit PIN only matters if "Require staff PIN" is on below.
            </p>
          </div>

          <div className="lg:col-span-2 bg-white border border-gray-200 rounded-xl overflow-hidden">
            {staff.length > 0 && (
              <div className="divide-y divide-gray-100">
                {staff.map(s => (
                  <div key={s.id}>
                    <div className="flex items-center gap-3 px-5 py-3">
                      <div className="h-8 w-8 rounded-full bg-brand-100 flex items-center justify-center shrink-0">
                        <span className="text-[12px] font-semibold text-brand-600">
                          {s.name[0]?.toUpperCase()}
                        </span>
                      </div>
                      <p className="flex-1 text-[13px] font-medium text-gray-900 truncate">{s.name}</p>
                      {s.has_pin ? (
                        <span className="flex items-center gap-1 text-[11px] text-gray-400 bg-gray-50 border border-gray-100 rounded-md px-2 py-1">
                          <Lock size={11} /> PIN set
                        </span>
                      ) : requirePin ? (
                        <span
                          className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-2 py-1"
                          title='This person cannot stamp while "Require staff PIN" is on. Set a PIN for them below.'
                        >
                          No PIN — can't stamp
                        </span>
                      ) : null}
                      <button
                        onClick={() => { setResetPinId(resetPinId === s.id ? null : s.id); setResetPinValue('') }}
                        className="text-gray-300 hover:text-brand-600 transition-colors p-1.5"
                        title={s.has_pin ? 'Reset PIN (e.g. if forgotten)' : 'Set a PIN'}
                      >
                        <KeyRound size={15} />
                      </button>
                      <button
                        onClick={() => handleRemoveStaff(s.id)}
                        className="text-gray-300 hover:text-red-500 transition-colors p-1.5"
                        title="Remove staff member"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                    {resetPinId === s.id && (
                      <div className="flex items-center gap-2 px-5 pb-3 pl-16">
                        <input
                          type="password"
                          inputMode="numeric"
                          value={resetPinValue}
                          onChange={(e) => setResetPinValue(e.target.value.replace(/\D/g, '').slice(0, 4))}
                          placeholder={s.has_pin ? 'New 4-digit PIN' : '4-digit PIN'}
                          autoFocus
                          className="w-36 px-3 py-2 rounded-lg border border-gray-200 bg-gray-50 text-[13px] focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/20 transition-all placeholder:text-gray-300"
                        />
                        <button
                          onClick={() => handleResetPin(s.id)}
                          disabled={resetPinValue.length < 4 || savingResetPin}
                          className="px-3 py-2 rounded-lg bg-brand-500 text-[12px] font-semibold text-white hover:bg-brand-600 transition-colors disabled:opacity-50"
                        >
                          {savingResetPin ? 'Saving…' : s.has_pin ? 'Reset PIN' : 'Set PIN'}
                        </button>
                        <button
                          onClick={() => { setResetPinId(null); setResetPinValue('') }}
                          className="px-3 py-2 rounded-lg border border-gray-200 text-[12px] font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            <div className={`p-5 ${staff.length > 0 ? 'border-t border-gray-100 bg-gray-50/60' : ''}`}>
              {staffError && (
                <p className="text-[12px] text-red-600 bg-red-50 rounded-lg px-3 py-2.5 mb-3">{staffError}</p>
              )}

              {firstStaffAdded && (
                <p className="text-[12px] text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2.5 mb-3">
                  Done — the Stamp page will now ask who's stamping before each stamp.
                </p>
              )}

              {/* Fixed-width wrappers, not competing width utilities on the
                  inputs themselves — the name field used to collapse to a
                  sliver, leaving Add permanently disabled */}
              <div className="flex flex-col sm:flex-row sm:items-end gap-2">
                <div className="flex-1 min-w-0">
                  <label className="block text-[12px] font-medium text-gray-600 mb-1.5">Staff name</label>
                  <input
                    type="text"
                    value={newStaffName}
                    onChange={(e) => setNewStaffName(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleAddStaff() }}
                    placeholder="e.g. Marcus"
                    className={inputClass}
                  />
                </div>
                <div className="sm:w-40">
                  <label className="block text-[12px] font-medium text-gray-600 mb-1.5">
                    4-digit PIN <span className="text-gray-400 font-normal">(optional)</span>
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={newStaffPin}
                    onChange={(e) => setNewStaffPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                    placeholder="Numbers only"
                    className={inputClass}
                  />
                </div>
                <button
                  onClick={handleAddStaff}
                  disabled={addingStaff || !newStaffName.trim() || !merchantId}
                  className="px-5 py-2.5 rounded-lg bg-brand-500 text-[13px] font-semibold text-white hover:bg-brand-600 transition-colors disabled:opacity-50 shrink-0"
                >
                  {addingStaff ? 'Adding…' : 'Add'}
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* ── Stamping rules ── */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-8">
          <div>
            <h2 className="text-[15px] font-semibold text-gray-900">Stamping rules</h2>
            <p className="text-[12px] text-gray-500 mt-1 leading-relaxed">
              Guardrails for how stamps get issued at the counter.
            </p>
          </div>

          <div className="lg:col-span-2 bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="p-5 space-y-5">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-[13px] font-medium text-gray-900">Require staff PIN to stamp</p>
                  <p className="text-[12px] text-gray-500 mt-0.5">
                    Staff confirm their 4-digit PIN before each stamp. Off = tap name only.
                  </p>
                </div>
                <button
                  onClick={() => setRequirePin(v => !v)}
                  role="switch"
                  aria-checked={requirePin}
                  className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${
                    requirePin ? 'bg-brand-500' : 'bg-gray-200'
                  }`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                      requirePin ? 'translate-x-5' : ''
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between gap-4 border-t border-gray-100 pt-5">
                <div>
                  <p className="text-[13px] font-medium text-gray-900">Stamp cooldown</p>
                  <p className="text-[12px] text-gray-500 mt-0.5">
                    Warn if the same customer is stamped again within this window. Staff can override. 0 = off.
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <input
                    type="number"
                    min={0}
                    max={60}
                    value={cooldown}
                    onChange={(e) => {
                      const v = parseInt(e.target.value)
                      setCooldown(Number.isNaN(v) ? 0 : Math.min(60, Math.max(0, v)))
                    }}
                    className={`${inputClass} w-16 text-center`}
                  />
                  <span className="text-[12px] text-gray-500">min</span>
                </div>
              </div>
            </div>

            <div className="px-5 py-4 bg-gray-50/60 border-t border-gray-100 flex justify-end">
              <button
                onClick={handleSaveStamping}
                disabled={savingStamping || !merchantId}
                className={`px-5 py-2.5 rounded-lg text-[13px] font-semibold transition-colors disabled:opacity-50 focus-ring ${
                  savedStamping ? 'bg-green-600 text-white' : 'bg-brand-500 text-white hover:bg-brand-600'
                }`}
              >
                {savingStamping ? 'Saving…' : savedStamping ? 'Saved ✓' : 'Save Stamping Rules'}
              </button>
            </div>
          </div>
        </section>

        {/* ── Counter mode ── */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-8">
          <div>
            <h2 className="text-[15px] font-semibold text-gray-900">Counter mode</h2>
            <p className="text-[12px] text-gray-500 mt-1 leading-relaxed">
              For the device that lives at your counter. Staff can stamp
              customers, but the rest of the dashboard stays locked.
            </p>
          </div>

          <div className="lg:col-span-2 bg-white border border-gray-200 rounded-xl p-5">
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50 text-brand-600 shrink-0">
                <Monitor size={18} strokeWidth={1.75} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-medium text-gray-900">Lock this device to the Stamp page</p>
                <ul className="text-[12px] text-gray-500 mt-1.5 space-y-1 leading-relaxed">
                  <li>· Staff still pick their name (and PIN, if required) for every stamp</li>
                  <li>· Dashboard, Customers, Analytics and Settings become unreachable</li>
                  <li>· Only your account password unlocks this device again</li>
                </ul>
                <p className="text-[12px] text-gray-400 mt-2">
                  Applies to this device only — your own laptop or phone stays fully open.
                </p>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-gray-100 flex justify-end">
              <button
                onClick={() => { enterKioskMode(); navigate('/stamp') }}
                className="flex items-center gap-1.5 px-5 py-2.5 rounded-lg bg-brand-500 text-[13px] font-semibold text-white hover:bg-brand-600 transition-colors focus-ring"
              >
                <Lock size={13} /> Turn on counter mode
              </button>
            </div>
          </div>
        </section>

        {/* ── Install on phone (PWA) ── */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-8">
          <div>
            <h2 className="text-[15px] font-semibold text-gray-900">Stampd on your phone</h2>
            <p className="text-[12px] text-gray-500 mt-1 leading-relaxed">
              Install the dashboard as an app — full screen, its own icon,
              perfect for stamping at the counter.
            </p>
          </div>

          <div className="lg:col-span-2 bg-white border border-gray-200 rounded-xl p-5">
            {isStandalone ? (
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100 text-green-700 shrink-0">
                  <Smartphone size={18} strokeWidth={1.75} />
                </div>
                <p className="text-[13px] text-gray-700">
                  You're using the installed app — nothing more to do here.
                </p>
              </div>
            ) : (
              <div className="flex items-start gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50 text-brand-600 shrink-0">
                  <Smartphone size={18} strokeWidth={1.75} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-medium text-gray-900">Add Stampd to your home screen</p>
                  <p className="text-[12px] text-gray-500 mt-1 leading-relaxed">
                    Works offline at the counter, opens full screen, and pairs
                    perfectly with counter mode.
                  </p>

                  {justInstalled ? (
                    <p className="text-[12px] text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2.5 mt-3">
                      Installed — look for the Stampd icon on your home screen.
                    </p>
                  ) : installPrompt ? (
                    <button
                      onClick={() => installPrompt.prompt()}
                      className="mt-3 flex items-center gap-1.5 px-5 py-2.5 rounded-lg bg-brand-500 text-[13px] font-semibold text-white hover:bg-brand-600 transition-colors focus-ring"
                    >
                      <Smartphone size={13} /> Install app
                    </button>
                  ) : isIOS ? (
                    <ol className="text-[12px] text-gray-600 mt-3 space-y-1.5 leading-relaxed list-decimal list-inside">
                      <li>Open this page in <span className="font-semibold">Safari</span> on your iPhone or iPad</li>
                      <li>Tap the <Share size={12} className="inline -mt-0.5" /> <span className="font-semibold">Share</span> button</li>
                      <li>Scroll down and tap <span className="font-semibold">Add to Home Screen</span></li>
                    </ol>
                  ) : (
                    <p className="text-[12px] text-gray-500 mt-3">
                      On your phone, open this page and choose{' '}
                      <span className="font-semibold text-gray-700">Install app</span> (or{' '}
                      <span className="font-semibold text-gray-700">Add to Home screen</span>) from
                      the browser menu.
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  )
}
