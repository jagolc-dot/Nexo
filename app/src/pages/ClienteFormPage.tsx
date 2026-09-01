import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useNegocio } from '../context/NegocioContext'
import { actualizarCliente, cambiarActivoCliente, crearCliente, obtenerCliente } from '../lib/clientes'
import { claseBoton } from '../components/ui/Button'

const CAMPO =
  'flex min-h-11 w-full items-center rounded-[10px] border bg-[var(--color-superficie)] px-3 text-sm text-[var(--color-texto)] outline-none focus:border-[var(--color-primario)]'
const ESTILO_CAMPO = { borderColor: 'var(--color-borde-campo)' }

function IconoVolver() {
  return (
    <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M14.5 6 8.5 12l6 6" />
    </svg>
  )
}

export function ClienteFormPage() {
  const { negocioActivo } = useNegocio()
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const [searchParams] = useSearchParams()
  const esEdicion = Boolean(id)

  const [nombre, setNombre] = useState(searchParams.get('nombre') ?? '')
  const [telefono, setTelefono] = useState('')
  const [redSocial, setRedSocial] = useState('')
  const [notas, setNotas] = useState('')
  const [cargando, setCargando] = useState(esEdicion)
  const [error, setError] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)
  const [desactivando, setDesactivando] = useState(false)

  useEffect(() => {
    if (!id) return
    obtenerCliente(id)
      .then((c) => {
        setNombre(c.nombre)
        setTelefono(c.telefono ?? '')
        setRedSocial(c.contacto_red_social ?? '')
        setNotas(c.notas ?? '')
      })
      .catch(() => setError('No se pudo cargar la clienta.'))
      .finally(() => setCargando(false))
  }, [id])

  if (!negocioActivo) return null
  if (cargando) return <p className="p-4 text-sm text-[var(--color-texto-suave)]">Cargando...</p>

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)

    if (!nombre) {
      setError('El nombre es obligatorio.')
      return
    }
    if (!telefono && !redSocial) {
      setError('Se necesita al menos un dato de contacto (teléfono o red social).')
      return
    }

    setEnviando(true)
    try {
      if (esEdicion && id) {
        await actualizarCliente(id, {
          nombre,
          telefono: telefono || null,
          contacto_red_social: redSocial || null,
          notas: notas || null,
        })
        navigate(`/clientes/${id}`, { replace: true })
        return
      }
      const cliente = await crearCliente({
        negocio_id: negocioActivo!.id,
        nombre,
        telefono: telefono || null,
        contacto_red_social: redSocial || null,
        notas: notas || null,
      })
      navigate(`/clientes/${cliente.id}`, { replace: true })
    } catch (err) {
      console.error(err)
      setError(err instanceof Error ? err.message : 'No se pudo guardar. Intenta de nuevo.')
    } finally {
      setEnviando(false)
    }
  }

  async function desactivar() {
    if (!id) return
    if (!confirm('¿Desactivar esta clienta? Se oculta de búsquedas y agendado; su historial permanece.')) return
    setDesactivando(true)
    try {
      await cambiarActivoCliente(id, false)
      navigate(`/clientes/${id}`, { replace: true })
    } catch (err) {
      console.error(err)
      setError(err instanceof Error ? err.message : 'No se pudo desactivar.')
      setDesactivando(false)
    }
  }

  return (
    <div className="mx-auto flex max-h-full w-full max-w-[480px] flex-col overflow-hidden rounded-[14px] border bg-[var(--color-superficie)] lg:mt-8 lg:shadow-[0_18px_50px_rgba(74,50,43,.15)]" style={{ borderColor: 'var(--color-hairline)' }}>
      <div className="flex items-center gap-2.5 border-b px-4 py-3.5" style={{ borderColor: 'var(--color-divisor-fuerte)' }}>
        <button onClick={() => navigate(-1)} className="flex h-9 w-9 items-center justify-center rounded-lg text-[var(--color-texto)] hover:bg-[var(--color-hover-nav)]" aria-label="Volver">
          <IconoVolver />
        </button>
        <div className="text-[17px] font-medium text-[var(--color-texto)]" style={{ fontFamily: 'var(--fuente-titulos)' }}>
          {esEdicion ? 'Editar clienta' : 'Nueva clienta'}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-1 flex-col gap-3.5 overflow-y-auto px-4 py-[18px]">
        <label className="flex flex-col gap-1.5 text-xs font-medium text-[var(--color-texto)]">
          Nombre <span style={{ color: 'var(--color-error)' }}>*</span>
          <input
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            className={CAMPO}
            style={ESTILO_CAMPO}
          />
        </label>

        <div className="flex gap-3">
          <label className="flex flex-1 flex-col gap-1.5 text-xs font-medium text-[var(--color-texto)]">
            Teléfono
            <input value={telefono} onChange={(e) => setTelefono(e.target.value)} className={CAMPO} style={ESTILO_CAMPO} />
          </label>
          <label className="flex flex-1 flex-col gap-1.5 text-xs font-medium text-[var(--color-texto)]">
            Red social
            <input value={redSocial} onChange={(e) => setRedSocial(e.target.value)} className={CAMPO} style={ESTILO_CAMPO} />
          </label>
        </div>
        <p className="-mt-2 text-xs text-[var(--color-texto-suave)]">Teléfono o red social — con uno basta.</p>

        <label className="flex flex-col gap-1.5 text-xs font-medium text-[var(--color-texto)]">
          Notas
          <textarea
            value={notas}
            onChange={(e) => setNotas(e.target.value)}
            rows={4}
            className="w-full rounded-[10px] border bg-[var(--color-superficie)] p-3 text-[13.5px] leading-[1.5] text-[var(--color-texto)] outline-none focus:border-[var(--color-primario)]"
            style={ESTILO_CAMPO}
          />
        </label>

        {error && <p className="text-sm text-[var(--color-error)]">{error}</p>}
      </form>

      <div className="border-t px-4 pb-4 pt-3" style={{ borderColor: 'var(--color-divisor-fuerte)' }}>
        <button onClick={handleSubmit} disabled={enviando} className={claseBoton('primario', 'w-full !min-h-12')}>
          {enviando ? 'Guardando...' : esEdicion ? 'Guardar cambios' : 'Guardar'}
        </button>
        {esEdicion && (
          <>
            <button
              onClick={desactivar}
              disabled={desactivando}
              className="mt-2 flex min-h-11 w-full items-center justify-center rounded-lg border-[1.5px] text-[13.5px] font-medium text-[var(--color-texto-suave)]"
              style={{ borderColor: '#E0CCC2' }}
            >
              {desactivando ? 'Desactivando...' : 'Desactivar clienta'}
            </button>
            <p className="mt-2 text-center text-xs text-[var(--color-texto-suave)]">Desactivar la oculta de búsquedas y agendado; su historial permanece.</p>
          </>
        )}
      </div>
    </div>
  )
}
