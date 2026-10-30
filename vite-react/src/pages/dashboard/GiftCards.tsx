import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Gift } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { GiftCardsWorkspace, GiftSection } from '@/components/GiftCards'

export default function GiftCards() {
  const { section } = useParams<{ section?: string }>()
  const current: GiftSection = section === 'redeem' ? 'redeem' : section === 'history' ? 'history' : 'issue'
  const [merchant, setMerchant] = useState<{ id: string; business_name: string; gift_cards_enabled: boolean } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoading(false); return }
      const { data } = await supabase
        .from('merchants')
        .select('id, business_name, gift_cards_enabled')
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

  if (!merchant.gift_cards_enabled) {
    return (
      <div className="animate-enter max-w-md mx-auto">
        <div className="border border-gray-200 rounded-2xl bg-white p-8 text-center">
          <div className="w-12 h-12 rounded-xl bg-brand-50 flex items-center justify-center mx-auto mb-4"><Gift size={22} className="text-brand-600" /></div>
          <h1 className="text-[18px] font-semibold text-gray-900 mb-2">Gift cards aren't on yet</h1>
          <p className="text-[13px] text-gray-600 leading-relaxed">
            Sell gift cards at your counter with no cardboard and no lost cards. Stampd keeps the balance; you keep the money.
            Message Stampd to switch it on for {merchant.business_name}.
          </p>
          <Link to="/dashboard" className="inline-flex mt-5 px-4 py-2 rounded-lg bg-brand-500 text-white text-[13px] font-semibold hover:bg-brand-600">Back to dashboard</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="animate-enter">
      <GiftCardsWorkspace merchantId={merchant.id} merchantName={merchant.business_name} section={current} />
    </div>
  )
}
