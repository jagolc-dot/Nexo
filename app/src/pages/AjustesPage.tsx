import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useNegocio } from '../context/NegocioContext'
import { supabase } from '../lib/supabaseClient'
import { subirLogoNegocio, actualizarTemaNegocio } from '../lib/negocios'
import { GIRO_POR_TEMA, TEMAS_DISPONIBLES } from '../lib/negociosConfig'
import { claseBoton } from '../components/ui/Button'
import { Logo } from '../components/ui/Logo'

function Tarjeta({ children }: { children: React.ReactNode }) {
  return <div className="rounded-xl bg-[var(--color-superficie)] p-5 shadow-[0_1px_3px_rgba(74,50,43,.07)]">{children}</div>
}
function Etiqueta({ children }: { children: React.ReactNode }) {
  return <div className="text-[11.5px] font-medium uppercase tracking-[.07em] text-[var(--color-texto-suave)]">{children}</div>
}
function IconoCheck() {
  return (
    <svg width={10} height={10} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
      <path d="m5 12 5 5 9-10" />
    </svg>
  )
}
function IconoChevron() {
  return (
    <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="#C9B4AA" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
      <path d="m9.5 6 6 6-6 6" />
    </svg>
  )
}
function IconoCerrar() {
  return (
    <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round">
      <path d="M6 6l12 12" />
      <path d="M18 6 6 18" />
    </svg>
  )
}
function IconoCerrarSesion() {
  return (
    <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 4h4.5a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H14" />
      <path d="M4 12h10" />
      <path d="M8 8l-4 4 4 4" />
    </svg>
  )
}

