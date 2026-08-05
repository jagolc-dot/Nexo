import { useEffect, useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { useNegocio } from '../context/NegocioContext'
import { generarPasswordSugerida, listarUsuarios, resetearPassword, revocarAcceso, type UsuarioAdmin } from '../lib/admin'
import { claseBoton } from '../components/ui/Button'

function IconoVolver() {
  return (
    <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M14.5 6 8.5 12l6 6" />
    </svg>
  )
}
function IconoMas() {
  return (
    <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round">
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </svg>
  )
}
function IconoX() {
  return (
    <svg width={9} height={9} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.6} strokeLinecap="round">
      <path d="M6 6l12 12" />
      <path d="M18 6 6 18" />
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

function ModalRestablecer({ usuario, onCerrar, onListo }: { usuario: UsuarioAdmin; onCerrar: () => void; onListo: () => void }) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  async function restablecer() {
    setError(null)
    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.')
      return
    }
    setEnviando(true)
    try {
      await resetearPassword(usuario.usuario_id, password)
      onListo()
    } catch {
      setError('No se pudo actualizar la contraseña.')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/32 p-4">
      <div className="w-full max-w-[440px] overflow-hidden rounded-[14px] bg-[var(--color-superficie)] shadow-[0_18px_50px_rgba(74,50,43,.3)]">
        <div className="flex items-center gap-2.5 border-b px-4 py-3.5" style={{ borderColor: 'var(--color-divisor-fuerte)' }}>
          <div className="flex-1 text-[17px] font-medium text-[var(--color-texto)]" style={{ fontFamily: 'var(--fuente-titulos)' }}>
            Restablecer contraseña
          </div>
          <button onClick={onCerrar} className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--color-texto-suave)] hover:bg-[var(--color-hover-nav)]" aria-label="Cerrar">
            <IconoCerrar />
          </button>
        </div>

        <div className="p-4">
          <div className="flex items-center gap-3 rounded-[10px] p-3" style={{ background: 'var(--color-fondo)' }}>
            <span
              className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-full text-[13px] font-medium"
              style={{ background: 'color-mix(in srgb, var(--color-primario) 14%, white)', color: 'var(--color-primario)' }}
            >
              {(usuario.nombre_completo ?? usuario.usuario).charAt(0).toUpperCase()}
            </span>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium text-[var(--color-texto)]">{usuario.nombre_completo ?? usuario.usuario}</div>
              <div className="text-xs text-[var(--color-texto-suave)]">usuario: {usuario.usuario}</div>
            </div>
          </div>

          <div className="mt-4">
            <div className="mb-1.5 text-xs font-medium text-[var(--color-texto)]">
              Nueva contraseña <span style={{ color: 'var(--color-error)' }}>*</span>
            </div>
            <div className="flex min-h-11 items-center gap-2 rounded-[10px] border px-3 text-sm text-[var(--color-texto)]" style={{ borderColor: 'var(--color-borde-campo)' }}>
              <input value={password} onChange={(e) => setPassword(e.target.value)} className="min-w-0 flex-1 bg-transparent outline-none" />
              <button type="button" onClick={() => setPassword(generarPasswordSugerida())} className="shrink-0 text-xs font-medium text-[var(--color-primario)]">
                Generar
              </button>
            </div>
          </div>
          <p className="mt-2.5 text-xs leading-[1.5] text-[var(--color-texto-suave)]">
            La sesión actual de {usuario.nombre_completo ?? usuario.usuario} se cerrará y deberá entrar con esta contraseña. Compártesela en persona.
          </p>
          {error && <p className="mt-2 text-xs text-[var(--color-error)]">{error}</p>}
        </div>

        <div className="flex gap-2 border-t p-4" style={{ borderColor: 'var(--color-divisor-fuerte)' }}>
          <button onClick={onCerrar} className={claseBoton('secundario', 'flex-1 !min-h-[46px]')}>
            Volver
          </button>
          <button onClick={restablecer} disabled={enviando} className={claseBoton('primario', 'flex-1 !min-h-[46px]')}>
            {enviando ? 'Restableciendo...' : 'Restablecer'}
          </button>
        </div>
      </div>
    </div>
  )
}

