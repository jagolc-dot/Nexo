import { Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useNegocio } from '../context/NegocioContext'
import { Logo } from '../components/ui/Logo'
import { GIRO_POR_TEMA } from '../lib/negociosConfig'

function IconoCerrarSesion() {
  return (
    <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 4h4.5a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H14" />
      <path d="M4 12h10" />
      <path d="M8 8l-4 4 4 4" />
    </svg>
  )
}

export function SelectorNegocioPage() {
  const { nombreUsuario, user, signOut } = useAuth()
  const { accesos, seleccionarNegocio } = useNegocio()
  const navigate = useNavigate()

  if (accesos && accesos.length === 0) {
    return <Navigate to="/sin-acceso" replace />
  }

  if (accesos && accesos.length === 1) {
    return <Navigate to="/" replace />
  }

  const nombre = nombreUsuario ?? user?.email?.split('@')[0] ?? ''

  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-1 bg-[var(--color-fondo)] px-4 py-8 text-center">
      <Logo size={40} />
      <h1 className="mt-3.5 text-[22px] font-medium text-[var(--color-texto)]">Hola, {nombre}</h1>
      <p className="text-[13.5px] text-[var(--color-texto-suave)]">¿Con qué negocio quieres trabajar hoy?</p>

      <div className="mt-6 flex flex-wrap justify-center gap-4">
        {accesos?.map(({ negocio }) => (
          <button
            key={negocio.id}
            data-tema={negocio.tema ?? 'neutro'}
            onClick={() => {
              seleccionarNegocio(negocio)
              navigate('/', { replace: true })
            }}
            className="flex w-[260px] flex-col items-center rounded-[14px] border bg-[var(--color-superficie)] p-6 text-center transition hover:shadow-[0_4px_18px_rgba(31,51,87,.1)]"
            style={{ borderColor: 'var(--color-hairline)' }}
            onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--color-acento)')}
            onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--color-hairline)')}
          >
            {negocio.logo_url ? (
              <img src={negocio.logo_url} alt="" className="h-16 w-16 rounded-full object-cover" />
            ) : (
              <span
                className="flex h-16 w-16 items-center justify-center rounded-full text-2xl font-medium"
                style={{ background: 'color-mix(in srgb, var(--color-primario) 12%, white)', color: 'var(--color-primario)' }}
              >
                {negocio.nombre.charAt(0).toUpperCase()}
              </span>
            )}
            <div className="mt-3 text-[15.5px] font-medium text-[var(--color-texto)]">{negocio.nombre}</div>
            <div className="mt-0.5 flex items-center gap-1.5">
              {GIRO_POR_TEMA[negocio.tema ?? ''] && <span className="text-[12.5px] text-[var(--color-texto-suave)]">{GIRO_POR_TEMA[negocio.tema ?? '']}</span>}
            </div>
            <div className="mt-3 flex gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: 'var(--color-primario)' }} />
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: 'var(--color-acento)' }} />
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: 'var(--color-secundario)' }} />
            </div>
          </button>
        ))}
      </div>

      <p className="mt-5 max-w-[380px] text-xs leading-[1.5] text-[var(--color-texto-suave)]">
        Al elegir se aplica el tema del negocio. Puedes cambiar de negocio en cualquier momento desde el menú, sin cerrar sesión.
      </p>
      <button onClick={signOut} className="mt-4 inline-flex items-center gap-1.5 text-[13px] font-medium text-[var(--color-texto-suave)]">
        <IconoCerrarSesion />
        Cerrar sesión
      </button>
    </div>
  )
}
