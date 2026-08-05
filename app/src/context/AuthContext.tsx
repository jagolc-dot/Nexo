import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabaseClient'
import { obtenerNombrePropio } from '../lib/auth'
import { claveNegocioActivo } from '../lib/negocioStorage'

interface AuthContextValue {
  session: Session | null
  user: User | null
  nombreUsuario: string | null
  loading: boolean
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [nombreUsuario, setNombreUsuario] = useState<string | null>(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession)
      setLoading(false)
    })

    return () => subscription.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    const userId = session?.user.id
    if (!userId) {
      setNombreUsuario(null)
      return
    }
    obtenerNombrePropio(userId).then(setNombreUsuario)
  }, [session?.user.id])

  async function signOut() {
    // Se borra el negocio recordado para que el próximo login, si hay
    // 2+ negocios, vuelva a mostrar el selector en vez de saltárselo.
    if (session?.user.id) {
      localStorage.removeItem(claveNegocioActivo(session.user.id))
    }
    await supabase.auth.signOut()
  }

  return (
    <AuthContext.Provider value={{ session, user: session?.user ?? null, nombreUsuario, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider')
  return ctx
}
