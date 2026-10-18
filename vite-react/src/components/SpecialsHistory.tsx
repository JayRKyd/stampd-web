import { useCallback, useEffect, useState } from 'react'
import { Ban, CalendarX, Plus } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

// Every post a merchant has made or planned, newest first, with the honest
// numbers once the nightly job has filled them in. Also exports the week
// strip (the "mini campaign" view) built from the same rows.

export interface SpecialRow {
  id: string
  kind: 'special' | 'update'
  text: string
  image_url: string | null
  earns_stamp: boolean
  starts_on: string
  ends_on: string
  ends_at_time: string | null
  tag: string
  status: 'scheduled' | 'sent' | 'cancelled'
  sent_at: string
  ended_at: string | null
  running: boolean
  recipients: number
  stamped_window: number | null
  usual_day: number | null
  new_customers: number | null
  posted_by_admin: boolean
}

function when(iso: string) {
  return new Date(iso).toLocaleString('en-US', { weekday: 'short', hour: 'numeric', minute: '2-digit' }).replace(':00', '')
}
function whenFull(iso: string) {
  return new Date(iso).toLocaleString('en-US', { weekday: 'long', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).replace(':00', '')
}
function ymd(d: Date) {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function useSpecials(merchantId: string, refreshKey = 0) {
  const [rows, setRows] = useState<SpecialRow[] | null>(null)
  const load = useCallback(async () => {
    const supabase = createClient()
    const { data } = await supabase.rpc('list_merchant_specials', { p_merchant_id: merchantId })
    setRows((data as SpecialRow[] | null) ?? [])
  }, [merchantId])
  useEffect(() => { load() }, [load, refreshKey])
  return { rows, reload: load }
}

// Seven days from today. Each day shows what's planned or running; an empty
// day is a button that hands the date to the composer.
export function SpecialsWeek({ rows, onPickDay }: { rows: SpecialRow[] | null; onPickDay: (day: string) => void }) {
  const days = Array.from({ length: 7 }, (_, i) => { const d = new Date(); d.setDate(d.getDate() + i); return d })
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500 mb-2">This week</p>
      <div className="grid grid-cols-7 gap-1.5">
        {days.map((d, i) => {
          const key = ymd(d)
          const planned = (rows ?? []).find(r =>
            r.status === 'scheduled' ? ymd(new Date(r.sent_at)) === key
            : r.status === 'sent' && !r.ended_at && r.starts_on <= key && key <= r.ends_on)
          const label = i === 0 ? 'Today' : d.toLocaleDateString('en-US', { weekday: 'short' })
          return planned ? (
            <div key={key} className={`rounded-xl p-2 min-h-[76px] flex flex-col gap-1 border ${planned.status === 'scheduled' ? 'bg-amber-50 border-amber-200' : 'bg-brand-50 border-brand-200'}`}>
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">{label}</span>
              <span className="text-[11px] font-semibold text-gray-800 leading-tight line-clamp-3">{planned.text}</span>
              <span className="text-[10px] text-gray-500 mt-auto">{planned.status === 'scheduled' ? 'Planned' : 'Running'}</span>
            </div>
          ) : (
            <button
              key={key}
              type="button"
              onClick={() => onPickDay(key)}
              className="rounded-xl p-2 min-h-[76px] flex flex-col gap-1 border border-dashed border-gray-300 bg-white hover:bg-gray-50 text-left"
              title={`Plan a post for ${label}`}
            >
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">{label}</span>
              <span className="mt-auto inline-flex items-center gap-1 text-[11px] font-semibold text-brand-600"><Plus size={11} /> Plan</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

export function SpecialsHistory({ rows, reload }: { rows: SpecialRow[] | null; reload: () => Promise<void> }) {
  const [acting, setActing] = useState<string | null>(null)

  async function endEarly(id: string) {
    setActing(id)
    await createClient().rpc('end_special', { p_id: id })
    await reload()
    setActing(null)
  }
  async function cancel(id: string) {
    setActing(id)
    await createClient().rpc('cancel_special', { p_id: id })
    await reload()
    setActing(null)
  }

  if (rows === null) {
    return <div className="w-5 h-5 border-2 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto my-8" />
  }

  if (rows.length === 0) {
    return (
      <div className="border border-gray-200 rounded-xl bg-white p-8 text-center">
        <p className="text-[13px] font-medium text-gray-500">Nothing posted yet. Your first one will show here with how many came in.</p>
      </div>
    )
  }

  const scheduled = rows.filter(r => r.status === 'scheduled').sort((a, b) => a.sent_at.localeCompare(b.sent_at))
  const running = rows.filter(r => r.running)
  const past = rows.filter(r => r.status === 'sent' && !r.running)

  return (
    <div className="flex flex-col gap-4">
      {scheduled.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">Planned</p>
          {scheduled.map(r => (
            <div key={r.id} className="border border-amber-200 bg-amber-50/40 rounded-xl p-4 flex flex-wrap items-center gap-3">
              {r.image_url && <img src={r.image_url} alt="" className="w-12 h-[60px] object-cover rounded-lg border border-gray-200" />}
              <div className="flex-1 min-w-[200px]">
                <p className="text-[14px] font-semibold text-gray-900">{r.text}</p>
                <p className="text-[12px] text-gray-500 mt-0.5">
                  Goes out {whenFull(r.sent_at)}
                  {r.ends_on !== r.starts_on && ` · runs ${Math.round((new Date(r.ends_on).getTime() - new Date(r.starts_on).getTime()) / 86400000) + 1} days`}
                  {r.posted_by_admin && ' · planned by Stampd'}
                </p>
              </div>
              <button
                onClick={() => cancel(r.id)}
                disabled={acting === r.id}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-gray-600 text-[12px] font-semibold hover:bg-gray-50 disabled:opacity-60"
              >
                <CalendarX size={13} /> {acting === r.id ? 'Cancelling…' : 'Cancel'}
              </button>
            </div>
          ))}
        </div>
      )}

      {running.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">Running now</p>
          {running.map(r => (
            <div key={r.id} className="border border-brand-200 bg-brand-50/40 rounded-xl p-4 flex flex-wrap items-center gap-3">
              {r.image_url && <img src={r.image_url} alt="" className="w-12 h-[60px] object-cover rounded-lg border border-gray-200" />}
              <div className="flex-1 min-w-[200px]">
                <p className="text-[14px] font-semibold text-gray-900">{r.text}</p>
                <p className="text-[12px] text-gray-500 mt-0.5">
                  Posted {when(r.sent_at)} · {r.recipients} sent
                  {r.ends_on !== r.starts_on && ` · runs to ${new Date(r.ends_on + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long' })}`}
                  {r.ends_at_time && ` · until ${r.ends_at_time.slice(0, 5)}`}
                  {r.posted_by_admin && ' · posted by Stampd'}
                </p>
              </div>
              <button
                onClick={() => endEarly(r.id)}
                disabled={acting === r.id}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-gray-600 text-[12px] font-semibold hover:bg-gray-50 disabled:opacity-60"
                title="Take it down now, for example if you sold out"
              >
                <Ban size={13} /> {acting === r.id ? 'Ending…' : 'End early'}
              </button>
            </div>
          ))}
        </div>
      )}

      {past.length > 0 && (
        <div className="border border-gray-200 rounded-xl overflow-hidden bg-white">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                  <th className="text-left px-4 py-2.5">Post</th>
                  <th className="text-left px-4 py-2.5 whitespace-nowrap">When</th>
                  <th className="text-right px-4 py-2.5 whitespace-nowrap">Sent to</th>
                  <th className="text-right px-4 py-2.5 whitespace-nowrap">Stamped after</th>
                  <th className="text-right px-4 py-2.5 whitespace-nowrap hidden sm:table-cell">Usual day</th>
                  <th className="text-right px-4 py-2.5 whitespace-nowrap hidden sm:table-cell">New customers</th>
                </tr>
              </thead>
              <tbody>
                {past.map((r, i) => (
                  <tr key={r.id} className={i !== past.length - 1 ? 'border-b border-gray-100' : ''}>
                    <td className="px-4 py-3">
                      <p className="text-[13px] font-medium text-gray-800">{r.text}</p>
                      <p className="text-[11px] text-gray-400">
                        {r.kind === 'update' ? 'Update' : 'Special'}
                        {r.ended_at && ' · ended early'}
                        {r.posted_by_admin && ' · posted by Stampd'}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-[12px] text-gray-500 whitespace-nowrap">{when(r.sent_at)}</td>
                    <td className="px-4 py-3 text-[13px] text-right tabular-nums">{r.recipients}</td>
                    <td className="px-4 py-3 text-[13px] text-right tabular-nums font-semibold text-brand-600">
                      {r.stamped_window ?? <span className="text-gray-400 font-normal">tonight</span>}
                    </td>
                    <td className="px-4 py-3 text-[13px] text-right tabular-nums text-gray-500 hidden sm:table-cell">
                      {r.usual_day ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-[13px] text-right tabular-nums hidden sm:table-cell">
                      {r.new_customers ?? '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="px-4 py-2.5 text-[11px] text-gray-400 border-t border-gray-100">
            Stamped after: customers stamped at your shop in the hours after the post. Usual day: the same weekday over the previous four weeks. Numbers fill in overnight.
          </p>
        </div>
      )}
    </div>
  )
}
