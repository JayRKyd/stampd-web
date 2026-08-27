import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { CheckCircle2, AlertCircle, Clock, Lock, Users, X, KeyRound, Copy, Check, Gift, Stamp as StampIcon, WifiOff } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useMerchantStatus } from '@/lib/merchantStatus'

type State = 'idle' | 'looking' | 'found' | 'not_found' | 'staff_pin' | 'cooldown' | 'issuing' | 'success' | 'error' | 'offline_ready'

// Offline queue: island wifi drops mid-shift. Stamps entered offline are
// saved locally and delivered automatically when the connection returns —
// the RPC validates the PIN server-side at delivery time.
interface QueuedStamp {
  pin: string
  quantity: number
  staffId: string | null
  queuedAt: string
}

const QUEUE_KEY = 'stampd_offline_queue'

function readQueue(): QueuedStamp[] {
  try { return JSON.parse(localStorage.getItem(QUEUE_KEY) ?? '[]') } catch { return [] }
}

interface Customer {
  first_name: string
  last_name: string
  current_stamps: number
  total_required: number
  reward_title: string
  total_rewards_earned: number
  member_since: string
}

interface StaffMember {
  id: string
  name: string
  pin: string | null
}

const LAST_STAFF_KEY = 'stampd_last_staff_id'
const STAFF_HINT_KEY = 'stampd_staff_hint_dismissed'

