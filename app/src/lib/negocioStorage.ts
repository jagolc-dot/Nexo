/** Compartido entre AuthContext y NegocioContext sin crear una dependencia circular. */
export function claveNegocioActivo(userId: string): string {
  return `negocio_activo:${userId}`
}
