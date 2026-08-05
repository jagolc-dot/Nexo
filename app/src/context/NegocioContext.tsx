import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from './AuthContext'
import { claveNegocioActivo } from '../lib/negocioStorage'
import type { AccesoNegocio, Negocio } from '../types'

interface NegocioContextValue {
  accesos: AccesoNegocio[] | null
  negocioActivo: Negocio | null
  loading: boolean
  seleccionarNegocio: (negocio: Negocio) => void
  actualizarNegocioActivo: (cambios: Partial<Negocio>) => void
}

const NegocioContext = createContext<NegocioContextValue | undefined>(undefined)

export function NegocioProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [accesos, setAccesos] = useState<AccesoNegocio[] | null>(null)
  const [negocioActivo, setNegocioActivo] = useState<Negocio | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) {
      setAccesos(null)
      setNegocioActivo(null)
      setLoading(false)
      return
    }

    let cancelado = false
    setLoading(true)

    supabase
      .from('usuarios_negocio')
      .select('rol, negocio:negocios(id, nombre, tipo, tema, logo_url)')
      .eq('usuario_id', user.id)
      .then(({ data, error }) => {
        if (cancelado) return
        if (error || !data) {
          setAccesos([])
          setLoading(false)
          return
        }

        const lista = data
          .filter((fila) => fila.negocio)
          .map((fila) => ({ negocio: fila.negocio as unknown as Negocio, rol: fila.rol }))

        setAccesos(lista)

        const idGuardado = localStorage.getItem(claveNegocioActivo(user.id))
        const coincidencia = lista.find((a) => a.negocio.id === idGuardado)

        if (coincidencia) {
          setNegocioActivo(coincidencia.negocio)
        } else if (lista.length === 1) {
          setNegocioActivo(lista[0].negocio)
          localStorage.setItem(claveNegocioActivo(user.id), lista[0].negocio.id)
        } else {
          setNegocioActivo(null)
        }

        setLoading(false)
      })

    return () => {
      cancelado = true
    }
  }, [user])

  function seleccionarNegocio(negocio: Negocio) {
    if (!user) return
    localStorage.setItem(claveNegocioActivo(user.id), negocio.id)
    setNegocioActivo(negocio)
  }

  // Refleja de inmediato un cambio ya guardado en la base (ej. desde
  // Ajustes) sin esperar a un refetch — evita que la UI (tema, logo)
  // quede desincronizada del negocio recién editado.
  function actualizarNegocioActivo(cambios: Partial<Negocio>) {
    setNegocioActivo((actual) => (actual ? { ...actual, ...cambios } : actual))
    setAccesos((actual) =>
      actual
        ? actual.map((a) => (a.negocio.id === negocioActivo?.id ? { ...a, negocio: { ...a.negocio, ...cambios } } : a))
        : actual,
    )
  }

  useEffect(() => {
    document.documentElement.setAttribute('data-tema', negocioActivo?.tema || 'neutro')
    return () => {
      // Si este provider se desmonta (ej. cerrar sesión), no debe
      // quedar pegado el tema del negocio anterior en /login.
      document.documentElement.setAttribute('data-tema', 'neutro')
    }
  }, [negocioActivo])

  return (
    <NegocioContext.Provider value={{ accesos, negocioActivo, loading, seleccionarNegocio, actualizarNegocioActivo }}>
      {children}
    </NegocioContext.Provider>
  )
}

export function useNegocio() {
  const ctx = useContext(NegocioContext)
  if (!ctx) throw new Error('useNegocio debe usarse dentro de NegocioProvider')
  return ctx
}
