import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { FORMATO_USUARIO, crearUsuario, generarPasswordSugerida, listarNegociosDisponibles } from '../lib/admin'
import type { Negocio } from '../types'
import { claseBoton } from '../components/ui/Button'

const CAMPO =
  'flex min-h-11 w-full items-center gap-1.5 rounded-[10px] border bg-[var(--color-superficie)] px-3 text-sm text-[var(--color-texto)] outline-none focus:border-[var(--color-primario)]'
const ESTILO_CAMPO = { borderColor: 'var(--color-borde-campo)' }

function IconoVolver() {
  return (
    <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M14.5 6 8.5 12l6 6" />
    </svg>
  )
}
function IconoCheck() {
  return (
    <svg width={11} height={11} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
      <path d="m5 12 5 5 9-10" />
    </svg>
  )
}

export function AdminCrearUsuarioPage() {
  const navigate = useNavigate()
  const [negocios, setNegocios] = useState<Negocio[]>([])
  const [seleccionados, setSeleccionados] = useState<Set<string>>(new Set())

  const [nombreCompleto, setNombreCompleto] = useState('')
  const [usuario, setUsuario] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  useEffect(() => {
    listarNegociosDisponibles().then(setNegocios)
  }, [])

  function alternarNegocio(id: string) {
    setSeleccionados((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)

    if (!FORMATO_USUARIO.test(usuario)) {
      setError('Usuario inválido: minúsculas, números o guión bajo, 3 a 20 caracteres.')
      return
    }
    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.')
      return
    }
    if (seleccionados.size === 0) {
      setError('Elige al menos un negocio.')
      return
    }

    setEnviando(true)
    try {
      await crearUsuario({
        usuario,
        nombre_completo: nombreCompleto || null,
        password,
        // "empleado" por defecto: el rol "dueño" no se asigna desde este
        // formulario — hoy no restringe nada en el sistema, así que no
        // tiene sentido exponerlo como una decisión sensible al crear.
        accesos: Array.from(seleccionados).map((negocio_id) => ({ negocio_id, rol: 'empleado' })),
      })
      navigate('/admin/usuarios', { replace: true })
    } catch (err) {
      console.error(err)
      setError(err instanceof Error ? err.message : 'No se pudo crear el usuario.')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="mx-auto flex max-h-full w-full max-w-[480px] flex-col overflow-hidden rounded-[14px] border bg-[var(--color-superficie)] lg:mt-8 lg:shadow-[0_18px_50px_rgba(74,50,43,.15)]" style={{ borderColor: 'var(--color-hairline)' }}>
      <div className="flex items-center gap-2.5 border-b px-4 py-3.5" style={{ borderColor: 'var(--color-divisor-fuerte)' }}>
        <button onClick={() => navigate(-1)} className="flex h-9 w-9 items-center justify-center rounded-lg text-[var(--color-texto)] hover:bg-[var(--color-hover-nav)]" aria-label="Volver">
          <IconoVolver />
        </button>
        <div className="text-[17px] font-medium text-[var(--color-texto)]" style={{ fontFamily: 'var(--fuente-titulos)' }}>
          Crear usuario
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-1 flex-col gap-3.5 overflow-y-auto px-4 py-[18px]">
        <label className="flex flex-col gap-1.5 text-xs font-medium text-[var(--color-texto)]">
          Nombre <span style={{ color: 'var(--color-error)' }}>*</span>
          <input
            value={nombreCompleto}
            onChange={(e) => setNombreCompleto(e.target.value)}
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            className={CAMPO}
            style={ESTILO_CAMPO}
          />
        </label>

        <label className="flex flex-col gap-1.5 text-xs font-medium text-[var(--color-texto)]">
          Usuario <span style={{ color: 'var(--color-error)' }}>*</span>
          <input value={usuario} onChange={(e) => setUsuario(e.target.value.toLowerCase())} className={CAMPO} style={ESTILO_CAMPO} />
          <span className="font-normal text-[var(--color-texto-suave)]">Minúsculas, números o guión bajo, 3 a 20 caracteres.</span>
        </label>

        <label className="flex flex-col gap-1.5 text-xs font-medium text-[var(--color-texto)]">
          Contraseña inicial <span style={{ color: 'var(--color-error)' }}>*</span>
          <div className={CAMPO} style={ESTILO_CAMPO}>
            <input value={password} onChange={(e) => setPassword(e.target.value)} className="min-w-0 flex-1 bg-transparent outline-none" />
            <button type="button" onClick={() => setPassword(generarPasswordSugerida())} className="shrink-0 text-xs font-medium text-[var(--color-primario)]">
              Generar
            </button>
          </div>
          <span className="font-normal text-[var(--color-texto-suave)]">La usuaria podrá cambiarla desde Ajustes al entrar.</span>
        </label>

        <div>
          <div className="mb-2 text-xs font-medium text-[var(--color-texto)]">
            Negocios asignados <span style={{ color: 'var(--color-error)' }}>*</span>
          </div>
          <div className="flex flex-col gap-2">
            {negocios.map((n) => {
              const sel = seleccionados.has(n.id)
              return (
                <button
                  key={n.id}
                  type="button"
                  data-tema={n.tema ?? 'neutro'}
                  onClick={() => alternarNegocio(n.id)}
                  className="flex items-center gap-3 rounded-[10px] border-2 px-3.5 py-3"
                  style={{ borderColor: sel ? 'var(--color-primario)' : 'var(--color-hairline)', background: sel ? 'color-mix(in srgb, var(--color-primario) 8%, white)' : 'var(--color-superficie)' }}
                >
                  {n.logo_url ? (
                    <img src={n.logo_url} alt="" className="h-[30px] w-[30px] shrink-0 rounded-full object-cover" />
                  ) : (
                    <span
                      className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full text-[13px] font-medium"
                      style={{ background: 'color-mix(in srgb, var(--color-primario) 14%, white)', color: 'var(--color-primario)' }}
                    >
                      {n.nombre.charAt(0).toUpperCase()}
                    </span>
                  )}
                  <span className="flex-1 text-left text-[13.5px] font-medium" style={{ color: sel ? 'var(--color-primario)' : 'var(--color-texto-suave)' }}>
                    {n.nombre}
                  </span>
                  <span
                    className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full"
                    style={sel ? { background: 'var(--color-primario)' } : { border: '1.5px solid #D8C4BA' }}
                  >
                    {sel && <IconoCheck />}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        {error && <p className="text-sm text-[var(--color-error)]">{error}</p>}
      </form>

      <div className="border-t px-4 pb-4 pt-3" style={{ borderColor: 'var(--color-divisor-fuerte)' }}>
        <button onClick={handleSubmit} disabled={enviando} className={claseBoton('primario', 'w-full !min-h-12')}>
          {enviando ? 'Creando...' : 'Crear usuario'}
        </button>
      </div>
    </div>
  )
}
