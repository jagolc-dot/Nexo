import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useNegocio } from '../context/NegocioContext'
import { CATEGORIAS, cambiarActivoTipoGasto, crearTipoGasto, listarTiposGasto } from '../lib/gastos'
import type { Categoria, TipoGasto } from '../types'
import { claseBoton } from '../components/ui/Button'
import { Toggle } from '../components/ui/Toggle'

function IconoVolver() {
  return (
    <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M14.5 6 8.5 12l6 6" />
    </svg>
  )
}
function IconoMas() {
  return (
    <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </svg>
  )
}

export function TiposGastoPage() {
  const { negocioActivo } = useNegocio()
  const navigate = useNavigate()

  const [tipos, setTipos] = useState<TipoGasto[] | null>(null)
  const [nombre, setNombre] = useState('')
  const [categoria, setCategoria] = useState<Categoria>('Insumos')
  const [error, setError] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  function cargar() {
    if (!negocioActivo) return
    listarTiposGasto(negocioActivo.id, true).then(setTipos)
  }

  useEffect(cargar, [negocioActivo])

  if (!negocioActivo) return null

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (!nombre) {
      setError('El nombre es obligatorio.')
      return
    }
    setEnviando(true)
    try {
      await crearTipoGasto(negocioActivo!.id, nombre, categoria)
      setNombre('')
      cargar()
    } catch (err) {
      console.error(err)
      setError(err instanceof Error ? err.message : 'No se pudo crear el tipo de gasto.')
    } finally {
      setEnviando(false)
    }
  }

  async function alternarActivo(tipo: TipoGasto) {
    await cambiarActivoTipoGasto(tipo.id, !tipo.activo)
    cargar()
  }

  return (
    <div className="mx-auto flex max-h-full w-full max-w-[560px] flex-col overflow-hidden rounded-[14px] border bg-[var(--color-superficie)] lg:mt-8 lg:shadow-[0_18px_50px_rgba(74,50,43,.15)]" style={{ borderColor: 'var(--color-hairline)' }}>
      <div className="flex items-center gap-2.5 border-b px-4 py-3.5" style={{ borderColor: 'var(--color-divisor-fuerte)' }}>
        <button onClick={() => navigate('/gastos')} className="flex h-9 w-9 items-center justify-center rounded-lg text-[var(--color-texto)] hover:bg-[var(--color-hover-nav)]" aria-label="Volver">
          <IconoVolver />
        </button>
        <div className="flex-1 text-[17px] font-medium text-[var(--color-texto)]" style={{ fontFamily: 'var(--fuente-titulos)' }}>
          Tipos de gasto
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <p className="mb-3 text-xs leading-[1.45] text-[var(--color-texto-suave)]">
          Un tipo dado de baja deja de sugerirse al capturar; sus gastos históricos no se tocan.
        </p>

        <div className="flex flex-col gap-2">
          {tipos?.map((t) => (
            <div
              key={t.id}
              className="flex items-center gap-2.5 rounded-[10px] border px-3.5 py-3"
              style={{ borderColor: 'var(--color-hairline)', background: t.activo ? 'var(--color-superficie)' : '#FBF8F6' }}
            >
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium" style={{ color: t.activo ? 'var(--color-texto)' : '#9C9C97' }}>
                  {t.nombre}
                </div>
                <div className="text-xs text-[var(--color-texto-suave)]">{t.categoria}</div>
              </div>
              <Toggle activo={t.activo} onClick={() => alternarActivo(t)} ariaLabel={t.activo ? 'Desactivar tipo de gasto' : 'Activar tipo de gasto'} />
            </div>
          ))}
          {tipos && tipos.length === 0 && <p className="text-sm text-[var(--color-texto-suave)]">Sin tipos de gasto todavía.</p>}
        </div>

        <form onSubmit={handleSubmit} className="mt-3.5 flex flex-col gap-2 sm:flex-row">
          <input
            placeholder="Nombre del tipo de gasto"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            className="min-h-11 min-w-0 flex-1 rounded-[10px] border px-3 text-[13.5px] text-[var(--color-texto)] outline-none focus:border-[var(--color-primario)]"
            style={{ borderColor: 'var(--color-borde-campo)' }}
          />
          <select
            value={categoria}
            onChange={(e) => setCategoria(e.target.value as Categoria)}
            className="min-h-11 rounded-[10px] border px-3 text-[13.5px] text-[var(--color-texto)] outline-none"
            style={{ borderColor: 'var(--color-borde-campo)' }}
          >
            {CATEGORIAS.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <button type="submit" disabled={enviando} className={claseBoton('primario', '!min-h-11 gap-1.5 px-4 text-[13.5px]')}>
            <IconoMas />
            Crear
          </button>
        </form>
        {error && <p className="mt-2 text-xs text-[var(--color-error)]">{error}</p>}
      </div>
    </div>
  )
}
