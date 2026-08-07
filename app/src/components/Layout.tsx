import { useEffect, useState, type ReactNode } from 'react'
import { Link, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useNegocio } from '../context/NegocioContext'
import { tieneServiciosConAgenda } from '../lib/agenda'
import { Logo } from '../components/ui/Logo'

const TRAZO = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round', strokeLinejoin: 'round' } as const

function IconoInicio(p: { size: number }) {
  return (
    <svg width={p.size} height={p.size} viewBox="0 0 24 24" {...TRAZO}>
      <path d="M3 11.5 12 4l9 7.5" />
      <path d="M5.5 10.5V20h13v-9.5" />
    </svg>
  )
}
function IconoAgenda(p: { size: number }) {
  return (
    <svg width={p.size} height={p.size} viewBox="0 0 24 24" {...TRAZO}>
      <rect x="3.5" y="5" width="17" height="15.5" rx="2" />
      <path d="M3.5 9.5h17" />
      <path d="M8 3v4" />
      <path d="M16 3v4" />
    </svg>
  )
}
function IconoClientes(p: { size: number }) {
  return (
    <svg width={p.size} height={p.size} viewBox="0 0 24 24" {...TRAZO}>
      <circle cx="9" cy="8.5" r="3.25" />
      <path d="M3.5 19c.6-3 2.8-4.75 5.5-4.75s4.9 1.75 5.5 4.75" />
      <circle cx="16.75" cy="9.75" r="2.5" />
      <path d="M17.6 14.6c1.8.55 2.7 1.85 3.1 3.9" />
    </svg>
  )
}
function IconoCatalogo(p: { size: number }) {
  return (
    <svg width={p.size} height={p.size} viewBox="0 0 24 24" {...TRAZO}>
      <path d="M4 4h6.6L20 13.4a1.8 1.8 0 0 1 0 2.6l-4 4a1.8 1.8 0 0 1-2.6 0L4 10.6z" />
      <circle cx="8.3" cy="8.3" r="1.1" />
    </svg>
  )
}
function IconoVentas(p: { size: number }) {
  return (
    <svg width={p.size} height={p.size} viewBox="0 0 24 24" {...TRAZO}>
      <path d="M6.5 3.5h11v17l-2.2-1.5-2.05 1.5-2.05-1.5-2.1 1.5z" />
      <path d="M9.5 8.5h5" />
      <path d="M9.5 12h5" />
    </svg>
  )
}
function IconoGastos(p: { size: number }) {
  return (
    <svg width={p.size} height={p.size} viewBox="0 0 24 24" {...TRAZO}>
      <rect x="3.5" y="6.5" width="17" height="13" rx="2" />
      <path d="M3.5 10.5h17" />
      <path d="M15 15h2.5" />
    </svg>
  )
}
function IconoReportes(p: { size: number }) {
  return (
    <svg width={p.size} height={p.size} viewBox="0 0 24 24" {...TRAZO}>
      <path d="M4 21h16" />
      <path d="M6 18v-6" />
      <path d="M12 18V6.5" />
      <path d="M18 18v-9" />
    </svg>
  )
}
function IconoAjustes(p: { size: number }) {
  return (
    <svg width={p.size} height={p.size} viewBox="0 0 24 24" {...TRAZO}>
      <path d="M4 7.5h16" />
      <circle cx="10" cy="7.5" r="2.2" />
      <path d="M4 16.5h16" />
      <circle cx="15" cy="16.5" r="2.2" />
    </svg>
  )
}
function IconoCerrarSesion(p: { size: number }) {
  return (
    <svg width={p.size} height={p.size} viewBox="0 0 24 24" {...TRAZO}>
      <path d="M14 4h4.5a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H14" />
      <path d="M4 12h10" />
      <path d="M8 8l-4 4 4 4" />
    </svg>
  )
}
function IconoHamburguesa() {
  return (
    <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round">
      <path d="M4 7h16" />
      <path d="M4 12h16" />
      <path d="M4 17h16" />
    </svg>
  )
}

interface ModuloNav {
  to: string
  etiqueta: string
  icono: (p: { size: number }) => ReactNode
  visible?: boolean
}

/** "Glam Nails by Chio" → título/subtítulo; sin " by " en el nombre, una sola línea. */
function partirNombreNegocio(nombre: string | undefined): { titulo: string; subtitulo: string | null } {
  if (!nombre) return { titulo: '', subtitulo: null }
  const match = nombre.match(/^(.+?)\s+by\s+(.+)$/i)
  if (!match) return { titulo: nombre, subtitulo: null }
  return { titulo: match[1], subtitulo: `by ${match[2]}` }
}

