import { supabase } from './supabaseClient'
import { formatoFechaISO } from './periodos'
import type { MetodoPago } from '../types'

interface VentaConDetalle {
  id: string
  fecha: string
  total: number
  cliente_id: string | null
  nombre_ocasional: string | null
  metodo_pago: MetodoPago
  clientes: { nombre: string } | null
  venta_detalle: Array<{ cantidad: number; costo_unitario: number; item_id: string; items: { nombre: string; tipo: string } | null }>
}

interface GastoActivo {
  id: string
  fecha_gasto: string
  categoria: string
  descripcion: string | null
  monto: number
  tipos_gasto: { nombre: string } | null
}

async function ventasConfirmadasEnRango(negocioId: string, inicio: Date, fin: Date): Promise<VentaConDetalle[]> {
  const { data, error } = await supabase
    .from('ventas')
    .select(
      'id, fecha, total, cliente_id, nombre_ocasional, metodo_pago, clientes(nombre), venta_detalle(cantidad, costo_unitario, item_id, items(nombre, tipo))',
    )
    .eq('negocio_id', negocioId)
    .eq('estado', 'confirmada')
    .gte('fecha', inicio.toISOString())
    .lte('fecha', fin.toISOString())

  if (error) throw error
  return data as unknown as VentaConDetalle[]
}

async function gastosActivosEnRango(negocioId: string, inicio: Date, fin: Date): Promise<GastoActivo[]> {
  const { data, error } = await supabase
    .from('gastos')
    .select('id, fecha_gasto, categoria, descripcion, monto, tipos_gasto(nombre)')
    .eq('negocio_id', negocioId)
    .eq('estado', 'activo')
    .gte('fecha_gasto', formatoFechaISO(inicio))
    .lte('fecha_gasto', formatoFechaISO(fin))

  if (error) throw error
  return data as unknown as GastoActivo[]
}

export interface LineaVentaResultados {
  id: string
  fecha: string
  cliente: string
  total: number
  costo: number
  margen: number
}

export interface LineaGastoResultados {
  id: string
  fecha_gasto: string
  concepto: string
  categoria: string
  monto: number
}

export interface EstadoResultados {
  ingresos: number
  costoVentas: number
  utilidadBruta: number
  gastosOperacion: number
  utilidadNeta: number
  ventas: LineaVentaResultados[]
  gastos: LineaGastoResultados[]
}

function costoDeVenta(v: VentaConDetalle): number {
  return v.venta_detalle.reduce((acc, d) => acc + d.cantidad * d.costo_unitario, 0)
}

export async function obtenerEstadoResultados(
  negocioId: string,
  inicio: Date,
  fin: Date,
): Promise<EstadoResultados> {
  const [ventasRaw, gastosRaw] = await Promise.all([
    ventasConfirmadasEnRango(negocioId, inicio, fin),
    gastosActivosEnRango(negocioId, inicio, fin),
  ])

  const ventas: LineaVentaResultados[] = ventasRaw.map((v) => {
    const costo = costoDeVenta(v)
    return {
      id: v.id,
      fecha: v.fecha,
      cliente: v.clientes?.nombre ?? v.nombre_ocasional ?? 'Público general',
      total: v.total,
      costo,
      margen: v.total - costo,
    }
  })

  const gastos: LineaGastoResultados[] = gastosRaw.map((g) => ({
    id: g.id,
    fecha_gasto: g.fecha_gasto,
    concepto: g.tipos_gasto?.nombre ?? g.descripcion ?? g.categoria,
    categoria: g.categoria,
    monto: g.monto,
  }))

  const ingresos = ventas.reduce((acc, v) => acc + v.total, 0)
  const costoVentas = ventas.reduce((acc, v) => acc + v.costo, 0)
  const utilidadBruta = ingresos - costoVentas
  const gastosOperacion = gastos.reduce((acc, g) => acc + g.monto, 0)
  const utilidadNeta = utilidadBruta - gastosOperacion

  return { ingresos, costoVentas, utilidadBruta, gastosOperacion, utilidadNeta, ventas, gastos }
}

export interface VentasPorMetodo {
  metodo_pago: MetodoPago
  cantidad: number
  total: number
}

export async function obtenerVentasPorFormaPago(
  negocioId: string,
  inicio: Date,
  fin: Date,
): Promise<VentasPorMetodo[]> {
  const ventas = await ventasConfirmadasEnRango(negocioId, inicio, fin)
  const mapa = new Map<MetodoPago, VentasPorMetodo>()
  for (const v of ventas) {
    const actual = mapa.get(v.metodo_pago) ?? { metodo_pago: v.metodo_pago, cantidad: 0, total: 0 }
    actual.cantidad += 1
    actual.total += v.total
    mapa.set(v.metodo_pago, actual)
  }
  return Array.from(mapa.values()).sort((a, b) => b.total - a.total)
}

