import type { HTMLAttributes } from 'react'

export type VarianteCard = 'superficie' | 'metrica'

interface Props extends HTMLAttributes<HTMLDivElement> {
  variante?: VarianteCard
}

const VARIANTES: Record<VarianteCard, string> = {
  superficie: 'bg-[var(--color-superficie)] border border-black/10 rounded-xl',
  metrica: 'bg-[var(--color-fondo)] rounded-xl',
}

/** Para elementos que no son <div> (ej. <form>) pero deben verse como Card. */
export function claseCard(variante: VarianteCard = 'superficie', className = '') {
  return `${VARIANTES[variante]} ${className}`
}

export function Card({ variante = 'superficie', className = '', ...props }: Props) {
  return <div className={`${VARIANTES[variante]} ${className}`} {...props} />
}
