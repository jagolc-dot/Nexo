// Copy descriptiva por tema (no por nombre de negocio) — un negocio
// nuevo solo agrega su tema aquí, igual que los colores en index.css.
export const GIRO_POR_TEMA: Record<string, string> = {
  boutique: 'Salón de uñas',
  sastreria: 'Ropa',
}

export const TEMAS_DISPONIBLES: { valor: string; etiqueta: string }[] = [
  { valor: 'boutique', etiqueta: 'Boutique' },
  { valor: 'sastreria', etiqueta: 'Sastrería' },
  { valor: 'neutro', etiqueta: 'Neutro' },
]
