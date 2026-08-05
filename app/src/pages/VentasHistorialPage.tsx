import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useNegocio } from '../context/NegocioContext'
import { listarVentas, type VentaConConceptos } from '../lib/ventas'
import { calcularRango, type Periodo } from '../lib/periodos'
import { claseBoton } from '../components/ui/Button'

const PERIODOS: { valor: Periodo; etiqueta: string }[] = [
  { valor: 'hoy', etiqueta: 'Hoy' },
  { valor: 'semana', etiqueta: 'Semana' },
  { valor: 'mes', etiqueta: 'Mes' },
]

function IconoVentas({ size = 30 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#B99A8D" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M6.5 3.5h11v17l-2.2-1.5-2.05 1.5-2.05-1.5-2.1 1.5z" />
      <path d="M9.5 8.5h5" />
      <path d="M9.5 12h5" />
    </svg>
  )
}
function IconoChevron() {
  return (
    <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="#C9B4AA" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="hidden shrink-0 sm:block">
      <path d="m9.5 6 6 6-6 6" />
    </svg>
  )
}

export function VentasHistorialPage() {
  const { negocioActivo } = useNegocio()
  const [periodo, setPeriodo] = useState<Periodo>('semana')
  const [ventas, setVentas] = useState<VentaConConceptos[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!negocioActivo) return
    setVentas(null)
    const { inicio, fin } = calcularRango(periodo)
    listarVentas(negocioActivo.id, inicio, fin)
      .then(setVentas)
      .catch(() => setError('No se pudo cargar el historial.'))
  }, [negocioActivo, periodo])

  if (!negocioActivo) return null

  const confirmadas = ventas?.filter((v) => v.estado === 'confirmada') ?? []
  const canceladas = ventas?.filter((v) => v.estado === 'cancelada') ?? []
  const totalPeriodo = confirmadas.reduce((acc, v) => acc + v.total, 0)

  return (
    <div className="p-4 md:p-[22px] lg:p-7">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex-1 text-[22px] font-medium text-[var(--color-texto)]" style={{ fontFamily: 'var(--fuente-titulos)' }}>
          Ventas
        </div>
        <div className="inline-flex flex-none rounded-[9px] p-[3px]" style={{ background: 'var(--color-track-segmentado)' }}>
          {PERIODOS.map((p) => (
            <button
              key={p.valor}
              onClick={() => setPeriodo(p.valor)}
              className={`rounded-[7px] px-3.5 py-[7px] text-[13px] ${
                periodo === p.valor ? 'bg-[var(--color-superficie)] font-medium text-[var(--color-texto)] shadow-[0_1px_2px_rgba(74,50,43,.1)]' : 'text-[var(--color-texto-suave)]'
              }`}
            >
              {p.etiqueta}
            </button>
          ))}
        </div>
        <Link to="/ventas/nueva" className={claseBoton('secundario', '!min-h-10 px-3.5 text-[13px]')}>
          + Nueva venta
        </Link>
      </div>

      <div className="max-w-[860px]">
        {error && <p className="mt-4 text-sm text-[var(--color-error)]">{error}</p>}
        {ventas === null && !error && <p className="mt-4 text-sm text-[var(--color-texto-suave)]">Cargando...</p>}

        {ventas && ventas.length === 0 && (
          <div className="mt-4 flex flex-col items-center rounded-xl bg-[var(--color-superficie)] px-6 py-12 text-center shadow-[0_1px_3px_rgba(74,50,43,.07)]">
            <IconoVentas />
            <div className="mt-3 text-[14.5px] font-medium text-[var(--color-texto)]">Sin ventas en este periodo</div>
            <p className="mt-1 max-w-[280px] text-[13px] text-[var(--color-texto-suave)]">Las ventas se generan al finalizar un servicio desde la Agenda.</p>
          </div>
        )}

        {ventas && ventas.length > 0 && (
          <>
            <div className="mt-3.5 flex items-baseline gap-2.5">
              <span className="text-[20px] text-[var(--color-primario)]" style={{ fontFamily: 'var(--fuente-titulos)' }}>
                ${totalPeriodo.toFixed(0)}
              </span>
              <span className="text-[12.5px] text-[var(--color-texto-suave)]">
                {confirmadas.length} venta{confirmadas.length === 1 ? '' : 's'} {periodo === 'hoy' ? 'hoy' : periodo === 'semana' ? 'esta semana' : 'este mes'}
                {canceladas.length > 0 && ` · ${canceladas.length} cancelada${canceladas.length === 1 ? '' : 's'}`}
              </span>
            </div>

            <div className="mt-2.5 rounded-xl bg-[var(--color-superficie)] px-[18px] shadow-[0_1px_3px_rgba(74,50,43,.07)]">
              {ventas.map((v, i) => {
                const cancelada = v.estado === 'cancelada'
                return (
                  <Link
                    key={v.id}
                    to={`/ventas/${v.id}`}
                    className={`flex items-center gap-3.5 py-3 ${i > 0 ? 'border-t' : ''}`}
                    style={{ borderColor: 'var(--color-divisor)' }}
                  >
                    <div className="w-16 shrink-0">
                      <div className="text-[13px] font-medium text-[var(--color-texto)]">
                        {new Date(v.fecha).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}
                      </div>
                      <div className="mt-0.5 text-[11.5px] text-[var(--color-texto-suave)]">
                        {new Date(v.fecha).toLocaleTimeString('es-MX', { hour: 'numeric', minute: '2-digit' })}
                      </div>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium" style={{ color: cancelada ? '#9C9C97' : 'var(--color-texto)' }}>
                        {v.clientes?.nombre ?? v.nombre_ocasional ?? 'Público general'}
                      </div>
                      <div className="truncate text-[12.5px] text-[var(--color-texto-suave)]">{v.conceptos}</div>
                    </div>
                    <div className="hidden w-24 shrink-0 text-[12.5px] text-[var(--color-texto-suave)] sm:block">{v.metodo_pago}</div>
                    <div
                      className="w-[70px] shrink-0 text-right text-sm font-medium"
                      style={cancelada ? { color: '#9C9C97', textDecoration: 'line-through' } : { color: 'var(--color-texto)' }}
                    >
                      ${v.total.toFixed(0)}
                    </div>
                    <span
                      className="inline-flex min-w-[88px] shrink-0 justify-center rounded-full px-2.5 py-[3px] text-[11.5px] font-medium"
                      style={{
                        background: `color-mix(in srgb, ${cancelada ? 'var(--color-error)' : 'var(--color-exito)'} 12%, white)`,
                        color: cancelada ? 'var(--color-error)' : 'var(--color-exito)',
                      }}
                    >
                      {cancelada ? 'Cancelada' : 'Completada'}
                    </span>
                    <IconoChevron />
                  </Link>
                )
              })}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
