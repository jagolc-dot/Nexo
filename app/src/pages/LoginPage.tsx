import { useState, type FormEvent } from 'react'
import { Navigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { emailSintetico } from '../lib/auth'
import { useAuth } from '../context/AuthContext'
import { Logo } from '../components/ui/Logo'
import { claseBoton } from '../components/ui/Button'

function IconoAdvertencia() {
  return (
    <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="var(--color-error)" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 shrink-0">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7.5v5.5" />
      <path d="M12 16.5h.01" />
    </svg>
  )
}
function IconoOjo({ visible }: { visible: boolean }) {
  return visible ? (
    <svg width={17} height={17} viewBox="0 0 24 24" fill="none" stroke="#9AA7B6" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 3l18 18" />
      <path d="M10.6 5.6A10.6 10.6 0 0 1 12 5.5c6 0 9.5 6.5 9.5 6.5a13.6 13.6 0 0 1-3 3.7M6.5 6.9C4 8.6 2.5 12 2.5 12s3.5 6.5 9.5 6.5a9.7 9.7 0 0 0 3.4-.6" />
      <path d="M9.9 10a2.8 2.8 0 0 0 4 4" />
    </svg>
  ) : (
    <svg width={17} height={17} viewBox="0 0 24 24" fill="none" stroke="#9AA7B6" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
      <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" />
      <circle cx="12" cy="12" r="2.8" />
    </svg>
  )
}

export function LoginPage() {
  const { session, loading } = useAuth()
  const [usuario, setUsuario] = useState('')
  const [password, setPassword] = useState('')
  const [mostrarPassword, setMostrarPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  if (!loading && session) {
    return <Navigate to="/" replace />
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setEnviando(true)

    const { error } = await supabase.auth.signInWithPassword({
      email: emailSintetico(usuario),
      password,
    })

    setEnviando(false)
    if (error) {
      setError('Usuario o contraseña incorrectos. Si olvidaste tu contraseña, pídele al dueño que la restablezca.')
    }
  }

  return (
    <div className="flex min-h-svh items-center justify-center bg-[var(--color-fondo)] px-4">
      <div className="w-full max-w-[380px] rounded-[14px] bg-[var(--color-superficie)] p-8 shadow-[0_4px_24px_rgba(31,51,87,.08)]">
        <div className="flex flex-col items-center text-center">
          <Logo size={48} />
          <div className="mt-3 text-[21px] font-medium tracking-[.01em] text-[var(--color-texto)]">Nexo</div>
          <div className="mt-0.5 text-[12.5px] text-[var(--color-texto-suave)]">Administración de negocios</div>
        </div>

        {error && (
          <div className="mt-5 flex gap-2.5 rounded-[10px] p-3" style={{ background: 'color-mix(in srgb, var(--color-error) 9%, white)' }}>
            <IconoAdvertencia />
            <p className="text-[12.5px] leading-[1.45]" style={{ color: '#A03A31' }}>
              {error}
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-5 flex flex-col gap-3.5">
          <label className="flex flex-col gap-1.5 text-xs font-medium text-[var(--color-texto)]">
            Usuario
            <input
              required
              value={usuario}
              onChange={(e) => setUsuario(e.target.value)}
              autoComplete="username"
              className="flex min-h-[46px] w-full items-center rounded-[10px] border px-3 text-sm text-[var(--color-texto)] outline-none focus:border-[var(--color-primario)]"
              style={{ borderColor: error ? 'var(--color-error)' : 'var(--color-borde-campo)' }}
            />
          </label>

          <label className="flex flex-col gap-1.5 text-xs font-medium text-[var(--color-texto)]">
            Contraseña
            <div
              className="flex min-h-[46px] w-full items-center gap-2 rounded-[10px] border px-3"
              style={{ borderColor: error ? 'var(--color-error)' : 'var(--color-borde-campo)' }}
            >
              <input
                type={mostrarPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                className="min-w-0 flex-1 bg-transparent text-base text-[var(--color-texto)] outline-none"
              />
              <button type="button" onClick={() => setMostrarPassword((v) => !v)} aria-label={mostrarPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}>
                <IconoOjo visible={mostrarPassword} />
              </button>
            </div>
          </label>

          <button type="submit" disabled={enviando} className={claseBoton('primario', 'mt-1.5 w-full !min-h-12')}>
            {enviando ? 'Entrando...' : 'Entrar'}
          </button>
        </form>

        <p className="mt-4 text-center text-xs leading-[1.5] text-[var(--color-texto-suave)]">Las cuentas las crea el dueño del negocio.</p>
      </div>
    </div>
  )
}
