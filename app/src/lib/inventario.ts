import { supabase } from './supabaseClient'
import type { Almacen, Compra, CompraPartida, MovimientoInventario, TipoAjuste } from '../types'

export async function obtenerAlmacen(negocioId: string): Promise<Almacen> {
  const { data, error } = await supabase.from('almacenes').select('*').eq('negocio_id', negocioId).eq('activo', true).single()
  if (error) throw error
  return data as Almacen
}

export interface VarianteInventario {
  id: string
  color: string | null
  talla: string | null
  codigo: string | null
  existencia: number
  costo_promedio: number
}

export interface ProductoInventario {
  id: string
  codigo: string | null
  nombre: string
  categoria: string | null
  unidad: string | null
  tiene_variantes: boolean
  stock: number
  costo_promedio: number
  variantes: VarianteInventario[]
}

export async function listarProductosInventario(negocioId: string): Promise<ProductoInventario[]> {
  const { data, error } = await supabase
    .from('items')
    .select('id, codigo, nombre, unidad, tiene_variantes, stock, costo_promedio, categorias_item(nombre), variantes_item(id, color, talla, codigo, existencia, costo_promedio, activo)')
    .eq('negocio_id', negocioId)
    .eq('tipo', 'producto')
    .eq('activo', true)
    .order('nombre')
  if (error) throw error

  type Fila = {
    id: string; codigo: string | null; nombre: string; unidad: string | null; tiene_variantes: boolean
    stock: number; costo_promedio: number
    categorias_item: { nombre: string } | null
    variantes_item: Array<VarianteInventario & { activo: boolean }>
  }

  return (data as unknown as Fila[]).map((i) => ({
    id: i.id,
    codigo: i.codigo,
    nombre: i.nombre,
    categoria: i.categorias_item?.nombre ?? null,
    unidad: i.unidad,
    tiene_variantes: i.tiene_variantes,
    stock: i.stock,
    costo_promedio: i.costo_promedio,
    variantes: i.variantes_item.filter((v) => v.activo),
  }))
}

export async function listarKardex(destino: { itemId: string } | { varianteId: string }): Promise<MovimientoInventario[]> {
  let query = supabase.from('movimientos_inventario').select('*').order('fecha', { ascending: false }).order('creado_en', { ascending: false })
  query = 'varianteId' in destino ? query.eq('variante_id', destino.varianteId) : query.eq('item_id', destino.itemId)
  const { data, error } = await query
  if (error) throw error
  return data as MovimientoInventario[]
}

export async function listarCompras(
  negocioId: string,
  filtros: { desde?: string; hasta?: string } = {},
): Promise<Compra[]> {
  let q = supabase.from('compras').select('*').eq('negocio_id', negocioId).order('fecha', { ascending: false })
  if (filtros.desde) q = q.gte('fecha', filtros.desde)
  if (filtros.hasta) q = q.lte('fecha', filtros.hasta)
  const { data, error } = await q
  if (error) throw error
  return data as Compra[]
}

export interface PartidaCompraConNombre extends CompraPartida {
  nombre: string
  codigo: string | null
  categoria: string | null
  unidad: string | null
}

export async function obtenerCompraConPartidas(compraId: string): Promise<{ compra: Compra; partidas: PartidaCompraConNombre[] }> {
  const [{ data: compra, error: e1 }, { data: partidas, error: e2 }] = await Promise.all([
    supabase.from('compras').select('*').eq('id', compraId).single(),
    supabase
      .from('compra_partidas')
      .select(
        '*, items(nombre, codigo, unidad, categorias_item(nombre)), variantes_item(codigo, color, talla, items(nombre, unidad, categorias_item(nombre)))',
      )
      .eq('compra_id', compraId),
  ])
  if (e1) throw e1
  if (e2) throw e2

  type ItemFila = { nombre: string; codigo?: string | null; unidad: string | null; categorias_item: { nombre: string } | null }
  type Fila = CompraPartida & {
    items: ItemFila | null
    variantes_item: { codigo: string | null; color: string | null; talla: string | null; items: ItemFila } | null
  }

  return {
    compra: compra as Compra,
    partidas: (partidas as unknown as Fila[]).map((p) => {
      const it = p.items ?? p.variantes_item?.items ?? null
      return {
        ...p,
        nombre: p.items
          ? p.items.nombre
          : `${p.variantes_item?.items.nombre} (${[p.variantes_item?.color, p.variantes_item?.talla].filter(Boolean).join(' / ')})`,
        codigo: p.items ? p.items.codigo ?? null : p.variantes_item?.codigo ?? null,
        categoria: it?.categorias_item?.nombre ?? null,
        unidad: it?.unidad ?? null,
      }
    }),
  }
}

export async function actualizarCompra(
  compraId: string,
  cambios: Partial<Pick<Compra, 'proveedor' | 'folio' | 'fecha' | 'notas'>>,
): Promise<void> {
  const { error } = await supabase.from('compras').update(cambios).eq('id', compraId)
  if (error) throw error
}

export interface PartidaCompra {
  item_id: string | null
  variante_id: string | null
  cantidad: number
  costo_total_partida: number
}

export async function confirmarCompra(
  negocioId: string, almacenId: string, proveedor: string | null, folio: string | null,
  fecha: string, notas: string | null, costoEnvio: number, partidas: PartidaCompra[],
): Promise<string> {
  const { data, error } = await supabase.rpc('confirmar_compra', {
    p_negocio_id: negocioId, p_almacen_id: almacenId, p_proveedor: proveedor, p_folio: folio,
    p_fecha: fecha, p_notas: notas, p_costo_envio: costoEnvio, p_partidas: partidas,
  })
  if (error) throw error
  return data as string
}

export async function cancelarCompra(compraId: string): Promise<void> {
  const { error } = await supabase.rpc('cancelar_compra', { p_compra_id: compraId })
  if (error) throw error
}

export async function registrarAjuste(
  negocioId: string, almacenId: string, destino: { itemId: string } | { varianteId: string },
  tipo: TipoAjuste, cantidadConSigno: number, motivo: string, fecha: string,
): Promise<string> {
  const { data, error } = await supabase.rpc('registrar_ajuste_inventario', {
    p_negocio_id: negocioId, p_almacen_id: almacenId,
    p_item_id: 'itemId' in destino ? destino.itemId : null,
    p_variante_id: 'varianteId' in destino ? destino.varianteId : null,
    p_tipo: tipo, p_cantidad: cantidadConSigno, p_motivo: motivo, p_fecha: fecha,
  })
  if (error) throw error
  return data as string
}

export interface PrevisualizacionRecosteo {
  existencia_actual: number
  costo_actual: number
  existencia_recalculada: number
  costo_recalculado: number
}

export async function previsualizarRecosteo(destino: { itemId: string } | { varianteId: string }): Promise<PrevisualizacionRecosteo> {
  const { data, error } = await supabase.rpc('previsualizar_recosteo', {
    p_item_id: 'itemId' in destino ? destino.itemId : null,
    p_variante_id: 'varianteId' in destino ? destino.varianteId : null,
  })
  if (error) throw error
  return (data as PrevisualizacionRecosteo[])[0]
}

export async function aplicarRecosteo(
  negocioId: string, almacenId: string, destino: { itemId: string } | { varianteId: string },
): Promise<string | null> {
  const { data, error } = await supabase.rpc('aplicar_recosteo', {
    p_negocio_id: negocioId, p_almacen_id: almacenId,
    p_item_id: 'itemId' in destino ? destino.itemId : null,
    p_variante_id: 'varianteId' in destino ? destino.varianteId : null,
  })
  if (error) throw error
  return data as string | null
}
