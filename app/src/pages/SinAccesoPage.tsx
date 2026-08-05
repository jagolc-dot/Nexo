import { useAuth } from '../context/AuthContext'
import { Button } from '../components/ui/Button'
import { Logo } from '../components/ui/Logo'

export function SinAccesoPage() {
  const { signOut } = useAuth()

  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-4 bg-[var(--color-fondo)] px-4 text-center">
      <Logo size={40} />
      <h1 className="text-xl font-medium text-[var(--color-texto)]">Sin negocio asignado</h1>
      <p className="max-w-sm text-sm text-[var(--color-texto-suave)]">
        Tu cuenta todavía no tiene ningún negocio asignado. Pide al administrador que te dé
        acceso.
      </p>
      <Button variante="secundario" onClick={signOut}>
        Cerrar sesión
      </Button>
    </div>
  )
}
