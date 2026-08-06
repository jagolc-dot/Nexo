import { useEffect, useState } from 'react'
import { useNegocio } from '../context/NegocioContext'
import { calcularRango, type Periodo } from '../lib/periodos'
import { componentesFechaNegocio, formatearFechaSolo, hoyEnNegocio, OPCIONES_ZONA_NEGOCIO } from '../lib/tiempoNegocio'
import {
  obtenerEstadoResultados,
  obtenerGastosPorCategoria,
  obtenerInventarioActual,
  obtenerServiciosYClientasFrecuentes,
  obtenerTasaCitas,
  obtenerVentasPorFormaPago,
  type EstadoResultados,
  type FilaInventario,
  type GastoPorCategoria,
  type ServicioMasVendido,
  type ClientaFrecuente,
  type TasaCitas,
  type VentasPorMetodo,
} from '../lib/reportes'
import { exportarExcel, exportarPDF } from '../lib/exportar'
import { claseBoton } from '../components/ui/Button'
import { TablaReporte } from '../components/reportes/TablaReporte'

const PERIODOS: { valor: Periodo; etiqueta: string }[] = [
  { valor: 'hoy', etiqueta: 'Hoy' },
  { valor: 'semana', etiqueta: 'Semana' },
  { valor: 'mes', etiqueta: 'Mes' },
  { valor: 'año', etiqueta: 'Año' },
]

const NOMBRES_MES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']

function etiquetaPeriodo(periodo: Periodo, inicio: Date, fin: Date): string {
  const ci = componentesFechaNegocio(inicio)
  const cf = componentesFechaNegocio(fin)
  if (periodo === 'hoy') return inicio.toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric', ...OPCIONES_ZONA_NEGOCIO })
  if (periodo === 'semana') return `${ci.dia} – ${cf.dia} de ${NOMBRES_MES[cf.mes - 1]}`
  if (periodo === 'año') return String(ci.anio)
  if (periodo === 'personalizado')
    return `${inicio.toLocaleDateString('es-MX', { day: 'numeric', month: 'short', ...OPCIONES_ZONA_NEGOCIO })} – ${fin.toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric', ...OPCIONES_ZONA_NEGOCIO })}`
  return `${NOMBRES_MES[ci.mes - 1].charAt(0).toUpperCase()}${NOMBRES_MES[ci.mes - 1].slice(1)} ${ci.anio}`
}

function Tarjeta({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`rounded-xl bg-[var(--color-superficie)] shadow-[0_1px_3px_rgba(74,50,43,.07)] ${className}`}>{children}</div>
}
function Etiqueta({ children }: { children: React.ReactNode }) {
  return <div className="text-[11.5px] font-medium uppercase tracking-[.07em] text-[var(--color-texto-suave)]">{children}</div>
}
function Barra({ pct, color }: { pct: number; color: string }) {
  return (
    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full" style={{ background: 'var(--color-track-segmentado)' }}>
      <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
    </div>
  )
}

function IconoDescargar() {
  return (
    <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="#68785B" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 4v11" />
      <path d="m7.5 11 4.5 4.5L16.5 11" />
      <path d="M4.5 19.5h15" />
    </svg>
  )
}

interface Operativos {
  pagos: VentasPorMetodo[]
  servicios: ServicioMasVendido[]
  clientas: ClientaFrecuente[]
  gastosCat: GastoPorCategoria[]
  citas: TasaCitas
}

