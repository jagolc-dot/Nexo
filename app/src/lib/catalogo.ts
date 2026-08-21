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
  unidad: Unidad | null
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
  codigo: string
}

export async function crearVariante(datos: DatosNuevaVariante): Promise<VarianteItem> {
  const { data, error } = await supabase.from('variantes_item').insert(datos).select().single()
  if (error) throw error
  return data as VarianteItem
}

export async function actualizarVariante(
  varianteId: string,
  cambios: Partial<Pick<VarianteItem, 'color' | 'talla' | 'codigo'>>,
): Promise<void> {
  const { error } = await supabase.from('variantes_item').update(cambios).eq('id', varianteId)
  if (error) throw error
}

export async function cambiarActivoVariante(varianteId: string, activo: boolean): Promise<void> {
  const { error } = await supabase.from('variantes_item').update({ activo }).eq('id', varianteId)
  if (error) throw error
}

// ============================================================
// Código: generación asistida (nunca se asigna sin confirmación) y
// verificación de unicidad con mensaje claro.
// ============================================================

const PALABRAS_IGNORADAS = new Set(['de', 'del', 'la', 'el', 'los', 'las', 'y', 'con', 'para', 'tipo', 'un', 'una', 'al'])

function normalizar(texto: string): string {
  return texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase()
}

function construirPrefijo(nombre: string, atributos: Array<string | null>): string {
  const palabras = normalizar(nombre).split(/\s+/).filter(Boolean)
  const significativas = palabras.filter((p) => !PALABRAS_IGNORADAS.has(p.toLowerCase()))
  const base = significativas.length > 0 ? significativas : palabras
  let letras = base.map((p) => p.charAt(0)).join('')
  for (const atributo of atributos) {
    if (letras.length >= 4 || !atributo) continue
    letras += normalizar(atributo).charAt(0)
  }
  return letras.slice(0, 4) || 'COD'
}

/** Propone un código (iniciales + consecutivo de 3 dígitos). El
 * usuario siempre revisa y confirma o edita antes de guardar — nunca
 * se asigna solo. */
export async function generarCodigoSugerido(
  negocioId: string,
  nombre: string,
  atributos: Array<string | null> = [],
): Promise<string> {
  const prefijo = construirPrefijo(nombre, atributos)
  const patron = `${prefijo}.%`

  const [{ data: itemsData, error: e1 }, { data: variantesData, error: e2 }] = await Promise.all([
    supabase.from('items').select('codigo').eq('negocio_id', negocioId).ilike('codigo', patron),
    supabase.from('variantes_item').select('codigo, items!inner(negocio_id)').eq('items.negocio_id', negocioId).ilike('codigo', patron),
  ])
  if (e1) throw e1
  if (e2) throw e2

  const existentes = [
    ...(itemsData ?? []).map((i) => i.codigo as string),
    ...((variantesData ?? []) as unknown as Array<{ codigo: string }>).map((v) => v.codigo),
  ]

  let maxConsecutivo = 0
  for (const codigo of existentes) {
    const match = codigo?.match(/\.(\d+)$/)
    if (match) maxConsecutivo = Math.max(maxConsecutivo, Number(match[1]))
  }

  return `${prefijo}.${String(maxConsecutivo + 1).padStart(3, '0')}`
}

export interface DisponibilidadCodigo {
  disponible: boolean
  perteneceA?: string
}

/** Verifica unicidad antes de guardar y, si ya está en uso, indica a
 * qué producto pertenece. Items: único por negocio. Variantes: único
 * global (así vive el constraint en la base de datos). */
export async function verificarCodigoDisponible(
  codigo: string,
  destino: { tipo: 'item'; negocioId: string; excluirId?: string } | { tipo: 'variante'; excluirId?: string },
): Promise<DisponibilidadCodigo> {
  if (destino.tipo === 'item') {
    let query = supabase.from('items').select('id, nombre').eq('negocio_id', destino.negocioId).eq('codigo', codigo)
    if (destino.excluirId) query = query.neq('id', destino.excluirId)
    const { data, error } = await query
    if (error) throw error
    return data.length > 0 ? { disponible: false, perteneceA: data[0].nombre } : { disponible: true }
  }

  let query = supabase.from('variantes_item').select('id, color, talla, items(nombre)').eq('codigo', codigo)
  if (destino.excluirId) query = query.neq('id', destino.excluirId)
  const { data, error } = await query
  if (error) throw error
  if (data.length === 0) return { disponible: true }
  const v = data[0] as unknown as { color: string | null; talla: string | null; items: { nombre: string } }
  return { disponible: false, perteneceA: `${v.items.nombre} (${[v.color, v.talla].filter(Boolean).join(' / ')})` }
}

/** Solo elimina si la variante no está referenciada en ventas ni en
 * inventario (compras/ajustes) — validado en base de datos, no aquí. */
export async function eliminarVariante(varianteId: string): Promise<void> {
  const { error } = await supabase.rpc('eliminar_variante', { p_variante_id: varianteId })
  if (error) throw error
}
