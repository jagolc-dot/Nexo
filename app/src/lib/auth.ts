import { supabase } from './supabaseClient'

const DOMINIO_SINTETICO = 'nexo.local'

/**
 * Supabase Auth siempre necesita un correo internamente. En vez de
 * consultar la base de datos para "buscar el correo de este usuario"
 * (lo que expondría un oráculo de existencia de usuarios a un cliente
 * sin sesión), el correo se construye de forma determinística y
 * puramente local — sin red, sin consulta.
 */
export function emailSintetico(usuario: string): string {
  return `${usuario.trim().toLowerCase()}@${DOMINIO_SINTETICO}`
}

export async function obtenerNombrePropio(usuarioId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('perfiles')
    .select('nombre_completo')
    .eq('usuario_id', usuarioId)
    .single()
  if (error) return null
  return data?.nombre_completo ?? null
}