export interface FilaInventario {
  item: string
  color: string | null
  talla: string | null
  existencia: number
  costo_promedio: number
}

export async function obtenerInventarioActual(negocioId: string): Promise<FilaInventario[]> {
  const { data, error } = await supabase
    .from('items')
    .select('nombre, variantes_item(color, talla, existencia, costo_promedio, activo)')
    .eq('negocio_id', negocioId)
    .eq('tipo', 'producto')
    .eq('activo', true)

  if (error) throw error

  const filas: FilaInventario[] = []
  for (const item of data as unknown as Array<{
    nombre: string
    variantes_item: Array<{ color: string | null; talla: string | null; existencia: number; costo_promedio: number; activo: boolean }>
  }>) {
    for (const v of item.variantes_item) {
      if (!v.activo) continue
      filas.push({
        item: item.nombre,
        color: v.color,
        talla: v.talla,
        existencia: v.existencia,
        costo_promedio: v.costo_promedio,
      })
    }
  }
  return filas
}

export interface ServicioMasVendido {
  nombre: string
  cantidad: number
}

export interface ClientaFrecuente {
  nombre: string
  visitas: number
}

export async function obtenerServiciosYClientasFrecuentes(
  negocioId: string,
  inicio: Date,
  fin: Date,
): Promise<{ servicios: ServicioMasVendido[]; productos: ServicioMasVendido[]; clientas: ClientaFrecuente[] }> {
  const ventas = await ventasConfirmadasEnRango(negocioId, inicio, fin)

  // Nunca se mezclan en un mismo ranking: el tipo del ítem decide a qué
  // mapa va cada línea, nunca el nombre de la categoría.
  const serviciosMapa = new Map<string, number>()
  const productosMapa = new Map<string, number>()
  for (const v of ventas) {
    for (const d of v.venta_detalle) {
      if (d.items?.tipo === 'servicio') {
        serviciosMapa.set(d.items.nombre, (serviciosMapa.get(d.items.nombre) ?? 0) + d.cantidad)
      } else if (d.items?.tipo === 'producto') {
        productosMapa.set(d.items.nombre, (productosMapa.get(d.items.nombre) ?? 0) + d.cantidad)
      }
    }
  }

  const clientasMapa = new Map<string, number>()
  for (const v of ventas) {
    const nombre = v.clientes?.nombre
    if (!nombre) continue
    clientasMapa.set(nombre, (clientasMapa.get(nombre) ?? 0) + 1)
  }

  return {
    servicios: Array.from(serviciosMapa.entries())
      .map(([nombre, cantidad]) => ({ nombre, cantidad }))
      .sort((a, b) => b.cantidad - a.cantidad),
    productos: Array.from(productosMapa.entries())
      .map(([nombre, cantidad]) => ({ nombre, cantidad }))
      .sort((a, b) => b.cantidad - a.cantidad),
    clientas: Array.from(clientasMapa.entries())
      .map(([nombre, visitas]) => ({ nombre, visitas }))
      .sort((a, b) => b.visitas - a.visitas),
  }
}

export interface GastoPorCategoria {
  categoria: string
  total: number
}

export async function obtenerGastosPorCategoria(
  negocioId: string,
  inicio: Date,
  fin: Date,
): Promise<GastoPorCategoria[]> {
  const gastos = await gastosActivosEnRango(negocioId, inicio, fin)
  const mapa = new Map<string, number>()
  for (const g of gastos) {
    mapa.set(g.categoria, (mapa.get(g.categoria) ?? 0) + g.monto)
  }
  return Array.from(mapa.entries())
    .map(([categoria, total]) => ({ categoria, total }))
    .sort((a, b) => b.total - a.total)
}

export interface TasaCitas {
  completadas: number
  canceladas: number
  pendientes: number
}

export async function obtenerTasaCitas(negocioId: string, inicio: Date, fin: Date): Promise<TasaCitas> {
  const { data, error } = await supabase
    .from('citas')
    .select('estado')
    .eq('negocio_id', negocioId)
    .gte('fecha_hora', inicio.toISOString())
    .lte('fecha_hora', fin.toISOString())

  if (error) throw error

  const filas = data as unknown as Array<{ estado: string }>
  return {
    completadas: filas.filter((f) => f.estado === 'completada').length,
    canceladas: filas.filter((f) => f.estado === 'cancelada').length,
    pendientes: filas.filter((f) => f.estado === 'pendiente' || f.estado === 'confirmada').length,
  }
}