export function AdminUsuariosPage() {
  const { accesos: accesosPropios } = useNegocio()
  const navigate = useNavigate()
  const esDueno = accesosPropios?.some((a) => a.rol === 'dueño') ?? false

  const [usuarios, setUsuarios] = useState<UsuarioAdmin[] | null>(null)
  const [paraResetear, setParaResetear] = useState<UsuarioAdmin | null>(null)

  function cargar() {
    listarUsuarios().then(setUsuarios)
  }

  useEffect(() => {
    if (!esDueno) return
    cargar()
  }, [esDueno])

  if (!esDueno) {
    return <Navigate to="/" replace />
  }

  async function revocar(usuarioId: string, negocioId: string) {
    if (!confirm('¿Revocar el acceso de este usuario a este negocio? No borra al usuario ni su historial.')) return
    await revocarAcceso(usuarioId, negocioId)
    cargar()
  }

  return (
    <div className="p-4 md:p-[22px] lg:p-7">
      <div className="flex items-center gap-2.5">
        <button onClick={() => navigate('/ajustes')} className="flex h-9 w-9 items-center justify-center rounded-lg text-[var(--color-texto)] hover:bg-[var(--color-hover-nav)]" aria-label="Volver">
          <IconoVolver />
        </button>
        <span className="text-[13px] text-[var(--color-texto-suave)]">Ajustes</span>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2.5">
            <span className="text-[22px] font-medium text-[var(--color-texto)]" style={{ fontFamily: 'var(--fuente-titulos)' }}>
              Usuarios
            </span>
            <span
              className="inline-flex rounded-full px-2.5 py-[3px] text-[11.5px] font-medium"
              style={{ background: 'color-mix(in srgb, var(--color-acento) 16%, white)', color: '#8A6E14' }}
            >
              Solo dueño
            </span>
          </div>
          <p className="mt-1 text-[12.5px] text-[var(--color-texto-suave)]">Tú creas las cuentas y restableces contraseñas; aquí no hay autoservicio.</p>
        </div>
        <Link to="/admin/usuarios/nuevo" className={claseBoton('primario', '!min-h-10 gap-1.5 px-4 text-[13.5px]')}>
          <IconoMas />
          Crear usuario
        </Link>
      </div>

      <div className="max-w-[820px]">
        {usuarios === null && <p className="mt-4 text-sm text-[var(--color-texto-suave)]">Cargando...</p>}
        {usuarios && usuarios.length === 0 && <p className="mt-4 text-sm text-[var(--color-texto-suave)]">Sin usuarios todavía.</p>}

        {usuarios && usuarios.length > 0 && (
          <div className="mt-4 rounded-xl bg-[var(--color-superficie)] px-[18px] shadow-[0_1px_3px_rgba(74,50,43,.07)]">
            {usuarios.map((u, i) => {
              const esDuenoFila = u.accesos.some((a) => a.rol === 'dueño')
              return (
                <div key={u.usuario_id} className={`flex flex-wrap items-center gap-3.5 py-3.5 ${i > 0 ? 'border-t' : ''}`} style={{ borderColor: 'var(--color-divisor)' }}>
                  <span
                    className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-full text-sm font-medium"
                    style={{ background: 'color-mix(in srgb, var(--color-primario) 14%, white)', color: 'var(--color-primario)' }}
                  >
                    {(u.nombre_completo ?? u.usuario).charAt(0).toUpperCase()}
                  </span>
                  <div className="w-[170px] min-w-0 shrink-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-[var(--color-texto)]">{u.nombre_completo ?? u.usuario}</span>
                      {esDuenoFila && (
                        <span
                          className="inline-flex rounded-full px-2 py-0.5 text-[10.5px] font-medium"
                          style={{ background: 'color-mix(in srgb, var(--color-acento) 16%, white)', color: '#8A6E14' }}
                        >
                          Dueño
                        </span>
                      )}
                    </div>
                    <div className="mt-0.5 text-xs text-[var(--color-texto-suave)]">usuario: {u.usuario}</div>
                  </div>
                  <div className="flex min-w-0 flex-1 flex-wrap gap-1.5">
                    {u.accesos.map((a) => (
                      <span key={a.negocio_id} className="inline-flex items-center gap-1.5 rounded-full py-1 pl-2.5 pr-1 text-[11.5px] font-medium text-[var(--color-texto-suave)]" style={{ background: '#F4EDE7' }}>
                        {a.negocio_nombre}
                        <button
                          onClick={() => revocar(u.usuario_id, a.negocio_id)}
                          aria-label="Revocar acceso"
                          className="flex h-4 w-4 items-center justify-center rounded-full text-[#B99A8D] hover:bg-[#EBDDD5] hover:text-[#8F5A4B]"
                        >
                          <IconoX />
                        </button>
                      </span>
                    ))}
                    {u.accesos.length === 0 && <span className="text-xs text-[var(--color-texto-suave)]">Sin negocios asignados</span>}
                  </div>
                  <button onClick={() => setParaResetear(u)} className={claseBoton('secundario', '!min-h-9 shrink-0 px-3 text-[12.5px]')}>
                    Restablecer contraseña
                  </button>
                </div>
              )
            })}
          </div>
        )}

        <p className="mt-2.5 max-w-[820px] text-xs text-[var(--color-texto-suave)]">
          Revocar el acceso a un negocio (×) no borra al usuario ni su historial; solo deja de ver ese negocio.
        </p>
      </div>

      {paraResetear && (
        <ModalRestablecer
          usuario={paraResetear}
          onCerrar={() => setParaResetear(null)}
          onListo={() => setParaResetear(null)}
        />
      )}
    </div>
  )
}
