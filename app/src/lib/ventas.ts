import { supabase } from './supabaseClient'
import type { Cliente, Item, LineaVenta, MetodoPago, Venta, VarianteItem } from '../types'

export async function listarClientes(negocioId: string): Promise<Cliente[]> {
  const { data, error } = await supabase
    .from('clientes')
    .select('*')
    .eq('negocio_id', negocioId)
    .eq('activo', true)
    .order('nombre')

  if (error) throw error
  return data as Cliente[]
}

export async function crearClienteRapido(
  negocioId: string,
  nombre: string,
  telefono: string | null,
  contactoRedSocial: string | null,
): Promise<Cliente> {
  const { data, error } = await supabase
    .from('clientes')
    .insert({
      negocio_id: negocioId,
      nombre,
      telefono,
      contacto_red_social: contactoRedSocial,
    })
    .select()
    .single()

  if (error) throw error
  return data as Cliente
}

export interface ItemConVariantes extends Item {
  variantes_item: VarianteItem[]
}

export async function listarItemsVendibles(negocioId: string): Promise<ItemConVariantes[]> {
  const { data, error } = await supabase
    .from('items')
    .select('*, variantes_item(*)')
    .eq('negocio_id', negocioId)
    .eq('activo', true)
    .order('nombre')

  if (error) throw error
  return data as unknown as ItemConVariantes[]
}

export interface DatosNuevaVenta {
  negocio_id: string
  cliente_id: string | null
  nombre_ocasional: string | null
  metodo_pago: MetodoPago
  lineas: LineaVenta[]
}

export async function crearVenta(datos: DatosNuevaVenta): Promise<string> {
  const { data, error } = await supabase.rpc('crear_venta', {
    p_negocio_id: datos.negocio_id,
    p_cliente_id: datos.cliente_id,
    p_nombre_ocasional: datos.nombre_ocasional,
    p_metodo_pago: datos.metodo_pago,
    p_lineas: datos.lineas.map((l) => ({
      item_id: l.item_id,
      variante_id: l.variante_id ?? '',
      cantidad: l.cantidad,
      precio_unitario: l.precio_unitario,
      costo_unitario: l.costo_unitario,
    })),
  })

  if (error) throw error
  return data as string
}

export interface VentaConConceptos extends Venta {
  conceptos: string
}

export async function listarVentas(negocioId: string, inicio?: Date, fin?: Date): Promise<VentaConConceptos[]> {
  let query = supabase
    .from('ventas')
    .select('*, clientes(nombre), venta_detalle(cantidad, items(nombre))')
    .eq('negocio_id', negocioId)
  if (inicio) query = query.gte('fecha', inicio.toISOString())
  if (fin) query = query.lte('fecha', fin.toISOString())
  const { data, error } = await query.order('fecha', { ascending: false })

  if (error) throw error

  return (
    data as unknown as Array<Venta & { venta_detalle: Array<{ cantidad: number; items: { nombre: string } | null }> }>
  ).map((v) => ({
    ...v,
    conceptos: v.venta_detalle.map((d) => (d.cantidad > 1 ? `${d.items?.nombre} × ${d.cantidad}` : d.items?.nombre)).join(', '),
  }))
}

export interface LineaVentaDetalle {
  cantidad: number
  precio_unitario: number
  item_id: string
  items: { nombre: string; tipo: string } | null
}

export interface VentaConLineas extends Venta {
  venta_detalle: LineaVentaDetalle[]
}

export async function obtenerVenta(id: string): Promise<VentaConLineas> {
  const { data, error } = await supabase
    .from('ventas')
    .select('*, clientes(nombre), venta_detalle(cantidad, precio_unitario, item_id, items(nombre, tipo))')
    .eq('id', id)
    .single()

  if (error) throw error
  return data as unknown as VentaConLineas
}

export async function obtenerEmpleadaDeVenta(ventaId: string): Promise<string | null> {
  const { data, error } = await supabase.from('citas').select('empleadas(nombre)').eq('venta_id', ventaId).limit(1)
  if (error) throw error
  const filas = data as unknown as Array<{ empleadas: { nombre: string } | null }>
  return filas[0]?.empleadas?.nombre ?? null
}

export async function cancelarVenta(ventaId: string): Promise<void> {
  const { error } = await supabase.from('ventas').update({ estado: 'cancelada' }).eq('id', ventaId)
  if (error) throw error
}
