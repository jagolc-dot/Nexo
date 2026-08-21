import { supabase } from './supabaseClient'
import type { CategoriaItem, Item, TipoItem, Unidad, VarianteItem } from '../types'

export async function listarItems(negocioId: string): Promise<Item[]> {
  const { data, error } = await supabase
    .from('items')
    .select('*, categorias_item(nombre)')
    .eq('negocio_id', negocioId)
    .order('nombre')

  if (error) throw error
  return data as unknown as Item[]
}

export async function obtenerItem(itemId: string): Promise<Item> {
  const { data, error } = await supabase
    .from('items')
    .select('*, categorias_item(nombre)')
    .eq('id', itemId)
    .single()
  if (error) throw error
  return data as unknown as Item
}

export interface DatosNuevoItem {
  negocio_id: string
  nombre: string
  tipo: TipoItem
  categoria_id: string | null
  precio_base: number | null
  duracion_minutos: number | null
  costo: number | null
  codigo: string | null
  unidad: Unidad
}

export async function crearItem(datos: DatosNuevoItem, manejaVariantes = false): Promise<Item> {
  const { data, error } = await supabase
    .from('items')
    .insert({
      ...datos,
      requiere_agenda: datos.tipo === 'servicio',
      // Un producto "simple" (sin color/talla) ya no necesita una variante
      // implícita: su costo y existencia viven directo en items.costo_promedio
      // / items.stock. Solo los productos que de verdad manejan variantes
      // (Don camisa) usan variantes_item.
      tiene_variantes: datos.tipo === 'producto' && manejaVariantes,
    })
    .select()
    .single()

  if (error) throw error
  return data as Item
}

export async function actualizarItem(
  itemId: string,
  cambios: Partial<Pick<Item, 'nombre' | 'categoria_id' | 'precio_base' | 'duracion_minutos' | 'costo' | 'codigo' | 'unidad'>>,
): Promise<void> {
  const { error } = await supabase.from('items').update(cambios).eq('id', itemId)
  if (error) throw error
}

export async function listarCategorias(
  negocioId: string,
  incluirInactivas = false,
  tipo?: TipoItem,
): Promise<CategoriaItem[]> {
  let query = supabase
    .from('categorias_item')
    .select('*')
    .eq('negocio_id', negocioId)
    .order('orden')
  if (!incluirInactivas) {
    query = query.eq('activo', true)
  }
  if (tipo) {
    query = query.eq('tipo', tipo)
  }
  const { data, error } = await query
  if (error) throw error
  return data as CategoriaItem[]
}

export async function crearCategoria(negocioId: string, nombre: string, tipo: TipoItem): Promise<CategoriaItem> {
  const { data, error } = await supabase
    .from('categorias_item')
    .insert({ negocio_id: negocioId, nombre, tipo })
    .select()
    .single()
  if (error) throw error
  return data as CategoriaItem
}

export async function cambiarActivoCategoria(id: string, activo: boolean): Promise<void> {
  const { error } = await supabase.from('categorias_item').update({ activo }).eq('id', id)
  if (error) throw error
}

export async function actualizarCategoria(
  id: string,
  cambios: Partial<Pick<CategoriaItem, 'nombre' | 'orden'>>,
): Promise<void> {
  const { error } = await supabase.from('categorias_item').update(cambios).eq('id', id)
  if (error) throw error
}

export async function cambiarActivoItem(itemId: string, activo: boolean): Promise<void> {
  const { error } = await supabase.from('items').update({ activo }).eq('id', itemId)
  if (error) throw error
}

/** Solo elimina si el ítem no está referenciado en ventas, citas ni
 * inventario (compras/ajustes) — validado en base de datos, no aquí. */
export async function eliminarItem(itemId: string): Promise<void> {
  const { error } = await supabase.rpc('eliminar_item', { p_item_id: itemId })
  if (error) throw error
}

export async function listarVariantes(itemId: string): Promise<VarianteItem[]> {
  const { data, error } = await supabase
    .from('variantes_item')
    .select('*')
    .eq('item_id', itemId)
    .order('color')

  if (error) throw error
  return data as VarianteItem[]
}

export interface DatosNuevaVariante {
  item_id: string
  color: string | null
  talla: string | null
}

export async function crearVariante(datos: DatosNuevaVariante): Promise<VarianteItem> {
  const { data, error } = await supabase.from('variantes_item').insert(datos).select().single()
  if (error) throw error
  return data as VarianteItem
}

export async function cambiarActivoVariante(varianteId: string, activo: boolean): Promise<void> {
  const { error } = await supabase.from('variantes_item').update({ activo }).eq('id', varianteId)
  if (error) throw error
}

/** Solo elimina si la variante no está referenciada en ventas ni en
 * inventario (compras/ajustes) — validado en base de datos, no aquí. */
export async function eliminarVariante(varianteId: string): Promise<void> {
  const { error } = await supabase.rpc('eliminar_variante', { p_variante_id: varianteId })
  if (error) throw error
}
