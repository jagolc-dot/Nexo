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

/** Gasto acumulado y número de visitas por clienta, para la lista (evita N+1). */
export async function obtenerResumenVentasPorCliente(negocioId: string): Promise<Record<string, ResumenCliente>> {
  const { data, error } = await supabase
    .from('ventas')
    .select('cliente_id, total')
    .eq('negocio_id', negocioId)
    .eq('estado', 'confirmada')
    .not('cliente_id', 'is', null)

  if (error) throw error

  const resumen: Record<string, ResumenCliente> = {}
  for (const v of data as Array<{ cliente_id: string; total: number }>) {
    const actual = resumen[v.cliente_id] ?? { gasto: 0, visitas: 0 }
    actual.gasto += v.total
    actual.visitas += 1
    resumen[v.cliente_id] = actual
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
