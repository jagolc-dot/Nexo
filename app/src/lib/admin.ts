import { supabase } from './supabaseClient'
import type { Negocio } from '../types'

export const FORMATO_USUARIO = /^[a-z0-9_]{3,20}$/

const PALABRAS_PASSWORD = ['glam', 'salon', 'unas', 'chio', 'nexo', 'studio', 'brillo', 'esmalte']

export function generarPasswordSugerida(): string {
  const palabra = PALABRAS_PASSWORD[Math.floor(Math.random() * PALABRAS_PASSWORD.length)]
  const numero = Math.floor(10 + Math.random() * 90)
  return `${palabra}-${numero}`
}

export async function listarNegociosDisponibles(): Promise<Negocio[]> {
  const { data, error } = await supabase.from('negocios').select('*').order('nombre')
  if (error) throw error
  return data as Negocio[]
}

async function invocarAdmin<T>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke('crear-usuario', { body })
  if (error) throw error
  if (data?.error) throw new Error(data.error)
  return data as T
}

export interface AccesoNuevoUsuario {
  negocio_id: string
  rol: string
}

export interface DatosNuevoUsuario {
  usuario: string
  nombre_completo: string | null
  password: string
  accesos: AccesoNuevoUsuario[]
}

export async function crearUsuario(datos: DatosNuevoUsuario): Promise<void> {
  await invocarAdmin({ accion: 'crear', ...datos })
}

export interface AccesoUsuario {
  negocio_id: string
  negocio_nombre: string
  rol: string
}

export interface UsuarioAdmin {
  usuario_id: string
  usuario: string
  nombre_completo: string | null
  accesos: AccesoUsuario[]
}

export async function listarUsuarios(): Promise<UsuarioAdmin[]> {
  const { usuarios } = await invocarAdmin<{ usuarios: UsuarioAdmin[] }>({ accion: 'listar' })
  return usuarios
}

export async function resetearPassword(usuarioId: string, passwordNueva: string): Promise<void> {
  await invocarAdmin({ accion: 'resetear_password', usuario_id: usuarioId, password_nueva: passwordNueva })
}

export async function revocarAcceso(usuarioId: string, negocioId: string): Promise<void> {
  await invocarAdmin({ accion: 'revocar_acceso', usuario_id: usuarioId, negocio_id: negocioId })
}
