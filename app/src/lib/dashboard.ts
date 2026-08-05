import { supabase } from './supabaseClient'
import { calcularRango } from './periodos'
import { obtenerEstadoResultados, obtenerServiciosYClientasFrecuentes, obtenerTasaCitas } from './reportes'

function inicioMesAnterior(): { inicio: Date; fin: Date } {
  const hoy = new Date()
  const inicio = new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1)
  const fin = new Date(hoy.getFullYear(), hoy.getMonth(), 0, 23, 59, 59, 999)
  return { inicio, fin }
}

async function citasHoyDesglose(negocioId: string): Promise<{ completadas: number; pendientes: number; total: number }> {
  const { inicio, fin } = calcularRango('hoy')
  const { data, error } = await supabase
    .from('citas')
    .select('estado')
    .eq('negocio_id', negocioId)
    .neq('estado', 'cancelada')
    .gte('fecha_hora', inicio.toISOString())
    .lte('fecha_hora', fin.toISOString())

  if (error) throw error
  const filas = data as Array<{ estado: string }>
  const completadas = filas.filter((f) => f.estado === 'completada').length
  return { completadas, pendientes: filas.length - completadas, total: filas.length }
}

export interface ServicioTop {
  nombre: string
  cantidad: number
}

export interface ProximaCita {
  id: string
  fecha_hora: string
  clienta: string
  servicios: string
}

async function obtenerProximasCitas(negocioId: string, limite = 5): Promise<ProximaCita[]> {
  const { data, error } = await supabase
    .from('citas')
    .select('id, fecha_hora, clientes(nombre), cita_servicios(items(nombre))')
    .eq('negocio_id', negocioId)
    .neq('estado', 'cancelada')
    .gte('fecha_hora', new Date().toISOString())
    .order('fecha_hora', { ascending: true })
    .limit(limite)

  if (error) throw error

  return (
    data as unknown as Array<{
      id: string
      fecha_hora: string
      clientes: { nombre: string } | null
      cita_servicios: Array<{ items: { nombre: string } | null }>
    }>
  ).map((c) => ({
    id: c.id,
    fecha_hora: c.fecha_hora,
    clienta: c.clientes?.nombre ?? 'Sin clienta',
    servicios: c.cita_servicios.map((s) => s.items?.nombre).filter(Boolean).join(' + '),
  }))
}

export interface DashboardBoutique {
  citasHoy: { completadas: number; pendientes: number; total: number }
  ingresosDia: number
  ventasHoyCount: number
  utilidadMes: number
  utilidadMesAnterior: number
  ingresosMes: number
  gastosMes: number
  clientesActivos: number
  ticketPromedio: number
  ingresosMesAnterior: number
  clientasNuevas: number
  clientasRecurrentes: number
  tasaCancelacion: number
  citasMesTotal: number
  citasMesCanceladas: number
  topServicios: ServicioTop[]
  topProductos: ServicioTop[]
  proximasCitas: ProximaCita[]
}

export async function obtenerDashboardBoutique(negocioId: string): Promise<DashboardBoutique> {
  const rangoHoy = calcularRango('hoy')
  const rangoMes = calcularRango('mes')
  const rangoMesAnterior = inicioMesAnterior()

  const [rHoy, rMes, rMesAnterior, citasHoy, clientesActivos, tasaCitas, frecuentes, proximasCitas, clientasMes] =
    await Promise.all([
      obtenerEstadoResultados(negocioId, rangoHoy.inicio, rangoHoy.fin),
      obtenerEstadoResultados(negocioId, rangoMes.inicio, rangoMes.fin),
      obtenerEstadoResultados(negocioId, rangoMesAnterior.inicio, rangoMesAnterior.fin),
      citasHoyDesglose(negocioId),
      contarClientesActivos(negocioId),
      obtenerTasaCitas(negocioId, rangoMes.inicio, rangoMes.fin),
      obtenerServiciosYClientasFrecuentes(negocioId, rangoMes.inicio, rangoMes.fin),
      obtenerProximasCitas(negocioId, 5),
      obtenerClientasNuevasVsRecurrentes(negocioId, rangoMes.inicio, rangoMes.fin),
    ])

  return {
    citasHoy,
    ingresosDia: rHoy.ingresos,
    ventasHoyCount: rHoy.ventas.length,
    utilidadMes: rMes.utilidadNeta,
    utilidadMesAnterior: rMesAnterior.utilidadNeta,
    ingresosMes: rMes.ingresos,
    gastosMes: rMes.gastosOperacion,
    clientesActivos,
    ticketPromedio: rMes.ventas.length === 0 ? 0 : rMes.ingresos / rMes.ventas.length,
    ingresosMesAnterior: rMesAnterior.ingresos,
    clientasNuevas: clientasMes.nuevas,
    clientasRecurrentes: clientasMes.recurrentes,
    tasaCancelacion:
      tasaCitas.completadas + tasaCitas.canceladas + tasaCitas.pendientes === 0
        ? 0
        : tasaCitas.canceladas / (tasaCitas.completadas + tasaCitas.canceladas + tasaCitas.pendientes),
    citasMesTotal: tasaCitas.completadas + tasaCitas.canceladas + tasaCitas.pendientes,
    citasMesCanceladas: tasaCitas.canceladas,
    topServicios: frecuentes.servicios.slice(0, 3),
    topProductos: frecuentes.productos.slice(0, 3),
    proximasCitas,
  }
}

