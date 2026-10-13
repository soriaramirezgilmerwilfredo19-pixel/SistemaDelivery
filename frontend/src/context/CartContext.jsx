import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import api from '../api/client'
import { useAuth } from './AuthContext'

const CartContext = createContext(null)

export function CartProvider({ children }) {
  const { user } = useAuth()
  const [cart, setCart] = useState({ items: [], subtotal: 0 })
  const [loading, setLoading] = useState(false)

  const refresh = useCallback(async () => {
    if (!user || user.role !== 'client') {
      setCart({ items: [], subtotal: 0 })
      return
    }
    setLoading(true)
    try {
      const { data } = await api.get('/cart')
      const payload = data?.data || data
      setCart({
        items: payload?.items || [],
        subtotal: Number(payload?.subtotal || 0),
      })
    } catch {
      setCart({ items: [], subtotal: 0 })
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    refresh()
  }, [refresh])

  const count = useMemo(
    () => (cart?.items || []).reduce((sum, item) => sum + Number(item.quantity || 0), 0),
    [cart]
  )

  const value = useMemo(() => ({ cart, count, loading, refresh }), [cart, count, loading, refresh])

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart debe usarse dentro de <CartProvider>')
  return ctx
}
