import { supabase } from './supabaseClient'
import type { Categoria, Gasto, TipoGasto } from '../types'

export const CATEGORIAS: Categoria[] = [
  'Insumos',
  'Renta',
  'Servicios',
  'Nómina',
  'Publicidad',
  'Otros',
]

export async function listarTiposGasto(negocioId: string, incluirInactivos = false): Promise<TipoGasto[]> {
  let query = supabase.from('tipos_gasto').select('*').eq('negocio_id', negocioId).order('nombre')
  if (!incluirInactivos) {
    query = query.eq('activo', true)
  }
  const { data, error } = await query
  if (error) throw error
  return data as TipoGasto[]
}

export async function crearTipoGasto(
  negocioId: string,
  nombre: string,
  categoria: Categoria,
): Promise<TipoGasto> {
  const { data, error } = await supabase
    .from('tipos_gasto')
    .insert({ negocio_id: negocioId, nombre, categoria })
    .select()
    .single()
  if (error) throw error
  return data as TipoGasto
}

export async function cambiarActivoTipoGasto(id: string, activo: boolean): Promise<void> {
  const { error } = await supabase.from('tipos_gasto').update({ activo }).eq('id', id)
  if (error) throw error
}

export async function listarGastos(
  negocioId: string,
  opciones?: { inicio?: Date; fin?: Date; categoria?: Categoria },
): Promise<Gasto[]> {
  let query = supabase.from('gastos').select('*, tipos_gasto(nombre)').eq('negocio_id', negocioId)
  if (opciones?.inicio) query = query.gte('fecha_gasto', opciones.inicio.toISOString().slice(0, 10))
  if (opciones?.fin) query = query.lte('fecha_gasto', opciones.fin.toISOString().slice(0, 10))
  if (opciones?.categoria) query = query.eq('categoria', opciones.categoria)
  const { data, error } = await query.order('fecha_gasto', { ascending: false })
  if (error) throw error
  return data as unknown as Gasto[]
}

export interface DatosNuevoGasto {
  negocio_id: string
  tipo_gasto_id: string | null
  categoria: Categoria
  descripcion: string | null
  monto: number
  fecha_gasto: string
}

export async function crearGasto(datos: DatosNuevoGasto): Promise<void> {
  const { error } = await supabase.from('gastos').insert(datos)
  if (error) throw error
}

export async function cancelarGasto(id: string): Promise<void> {
  const { error } = await supabase.from('gastos').update({ estado: 'cancelado' }).eq('id', id)
  if (error) throw error
}
