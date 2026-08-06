import { formatInTimeZone } from 'date-fns-tz'
import { supabase } from './supabaseClient'
import { ZONA_NEGOCIO, inicioDiaNegocio, finDiaNegocio } from './tiempoNegocio'
import type { Empleada, Item } from '../types'

export const FORMAS_UNA = ['Almendrada', 'Cuadrada', 'Coffin', 'Stiletto'] as const

export async function listarEmpleadas(negocioId: string, soloActivas = true): Promise<Empleada[]> {
  let query = supabase.from('empleadas').select('*').eq('negocio_id', negocioId).order('nombre')
  if (soloActivas) {
    query = query.eq('activo', true)
  }
  const { data, error } = await query
  if (error) throw error
  return data as Empleada[]
}

export async function tieneServiciosConAgenda(negocioId: string): Promise<boolean> {
  const { count, error } = await supabase
    .from('items')
    .select('id', { count: 'exact', head: true })
    .eq('negocio_id', negocioId)
    .eq('requiere_agenda', true)
    .eq('activo', true)

  if (error) throw error
  return (count ?? 0) > 0
}

export async function listarServiciosConAgenda(negocioId: string): Promise<Item[]> {
  const { data, error } = await supabase
    .from('items')
    .select('*')
    .eq('negocio_id', negocioId)
    .eq('requiere_agenda', true)
    .eq('activo', true)
    .order('nombre')

  if (error) throw error
  return data as unknown as Item[]
}

export interface CitaServicio {
  item_id: string
  precio: number
  duracion_minutos: number
  items: { nombre: string; costo: number | null } | null
}

export interface Cita {
  id: string
  negocio_id: string
  cliente_id: string | null
  fecha_hora: string
  forma_una: string | null
  estado: 'pendiente' | 'confirmada' | 'completada' | 'cancelada'
  venta_id: string | null
  empleada_id: string | null
  empleadas: { nombre: string } | null
  clientes: { nombre: string; telefono: string | null; contacto_red_social: string | null; notas: string | null } | null
  cita_servicios: CitaServicio[]
}

const SELECT_CITA =
  '*, clientes(nombre, telefono, contacto_red_social, notas), empleadas(nombre), cita_servicios(item_id, precio, duracion_minutos, items(nombre, costo))'

export async function listarCitasRango(
  negocioId: string,
  desdeISO: string,
  hastaISO: string,
): Promise<Cita[]> {
  const { data, error } = await supabase
    .from('citas')
    .select(SELECT_CITA)
    .eq('negocio_id', negocioId)
    .gte('fecha_hora', desdeISO)
    .lt('fecha_hora', hastaISO)
    .order('fecha_hora', { ascending: true })

  if (error) throw error
  return data as unknown as Cita[]
}

export async function obtenerCita(citaId: string): Promise<Cita> {
  const { data, error } = await supabase
    .from('citas')
    .select(SELECT_CITA)
    .eq('id', citaId)
    .single()

  if (error) throw error
  return data as unknown as Cita
}

export interface ServicioParaAgendar {
  item_id: string
  precio: number
  duracion_minutos: number
}

export async function agendarCita(
  negocioId: string,
  clienteId: string,
  fechaHoraISO: string,
  servicios: ServicioParaAgendar[],
  formaUna: string | null,
  empleadaId: string | null,
): Promise<string> {
  const { data, error } = await supabase.rpc('agendar_cita', {
    p_negocio_id: negocioId,
    p_cliente_id: clienteId,
    p_fecha_hora: fechaHoraISO,
    p_servicios: servicios,
    p_forma_una: formaUna,
    p_empleada_id: empleadaId,
  })
  if (error) throw error
  return data as string
}

/**
 * Chequeo de disponibilidad puramente informativo para la UI (mismo patrón
 * que la prevención de venta con existencia insuficiente): agendar_cita es
 * la única autoridad real sobre traslapes, esto solo evita que la clienta
 * llegue al paso de confirmar para enterarse recién ahí.
 */
export async function verificarDisponibilidad(
  negocioId: string,
  empleadaId: string,
  inicio: Date,
  duracionMinutos: number,
): Promise<boolean> {
  const fin = inicio.getTime() + duracionMinutos * 60000
  const diaYMD = formatInTimeZone(inicio, ZONA_NEGOCIO, 'yyyy-MM-dd')
  const desdeDia = inicioDiaNegocio(diaYMD)
  const hastaDia = finDiaNegocio(diaYMD)

  const { data, error } = await supabase
    .from('citas')
    .select('fecha_hora, cita_servicios(duracion_minutos)')
    .eq('negocio_id', negocioId)
    .eq('empleada_id', empleadaId)
    .in('estado', ['pendiente', 'confirmada'])
    .gte('fecha_hora', desdeDia.toISOString())
    .lte('fecha_hora', hastaDia.toISOString())

  if (error) throw error

  const conflicto = (
    data as Array<{ fecha_hora: string; cita_servicios: Array<{ duracion_minutos: number }> }>
  ).some((c) => {
    const cIni = new Date(c.fecha_hora).getTime()
    const cDur = c.cita_servicios.reduce((acc, s) => acc + s.duracion_minutos, 0)
    const cFin = cIni + cDur * 60000
    return inicio.getTime() < cFin && cIni < fin
  })

  return !conflicto
}

export async function cancelarCita(citaId: string): Promise<void> {
  const { error } = await supabase.from('citas').update({ estado: 'cancelada' }).eq('id', citaId)
  if (error) throw error
}

export async function completarCita(citaId: string, ventaId: string): Promise<void> {
  const { error } = await supabase
    .from('citas')
    .update({ estado: 'completada', venta_id: ventaId })
    .eq('id', citaId)
  if (error) throw error
}
