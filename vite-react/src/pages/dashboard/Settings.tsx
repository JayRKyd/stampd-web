import { useState, useEffect } from 'react'
import { Trash2, Lock } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { BUSINESS_CATEGORIES, normalizeCategory } from '@/lib/categories'

interface StaffMember {
  id: string
  name: string
  pin: string | null
  is_active: boolean
}

export default function Settings() {
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

  // Staff & stamping settings
  const [staff, setStaff] = useState<StaffMember[]>([])
  const [newStaffName, setNewStaffName] = useState('')
  const [newStaffPin, setNewStaffPin] = useState('')
  const [addingStaff, setAddingStaff] = useState(false)
  const [staffError, setStaffError] = useState('')
  const [firstStaffAdded, setFirstStaffAdded] = useState(false)
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
        .select('id, business_name, category, address, phone, website, description, require_staff_pin, stamp_cooldown_minutes')
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
        setRequirePin(!!merchant.require_staff_pin)
        setCooldown(merchant.stamp_cooldown_minutes ?? 5)

        const { data: staffRows } = await supabase
          .from('staff')
          .select('id, name, pin, is_active')
          .eq('merchant_id', merchant.id)
          .eq('is_active', true)
          .order('created_at')
        setStaff(staffRows ?? [])
      }
      setLoading(false)
    }
    load()
  }, [])

  const handleSave = async () => {
    if (!merchantId) return
    setSaving(true)
    const supabase = createClient()
    await supabase.from('merchants').update({
      business_name: form.businessName,
      category: form.category || null,
      address: form.address || null,
      phone: form.phone || null,
      website: form.website || null,
      description: form.description || null,
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
      .select('id, name, pin, is_active')
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
                  <div key={s.id} className="flex items-center gap-3 px-5 py-3">
                    <div className="h-8 w-8 rounded-full bg-brand-100 flex items-center justify-center shrink-0">
                      <span className="text-[12px] font-semibold text-brand-600">
                        {s.name[0]?.toUpperCase()}
                      </span>
                    </div>
                    <p className="flex-1 text-[13px] font-medium text-gray-900 truncate">{s.name}</p>
                    {s.pin && (
                      <span className="flex items-center gap-1 text-[11px] text-gray-400 bg-gray-50 border border-gray-100 rounded-md px-2 py-1">
                        <Lock size={11} /> PIN set
                      </span>
                    )}
                    <button
                      onClick={() => handleRemoveStaff(s.id)}
                      className="text-gray-300 hover:text-red-500 transition-colors p-1.5"
                      title="Remove staff member"
                    >
                      <Trash2 size={15} />
                    </button>
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

              <div className="flex gap-2">
                <input
                  type="text"
                  value={newStaffName}
                  onChange={(e) => setNewStaffName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleAddStaff() }}
                  placeholder="Staff name"
                  className={`${inputClass} flex-1`}
                />
                <input
                  type="text"
                  inputMode="numeric"
                  value={newStaffPin}
                  onChange={(e) => setNewStaffPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  placeholder="PIN (optional)"
                  className={`${inputClass} w-32`}
                />
                <button
                  onClick={handleAddStaff}
                  disabled={addingStaff || !newStaffName.trim() || !merchantId}
                  className="px-4 py-2.5 rounded-lg bg-brand-500 text-[13px] font-semibold text-white hover:bg-brand-600 transition-colors disabled:opacity-50 shrink-0"
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
      </div>
    </div>
  )
}