export default function Stamp() {
  const { isActive, loading: statusLoading } = useMerchantStatus()
  const [merchantId, setMerchantId] = useState('')
  const [pin, setPin] = useState('')
  const [state, setState] = useState<State>('idle')
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [stampsAfterIssue, setStampsAfterIssue] = useState(0)
  const [todayCount, setTodayCount] = useState(0)
  const [errorMsg, setErrorMsg] = useState('')

  // Staff attribution
  const [staffList, setStaffList] = useState<StaffMember[]>([])
  const [staffLoaded, setStaffLoaded] = useState(false)
  const [hintDismissed, setHintDismissed] = useState(
    () => localStorage.getItem(STAFF_HINT_KEY) === '1'
  )
  const [selectedStaffId, setSelectedStaffId] = useState<string | null>(null)
  const [requireStaffPin, setRequireStaffPin] = useState(false)
  const [verifiedStaffId, setVerifiedStaffId] = useState<string | null>(null)
  const [staffPinInput, setStaffPinInput] = useState('')
  const [staffPinError, setStaffPinError] = useState('')

  // Stamp options
  const [quantity, setQuantity] = useState(1)
  const [cooldownMsg, setCooldownMsg] = useState('')

  // Offline queue
  const [online, setOnline] = useState(() => navigator.onLine)
  const [queuedCount, setQueuedCount] = useState(() => readQueue().length)
  const [flushMsg, setFlushMsg] = useState('')

  // Guest one-time PIN (backup flow)
  const [guestPinOpen, setGuestPinOpen] = useState(false)
  const [guestPinLoading, setGuestPinLoading] = useState(false)
  const [guestPinError, setGuestPinError] = useState('')
  const [guestPin, setGuestPin] = useState<{ code: string; expires_at: string } | null>(null)
  const [guestPinCopied, setGuestPinCopied] = useState(false)

  useEffect(() => {
    async function init() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: merchant } = await supabase
        .from('merchants')
        .select('id, require_staff_pin')
        .eq('owner_id', user.id)
        .maybeSingle()
      if (!merchant) return
      setMerchantId(merchant.id)
      setRequireStaffPin(!!merchant.require_staff_pin)

      const { data: staff } = await supabase
        .from('staff')
        .select('id, name, pin')
        .eq('merchant_id', merchant.id)
        .eq('is_active', true)
        .order('created_at')
      const list = staff ?? []
      setStaffList(list)
      setStaffLoaded(true)

      // Pre-select last-used staff (or the only one) so the common case is
      // zero taps. When PINs are required, staff without one can't stamp —
      // never auto-select them.
      const selectable = merchant.require_staff_pin ? list.filter(s => s.pin) : list
      const remembered = localStorage.getItem(LAST_STAFF_KEY)
      if (remembered && selectable.some(s => s.id === remembered)) {
        setSelectedStaffId(remembered)
      } else if (selectable.length === 1) {
        setSelectedStaffId(selectable[0].id)
      }

      const start = new Date()
      start.setHours(0, 0, 0, 0)
      const { count } = await supabase
        .from('stamp_events')
        .select('id', { count: 'exact', head: true })
        .eq('merchant_id', merchant.id)
        .gte('created_at', start.toISOString())
      setTodayCount(count ?? 0)
    }
    init()
  }, [])

  const writeQueue = (q: QueuedStamp[]) => {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(q))
    setQueuedCount(q.length)
  }

  // Deliver queued stamps. Permanent failures (bad PIN) are dropped with a
  // note; network failures keep the item for the next attempt. The queue is
  // persisted after EVERY item — queued delivery bypasses the duplicate
  // cooldown, so a phone dying mid-flush must never leave delivered stamps
  // in storage to send twice. flushingRef stops the reconnect event and the
  // page-load effect from draining the same queue concurrently.
  const flushingRef = useRef(false)
  const flushQueue = async () => {
    if (flushingRef.current) return
    if (!merchantId || !navigator.onLine) return
    const queue = readQueue()
    if (queue.length === 0) return

    flushingRef.current = true
    const supabase = createClient()
    const keep: QueuedStamp[] = [] // transient failures — retry on next flush
    let delivered = 0
    let rejected = 0

    try {
      for (let i = 0; i < queue.length; i++) {
        const item = queue[i]
        try {
          const { data, error } = await supabase.rpc('issue_stamp_by_personal_pin', {
            p_pin: item.pin,
            p_merchant_id: merchantId,
            p_staff_id: item.staffId,
            p_quantity: item.quantity,
            // Merchant explicitly queued it — don't bounce on cooldown at delivery
            p_override_cooldown: true,
          })
          if (error) keep.push(item) // network/transient — retry later
          else {
            const result = Array.isArray(data) ? data[0] : data
            if (result?.success) delivered++
            else rejected++ // invalid PIN etc. — dropping, retrying won't help
          }
        } catch {
          keep.push(item)
        }
        writeQueue([...keep, ...queue.slice(i + 1)])
      }
    } finally {
      flushingRef.current = false
    }

    if (delivered > 0) setTodayCount(prev => prev + delivered)
    if (delivered > 0 || rejected > 0) {
      setFlushMsg(
        `${delivered} queued stamp${delivered === 1 ? '' : 's'} delivered` +
        (rejected > 0 ? ` · ${rejected} rejected (invalid PIN)` : '')
      )
      setTimeout(() => setFlushMsg(''), 6000)
    }
  }

  // Track connectivity; deliver the queue the moment we're back online
  useEffect(() => {
    const goOnline = () => { setOnline(true); flushQueue() }
    const goOffline = () => setOnline(false)
    window.addEventListener('online', goOnline)
    window.addEventListener('offline', goOffline)
    return () => {
      window.removeEventListener('online', goOnline)
      window.removeEventListener('offline', goOffline)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [merchantId])

  // Anything left over from a previous session sends once merchant is loaded
  useEffect(() => {
    if (merchantId && online) flushQueue()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [merchantId])

  // The actual enqueue — call only after the staff gate has been satisfied
  const pushToQueue = () => {
    const queue = readQueue()
    queue.push({ pin, quantity, staffId: selectedStaffId, queuedAt: new Date().toISOString() })
    writeQueue(queue)
    setPin('')
    setQuantity(1)
    setState('idle')
    setFlushMsg('Stamp queued — it will send automatically when you reconnect')
    setTimeout(() => setFlushMsg(''), 5000)
  }

  const selectStaff = (id: string) => {
    // "Require staff PIN" means require: a staff member with no PIN can't
    // be stamped under, or the gate would have a permanently open door
    const target = staffList.find(s => s.id === id)
    if (requireStaffPin && target && !target.pin) return
    setSelectedStaffId(id)
    localStorage.setItem(LAST_STAFF_KEY, id)
    setStaffPinInput('')
    setStaffPinError('')
  }

  const dismissHint = () => {
    localStorage.setItem(STAFF_HINT_KEY, '1')
    setHintDismissed(true)
  }

  const selectedStaff = staffList.find(s => s.id === selectedStaffId) ?? null
  const needsStaffPinCheck =
    requireStaffPin && !!selectedStaff?.pin && verifiedStaffId !== selectedStaffId

  // Offline queue entry point — the staff gate applies exactly as it does
  // online; losing wifi must not turn the PIN requirement off
  const queueStamp = () => {
    if (staffList.length > 0 && !selectedStaffId) return
    if (requireStaffPin && selectedStaff && !selectedStaff.pin) return
    if (needsStaffPinCheck) {
      setStaffPinInput('')
      setStaffPinError('')
      setState('staff_pin')
      return
    }
    pushToQueue()
  }

  const handlePinChange = async (value: string) => {
    const cleaned = value.replace(/\D/g, '').slice(0, 6)
    setPin(cleaned)

    if (cleaned.length < 6) {
      if (state !== 'idle' && state !== 'offline_ready') setState('idle')
      return
    }

    if (!merchantId || !isActive) return

    // No connection: skip the lookup (it can't work) and offer to queue
    if (!navigator.onLine) {
      setQuantity(1)
      setState('offline_ready')
      return
    }

    setState('looking')
    setErrorMsg('')

    const supabase = createClient()
    const { data, error } = await supabase.rpc('lookup_by_personal_pin', {
      p_pin: cleaned,
      p_merchant_id: merchantId,
    })

    if (error || !data) {
      setState('not_found')
      setErrorMsg('No customer found with that PIN.')
      return
    }

    // RPC returns jsonb — may be object or array
    const result = Array.isArray(data) ? data[0] : data
    if (!result || result.error) {
      setState('not_found')
      setErrorMsg(result?.error ?? 'No customer found with that PIN.')
      return
    }

    setCustomer(result as Customer)
    setQuantity(1)
    setState('found')
  }

  const startIssue = () => {
    // Staff must be chosen when staff profiles exist (accountability)
    if (staffList.length > 0 && !selectedStaffId) return
    if (requireStaffPin && selectedStaff && !selectedStaff.pin) return
    if (needsStaffPinCheck) {
      setStaffPinInput('')
      setStaffPinError('')
      setState('staff_pin')
      return
    }
    issueStamp(false)
  }

  const verifyStaffPin = () => {
    if (!selectedStaff) return
    if (staffPinInput === selectedStaff.pin) {
      setVerifiedStaffId(selectedStaff.id)
      // Offline there is no customer lookup — the verified stamp goes to
      // the queue instead of the RPC
      if (!navigator.onLine) pushToQueue()
      else issueStamp(false)
    } else {
      setStaffPinError('Incorrect PIN. Try again.')
      setStaffPinInput('')
    }
  }

  const issueStamp = async (overrideCooldown: boolean) => {
    if (!merchantId || !customer || !isActive) return
    setState('issuing')

    const supabase = createClient()
    const { data, error } = await supabase.rpc('issue_stamp_by_personal_pin', {
      p_pin: pin,
      p_merchant_id: merchantId,
      p_staff_id: selectedStaffId,
      p_quantity: quantity,
      p_override_cooldown: overrideCooldown,
    })

    if (error) {
      setErrorMsg(error.message)
      setState('error')
      return
    }

    const result = Array.isArray(data) ? data[0] : data

    if (result && result.success === false) {
      if (result.error === 'cooldown') {
        const mins = Number(result.minutes_ago ?? 0)
        const secs = Number(result.seconds_ago ?? 0)
        setCooldownMsg(
          mins >= 1
            ? `This customer was stamped ${mins} minute${mins === 1 ? '' : 's'} ago.`
            : `This customer was stamped ${secs} seconds ago.`
        )
        setState('cooldown')
        return
      }
      setErrorMsg(
        result.error === 'pin_not_found' ? 'No customer found with that PIN.'
        : result.error === 'invalid_staff' ? 'Selected staff member is no longer active.'
        : result.error === 'no_active_card' ? 'No active loyalty card for this business.'
        : result.error === 'merchant_not_approved' ? 'Your account must be approved before you can stamp customers.'
        : 'Something went wrong.')
      setState('error')
      return
    }

    const updatedStamps = result?.current_stamps ?? customer.current_stamps + quantity
    setStampsAfterIssue(updatedStamps)
    setTodayCount(prev => prev + 1)
    setState('success')
  }

  const handleReset = () => {
    setPin('')
    setCustomer(null)
    setErrorMsg('')
    setCooldownMsg('')
    setQuantity(1)
    setState('idle')
  }

  const generateGuestPin = async () => {
    if (!merchantId || !isActive) return
    setGuestPinLoading(true)
    setGuestPinError('')
    setGuestPinCopied(false)
    const supabase = createClient()
    const { data, error } = await supabase.rpc('generate_merchant_pin', { p_merchant_id: merchantId })
    setGuestPinLoading(false)
    if (error || !data?.code) {
      setGuestPinError(
        data?.error === 'unauthorized' ? 'You do not have permission to generate a PIN.'
        : data?.error === 'merchant_not_approved' ? 'Your account must be approved before generating guest PINs.'
        : 'Could not generate PIN — try again.'
      )
      return
    }
    setGuestPin({ code: data.code, expires_at: data.expires_at })
  }

  const copyGuestPin = async () => {
    if (!guestPin?.code) return
    await navigator.clipboard.writeText(guestPin.code)
    setGuestPinCopied(true)
    setTimeout(() => setGuestPinCopied(false), 2000)
  }

  const initials = customer
    ? `${customer.first_name?.[0] ?? ''}${customer.last_name?.[0] ?? ''}`.toUpperCase()
    : ''

  const memberSince = customer?.member_since
    ? new Date(customer.member_since).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
    : ''

  const total = customer?.total_required ?? 10
  const stampCount = state === 'success' ? stampsAfterIssue : (customer?.current_stamps ?? 0)
  const remaining = Math.max(0, total - stampCount)
  const rewardEarned = state === 'success' && remaining === 0

  if (statusLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!isActive) {
    return (
      <div className="animate-enter max-w-md mx-auto">
        <div className="border border-amber-200 rounded-2xl bg-amber-50 p-8 text-center">
          <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center mx-auto mb-4">
            <Clock size={22} className="text-amber-600" />
          </div>
          <h1 className="text-[18px] font-semibold text-gray-900 mb-2">Pending approval</h1>
          <p className="text-[13px] text-gray-600 leading-relaxed">
            Stamping is disabled until your business is verified. Finish setup, then we'll review your account and unlock this page.
          </p>
          <Link
            to="/onboarding"
            className="inline-flex mt-5 px-4 py-2 rounded-lg bg-brand-500 text-white text-[13px] font-semibold hover:bg-brand-600 transition-colors"
          >
            View setup status
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="animate-enter max-w-md mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[22px] font-semibold text-gray-900 tracking-[-0.02em]">Issue Stamp</h1>
          <p className="text-[13px] text-gray-500 mt-0.5">Ask for the customer's Stampd PIN</p>
        </div>
        <div className="flex items-baseline gap-1.5 bg-brand-50 px-3 py-1.5 rounded-lg shrink-0">
          <span className="text-[15px] font-bold text-brand-600">{todayCount}</span>
          <span className="text-[11px] font-medium text-brand-500">today</span>
        </div>
      </div>

      {/* Connectivity: offline notice + queued-delivery status */}
      {!online && (
        <div className="mb-4 flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <WifiOff size={16} className="text-amber-600 shrink-0" />
          <p className="flex-1 text-[12px] text-amber-800 leading-relaxed">
            <span className="font-semibold">You're offline.</span>{' '}
            Stamps you enter will be queued and sent automatically when the connection returns.
            {queuedCount > 0 && <span className="font-semibold"> {queuedCount} waiting.</span>}
          </p>
        </div>
      )}
      {flushMsg && (
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 px-4 py-3">
          <CheckCircle2 size={15} className="text-green-600 shrink-0" />
          <p className="text-[12px] font-medium text-green-700">{flushMsg}</p>
        </div>
      )}

      {/* One-time nudge: point merchants with a team to staff setup */}
      {staffLoaded && staffList.length === 0 && !hintDismissed && (
        <div className="mb-4 flex items-start gap-3 rounded-xl border border-brand-100 bg-brand-50/60 px-4 py-3">
          <Users size={16} className="text-brand-500 shrink-0 mt-0.5" />
          <p className="flex-1 text-[12px] text-gray-600 leading-relaxed">
            Running this with a team? Add your staff so every stamp is logged with who issued it.{' '}
            <Link to="/settings" className="font-semibold text-brand-600 hover:underline">
              Set up staff
            </Link>
          </p>
          <button
            onClick={dismissHint}
            className="text-gray-300 hover:text-gray-500 transition-colors shrink-0 p-0.5"
            aria-label="Dismiss"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Staff selector — who is issuing the stamp */}
      {staffList.length > 0 && (
        <div className="mb-4">
          <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Stamping as</p>
          <div className="flex gap-2 flex-wrap">
            {staffList.map(s => {
              const blocked = requireStaffPin && !s.pin
              return (
                <button
                  key={s.id}
                  onClick={() => selectStaff(s.id)}
                  disabled={blocked}
                  title={blocked ? 'No PIN set — add one in Settings before they can stamp' : undefined}
                  className={`px-4 py-2.5 rounded-lg text-[13px] font-semibold transition-all ${
                    blocked
                      ? 'bg-gray-50 border border-dashed border-gray-200 text-gray-300 cursor-not-allowed'
                      : selectedStaffId === s.id
                      ? 'bg-brand-500 text-white shadow-sm'
                      : 'bg-white border border-gray-200 text-gray-600 hover:border-brand-400 hover:text-brand-600'
                  }`}
                >
                  {s.name}
                  {requireStaffPin && s.pin && (
                    <Lock size={11} className={`inline ml-1.5 -mt-0.5 ${selectedStaffId === s.id ? 'opacity-80' : 'opacity-50'}`} />
                  )}
                  {blocked && <span className="ml-1.5 text-[10px] font-medium">No PIN</span>}
                </button>
              )
            })}
          </div>
          {requireStaffPin && staffList.some(s => !s.pin) && (
            <p className="text-[11px] text-amber-700 mt-2">
              Greyed-out names have no PIN and can't stamp while "Require staff PIN" is on —{' '}
              <Link to="/settings" className="font-semibold underline">add PINs in Settings</Link>.
            </p>
          )}
        </div>
      )}

      {/* Idle / looking / not_found — the PIN pad is the hero */}
      {(state === 'idle' || state === 'looking' || state === 'not_found') && (
        <div className="bg-white border border-gray-200 rounded-2xl p-6">
          <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider text-center mb-4">
            Customer PIN
          </p>

          {/* Cells ARE the input — invisible field on top captures typing */}
          <div className="relative mx-auto w-fit">
            <div className="flex gap-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className={`h-14 w-11 sm:w-12 rounded-xl border-[1.5px] flex items-center justify-center text-[22px] font-bold transition-colors ${
                    pin[i]
                      ? 'border-brand-500 bg-brand-50 text-brand-600'
                      : i === pin.length
                      ? 'border-brand-400 bg-brand-50/40'
                      : 'border-gray-200 bg-gray-50 text-gray-300'
                  }`}
                >
                  {pin[i] ?? (i === pin.length && state === 'idle' ? (
                    <span className="w-0.5 h-6 bg-brand-400 rounded-full animate-pulse" />
                  ) : '')}
                </div>
              ))}
            </div>
            <input
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              value={pin}
              onChange={(e) => handlePinChange(e.target.value)}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              aria-label="Customer PIN"
              autoFocus
            />
          </div>

          {state === 'looking' && (
            <div className="flex items-center justify-center gap-2 mt-4">
              <div className="w-3.5 h-3.5 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-[12px] text-gray-400">Looking up customer…</p>
            </div>
          )}

          {state === 'not_found' && (
            <div className="flex items-center gap-2 mt-4 text-red-600 bg-red-50 rounded-lg px-3 py-2.5">
              <AlertCircle size={14} className="shrink-0" />
              <p className="text-[12px]">{errorMsg}</p>
            </div>
          )}

          <p className="text-[11px] text-gray-400 text-center mt-5 leading-relaxed">
            New customers join automatically when you stamp them for the first time.
          </p>

          <div className="border-t border-gray-100 mt-5 pt-4">
            <button
              type="button"
              onClick={() => { setGuestPinOpen(true); setGuestPin(null); setGuestPinError('') }}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg border border-dashed border-gray-200 text-[12px] font-medium text-gray-500 hover:border-brand-300 hover:text-brand-600 transition-colors"
            >
              <KeyRound size={14} />
              Guest without the app? Generate a one-time PIN
            </button>
          </div>
        </div>
      )}

      {/* Offline: queue the stamp for delivery on reconnect */}
      {state === 'offline_ready' && (
        <div className="bg-white border border-amber-200 rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="h-11 w-11 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
              <WifiOff size={18} className="text-amber-600" />
            </div>
            <div>
              <h3 className="text-[15px] font-semibold text-gray-900">Queue this stamp?</h3>
              <p className="text-[12px] text-gray-400">
                PIN {pin.slice(0, 3)} {pin.slice(3)} — customer lookup isn't possible offline
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between mb-5">
            <span className="text-[13px] text-gray-600">Stamps to add</span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setQuantity(q => Math.max(1, q - 1))}
                disabled={quantity <= 1}
                className="w-11 h-11 rounded-xl border border-gray-200 text-[18px] font-bold text-gray-600 hover:bg-gray-50 disabled:opacity-30 transition-colors"
              >
                −
              </button>
              <span className="w-10 text-center text-[18px] font-bold text-gray-900">{quantity}</span>
              <button
                onClick={() => setQuantity(q => Math.min(5, q + 1))}
                disabled={quantity >= 5}
                className="w-11 h-11 rounded-xl border border-gray-200 text-[18px] font-bold text-gray-600 hover:bg-gray-50 disabled:opacity-30 transition-colors"
              >
                +
              </button>
            </div>
          </div>

          {staffList.length > 0 && !selectedStaffId && (
            <p className="text-[12px] text-amber-600 bg-amber-50 rounded-lg px-3 py-2.5 mb-3">
              Select who's stamping above first.
            </p>
          )}

          <div className="flex gap-2">
            <button
              onClick={handleReset}
              className="flex-1 py-3 rounded-xl border border-gray-200 text-[14px] font-medium text-gray-600 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={queueStamp}
              disabled={staffList.length > 0 && !selectedStaffId}
              className="flex-[2] py-3 rounded-xl bg-amber-500 text-[14px] font-semibold text-white hover:bg-amber-600 transition-colors disabled:opacity-50"
            >
              {quantity > 1 ? `Queue ${quantity} Stamps` : 'Queue Stamp'}
            </button>
          </div>
          <p className="text-[11px] text-gray-400 text-center mt-3">
            Sends automatically when you're back online — the PIN is verified on delivery.
          </p>
        </div>
      )}

      {/* Found */}
      {state === 'found' && customer && (
        <div className="bg-white border border-gray-200 rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-5 pb-5 border-b border-gray-100">
            <div className="h-12 w-12 rounded-full bg-brand-100 flex items-center justify-center shrink-0">
              <span className="text-[14px] font-bold text-brand-600">{initials}</span>
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-[16px] font-semibold text-gray-900 truncate">
                {customer.first_name} {customer.last_name}
              </h3>
              <p className="text-[12px] text-gray-400">Member since {memberSince}</p>
            </div>
            {customer.total_rewards_earned > 0 && (
              <div className="flex items-center gap-1 bg-accent-50 text-accent-500 px-2 py-1 rounded-md shrink-0" title="Rewards earned">
                <Gift size={12} />
                <span className="text-[12px] font-semibold">{customer.total_rewards_earned}</span>
              </div>
            )}
          </div>

          <div className="mb-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[12px] text-gray-500">Progress</span>
              <span className="text-[13px] font-bold text-brand-600">
                {customer.current_stamps} <span className="font-medium text-gray-400">/ {total}</span>
              </span>
            </div>
            <div className="flex gap-1">
              {Array.from({ length: total }).map((_, i) => (
                <div
                  key={i}
                  className={`h-2.5 flex-1 rounded-full ${i < customer.current_stamps ? 'bg-brand-500' : 'bg-gray-100'}`}
                />
              ))}
            </div>
            {customer.reward_title && (
              <p className="flex items-center gap-1.5 text-[12px] text-gray-500 mt-2">
                <Gift size={12} className="text-accent-500" />
                {customer.reward_title}
              </p>
            )}
          </div>

          {/* Quantity — for per-item programs (e.g. two purchases in one visit) */}
          <div className="flex items-center justify-between mb-5">
            <span className="text-[13px] text-gray-600">Stamps to add</span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setQuantity(q => Math.max(1, q - 1))}
                disabled={quantity <= 1}
                className="w-11 h-11 rounded-xl border border-gray-200 text-[18px] font-bold text-gray-600 hover:bg-gray-50 disabled:opacity-30 transition-colors"
              >
                −
              </button>
              <span className="w-10 text-center text-[18px] font-bold text-gray-900">{quantity}</span>
              <button
                onClick={() => setQuantity(q => Math.min(5, q + 1))}
                disabled={quantity >= 5}
                className="w-11 h-11 rounded-xl border border-gray-200 text-[18px] font-bold text-gray-600 hover:bg-gray-50 disabled:opacity-30 transition-colors"
              >
                +
              </button>
            </div>
          </div>

          {staffList.length > 0 && !selectedStaffId && (
            <p className="text-[12px] text-amber-600 bg-amber-50 rounded-lg px-3 py-2.5 mb-3">
              Select who's stamping above first.
            </p>
          )}

          <div className="flex gap-2">
            <button
              onClick={handleReset}
              className="flex-1 py-3 rounded-xl border border-gray-200 text-[14px] font-medium text-gray-600 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={startIssue}
              disabled={staffList.length > 0 && !selectedStaffId}
              className="flex-[2] py-3 rounded-xl bg-brand-500 text-[14px] font-semibold text-white hover:bg-brand-600 transition-colors disabled:opacity-50 focus-ring"
            >
              {quantity > 1 ? `Add ${quantity} Stamps` : 'Add Stamp'}
            </button>
          </div>
        </div>
      )}

      {/* Staff PIN gate (only when the merchant requires it) */}
      {state === 'staff_pin' && selectedStaff && (
        <div className="bg-white border border-gray-200 rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="h-11 w-11 rounded-full bg-brand-100 flex items-center justify-center shrink-0">
              <Lock size={16} className="text-brand-600" />
            </div>
            <div>
              <h3 className="text-[15px] font-semibold text-gray-900">Confirm it's you, {selectedStaff.name}</h3>
              <p className="text-[12px] text-gray-400">Enter your 4-digit staff PIN</p>
            </div>
          </div>

          <input
            type="password"
            inputMode="numeric"
            value={staffPinInput}
            onChange={(e) => setStaffPinInput(e.target.value.replace(/\D/g, '').slice(0, 4))}
            placeholder="••••"
            className="w-full text-center text-xl tracking-[0.5em] py-3 rounded-xl border border-gray-200 bg-gray-50 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/20 transition-all placeholder:text-gray-300 font-mono mb-3"
            autoFocus
          />

          {staffPinError && (
            <div className="flex items-center gap-2 mb-3 text-red-600 bg-red-50 rounded-lg px-3 py-2.5">
              <AlertCircle size={14} className="shrink-0" />
              <p className="text-[12px]">{staffPinError}</p>
            </div>
          )}

          <div className="flex gap-2">
            <button
              onClick={() => setState('found')}
              className="flex-1 py-3 rounded-xl border border-gray-200 text-[14px] font-medium text-gray-600 hover:bg-gray-50 transition-colors"
            >
              Back
            </button>
            <button
              onClick={verifyStaffPin}
              disabled={staffPinInput.length < 4}
              className="flex-[2] py-3 rounded-xl bg-brand-500 text-[14px] font-semibold text-white hover:bg-brand-600 transition-colors disabled:opacity-50"
            >
              Confirm & Stamp
            </button>
          </div>
        </div>
      )}

      {/* Cooldown — soft block, staff can confirm */}
      {state === 'cooldown' && customer && (
        <div className="bg-white border border-amber-200 rounded-2xl p-8 text-center">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 mb-4">
            <Clock size={26} className="text-amber-600" />
          </div>
          <h3 className="text-[18px] font-semibold text-gray-900 mb-1">Stamped recently</h3>
          <p className="text-[13px] text-gray-500 mb-6">
            {cooldownMsg} Stamp {customer.first_name} anyway?
          </p>
          <div className="flex gap-2">
            <button
              onClick={handleReset}
              className="flex-1 py-3 rounded-xl border border-gray-200 text-[14px] font-medium text-gray-600 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => issueStamp(true)}
              className="flex-[2] py-3 rounded-xl bg-amber-500 text-[14px] font-semibold text-white hover:bg-amber-600 transition-colors"
            >
              Stamp Anyway
            </button>
          </div>
        </div>
      )}

      {/* Issuing */}
      {state === 'issuing' && (
        <div className="bg-white border border-gray-200 rounded-2xl p-10 text-center">
          <div className="inline-flex h-12 w-12 items-center justify-center mb-3">
            <div className="w-7 h-7 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
          </div>
          <p className="text-[14px] text-gray-500">Issuing stamp…</p>
        </div>
      )}

      {/* Success — readable from arm's length at the counter */}
      {state === 'success' && customer && (
        <div className={`bg-white border rounded-2xl p-8 text-center ${rewardEarned ? 'border-accent-400' : 'border-gray-200'}`}>
          <div className={`inline-flex h-16 w-16 items-center justify-center rounded-full mb-4 ${rewardEarned ? 'bg-accent-50' : 'bg-green-100'}`}>
            {rewardEarned
              ? <Gift size={30} className="text-accent-500" />
              : <CheckCircle2 size={30} className="text-green-600" />}
          </div>
          <h3 className="text-[20px] font-bold text-gray-900 tracking-[-0.02em] mb-1">
            {rewardEarned ? 'Reward Earned!' : quantity > 1 ? `${quantity} Stamps Issued` : 'Stamp Issued'}
          </h3>
          <p className="text-[14px] text-gray-600 mb-4">
            {customer.first_name} {customer.last_name} · <span className="font-bold text-gray-900">{stampsAfterIssue} / {total}</span>
          </p>

          <div className="flex gap-1 mb-4 max-w-[280px] mx-auto">
            {Array.from({ length: total }).map((_, i) => (
              <div
                key={i}
                className={`h-2.5 flex-1 rounded-full ${
                  i < stampsAfterIssue ? (rewardEarned ? 'bg-accent-400' : 'bg-brand-500') : 'bg-gray-100'
                }`}
              />
            ))}
          </div>

          {rewardEarned ? (
            <p className="text-[13px] font-semibold text-accent-500 mb-1">
              {customer.reward_title ? `Give them: ${customer.reward_title}` : 'Their reward is ready to claim'}
            </p>
          ) : (
            <p className="text-[13px] text-gray-500 mb-1">{remaining} more until reward</p>
          )}
          {selectedStaff && (
            <p className="text-[12px] text-gray-400">by {selectedStaff.name}</p>
          )}

          <button
            onClick={handleReset}
            className="mt-6 w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-brand-500 text-[14px] font-semibold text-white hover:bg-brand-600 transition-colors focus-ring"
          >
            <StampIcon size={16} />
            Stamp Another
          </button>
        </div>
      )}

      {/* Error */}
      {state === 'error' && (
        <div className="bg-white border border-red-200 rounded-2xl p-8 text-center">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-red-100 mb-4">
            <AlertCircle size={26} className="text-red-600" />
          </div>
          <h3 className="text-[18px] font-semibold text-gray-900 mb-1">Something went wrong</h3>
          <p className="text-[13px] text-gray-500 mb-6">{errorMsg}</p>
          <button
            onClick={handleReset}
            className="w-full py-3 rounded-xl bg-brand-500 text-[14px] font-semibold text-white hover:bg-brand-600 transition-colors"
          >
            Try Again
          </button>
        </div>
      )}

      {/* Guest one-time PIN modal */}
      {guestPinOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-gray-950/30">
          <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl p-5 animate-enter">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-[16px] font-semibold text-gray-900">One-time guest PIN</h3>
                <p className="text-[12px] text-gray-500 mt-1 leading-relaxed">
                  For customers without the app. They enter this code in Stampd to get their first stamp.
                </p>
              </div>
              <button
                onClick={() => setGuestPinOpen(false)}
                className="text-gray-400 hover:text-gray-600 p-1"
                aria-label="Close"
              >
                <X size={16} />
              </button>
            </div>

            {guestPin ? (
              <div className="text-center">
                <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Valid for 2 minutes</p>
                <p className="text-[40px] font-bold tracking-[0.2em] text-brand-600 font-mono mb-3">{guestPin.code}</p>
                <p className="text-[11px] text-gray-400 mb-4">
                  Expires {new Date(guestPin.expires_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                </p>
                <button
                  onClick={copyGuestPin}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-gray-200 text-[13px] font-medium text-gray-700 hover:bg-gray-50"
                >
                  {guestPinCopied ? <><Check size={14} className="text-green-600" /> Copied</> : <><Copy size={14} /> Copy code</>}
                </button>
              </div>
            ) : (
              <>
                {guestPinError && (
                  <p className="text-[12px] text-red-500 mb-3">{guestPinError}</p>
                )}
                <button
                  onClick={generateGuestPin}
                  disabled={guestPinLoading}
                  className="w-full py-3 rounded-xl bg-brand-500 text-[13px] font-semibold text-white hover:bg-brand-600 disabled:opacity-60"
                >
                  {guestPinLoading ? 'Generating…' : 'Generate PIN'}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