async function contarClientesActivos(negocioId: string): Promise<number> {
  const desde = new Date()
  desde.setMonth(desde.getMonth() - 2)

  const { data, error } = await supabase
    .from('ventas')
    .select('cliente_id')
    .eq('negocio_id', negocioId)
    .eq('estado', 'confirmada')
    .not('cliente_id', 'is', null)
    .gte('fecha', desde.toISOString())

  if (error) throw error
  return new Set((data as Array<{ cliente_id: string }>).map((d) => d.cliente_id)).size
}

async function obtenerClientasNuevasVsRecurrentes(
  negocioId: string,
  inicio: Date,
  fin: Date,
): Promise<{ nuevas: number; recurrentes: number }> {
  const { data: delMes, error: errorDelMes } = await supabase
    .from('ventas')
    .select('cliente_id')
    .eq('negocio_id', negocioId)
    .eq('estado', 'confirmada')
    .not('cliente_id', 'is', null)
    .gte('fecha', inicio.toISOString())
    .lte('fecha', fin.toISOString())

  if (errorDelMes) throw errorDelMes

  const clientesDelMes = Array.from(new Set((delMes as Array<{ cliente_id: string }>).map((d) => d.cliente_id)))
  if (clientesDelMes.length === 0) return { nuevas: 0, recurrentes: 0 }

  const { data: previas, error: errorPrevias } = await supabase
    .from('ventas')
    .select('cliente_id')
    .eq('negocio_id', negocioId)
    .eq('estado', 'confirmada')
    .in('cliente_id', clientesDelMes)
    .lt('fecha', inicio.toISOString())

  if (errorPrevias) throw errorPrevias

  const conHistoriaPrevia = new Set((previas as Array<{ cliente_id: string }>).map((d) => d.cliente_id))
  const nuevas = clientesDelMes.filter((id) => !conHistoriaPrevia.has(id)).length
  return { nuevas, recurrentes: clientesDelMes.length - nuevas }
}

export interface ProductoBajaExistencia {
  nombre: string
  variante: string | null
  existencia: number
}

const UMBRAL_EXISTENCIA_BAJA = 3

async function obtenerProductosBajaExistencia(negocioId: string): Promise<ProductoBajaExistencia[]> {
  const { data, error } = await supabase
    .from('variantes_item')
    .select('color, talla, existencia, activo, items!inner(nombre, negocio_id, activo)')
    .eq('items.negocio_id', negocioId)
    .eq('items.activo', true)
    .eq('activo', true)
    .lte('existencia', UMBRAL_EXISTENCIA_BAJA)
    .order('existencia', { ascending: true })
    .limit(5)

  if (error) throw error

  return (
    data as unknown as Array<{
      color: string | null
      talla: string | null
      existencia: number
      items: { nombre: string } | null
    }>
  ).map((v) => ({
    nombre: v.items?.nombre ?? '—',
    variante: [v.color, v.talla].filter(Boolean).join(' / ') || null,
    existencia: v.existencia,
  }))
}

export interface DashboardSastreria {
  ventasDia: number
  utilidadMes: number
  utilidadMesAnterior: number
  ticketPromedio: number
  clientesActivos: number
  productosBajaExistencia: ProductoBajaExistencia[]
}

export async function obtenerDashboardSastreria(negocioId: string): Promise<DashboardSastreria> {
  const rangoHoy = calcularRango('hoy')
  const rangoMes = calcularRango('mes')
  const rangoMesAnterior = inicioMesAnterior()

  const [rHoy, rMes, rMesAnterior, clientesActivos, productosBajaExistencia] = await Promise.all([
    obtenerEstadoResultados(negocioId, rangoHoy.inicio, rangoHoy.fin),
    obtenerEstadoResultados(negocioId, rangoMes.inicio, rangoMes.fin),
    obtenerEstadoResultados(negocioId, rangoMesAnterior.inicio, rangoMesAnterior.fin),
    contarClientesActivos(negocioId),
    obtenerProductosBajaExistencia(negocioId),
  ])

  return {
    ventasDia: rHoy.ingresos,
    utilidadMes: rMes.utilidadNeta,
    utilidadMesAnterior: rMesAnterior.utilidadNeta,
    ticketPromedio: rMes.ventas.length === 0 ? 0 : rMes.ingresos / rMes.ventas.length,
    clientesActivos,
    productosBajaExistencia,
  }
}
