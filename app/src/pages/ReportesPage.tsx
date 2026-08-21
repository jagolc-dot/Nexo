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

const COLOR_ERROR = '#C1443A'
const ALTURA_BARRAS = 130

interface BarraDato {
  nombre: string
  valor: number
  tipo: 'pos' | 'resta' | 'total'
}

/**
 * Barras con línea base compartible entre gráficas: recibe el
 * máximo/mínimo del GRUPO de gráficas al que pertenece (no solo el
 * suyo propio), para que "escalaMax"/"escalaMin" puedan venir
 * calculados sobre varias gráficas a la vez (Etapa 19 C).
 */
function GraficaBarras({
  titulo,
  barras,
  escalaMax,
  escalaMin,
  margenPct,
  mensajeVacio,
}: {
  titulo: string
  barras: BarraDato[]
  escalaMax: number
  escalaMin: number
  margenPct: number | null
  mensajeVacio?: string
}) {
  const colorBarra = { pos: 'color-mix(in srgb, var(--color-primario) 45%, white)', resta: '#EBDCD3', neta: 'var(--color-primario)' } as Record<string, string>
  const colorTexto = { pos: 'var(--color-texto)', resta: 'var(--color-texto-suave)', neta: 'var(--color-primario)' } as Record<string, string>

  const rangoPos = Math.max(escalaMax, 1)
  const rangoNeg = Math.max(-escalaMin, 0)
  const alturaAbajo = rangoNeg > 0 ? (rangoNeg / rangoPos) * ALTURA_BARRAS : 0

  return (
    <Tarjeta className="min-w-0 p-5">
      <div className="text-[16.5px] font-medium text-[var(--color-texto)]" style={{ fontFamily: 'var(--fuente-titulos)' }}>
        {titulo}
      </div>

      {mensajeVacio ? (
        <div className="flex flex-col items-center justify-center py-10 text-center" style={{ height: ALTURA_BARRAS + alturaAbajo + 20 }}>
          <p className="text-sm text-[var(--color-texto-suave)]">{mensajeVacio}</p>
        </div>
      ) : (
        <div className="mt-4 flex items-stretch gap-3" style={{ height: ALTURA_BARRAS + alturaAbajo + 40 }}>
          {barras.map((b) => {
            const negativo = b.valor < 0
            const alturaBarra = Math.max((Math.abs(b.valor) / rangoPos) * ALTURA_BARRAS, 2)
            return (
              <div key={b.nombre} className="flex min-w-0 flex-1 flex-col items-center">
                <div className="flex w-full flex-1 flex-col items-center justify-end" style={{ height: ALTURA_BARRAS }}>
                  {!negativo && (
                    <>
                      <div className="whitespace-nowrap text-sm font-medium" style={{ color: colorTexto[b.tipo] }}>
                        ${b.valor.toFixed(0)}
                      </div>
                      <div className="mt-1.5 w-[72%] rounded-t-md" style={{ height: alturaBarra, background: colorBarra[b.tipo] }} />
                    </>
                  )}
                </div>
                {alturaAbajo > 0 && (
                  <>
                    <div className="w-full border-t" style={{ borderColor: 'var(--color-texto)' }} />
                    <div className="flex w-full flex-col items-center" style={{ height: alturaAbajo }}>
                      {negativo && <div className="w-[72%] rounded-b-md" style={{ height: alturaBarra, background: COLOR_ERROR }} />}
                    </div>
                    {negativo && (
                      <div className="whitespace-nowrap text-sm font-medium" style={{ color: COLOR_ERROR }}>
                        −${Math.abs(b.valor).toFixed(0)}
                      </div>
                    )}
                  </>
                )}
                <div className="mt-2 text-center text-[11.5px] leading-tight text-[var(--color-texto-suave)]">{b.nombre}</div>
              </div>
            )
          })}
        </div>
      )}

      {!mensajeVacio && margenPct !== null && (
        <div className="mt-2 flex justify-end">
          <span
            className="inline-flex rounded-full px-2.5 py-[3px] text-xs font-medium"
            style={{
              background: margenPct < 0 ? 'color-mix(in srgb, var(--color-error) 12%, white)' : 'color-mix(in srgb, var(--color-exito) 12%, white)',
              color: margenPct < 0 ? 'var(--color-error)' : 'var(--color-exito)',
            }}
          >
            margen {margenPct.toFixed(0)}%
          </span>
        </div>
      )}
    </Tarjeta>
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

function ListaLineas({ titulo, lineas }: { titulo: string; lineas: EstadoResultados['servicios']['lineas'] }) {
  const [verTodas, setVerTodas] = useState(false)
  const visibles = verTodas ? lineas : lineas.slice(0, 8)

  return (
    <div className="mt-4">
      <Etiqueta>{titulo}</Etiqueta>
      {lineas.length === 0 && <p className="mt-2 text-sm text-[var(--color-texto-suave)]">Sin movimientos en este periodo.</p>}
      {visibles.map((l, i) => (
        <div key={`${l.ventaId}-${i}`} className="flex items-center gap-2.5 border-b py-2.5 text-[13px]" style={{ borderColor: 'var(--color-divisor)' }}>
          <span className="w-12 shrink-0 text-xs text-[var(--color-texto-suave)]">{new Date(l.fecha).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', ...OPCIONES_ZONA_NEGOCIO })}</span>
          <span className="min-w-0 flex-1 truncate text-[var(--color-texto)]">
            {l.itemNombre}
            {l.cantidad > 1 && <span className="text-[var(--color-texto-suave)]"> ×{l.cantidad}</span>}
            <span className="ml-1.5 truncate text-xs text-[var(--color-texto-suave)]">{l.cliente}</span>
          </span>
          <span className="shrink-0 font-medium text-[var(--color-texto)]">${l.total.toFixed(0)}</span>
          <span className="w-24 shrink-0 text-right text-xs text-[var(--color-exito)]">margen ${l.margen.toFixed(0)}</span>
        </div>
      ))}
      {!verTodas && lineas.length > 8 && (
        <button onClick={() => setVerTodas(true)} className="mt-2.5 text-[12.5px] font-medium text-[var(--color-primario)]">
          Ver las {lineas.length - 8} restantes
        </button>
      )}
    </div>
  )
}

function DetalleER({ datos }: { datos: EstadoResultados }) {
  const [verTodosGastos, setVerTodosGastos] = useState(false)
  const gastosVisibles = verTodosGastos ? datos.gastos : datos.gastos.slice(0, 8)

  return (
    <div className="mt-3.5">
      <ListaLineas titulo="Servicios · línea por línea" lineas={datos.servicios.lineas} />
      <ListaLineas titulo="Productos · línea por línea" lineas={datos.productos.lineas} />

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
  const [tabMovil, setTabMovil] = useState<'servicios' | 'productos'>('servicios')
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

  const ingresosTotales = (datos?.servicios.ingresos ?? 0) + (datos?.productos.ingresos ?? 0)
  const margen = ingresosTotales === 0 ? 0 : ((datos?.utilidadNeta ?? 0) / ingresosTotales) * 100

  type FilaER =
    | { tipo: 'seccion'; seccion: string }
    | { tipo: 'linea'; l: string; v: number; suave?: boolean; total?: boolean }
  const filas: FilaER[] = datos
    ? [
        { tipo: 'seccion', seccion: 'Servicios' },
        { tipo: 'linea', l: 'Ingresos por servicios', v: datos.servicios.ingresos },
        { tipo: 'linea', l: '(−) Costo de servicios', v: datos.servicios.costoVentas, suave: true },
        { tipo: 'linea', l: '= Utilidad bruta de servicios', v: datos.servicios.utilidadBruta, total: true },
        { tipo: 'seccion', seccion: 'Productos' },
        { tipo: 'linea', l: 'Ingresos por productos', v: datos.productos.ingresos },
        { tipo: 'linea', l: '(−) Costo de productos', v: datos.productos.costoVentas, suave: true },
        { tipo: 'linea', l: '= Utilidad bruta de productos', v: datos.productos.utilidadBruta, total: true },
        { tipo: 'linea', l: '= Utilidad bruta total', v: datos.utilidadBrutaTotal, total: true },
        { tipo: 'linea', l: '(−) Gastos de operación', v: datos.gastosOperacion, suave: true },
      ]
    : []

  // Gráficas 1 y 2 comparten escala: se calcula sobre el conjunto de
  // ambas, no cada una por su cuenta (Etapa 19 C). La gráfica 3 tiene la
  // suya propia porque representa una etapa distinta del cálculo.
  const barrasServicios: BarraDato[] = datos
    ? [
        { nombre: 'Ingresos por servicios', valor: datos.servicios.ingresos, tipo: 'pos' },
        { nombre: '(−) Costo de servicios', valor: datos.servicios.costoVentas, tipo: 'resta' },
        { nombre: '= Utilidad bruta de servicios', valor: datos.servicios.utilidadBruta, tipo: 'total' },
      ]
    : []
  const barrasProductos: BarraDato[] = datos
    ? [
        { nombre: 'Ingresos por productos', valor: datos.productos.ingresos, tipo: 'pos' },
        { nombre: '(−) Costo de productos', valor: datos.productos.costoVentas, tipo: 'resta' },
        { nombre: '= Utilidad bruta de productos', valor: datos.productos.utilidadBruta, tipo: 'total' },
      ]
    : []
  const valoresGrupo12 = [...barrasServicios, ...barrasProductos].map((b) => b.valor)
  const escalaMax12 = valoresGrupo12.length ? Math.max(...valoresGrupo12, 0) : 0
  const escalaMin12 = valoresGrupo12.length ? Math.min(...valoresGrupo12, 0) : 0

  const barrasResultado: BarraDato[] = datos
    ? [
        { nombre: 'Utilidad bruta total', valor: datos.utilidadBrutaTotal, tipo: 'total' },
        { nombre: '(−) Gastos de operación', valor: datos.gastosOperacion, tipo: 'resta' },
        { nombre: '= Utilidad neta', valor: datos.utilidadNeta, tipo: 'total' },
      ]
    : []
  const valoresGrupo3 = barrasResultado.map((b) => b.valor)
  const escalaMax3 = valoresGrupo3.length ? Math.max(...valoresGrupo3, 0) : 0
  const escalaMin3 = valoresGrupo3.length ? Math.min(...valoresGrupo3, 0) : 0

  const margenServicios = !datos || datos.servicios.ingresos === 0 ? null : (datos.servicios.utilidadBruta / datos.servicios.ingresos) * 100
  const margenProductos = !datos || datos.productos.ingresos === 0 ? null : (datos.productos.utilidadBruta / datos.productos.ingresos) * 100
  const margenNeto = ingresosTotales === 0 ? null : ((datos?.utilidadNeta ?? 0) / ingresosTotales) * 100

  function exportar(tipo: 'pdf' | 'excel') {
    if (!datos) return
    const fn = tipo === 'pdf' ? exportarPDF : exportarExcel
    if (nivel === 'resumen') {
      fn('Estado de Resultados', ['Concepto', 'Monto'], [
        ['SERVICIOS', ''],
        ['Ingresos por servicios', datos.servicios.ingresos.toFixed(2)],
        ['(-) Costo de servicios', datos.servicios.costoVentas.toFixed(2)],
        ['= Utilidad bruta de servicios', datos.servicios.utilidadBruta.toFixed(2)],
        ['PRODUCTOS', ''],
        ['Ingresos por productos', datos.productos.ingresos.toFixed(2)],
        ['(-) Costo de productos', datos.productos.costoVentas.toFixed(2)],
        ['= Utilidad bruta de productos', datos.productos.utilidadBruta.toFixed(2)],
        ['= Utilidad bruta total', datos.utilidadBrutaTotal.toFixed(2)],
        ['(-) Gastos de operación', datos.gastosOperacion.toFixed(2)],
        ['= Utilidad neta', datos.utilidadNeta.toFixed(2)],
      ])
    } else {
      fn(
        'Estado de Resultados - Servicios',
        ['Fecha', 'Cliente', 'Servicio', 'Cantidad', 'Total', 'Costo', 'Margen'],
        datos.servicios.lineas.map((l) => [
          new Date(l.fecha).toLocaleString('es-MX', OPCIONES_ZONA_NEGOCIO),
          l.cliente,
          l.itemNombre,
          l.cantidad,
          l.total.toFixed(2),
          l.costo.toFixed(2),
          l.margen.toFixed(2),
        ]),
      )
      fn(
        'Estado de Resultados - Productos',
        ['Fecha', 'Cliente', 'Producto', 'Cantidad', 'Total', 'Costo', 'Margen'],
        datos.productos.lineas.map((l) => [
          new Date(l.fecha).toLocaleString('es-MX', OPCIONES_ZONA_NEGOCIO),
          l.cliente,
          l.itemNombre,
          l.cantidad,
          l.total.toFixed(2),
          l.costo.toFixed(2),
          l.margen.toFixed(2),
        ]),
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
        <div className="mt-4">
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
            <div className="mt-4">
              <div className="mb-3 inline-flex rounded-lg p-0.5 sm:hidden" style={{ background: 'var(--color-track-segmentado)' }}>
                {(['servicios', 'productos'] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setTabMovil(t)}
                    className={`rounded-md px-3 py-1.5 text-xs capitalize ${
                      tabMovil === t ? 'bg-[var(--color-superficie)] font-medium text-[var(--color-texto)] shadow-[0_1px_2px_rgba(74,50,43,.1)]' : 'text-[var(--color-texto-suave)]'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className={tabMovil === 'servicios' ? '' : 'hidden sm:block'}>
                  <GraficaBarras
                    titulo="Servicios"
                    barras={barrasServicios}
                    escalaMax={escalaMax12}
                    escalaMin={escalaMin12}
                    margenPct={margenServicios}
                    mensajeVacio={datos.servicios.ingresos === 0 ? 'Sin ventas de servicios en este periodo.' : undefined}
                  />
                </div>
                <div className={tabMovil === 'productos' ? '' : 'hidden sm:block'}>
                  <GraficaBarras
                    titulo="Productos"
                    barras={barrasProductos}
                    escalaMax={escalaMax12}
                    escalaMin={escalaMin12}
                    margenPct={margenProductos}
                    mensajeVacio={datos.productos.ingresos === 0 ? 'Sin ventas de productos en este periodo.' : undefined}
                  />
                </div>
                <GraficaBarras titulo="Resultado del periodo" barras={barrasResultado} escalaMax={escalaMax3} escalaMin={escalaMin3} margenPct={margenNeto} />
              </div>
            </div>
          ) : (
            <Tarjeta className="mt-4 min-w-0 p-5">
              <DetalleER datos={datos} />
            </Tarjeta>
          )}

          {esBoutique && operativos && (
            <div className="mt-4">
              <GrupoOperativos datos={operativos} />
            </div>
          )}
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
              {filas.map((f, i) =>
                f.tipo === 'seccion' ? (
                  <div key={i} className="mt-4 text-[11px] font-medium uppercase tracking-[.14em] text-[var(--color-texto-suave)] first:mt-0">
                    {f.seccion}
                  </div>
                ) : (
                  <div
                    key={i}
                    className={`flex items-baseline gap-2.5 py-2.5 text-sm ${f.suave ? 'text-[var(--color-texto-suave)]' : f.total ? 'font-medium text-[var(--color-texto)]' : 'text-[var(--color-texto)]'}`}
                  >
                    <span>{f.l}</span>
                    <span className="flex-1 border-b border-dotted" style={{ borderColor: '#D8C4BA' }} />
                    <span>${f.v.toFixed(0)}</span>
                  </div>
                ),
              )}
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