export function Layout() {
  const { signOut, nombreUsuario } = useAuth()
  const { negocioActivo, accesos } = useNegocio()
  const location = useLocation()

  const [menuMovilAbierto, setMenuMovilAbierto] = useState(false)
  const [expandidaEnTablet, setExpandidaEnTablet] = useState(false)
  const [menuPerfilAbierto, setMenuPerfilAbierto] = useState(false)
  const [mostrarAgenda, setMostrarAgenda] = useState(false)

  const puedeCambiarNegocio = (accesos?.length ?? 0) > 1
  const esDueno = accesos?.some((a) => a.rol === 'dueño') ?? false
  const { titulo: nombreNegocio, subtitulo: subtituloNegocio } = partirNombreNegocio(negocioActivo?.nombre)
  const inicialUsuario = (nombreUsuario ?? '?').trim().charAt(0).toUpperCase()

  useEffect(() => {
    if (!negocioActivo) return
    tieneServiciosConAgenda(negocioActivo.id).then(setMostrarAgenda)
  }, [negocioActivo])

  useEffect(() => {
    setMenuMovilAbierto(false)
  }, [location.pathname])

  const modulos: ModuloNav[] = [
    { to: '/', etiqueta: 'Inicio', icono: IconoInicio },
    { to: '/agenda', etiqueta: 'Agenda', icono: IconoAgenda, visible: mostrarAgenda },
    { to: '/clientes', etiqueta: 'Clientes', icono: IconoClientes },
    { to: '/catalogo', etiqueta: 'Catálogo', icono: IconoCatalogo },
    { to: '/ventas', etiqueta: 'Ventas', icono: IconoVentas },
    { to: '/gastos', etiqueta: 'Gastos', icono: IconoGastos },
    { to: '/reportes', etiqueta: 'Reportes', icono: IconoReportes },
  ]

  function estaActivo(to: string) {
    return to === '/' ? location.pathname === '/' : location.pathname.startsWith(to)
  }

  function claseItemNav(activo: boolean) {
    return `flex min-h-11 items-center gap-2.5 rounded-lg px-2.5 text-[13.5px] transition-colors hover:bg-[var(--color-hover-nav)] ${
      activo
        ? 'bg-[color-mix(in_srgb,var(--color-primario)_10%,white)] font-medium text-[var(--color-primario)]'
        : 'text-[var(--color-texto-suave)]'
    }`
  }

  function ContenidoMenu({
    forzarEtiquetas,
    onAlternarTablet,
    tabletExpandida,
  }: {
    forzarEtiquetas: boolean
    onAlternarTablet?: () => void
    tabletExpandida?: boolean
  }) {
    const claseEtiqueta = forzarEtiquetas ? 'truncate' : 'hidden truncate lg:inline'

    return (
      <div className="flex h-full flex-col">
        <div className="flex items-center gap-2.5 px-2">
          {negocioActivo?.logo_url ? (
            <img src={negocioActivo.logo_url} alt="" className="h-10 w-10 shrink-0 rounded-full object-cover" />
          ) : (
            <Logo size={40} />
          )}
          <div className={`min-w-0 flex-1 ${claseEtiqueta}`}>
            <div
              className="truncate text-[14.5px] font-medium leading-tight text-[var(--color-texto)]"
              style={{ fontFamily: 'var(--fuente-titulos)' }}
              translate="no"
            >
              {nombreNegocio}
            </div>
            {subtituloNegocio && (
              <div className="truncate text-[11.5px] text-[var(--color-texto-suave)]">{subtituloNegocio}</div>
            )}
          </div>
          {onAlternarTablet && (
            <button
              onClick={onAlternarTablet}
              className="ml-auto hidden min-h-8 min-w-8 items-center justify-center rounded-lg text-[var(--color-texto-suave)] hover:bg-[var(--color-hover-nav)] md:flex lg:hidden"
              aria-label={tabletExpandida ? 'Colapsar menú' : 'Expandir menú'}
            >
              {tabletExpandida ? '«' : '»'}
            </button>
          )}
        </div>

        <nav className="mt-[22px] flex flex-1 flex-col gap-0.5 overflow-y-auto px-2">
          {modulos
            .filter((m) => m.visible !== false)
            .map((m) => (
              <Link key={m.to} to={m.to} title={forzarEtiquetas ? undefined : m.etiqueta} className={claseItemNav(estaActivo(m.to))}>
                <m.icono size={18} />
                <span className={claseEtiqueta}>{m.etiqueta}</span>
              </Link>
            ))}
        </nav>

        <div className="relative mt-3 border-t px-2 pt-3" style={{ borderColor: 'var(--color-hairline)' }}>
          <button
            onClick={() => setMenuPerfilAbierto((v) => !v)}
            className="flex w-full items-center gap-2.5 rounded-lg p-1.5 text-left hover:bg-[var(--color-hover-nav)]"
          >
            <span
              className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full text-[13px] font-medium"
              style={{ background: 'color-mix(in srgb, var(--color-primario) 14%, white)', color: 'var(--color-primario)' }}
            >
              {inicialUsuario}
            </span>
            <span className={`min-w-0 flex-1 ${claseEtiqueta}`}>
              <span className="block truncate text-[13px] font-medium text-[var(--color-texto)]">
                {nombreUsuario ?? '—'}
              </span>
              <span className="block truncate text-[11px] text-[var(--color-texto-suave)]">{negocioActivo?.nombre}</span>
            </span>
          </button>

          {menuPerfilAbierto && (
            <div
              className="absolute bottom-full left-2 z-10 mb-1 w-48 rounded-xl border bg-[var(--color-superficie)] py-1 shadow-lg"
              style={{ borderColor: 'var(--color-hairline)' }}
            >
              {puedeCambiarNegocio && (
                <Link
                  to="/selector"
                  onClick={() => setMenuPerfilAbierto(false)}
                  className="block px-4 py-2 text-sm text-[var(--color-texto)] hover:bg-[var(--color-hover-nav)]"
                >
                  Cambiar negocio
                </Link>
              )}
              {esDueno && (
                <Link
                  to="/admin/usuarios"
                  onClick={() => setMenuPerfilAbierto(false)}
                  className="block px-4 py-2 text-sm text-[var(--color-texto)] hover:bg-[var(--color-hover-nav)]"
                >
                  Usuarios
                </Link>
              )}
            </div>
          )}

          <Link to="/ajustes" className={`mt-0.5 ${claseItemNav(estaActivo('/ajustes'))}`} style={{ fontSize: '13px' }}>
            <IconoAjustes size={17} />
            <span className={claseEtiqueta}>Ajustes</span>
          </Link>
          <button
            onClick={signOut}
            className="mt-0.5 flex min-h-11 w-full items-center gap-2.5 rounded-lg px-2.5 text-[13px] text-[var(--color-texto-suave)] hover:bg-[var(--color-hover-nav)]"
          >
            <IconoCerrarSesion size={17} />
            <span className={claseEtiqueta}>Cerrar sesión</span>
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-svh bg-[var(--color-fondo)]">
      {/* Menú lateral persistente: tablet vertical (íconos) y escritorio (completo) */}
      <aside
        className={`hidden shrink-0 border-r bg-[var(--color-superficie)] md:block ${
          expandidaEnTablet ? 'md:w-64' : 'md:w-16 lg:w-[232px]'
        }`}
        style={{ borderColor: 'var(--color-hairline)', padding: '20px 14px' }}
      >
        <ContenidoMenu
          forzarEtiquetas={expandidaEnTablet}
          tabletExpandida={expandidaEnTablet}
          onAlternarTablet={() => setExpandidaEnTablet((v) => !v)}
        />
      </aside>

      {/* Menú lateral como panel deslizante: celular */}
      {menuMovilAbierto && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMenuMovilAbierto(false)} />
          <aside
            className="absolute inset-y-0 left-0 w-64 max-w-[80vw] bg-[var(--color-superficie)] shadow-xl"
            style={{ padding: '20px 14px' }}
          >
            <ContenidoMenu forzarEtiquetas />
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Barra superior: solo celular */}
        <header
          className="flex items-center gap-3 border-b bg-[var(--color-superficie)] px-4 py-3 md:hidden"
          style={{ borderColor: 'var(--color-hairline)' }}
        >
          <button
            onClick={() => setMenuMovilAbierto(true)}
            className="flex min-h-11 min-w-11 items-center justify-center rounded-lg text-[var(--color-texto)]"
            aria-label="Abrir menú"
          >
            <IconoHamburguesa />
          </button>
          {negocioActivo?.logo_url ? (
            <img src={negocioActivo.logo_url} alt="" className="h-[30px] w-[30px] shrink-0 rounded-full object-cover" />
          ) : (
            <Logo size={30} />
          )}
          <div
            className="min-w-0 flex-1 truncate text-[15px] font-medium"
            style={{ fontFamily: 'var(--fuente-titulos)', color: 'var(--color-texto)' }}
            translate="no"
          >
            {nombreNegocio}
            {subtituloNegocio && (
              <span className="ml-1.5 text-xs font-normal text-[var(--color-texto-suave)]">{subtituloNegocio}</span>
            )}
          </div>
          <span
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-medium"
            style={{ background: 'color-mix(in srgb, var(--color-primario) 14%, white)', color: 'var(--color-primario)' }}
          >
            {inicialUsuario}
          </span>
        </header>

        <main className="min-w-0 flex-1 overflow-x-hidden">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
