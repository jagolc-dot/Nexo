import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useNegocio } from '../context/NegocioContext'
import { cancelarGasto, CATEGORIAS, listarGastos } from '../lib/gastos'
import { calcularRango } from '../lib/periodos'
import type { Categoria, Gasto } from '../types'
import { claseBoton } from '../components/ui/Button'
import { formatearFechaSolo, hoyEnNegocio, OPCIONES_ZONA_NEGOCIO } from '../lib/tiempoNegocio'
import { formatearMoneda } from '../lib/formato'

type PeriodoGasto = 'semana' | 'mes' | 'año'
const PERIODOS: { valor: PeriodoGasto; etiqueta: string }[] = [
  { valor: 'semana', etiqueta: 'Semana' },
  { valor: 'mes', etiqueta: 'Mes' },
  { valor: 'año', etiqueta: 'Año' },
]

function IconoGastos({ size = 30 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#B99A8D" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <rect x="3.5" y="6.5" width="17" height="13" rx="2" />
      <path d="M3.5 10.5h17" />
      <path d="M15 15h2.5" />
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
    <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
      <path d="M6 6l12 12" />
      <path d="M18 6 6 18" />
    </svg>
  )
}

const NOMBRES_MES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']

export function GastosPage() {
  const { negocioActivo } = useNegocio()
  const [periodo, setPeriodo] = useState<PeriodoGasto>('mes')
  const [categoria, setCategoria] = useState<Categoria | ''>('')
  const [gastos, setGastos] = useState<Gasto[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  function cargar() {
    if (!negocioActivo) return
    setGastos(null)
    const { inicio, fin } = calcularRango(periodo)
    listarGastos(negocioActivo.id, { inicio, fin, categoria: categoria || undefined })
      .then(setGastos)
      .catch(() => setError('No se pudo cargar los gastos.'))
  }

  useEffect(cargar, [negocioActivo, periodo, categoria])

  if (!negocioActivo) return null

  async function cancelar(gasto: Gasto) {
    if (!confirm('¿Cancelar este gasto?')) return
    try {
      await cancelarGasto(gasto.id)
      cargar()
    } catch (err) {
      console.error(err)
      setError(err instanceof Error ? err.message : 'No se pudo cancelar el gasto.')
    }
  }

  const activos = gastos?.filter((g) => g.estado === 'activo') ?? []
  const totalPeriodo = activos.reduce((acc, g) => acc + g.monto, 0)

  return (
    <div className="p-4 md:p-[22px] lg:p-7">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex-1 text-[22px] font-medium text-[var(--color-texto)]" style={{ fontFamily: 'var(--fuente-titulos)' }}>
          Gastos
        </div>
        <Link to="/gastos/tipos" className={claseBoton('secundario', '!min-h-10 px-3.5 text-[13px]')}>
          Tipos de gasto
        </Link>
        <Link to="/gastos/nuevo" className={claseBoton('primario', '!min-h-10 gap-1.5 px-4 text-[13.5px]')}>
          <IconoMas />
          Nuevo gasto
        </Link>
      </div>

      <div className="mt-3.5 flex flex-wrap items-center gap-2.5">
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
        <select
          value={categoria}
          onChange={(e) => setCategoria(e.target.value as Categoria | '')}
          className="min-h-9 rounded-full border px-3 text-[12.5px] font-medium text-[var(--color-texto)] outline-none"
          style={{ borderColor: 'var(--color-borde-campo)' }}
        >
          <option value="">Categoría: Todas</option>
          {CATEGORIAS.map((c) => (
            <option key={c} value={c}>
              Categoría: {c}
            </option>
          ))}
        </select>
      </div>

      <div className="max-w-[820px]">
        {error && <p className="mt-4 text-sm text-[var(--color-error)]">{error}</p>}
        {gastos === null && !error && <p className="mt-4 text-sm text-[var(--color-texto-suave)]">Cargando...</p>}

        {gastos && gastos.length === 0 && (
          <div className="mt-4 flex flex-col items-center rounded-xl bg-[var(--color-superficie)] px-6 py-12 text-center shadow-[0_1px_3px_rgba(74,50,43,.07)]">
            <IconoGastos />
            <div className="mt-3 text-[14.5px] font-medium text-[var(--color-texto)]">Sin gastos en este periodo</div>
            <p className="mt-1 max-w-[280px] text-[13px] text-[var(--color-texto-suave)]">Registra la renta, insumos o cualquier gasto del negocio.</p>
            <Link to="/gastos/nuevo" className={`mt-4 ${claseBoton('primario')}`}>
              Nuevo gasto
            </Link>
          </div>
        )}

        {gastos && gastos.length > 0 && (
          <>
            <div className="mt-3.5 flex items-baseline gap-2.5">
              <span className="text-[20px] text-[var(--color-primario)]" style={{ fontFamily: 'var(--fuente-titulos)' }}>
                {formatearMoneda(totalPeriodo)}
              </span>
              <span className="text-[12.5px] text-[var(--color-texto-suave)]">
                {activos.length} gasto{activos.length === 1 ? '' : 's'} en {NOMBRES_MES[Number(hoyEnNegocio().split('-')[1]) - 1]}
              </span>
            </div>

            <div className="mt-2.5 rounded-xl bg-[var(--color-superficie)] px-[18px] shadow-[0_1px_3px_rgba(74,50,43,.07)]">
              {gastos.map((g, i) => {
                const cancelado = g.estado === 'cancelado'
                return (
                  <div key={g.id} className={`flex items-center gap-3.5 py-3 ${i > 0 ? 'border-t' : ''}`} style={{ borderColor: 'var(--color-divisor)' }}>
                    <div className="w-16 shrink-0">
                      <div className="text-[13px] font-medium text-[var(--color-texto)]">
                        {formatearFechaSolo(g.fecha_gasto)}
                      </div>
                      <div className="mt-0.5 hidden text-[11.5px] text-[var(--color-texto-suave)] sm:block">
                        capt. {new Date(g.fecha_registro).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', ...OPCIONES_ZONA_NEGOCIO })}
                      </div>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium" style={{ color: cancelado ? '#9C9C97' : 'var(--color-texto)' }}>
                        {g.tipos_gasto?.nombre ?? g.descripcion ?? g.categoria}
                      </div>
                      <div className="text-[12.5px] text-[var(--color-texto-suave)]">{g.tipos_gasto ? 'Tipo recurrente' : 'Extraordinario'}</div>
                    </div>
                    <span className="inline-flex shrink-0 rounded-full px-2.5 py-[3px] text-[11.5px] font-medium" style={{ background: '#F4EDE7', color: 'var(--color-texto-suave)' }}>
                      {g.categoria}
                    </span>
                    <div
                      className="w-[92px] shrink-0 text-right text-sm font-medium"
                      style={cancelado ? { color: '#9C9C97', textDecoration: 'line-through' } : { color: 'var(--color-texto)' }}
                    >
                      {formatearMoneda(g.monto)}
                    </div>
                    {!cancelado && (
                      <button onClick={() => cancelar(g)} aria-label="Cancelar gasto" className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[var(--color-texto-suave)] hover:bg-[var(--color-hover-nav)]">
                        <IconoX />
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
