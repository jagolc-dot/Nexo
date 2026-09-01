import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useNegocio } from '../context/NegocioContext'
import { crearGasto, listarTiposGasto } from '../lib/gastos'
import type { TipoGasto } from '../types'
import { claseBoton } from '../components/ui/Button'
import { hoyEnNegocio } from '../lib/tiempoNegocio'

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

export function GastoFormPage() {
  const { negocioActivo } = useNegocio()
  const navigate = useNavigate()

  const [tiposGasto, setTiposGasto] = useState<TipoGasto[]>([])
  const [modo, setModo] = useState<'recurrente' | 'extraordinario'>('recurrente')
  const [tipoGastoId, setTipoGastoId] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [monto, setMonto] = useState('')
  const [fechaGasto, setFechaGasto] = useState(hoyEnNegocio())
  const [error, setError] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  useEffect(() => {
    if (!negocioActivo) return
    listarTiposGasto(negocioActivo.id).then((tipos) => {
      setTiposGasto(tipos)
      if (tipos.length === 0) setModo('extraordinario')
    })
  }, [negocioActivo])

  if (!negocioActivo) return null

  const tipoSeleccionado = tiposGasto.find((t) => t.id === tipoGastoId)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)

    const montoNum = Number(monto)
    if (!montoNum || montoNum <= 0) {
      setError('El monto debe ser mayor a 0.')
      return
    }
    if (!fechaGasto) {
      setError('La fecha del gasto es obligatoria.')
      return
    }
    if (modo === 'recurrente') {
      if (!tipoSeleccionado) {
        setError('Elige un tipo de gasto.')
        return
      }
    } else if (!descripcion) {
      setError('La descripción es obligatoria para un gasto extraordinario.')
      return
    }

    setEnviando(true)
    try {
      await crearGasto({
        negocio_id: negocioActivo!.id,
        tipo_gasto_id: modo === 'recurrente' ? tipoSeleccionado!.id : null,
        categoria: modo === 'recurrente' ? tipoSeleccionado!.categoria : 'Otros',
        descripcion: descripcion || null,
        monto: montoNum,
        fecha_gasto: fechaGasto,
      })
      navigate('/gastos', { replace: true })
    } catch (err) {
      console.error(err)
      setError(err instanceof Error ? err.message : 'No se pudo guardar el gasto.')
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
          Nuevo gasto
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-1 flex-col gap-3.5 overflow-y-auto px-4 py-[18px]">
        <div className="flex gap-3">
          <label className="flex flex-1 flex-col gap-1.5 text-xs font-medium text-[var(--color-texto)]">
            Monto <span style={{ color: 'var(--color-error)' }}>*</span>
            <div className={CAMPO} style={ESTILO_CAMPO}>
              <span className="font-normal text-[var(--color-texto-suave)]">$</span>
              <input type="number" step="0.01" min="0" value={monto} onChange={(e) => setMonto(e.target.value)} className="min-w-0 flex-1 bg-transparent font-medium outline-none" />
            </div>
          </label>
          <label className="flex flex-1 flex-col gap-1.5 text-xs font-medium text-[var(--color-texto)]">
            Fecha del gasto <span style={{ color: 'var(--color-error)' }}>*</span>
            <input type="date" value={fechaGasto} onChange={(e) => setFechaGasto(e.target.value)} className={CAMPO} style={ESTILO_CAMPO} />
          </label>
        </div>
        <p className="-mt-2 text-xs text-[var(--color-texto-suave)]">La fecha del gasto puede ser anterior a hoy; la captura queda registrada aparte.</p>

        <div className="inline-flex self-start rounded-[9px] p-[3px]" style={{ background: 'var(--color-track-segmentado)' }}>
          {(['recurrente', 'extraordinario'] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setModo(m)}
              disabled={m === 'recurrente' && tiposGasto.length === 0}
              className={`rounded-[7px] px-3.5 py-[7px] text-[13px] disabled:opacity-40 ${
                modo === m ? 'bg-[var(--color-superficie)] font-medium text-[var(--color-texto)] shadow-[0_1px_2px_rgba(74,50,43,.1)]' : 'text-[var(--color-texto-suave)]'
              }`}
            >
              {m === 'recurrente' ? 'Tipo recurrente' : 'Extraordinario'}
            </button>
          ))}
        </div>

        {modo === 'recurrente' ? (
          <div>
            <div className="mb-2 text-xs font-medium text-[var(--color-texto)]">
              Tipo de gasto <span style={{ color: 'var(--color-error)' }}>*</span>
            </div>
            <div className="flex flex-col gap-2">
              {tiposGasto.map((t) => {
                const sel = tipoGastoId === t.id
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setTipoGastoId(t.id)}
                    className="flex items-center gap-3 rounded-[10px] border-2 px-3.5 py-2.5"
                    style={{ borderColor: sel ? 'var(--color-primario)' : 'var(--color-hairline)', background: sel ? 'color-mix(in srgb, var(--color-primario) 8%, white)' : 'var(--color-superficie)' }}
                  >
                    <span className="flex-1 text-left text-[13.5px] font-medium" style={{ color: sel ? 'var(--color-primario)' : 'var(--color-texto)' }}>
                      {t.nombre}
                    </span>
                    <span className="text-[11.5px] text-[var(--color-texto-suave)]">{t.categoria}</span>
                  </button>
                )
              })}
              {tiposGasto.length === 0 && <p className="text-sm text-[var(--color-texto-suave)]">Sin tipos de gasto — crea uno en "Tipos de gasto".</p>}
            </div>
          </div>
        ) : (
          <label className="flex flex-col gap-1.5 text-xs font-medium text-[var(--color-texto)]">
            Descripción <span style={{ color: 'var(--color-error)' }}>*</span>
            <textarea
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              rows={3}
              className="w-full rounded-[10px] border bg-[var(--color-superficie)] p-3 text-[14px] font-normal text-[var(--color-texto)] outline-none focus:border-[var(--color-primario)]"
              style={ESTILO_CAMPO}
            />
            <span className="font-normal text-[var(--color-texto-suave)]">Los gastos extraordinarios se registran en la categoría «Otros».</span>
          </label>
        )}

        {error && <p className="text-sm text-[var(--color-error)]">{error}</p>}
      </form>

      <div className="border-t px-4 pb-4 pt-3" style={{ borderColor: 'var(--color-divisor-fuerte)' }}>
        <button onClick={handleSubmit} disabled={enviando} className={claseBoton('primario', 'w-full !min-h-12')}>
          {enviando ? 'Guardando...' : 'Guardar gasto'}
        </button>
      </div>
    </div>
  )
}