function ModalCambiarPassword({ onCerrar }: { onCerrar: () => void }) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [ok, setOk] = useState(false)
  const [enviando, setEnviando] = useState(false)

  async function guardar() {
    setError(null)
    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.')
      return
    }
    setEnviando(true)
    const { error } = await supabase.auth.updateUser({ password })
    setEnviando(false)
    if (error) {
      setError('No se pudo cambiar la contraseña. Intenta de nuevo.')
      return
    }
    setOk(true)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/32 p-4">
      <div className="w-full max-w-[420px] overflow-hidden rounded-[14px] bg-[var(--color-superficie)] shadow-[0_18px_50px_rgba(74,50,43,.3)]">
        <div className="flex items-center gap-2.5 border-b px-4 py-3.5" style={{ borderColor: 'var(--color-divisor-fuerte)' }}>
          <div className="flex-1 text-[17px] font-medium text-[var(--color-texto)]" style={{ fontFamily: 'var(--fuente-titulos)' }}>
            Cambiar contraseña
          </div>
          <button onClick={onCerrar} className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--color-texto-suave)] hover:bg-[var(--color-hover-nav)]" aria-label="Cerrar">
            <IconoCerrar />
          </button>
        </div>

        {ok ? (
          <div className="p-4">
            <p className="text-sm text-[var(--color-texto)]">Tu contraseña se actualizó correctamente.</p>
            <button onClick={onCerrar} className={claseBoton('primario', 'mt-4 w-full !min-h-11')}>
              Listo
            </button>
          </div>
        ) : (
          <>
            <div className="p-4">
              <div className="mb-1.5 text-xs font-medium text-[var(--color-texto)]">
                Nueva contraseña <span style={{ color: 'var(--color-error)' }}>*</span>
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="flex min-h-11 w-full items-center rounded-[10px] border px-3 text-sm text-[var(--color-texto)] outline-none focus:border-[var(--color-primario)]"
                style={{ borderColor: 'var(--color-borde-campo)' }}
              />
              {error && <p className="mt-2 text-xs text-[var(--color-error)]">{error}</p>}
            </div>
            <div className="flex gap-2 border-t p-4" style={{ borderColor: 'var(--color-divisor-fuerte)' }}>
              <button onClick={onCerrar} className={claseBoton('secundario', 'flex-1 !min-h-11')}>
                Cancelar
              </button>
              <button onClick={guardar} disabled={enviando} className={claseBoton('primario', 'flex-1 !min-h-11')}>
                {enviando ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export function AjustesPage() {
  const { nombreUsuario, user, signOut } = useAuth()
  const { negocioActivo, accesos, actualizarNegocioActivo } = useNegocio()
  const inputLogoRef = useRef<HTMLInputElement>(null)

  const [mostrarPassword, setMostrarPassword] = useState(false)
  const [subiendoLogo, setSubiendoLogo] = useState(false)
  const [cambiandoTema, setCambiandoTema] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!negocioActivo) return null

  const esDueno = accesos?.some((a) => a.rol === 'dueño') ?? false
  const nombre = nombreUsuario ?? user?.email?.split('@')[0] ?? ''
  const usuarioLogin = user?.email?.split('@')[0] ?? ''

  async function onArchivoLogo(e: React.ChangeEvent<HTMLInputElement>) {
    const archivo = e.target.files?.[0]
    if (!archivo || !negocioActivo) return
    setError(null)
    setSubiendoLogo(true)
    try {
      const url = await subirLogoNegocio(negocioActivo.id, archivo)
      actualizarNegocioActivo({ logo_url: url })
    } catch {
      setError('No se pudo subir el logo. Intenta con otra imagen.')
    } finally {
      setSubiendoLogo(false)
      if (inputLogoRef.current) inputLogoRef.current.value = ''
    }
  }

  async function cambiarTema(tema: string) {
    if (!negocioActivo || tema === negocioActivo.tema) return
    setCambiandoTema(true)
    try {
      await actualizarTemaNegocio(negocioActivo.id, tema)
      actualizarNegocioActivo({ tema })
    } catch {
      setError('No se pudo cambiar el tema.')
    } finally {
      setCambiandoTema(false)
    }
  }

  return (
    <div className="p-4 md:p-[22px] lg:p-7">
      <div className="text-[22px] font-medium text-[var(--color-texto)]" style={{ fontFamily: 'var(--fuente-titulos)' }}>
        Ajustes
      </div>

      <div className="mt-4 flex max-w-[640px] flex-col gap-4">
        <Tarjeta>
          <Etiqueta>Perfil</Etiqueta>
          <div className="mt-3 flex flex-wrap items-center gap-3.5">
            <span
              className="flex h-[46px] w-[46px] shrink-0 items-center justify-center rounded-full text-[17px] font-medium"
              style={{ background: 'color-mix(in srgb, var(--color-primario) 14%, white)', color: 'var(--color-primario)' }}
            >
              {nombre.charAt(0).toUpperCase()}
            </span>
            <div className="min-w-0 flex-1">
              <div className="text-[15px] font-medium text-[var(--color-texto)]">{nombre}</div>
              <div className="mt-0.5 text-[12.5px] text-[var(--color-texto-suave)]">usuario: {usuarioLogin}</div>
            </div>
            <button onClick={() => setMostrarPassword(true)} className={claseBoton('secundario', '!min-h-10 px-3.5 text-[13px]')}>
              Cambiar contraseña
            </button>
          </div>
        </Tarjeta>

        <Tarjeta>
          <Etiqueta>Negocio</Etiqueta>
          <div className="mt-3 flex flex-wrap items-center gap-3.5">
            {negocioActivo.logo_url ? (
              <img src={negocioActivo.logo_url} alt="" className="h-[46px] w-[46px] shrink-0 rounded-full object-cover" />
            ) : (
              <div className="shrink-0">
                <Logo size={46} />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div className="text-[15px] font-medium text-[var(--color-texto)]">{negocioActivo.nombre}</div>
              {GIRO_POR_TEMA[negocioActivo.tema ?? ''] && (
                <div className="mt-0.5 text-[12.5px] text-[var(--color-texto-suave)]">{GIRO_POR_TEMA[negocioActivo.tema ?? '']}</div>
              )}
            </div>
            <button onClick={() => inputLogoRef.current?.click()} disabled={subiendoLogo} className={claseBoton('secundario', '!min-h-10 px-3.5 text-[13px]')}>
              {subiendoLogo ? 'Subiendo...' : 'Cambiar logo'}
            </button>
            <input ref={inputLogoRef} type="file" accept="image/*" className="hidden" onChange={onArchivoLogo} />
          </div>

          <div className="mt-4 border-t pt-3.5" style={{ borderColor: 'var(--color-divisor)' }}>
            <div className="text-xs font-medium text-[var(--color-texto)]">Tema del negocio</div>
            <div className="mt-2.5 flex flex-wrap gap-2.5">
              {TEMAS_DISPONIBLES.map((t) => {
                const sel = (negocioActivo.tema ?? 'neutro') === t.valor
                return (
                  <button
                    key={t.valor}
                    data-tema={t.valor}
                    onClick={() => cambiarTema(t.valor)}
                    disabled={cambiandoTema}
                    className="flex items-center gap-2 rounded-[10px] border-2 px-3.5 py-2.5"
                    style={{ borderColor: sel ? 'var(--color-primario)' : 'var(--color-hairline)', background: sel ? 'color-mix(in srgb, var(--color-primario) 8%, white)' : 'var(--color-superficie)' }}
                  >
                    <span className="flex gap-1">
                      <span className="h-3 w-3 rounded-full" style={{ background: 'var(--color-primario)' }} />
                      <span className="h-3 w-3 rounded-full" style={{ background: 'var(--color-acento)' }} />
                      <span className="h-3 w-3 rounded-full" style={{ background: 'var(--color-secundario)' }} />
                    </span>
                    <span className="text-[12.5px] font-medium" style={{ color: sel ? 'var(--color-primario)' : 'var(--color-texto-suave)' }}>
                      {t.etiqueta}
                    </span>
                    {sel && (
                      <span className="flex h-4 w-4 items-center justify-center rounded-full" style={{ background: 'var(--color-primario)' }}>
                        <IconoCheck />
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
            <p className="mt-2 text-xs text-[var(--color-texto-suave)]">El tema se aplica a toda la app de este negocio; la estructura no cambia.</p>
          </div>
        </Tarjeta>

        {error && <p className="text-sm text-[var(--color-error)]">{error}</p>}

        {esDueno && (
          <Link to="/admin/usuarios" className="flex items-center gap-3 rounded-xl bg-[var(--color-superficie)] px-5 py-4 shadow-[0_1px_3px_rgba(74,50,43,.07)]">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-[var(--color-texto)]">Administración de usuarios</span>
                <span className="inline-flex rounded-full px-2 py-0.5 text-[10.5px] font-medium" style={{ background: 'color-mix(in srgb, var(--color-acento) 16%, white)', color: '#8A6E14' }}>
                  Solo dueño
                </span>
              </div>
              <div className="mt-0.5 text-[12.5px] text-[var(--color-texto-suave)]">Crear usuarios, restablecer contraseñas, asignar negocios</div>
            </div>
            <IconoChevron />
          </Link>
        )}

        <button
          onClick={signOut}
          className="inline-flex min-h-[46px] items-center justify-center gap-2 rounded-[10px] border-[1.5px] text-[13.5px] font-medium text-[var(--color-texto-suave)]"
          style={{ borderColor: '#E0CCC2' }}
        >
          <IconoCerrarSesion />
          Cerrar sesión
        </button>
      </div>

      {mostrarPassword && <ModalCambiarPassword onCerrar={() => setMostrarPassword(false)} />}
    </div>
  )
}
