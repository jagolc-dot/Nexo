import { supabase } from './supabaseClient'
import type { Cliente, EstadoVenta, MetodoPago } from '../types'

export async function listarClientes(negocioId: string, incluirInactivos = false): Promise<Cliente[]> {
  let query = supabase.from('clientes').select('*').eq('negocio_id', negocioId).order('nombre')
  if (!incluirInactivos) {
    query = query.eq('activo', true)
  }
  const { data, error } = await query
  if (error) throw error
  return data as Cliente[]
}

export async function obtenerCliente(clienteId: string): Promise<Cliente> {
  const { data, error } = await supabase.from('clientes').select('*').eq('id', clienteId).single()
  if (error) throw error
  return data as Cliente
}

export interface DatosCliente {
  negocio_id: string
  nombre: string
  telefono: string | null
  contacto_red_social: string | null
  notas: string | null
}

export async function crearCliente(datos: DatosCliente): Promise<Cliente> {
  const { data, error } = await supabase.from('clientes').insert(datos).select().single()
  if (error) throw error
  return data as Cliente
}

export async function actualizarCliente(
  clienteId: string,
  cambios: Partial<Pick<Cliente, 'nombre' | 'telefono' | 'contacto_red_social'>> & { notas?: string | null },
): Promise<void> {
  const { error } = await supabase.from('clientes').update(cambios).eq('id', clienteId)
  if (error) throw error
}

export async function cambiarActivoCliente(clienteId: string, activo: boolean): Promise<void> {
  const { error } = await supabase.from('clientes').update({ activo }).eq('id', clienteId)
  if (error) throw error
}

export interface ResumenCliente {
  gasto: number
  visitas: number
}

/**
 * Gasto acumulado y número de visitas por clienta, para la lista (evita
 * N+1). Visita = cita completada, no venta — una compra de mostrador no
 * cuenta como visita aunque sí suma al gasto acumulado.
 */
export async function obtenerResumenVentasPorCliente(negocioId: string): Promise<Record<string, ResumenCliente>> {
  const [ventasRes, citasRes] = await Promise.all([
    supabase.from('ventas').select('cliente_id, total').eq('negocio_id', negocioId).eq('estado', 'confirmada').not('cliente_id', 'is', null),
    supabase.from('citas').select('cliente_id').eq('negocio_id', negocioId).eq('estado', 'completada').not('cliente_id', 'is', null),
  ])
  if (ventasRes.error) throw ventasRes.error
  if (citasRes.error) throw citasRes.error

  const resumen: Record<string, ResumenCliente> = {}
  for (const v of ventasRes.data as Array<{ cliente_id: string; total: number }>) {
    const actual = resumen[v.cliente_id] ?? { gasto: 0, visitas: 0 }
    actual.gasto += v.total
    resumen[v.cliente_id] = actual
  }
  for (const c of citasRes.data as Array<{ cliente_id: string }>) {
    const actual = resumen[c.cliente_id] ?? { gasto: 0, visitas: 0 }
    actual.visitas += 1
    resumen[c.cliente_id] = actual
  }
  return resumen
}

export interface VisitaCliente {
  id: string
  fecha: string
  total: number
  estado: EstadoVenta
  metodo_pago: MetodoPago
  items: string
}

export async function obtenerHistorialCliente(clienteId: string): Promise<VisitaCliente[]> {
  const { data, error } = await supabase
    .from('ventas')
    .select('id, fecha, total, estado, metodo_pago, venta_detalle(cantidad, items(nombre))')
    .eq('cliente_id', clienteId)
    .order('fecha', { ascending: false })

  if (error) throw error

  return (data as unknown as Array<{
    id: string
    fecha: string
    total: number
    estado: EstadoVenta
    metodo_pago: MetodoPago
    venta_detalle: Array<{ cantidad: number; items: { nombre: string } | null }>
  }>).map((v) => ({
    id: v.id,
    fecha: v.fecha,
    total: v.total,
    estado: v.estado,
    metodo_pago: v.metodo_pago,
    items: v.venta_detalle
      .map((d) => `${d.items?.nombre ?? '?'} ×${d.cantidad}`)
      .join(', '),
  }))
}

export interface VisitaClienta {
  cita_id: string
  fecha_hora: string
  servicios: string
  forma_una: string | null
  monto: number
}

export interface ProductoAdquirido {
  fecha: string
  nombre: string
  cantidad: number
  monto: number
}

export interface HistorialDetalladoCliente {
  visitas: VisitaClienta[]
  comprasCount: number
  productos: ProductoAdquirido[]
  gastoTotal: number
}

/**
 * Separa visitas (citas completadas) de compras de mostrador. Una venta
 * originada en una cita es una visita, no una visita más una compra: sus
 * productos aparecen en `productos`, pero no suman a `comprasCount`. El
 * gasto total sigue siendo la suma de todas las ventas confirmadas.
 */
export async function obtenerHistorialDetalladoCliente(clienteId: string): Promise<HistorialDetalladoCliente> {
  const [citasRes, ventasRes] = await Promise.all([
    supabase
      .from('citas')
      .select('id, fecha_hora, forma_una, venta_id, cita_servicios(items(nombre)), ventas(venta_detalle(cantidad, precio_unitario, items(nombre, tipo)))')
      .eq('cliente_id', clienteId)
      .eq('estado', 'completada')
      .order('fecha_hora', { ascending: false }),
    supabase
      .from('ventas')
      .select('id, fecha, total, venta_detalle(cantidad, precio_unitario, items(nombre, tipo))')
      .eq('cliente_id', clienteId)
      .eq('estado', 'confirmada')
      .order('fecha', { ascending: false }),
  ])

  if (citasRes.error) throw citasRes.error
  if (ventasRes.error) throw ventasRes.error

  type LineaDetalle = { cantidad: number; precio_unitario: number; items: { nombre: string; tipo: string } | null }
  const citasData = citasRes.data as unknown as Array<{
    id: string
    fecha_hora: string
    forma_una: string | null
    venta_id: string | null
    cita_servicios: Array<{ items: { nombre: string } | null }>
    ventas: { venta_detalle: LineaDetalle[] } | null
  }>
  const ventasData = ventasRes.data as unknown as Array<{
    id: string
    fecha: string
    total: number
    venta_detalle: LineaDetalle[]
  }>

  const visitas: VisitaClienta[] = citasData.map((c) => {
    const lineasServicio = c.ventas?.venta_detalle.filter((d) => d.items?.tipo === 'servicio') ?? []
    return {
      cita_id: c.id,
      fecha_hora: c.fecha_hora,
      servicios: c.cita_servicios.map((s) => s.items?.nombre).filter(Boolean).join(' + '),
      forma_una: c.forma_una,
      monto: lineasServicio.reduce((acc, d) => acc + d.cantidad * d.precio_unitario, 0),
    }
  })

  const ventaIdsDeVisita = new Set(citasData.map((c) => c.venta_id).filter((id): id is string => id !== null))
  const comprasCount = ventasData.filter((v) => !ventaIdsDeVisita.has(v.id)).length

  const productos: ProductoAdquirido[] = []
  for (const v of ventasData) {
    for (const d of v.venta_detalle) {
      if (d.items?.tipo !== 'producto') continue
      productos.push({ fecha: v.fecha, nombre: d.items.nombre, cantidad: d.cantidad, monto: d.cantidad * d.precio_unitario })
    }
  }

  const gastoTotal = ventasData.reduce((acc, v) => acc + v.total, 0)

  return { visitas, comprasCount, productos, gastoTotal }
}
