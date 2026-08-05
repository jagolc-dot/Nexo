import { supabase } from './supabaseClient'

export async function actualizarTemaNegocio(negocioId: string, tema: string): Promise<void> {
  const { error } = await supabase.from('negocios').update({ tema }).eq('id', negocioId)
  if (error) throw error
}

export async function subirLogoNegocio(negocioId: string, archivo: File): Promise<string> {
  const extension = archivo.name.split('.').pop() ?? 'jpg'
  const ruta = `${negocioId}/logo-${Date.now()}.${extension}`

  const { error: errorSubida } = await supabase.storage.from('logos').upload(ruta, archivo, { upsert: true })
  if (errorSubida) throw errorSubida

  const {
    data: { publicUrl },
  } = supabase.storage.from('logos').getPublicUrl(ruta)

  const { error: errorUpdate } = await supabase.from('negocios').update({ logo_url: publicUrl }).eq('id', negocioId)
  if (errorUpdate) throw errorUpdate

  return publicUrl
}
