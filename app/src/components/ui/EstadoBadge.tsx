export type TipoEstado = 'exito' | 'advertencia' | 'error' | 'neutral'

const COLORES: Record<TipoEstado, string> = {
  exito: 'bg-[var(--color-exito)]/15 text-[var(--color-exito)]',
  advertencia: 'bg-[var(--color-advertencia)]/15 text-[var(--color-advertencia)]',
  error: 'bg-[var(--color-error)]/15 text-[var(--color-error)]',
  neutral: 'bg-black/10 text-[var(--color-texto-suave)]',
}

export function EstadoBadge({ tipo, texto }: { tipo: TipoEstado; texto: string }) {
  return (
    <span className={`ml-2 rounded px-2 py-0.5 text-xs font-medium ${COLORES[tipo]}`}>{texto}</span>
  )
}
