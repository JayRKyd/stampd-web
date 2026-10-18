import { useEffect, useState } from 'react'
import { Megaphone } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { SpecialComposer } from '@/components/SpecialComposer'
import { SpecialsHistory, SpecialsWeek, useSpecials } from '@/components/SpecialsHistory'

export default function Specials() {
  const [merchant, setMerchant] = useState<{ id: string; business_name: string } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoading(false); return }
      const { data } = await supabase
        .from('merchants')
        .select('id, business_name')
        .eq('owner_id', user.id)
        .maybeSingle()
      setMerchant(data ?? null)
      setLoading(false)
    }
    load()
  }, [])

  if (loading) {
    return <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto my-16" />
  }
  if (!merchant) return null

  return <SpecialsWorkspace merchantId={merchant.id} merchantName={merchant.business_name} />
}

// Shared by the merchant page and the admin panel: week strip, composer, history.
export function SpecialsWorkspace({ merchantId, merchantName, compact = false }: { merchantId: string; merchantName: string; compact?: boolean }) {
  const { rows, reload } = useSpecials(merchantId)
  const [plannedDay, setPlannedDay] = useState<string | null>(null)

  return (
    <div className={compact ? 'flex flex-col gap-5' : 'w-full px-4 lg:px-8 py-6 lg:py-8 flex flex-col gap-6'}>
      {!compact && (
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center shrink-0">
            <Megaphone size={20} strokeWidth={1.75} />
          </div>
          <div>
            <h1 className="text-[22px] font-semibold text-gray-900 tracking-[-0.02em]">Post a special or update</h1>
            <p className="text-[13px] text-gray-500 mt-0.5 max-w-xl">
              One line, straight to the phones of everyone who has been stamped at {merchantName}, and onto Today for everyone on Stampd.
              One a day, between 9am and 8pm. Plan the week ahead if you like.
            </p>
          </div>
        </div>
      )}

      <SpecialsWeek rows={rows} onPickDay={day => setPlannedDay(day + '#' + Date.now())} />

      <SpecialComposer
        merchantId={merchantId}
        merchantName={merchantName}
        plannedDay={plannedDay}
        onPosted={() => { reload(); setPlannedDay(null) }}
      />

      <div>
        <h2 className="text-[15px] font-semibold text-gray-900 mb-3">{compact ? 'Their posts' : 'Your posts'}</h2>
        <SpecialsHistory rows={rows} reload={reload} />
      </div>
    </div>
  )
}