function GrupoOperativos({ datos }: { datos: Operativos }) {
  const totalPagos = datos.pagos.reduce((a, p) => a + p.total, 0)
  const totalGastosCat = datos.gastosCat.reduce((a, g) => a + g.total, 0)
  const totalCitas = datos.citas.completadas + datos.citas.canceladas + datos.citas.pendientes
  const tasaCancelacion = totalCitas === 0 ? 0 : (datos.citas.canceladas / totalCitas) * 100

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <Tarjeta className="min-w-0 p-[18px]">
        <Etiqueta>Ventas por forma de pago</Etiqueta>
        {datos.pagos.length === 0 && <p className="mt-2 text-sm text-[var(--color-texto-suave)]">Sin ventas.</p>}
        {datos.pagos.map((p) => (
          <div key={p.metodo_pago} className="mt-2.5">
            <div className="flex justify-between gap-2 text-[12.5px] capitalize text-[var(--color-texto)]">
              <span>{p.metodo_pago}</span>
              <span className="font-medium">${p.total.toFixed(0)}</span>
            </div>
            <Barra pct={totalPagos === 0 ? 0 : (p.total / totalPagos) * 100} color="var(--color-primario)" />
          </div>
        ))}
      </Tarjeta>

      <Tarjeta className="min-w-0 p-[18px]">
        <Etiqueta>Servicios más vendidos</Etiqueta>
        {datos.servicios.length === 0 && <p className="mt-2 text-sm text-[var(--color-texto-suave)]">Sin datos.</p>}
        {datos.servicios.slice(0, 5).map((s, i) => (
          <div key={s.nombre} className="mt-2.5 flex items-baseline gap-2">
            <span className="w-3 text-xs font-medium text-[var(--color-acento)]">{i + 1}</span>
            <span className="min-w-0 flex-1 truncate text-[13px] text-[var(--color-texto)]">{s.nombre}</span>
            <span className="text-xs font-medium text-[var(--color-texto-suave)]">{s.cantidad}</span>
          </div>
        ))}
      </Tarjeta>

      <Tarjeta className="min-w-0 p-[18px]">
        <Etiqueta>Clientas más frecuentes</Etiqueta>
        {datos.clientas.length === 0 && <p className="mt-2 text-sm text-[var(--color-texto-suave)]">Sin datos.</p>}
        {datos.clientas.slice(0, 5).map((c) => (
          <div key={c.nombre} className="mt-2.5 flex items-center gap-2.5">
            <span
              className="flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-full text-[11.5px] font-medium"
              style={{ background: 'color-mix(in srgb, var(--color-secundario) 18%, white)', color: '#68785B' }}
            >
              {c.nombre.charAt(0).toUpperCase()}
            </span>
            <span className="min-w-0 flex-1 truncate text-[13px] text-[var(--color-texto)]">{c.nombre}</span>
            <span className="shrink-0 text-xs text-[var(--color-texto-suave)]">{c.visitas} visitas</span>
          </div>
        ))}
      </Tarjeta>

      <Tarjeta className="min-w-0 p-[18px]">
        <Etiqueta>Gastos por categoría</Etiqueta>
        {datos.gastosCat.length === 0 && <p className="mt-2 text-sm text-[var(--color-texto-suave)]">Sin gastos.</p>}
        {datos.gastosCat.map((g) => (
          <div key={g.categoria} className="mt-2.5">
            <div className="flex justify-between gap-2 text-[12.5px] text-[var(--color-texto)]">
              <span>{g.categoria}</span>
              <span className="font-medium">${g.total.toFixed(0)}</span>
            </div>
            <Barra pct={totalGastosCat === 0 ? 0 : (g.total / totalGastosCat) * 100} color="var(--color-secundario)" />
          </div>
        ))}
      </Tarjeta>

      <Tarjeta className="min-w-0 p-[18px] sm:col-span-2">
        <Etiqueta>Citas completadas vs. canceladas</Etiqueta>
        <div className="mt-2.5 flex flex-wrap items-baseline gap-4">
          <div>
            <span className="text-[22px]" style={{ fontFamily: 'var(--fuente-titulos)' }}>
              {datos.citas.completadas}
            </span>{' '}
            <span className="text-[12.5px] font-medium text-[var(--color-exito)]">completadas</span>
          </div>
          <div>
            <span className="text-[22px]" style={{ fontFamily: 'var(--fuente-titulos)' }}>
              {datos.citas.canceladas}
            </span>{' '}
            <span className="text-[12.5px] font-medium text-[var(--color-error)]">canceladas</span>
          </div>
          <span className="text-xs text-[var(--color-texto-suave)]">tasa de cancelación {tasaCancelacion.toFixed(0)}%</span>
        </div>
        <div className="mt-2.5 flex h-2 overflow-hidden rounded-full">
          <div className="h-full" style={{ width: `${totalCitas === 0 ? 0 : (datos.citas.completadas / totalCitas) * 100}%`, background: 'color-mix(in srgb, var(--color-exito) 55%, white)' }} />
          <div className="h-full flex-1" style={{ background: 'color-mix(in srgb, var(--color-error) 55%, white)' }} />
        </div>
      </Tarjeta>
    </div>
  )
}

