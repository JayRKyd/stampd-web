import { createContext, useContext, type ReactNode } from 'react'

interface MerchantStatusContextValue {
  isActive: boolean
  loading: boolean
}

const MerchantStatusContext = createContext<MerchantStatusContextValue>({
  isActive: true,
  loading: true,
})

export function MerchantStatusProvider({
  isActive,
  loading,
  children,
}: MerchantStatusContextValue & { children: ReactNode }) {
  return (
    <MerchantStatusContext.Provider value={{ isActive, loading }}>
      {children}
    </MerchantStatusContext.Provider>
  )
}

export function useMerchantStatus() {
  return useContext(MerchantStatusContext)
}
