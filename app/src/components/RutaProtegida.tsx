import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { NegocioProvider, useNegocio } from '../context/NegocioContext'

function Cargando() {
  return (
    <div className="flex min-h-svh items-center justify-center bg-[var(--color-fondo)]">
      <p className="text-sm text-[var(--color-texto-suave)]">Cargando...</p>
    </div>
  )
}

export function RutaProtegida() {
  const { session, loading } = useAuth()

  if (loading) return <Cargando />
  if (!session) return <Navigate to="/login" replace />

  return (
    <NegocioProvider>
      <Outlet />
    </NegocioProvider>
  )
}

export function RequiereNegocioActivo() {
  const { accesos, negocioActivo, loading } = useNegocio()

  if (loading || accesos === null) return <Cargando />
  if (accesos.length === 0) return <Navigate to="/sin-acceso" replace />
  if (!negocioActivo) return <Navigate to="/selector" replace />

  return <Outlet />
}