function DetalleER({ datos }: { datos: EstadoResultados }) {
  const [verTodasVentas, setVerTodasVentas] = useState(false)
  const [verTodosGastos, setVerTodosGastos] = useState(false)
  const ventasVisibles = verTodasVentas ? datos.ventas : datos.ventas.slice(0, 8)
  const gastosVisibles = verTodosGastos ? datos.gastos : datos.gastos.slice(0, 8)

  return (
    <div className="mt-3.5">
      <Etiqueta>Ingresos · venta por venta</Etiqueta>
      {datos.ventas.length === 0 && <p className="mt-2 text-sm text-[var(--color-texto-suave)]">Sin ventas en este periodo.</p>}
      {ventasVisibles.map((v) => (
        <div key={v.id} className="flex items-center gap-2.5 border-b py-2.5 text-[13px]" style={{ borderColor: 'var(--color-divisor)' }}>
          <span className="w-12 shrink-0 text-xs text-[var(--color-texto-suave)]">{new Date(v.fecha).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', ...OPCIONES_ZONA_NEGOCIO })}</span>
          <span className="min-w-0 flex-1 truncate text-[var(--color-texto)]">{v.cliente}</span>
          <span className="shrink-0 font-medium text-[var(--color-texto)]">${v.total.toFixed(0)}</span>
          <span className="w-24 shrink-0 text-right text-xs text-[var(--color-exito)]">margen ${v.margen.toFixed(0)}</span>
        </div>
      ))}
      {!verTodasVentas && datos.ventas.length > 8 && (
        <button onClick={() => setVerTodasVentas(true)} className="mt-2.5 text-[12.5px] font-medium text-[var(--color-primario)]">
          Ver las {datos.ventas.length - 8} restantes
        </button>
      )}

      <div className="mt-4">
        <Etiqueta>Gastos · uno por uno</Etiqueta>
      </div>
      {datos.gastos.length === 0 && <p className="mt-2 text-sm text-[var(--color-texto-suave)]">Sin gastos en este periodo.</p>}
      {gastosVisibles.map((g) => (
        <div key={g.id} className="flex items-center gap-2.5 border-b py-2.5 text-[13px]" style={{ borderColor: 'var(--color-divisor)' }}>
          <span className="w-12 shrink-0 text-xs text-[var(--color-texto-suave)]">{formatearFechaSolo(g.fecha_gasto)}</span>
          <span className="min-w-0 flex-1 truncate text-[var(--color-texto)]">{g.concepto}</span>
          <span className="shrink-0 text-xs text-[var(--color-texto-suave)]">{g.categoria}</span>
          <span className="w-16 shrink-0 text-right font-medium text-[var(--color-texto)]">${g.monto.toFixed(0)}</span>
        </div>
      ))}
      {!verTodosGastos && datos.gastos.length > 8 && (
        <button onClick={() => setVerTodosGastos(true)} className="mt-2.5 text-[12.5px] font-medium text-[var(--color-primario)]">
          Ver los {datos.gastos.length - 8} restantes
        </button>
      )}
    </div>
  )
}

export function ReportesPage() {
  const { negocioActivo } = useNegocio()
  const [periodo, setPeriodo] = useState<Periodo>('mes')
  const [rangoLibreAbierto, setRangoLibreAbierto] = useState(false)
  const [rangoPersonalizado, setRangoPersonalizado] = useState({ inicio: hoyEnNegocio(), fin: hoyEnNegocio() })
  const [vista, setVista] = useState<'cascada' | 'documento'>('cascada')
  const [nivel, setNivel] = useState<'resumen' | 'detalle'>('resumen')
  const [datos, setDatos] = useState<EstadoResultados | null>(null)
  const [operativos, setOperativos] = useState<Operativos | null>(null)
  const [inventario, setInventario] = useState<FilaInventario[] | null>(null)

  const esBoutique = negocioActivo?.tema === 'boutique'
  const { inicio, fin } = calcularRango(periodo, rangoPersonalizado)
  const inicioMs = inicio.getTime()
  const finMs = fin.getTime()

  useEffect(() => {
    if (!negocioActivo) return
    setDatos(null)
    obtenerEstadoResultados(negocioActivo.id, inicio, fin).then(setDatos)

    if (esBoutique) {
      setOperativos(null)
      Promise.all([
        obtenerVentasPorFormaPago(negocioActivo.id, inicio, fin),
        obtenerServiciosYClientasFrecuentes(negocioActivo.id, inicio, fin),
        obtenerGastosPorCategoria(negocioActivo.id, inicio, fin),
        obtenerTasaCitas(negocioActivo.id, inicio, fin),
      ]).then(([pagos, frecuentes, gastosCat, citas]) => {
        setOperativos({ pagos, servicios: frecuentes.servicios, clientas: frecuentes.clientas, gastosCat, citas })
      })
    } else {
      setInventario(null)
      obtenerInventarioActual(negocioActivo.id).then(setInventario)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [negocioActivo, esBoutique, inicioMs, finMs])

  if (!negocioActivo) return null

  const ingresos = datos?.ingresos ?? 0
  const margen = ingresos === 0 ? 0 : ((datos?.utilidadNeta ?? 0) / ingresos) * 100
  const alturaBase = 130
  const valorMax = Math.max(ingresos, 1)
  const barras = datos
    ? [
        { nombre: 'Ingresos', valor: datos.ingresos, tipo: 'pos' as const },
        { nombre: '(−) Costo de ventas', valor: datos.costoVentas, tipo: 'resta' as const },
        { nombre: '= Utilidad bruta', valor: datos.utilidadBruta, tipo: 'pos' as const },
        { nombre: '(−) Gastos de operación', valor: datos.gastosOperacion, tipo: 'resta' as const },
        { nombre: '= Utilidad neta', valor: datos.utilidadNeta, tipo: 'neta' as const },
      ]
    : []
  const colorBarra = { pos: 'color-mix(in srgb, var(--color-primario) 45%, white)', resta: '#EBDCD3', neta: 'var(--color-primario)' }
  const colorTexto = { pos: 'var(--color-texto)', resta: 'var(--color-texto-suave)', neta: 'var(--color-primario)' }

  function exportar(tipo: 'pdf' | 'excel') {
    if (!datos) return
    const fn = tipo === 'pdf' ? exportarPDF : exportarExcel
    if (nivel === 'resumen') {
      fn('Estado de Resultados', ['Concepto', 'Monto'], [
        ['Ingresos', datos.ingresos.toFixed(2)],
        ['(-) Costo de ventas', datos.costoVentas.toFixed(2)],
        ['= Utilidad bruta', datos.utilidadBruta.toFixed(2)],
        ['(-) Gastos de operación', datos.gastosOperacion.toFixed(2)],
        ['= Utilidad neta', datos.utilidadNeta.toFixed(2)],
      ])
    } else {
      fn(
        'Estado de Resultados - Ventas',
        ['Fecha', 'Cliente', 'Total', 'Costo', 'Margen'],
        datos.ventas.map((v) => [new Date(v.fecha).toLocaleString('es-MX', OPCIONES_ZONA_NEGOCIO), v.cliente, v.total.toFixed(2), v.costo.toFixed(2), v.margen.toFixed(2)]),
      )
      fn(
        'Estado de Resultados - Gastos',
        ['Fecha', 'Concepto', 'Categoría', 'Monto'],
        datos.gastos.map((g) => [formatearFechaSolo(g.fecha_gasto), g.concepto, g.categoria, g.monto.toFixed(2)]),
      )
    }
  }

  return (
    <div className="p-4 md:p-[22px] lg:p-7">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex-1 text-[22px] font-medium text-[var(--color-texto)]" style={{ fontFamily: 'var(--fuente-titulos)' }}>
          Reportes
        </div>
        <button onClick={() => exportar('pdf')} className={claseBoton('secundario', '!min-h-[38px] gap-1.5 px-3 text-[12.5px]')}>
          <IconoDescargar />
          PDF
        </button>
        <button onClick={() => exportar('excel')} className={claseBoton('secundario', '!min-h-[38px] gap-1.5 px-3 text-[12.5px]')}>
          <IconoDescargar />
          Excel
        </button>
      </div>

      <div className="mt-3.5 flex flex-wrap items-center gap-2.5">
        <div className="inline-flex flex-none rounded-[9px] p-[3px]" style={{ background: 'var(--color-track-segmentado)' }}>
          {PERIODOS.map((p) => (
            <button
              key={p.valor}
              onClick={() => {
                setPeriodo(p.valor)
                setRangoLibreAbierto(false)
              }}
              className={`rounded-[7px] px-3.5 py-[7px] text-[13px] ${
                periodo === p.valor ? 'bg-[var(--color-superficie)] font-medium text-[var(--color-texto)] shadow-[0_1px_2px_rgba(74,50,43,.1)]' : 'text-[var(--color-texto-suave)]'
              }`}
            >
              {p.etiqueta}
            </button>
          ))}
        </div>
        <button
          onClick={() => setRangoLibreAbierto((v) => !v)}
          className="inline-flex min-h-9 items-center gap-1.5 rounded-full border px-3 text-[12.5px] font-medium text-[var(--color-texto)]"
          style={{ borderColor: 'var(--color-borde-campo)', background: periodo === 'personalizado' ? 'color-mix(in srgb, var(--color-primario) 8%, white)' : 'var(--color-superficie)' }}
        >
          Rango libre
        </button>
        <span className="text-[12.5px] text-[var(--color-texto-suave)]">{etiquetaPeriodo(periodo, inicio, fin)}</span>

        <div className="flex-1" />
        <div className="inline-flex flex-none rounded-[9px] p-[3px]" style={{ background: 'var(--color-track-segmentado)' }}>
          {(['cascada', 'documento'] as const).map((v) => (
            <button
              key={v}
              onClick={() => setVista(v)}
              className={`rounded-[7px] px-3.5 py-[7px] text-[13px] ${
                vista === v ? 'bg-[var(--color-superficie)] font-medium text-[var(--color-texto)] shadow-[0_1px_2px_rgba(74,50,43,.1)]' : 'text-[var(--color-texto-suave)]'
              }`}
            >
              {v === 'cascada' ? 'Gráfica' : 'Documento'}
            </button>
          ))}
        </div>
      </div>

      {rangoLibreAbierto && (
        <div className="mt-2.5 flex items-center gap-2 text-sm">
          <input
            type="date"
            value={rangoPersonalizado.inicio}
            onChange={(e) => {
              setRangoPersonalizado((r) => ({ ...r, inicio: e.target.value }))
              setPeriodo('personalizado')
            }}
            className="min-h-9 rounded-lg border px-2 text-[var(--color-texto)]"
            style={{ borderColor: 'var(--color-borde-campo)' }}
          />
          <span className="text-[var(--color-texto-suave)]">a</span>
          <input
            type="date"
            value={rangoPersonalizado.fin}
            onChange={(e) => {
              setRangoPersonalizado((r) => ({ ...r, fin: e.target.value }))
              setPeriodo('personalizado')
            }}
            className="min-h-9 rounded-lg border px-2 text-[var(--color-texto)]"
            style={{ borderColor: 'var(--color-borde-campo)' }}
          />
        </div>
      )}

      {!datos && <p className="mt-4 text-sm text-[var(--color-texto-suave)]">Cargando...</p>}

      {datos && vista === 'cascada' && (
        <div className="mt-4 grid grid-cols-1 items-start gap-4 xl:grid-cols-[440px_1fr]">
          <Tarjeta className="min-w-0 p-5">
            <div className="flex flex-wrap items-center justify-between gap-2.5">
              <div className="text-[16.5px] font-medium text-[var(--color-texto)]" style={{ fontFamily: 'var(--fuente-titulos)' }}>
                Estado de Resultados
              </div>
              <div className="inline-flex rounded-lg p-0.5" style={{ background: 'var(--color-track-segmentado)' }}>
                {(['resumen', 'detalle'] as const).map((n) => (
                  <button
                    key={n}
                    onClick={() => setNivel(n)}
                    className={`rounded-md px-2.5 py-1 text-xs ${
                      nivel === n ? 'bg-[var(--color-superficie)] font-medium text-[var(--color-texto)] shadow-[0_1px_2px_rgba(74,50,43,.1)]' : 'text-[var(--color-texto-suave)]'
                    }`}
                  >
                    {n === 'resumen' ? 'Resumen' : 'Detalle'}
                  </button>
                ))}
              </div>
            </div>

            {nivel === 'resumen' ? (
              <div className="mt-4 flex items-stretch gap-3" style={{ height: alturaBase + 40 }}>
                {barras.map((b) => (
                  <div key={b.nombre} className="flex min-w-0 flex-1 flex-col items-center justify-end">
                    <div className="whitespace-nowrap text-sm font-medium" style={{ color: colorTexto[b.tipo] }}>
                      ${b.valor.toFixed(0)}
                    </div>
                    <div
                      className="mt-1.5 w-[72%] rounded-t-md"
                      style={{ height: Math.max((b.valor / valorMax) * alturaBase, 2), background: colorBarra[b.tipo] }}
                    />
                    <div className="mt-2 text-center text-[11.5px] leading-tight text-[var(--color-texto-suave)]">{b.nombre}</div>
                  </div>
                ))}
              </div>
            ) : (
              <DetalleER datos={datos} />
            )}
            {nivel === 'resumen' && (
              <div className="mt-2 flex justify-end">
                <span
                  className="inline-flex rounded-full px-2.5 py-[3px] text-xs font-medium"
                  style={{ background: 'color-mix(in srgb, var(--color-exito) 12%, white)', color: 'var(--color-exito)' }}
                >
                  margen {margen.toFixed(0)}%
                </span>
              </div>
            )}
          </Tarjeta>

          {esBoutique && operativos && <GrupoOperativos datos={operativos} />}
        </div>
      )}

      {datos && vista === 'documento' && (
        <>
          <div className="mx-auto mt-4 max-w-[640px] rounded-xl bg-[var(--color-superficie)] px-11 py-9 shadow-[0_1px_3px_rgba(74,50,43,.07)]">
            <div className="text-center">
              <div className="text-[11px] font-medium uppercase tracking-[.14em] text-[var(--color-texto-suave)]">{negocioActivo.nombre}</div>
              <div className="mt-1.5 text-[26px] font-medium text-[var(--color-texto)]" style={{ fontFamily: 'var(--fuente-titulos)' }}>
                Estado de Resultados
              </div>
              <div className="mt-1 text-[12.5px] text-[var(--color-texto-suave)]">{etiquetaPeriodo(periodo, inicio, fin)}</div>
            </div>

            <div className="mt-6">
              {[
                { l: 'Ingresos', v: datos.ingresos, suave: false },
                { l: '(−) Costo de ventas', v: datos.costoVentas, suave: true },
                { l: '= Utilidad bruta', v: datos.utilidadBruta, suave: false },
                { l: '(−) Gastos de operación', v: datos.gastosOperacion, suave: true },
              ].map((r) => (
                <div key={r.l} className={`flex items-baseline gap-2.5 py-2.5 text-sm ${r.suave ? 'text-[var(--color-texto-suave)]' : 'font-medium text-[var(--color-texto)]'}`}>
                  <span>{r.l}</span>
                  <span className="flex-1 border-b border-dotted" style={{ borderColor: '#D8C4BA' }} />
                  <span>${r.v.toFixed(0)}</span>
                </div>
              ))}
              <div className="mt-2.5 flex items-baseline justify-between gap-2.5 pt-4" style={{ borderTop: '3px double var(--color-texto)' }}>
                <span className="text-[15px] font-medium text-[var(--color-texto)]">= Utilidad neta</span>
                <span className="text-[28px] text-[var(--color-primario)]" style={{ fontFamily: 'var(--fuente-titulos)' }}>
                  ${datos.utilidadNeta.toFixed(0)}
                </span>
              </div>
              <div className="mt-1.5 flex justify-end">
                <span
                  className="inline-flex rounded-full px-2.5 py-[3px] text-xs font-medium"
                  style={{ background: 'color-mix(in srgb, var(--color-exito) 12%, white)', color: 'var(--color-exito)' }}
                >
                  margen {margen.toFixed(0)}%
                </span>
              </div>
            </div>
          </div>
          {esBoutique && operativos && (
            <div className="mx-auto mt-4 max-w-[640px]">
              <GrupoOperativos datos={operativos} />
            </div>
          )}
        </>
      )}

      {datos && !esBoutique && inventario && (
        <div className="mt-4 max-w-[820px]">
          <TablaReporte
            titulo="Inventario actual"
            columnas={['Producto', 'Color', 'Talla', 'Existencia', 'Costo promedio']}
            filas={inventario.map((f) => [f.item, f.color ?? '—', f.talla ?? '—', f.existencia, f.costo_promedio.toFixed(2)])}
          />
        </div>
      )}
    </div>
  )
}
