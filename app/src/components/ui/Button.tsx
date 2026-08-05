import type { ButtonHTMLAttributes } from 'react'

export type VarianteBoton = 'primario' | 'secundario' | 'destructivo'

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variante?: VarianteBoton
}

const BASE =
  'inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-4 text-sm font-medium transition disabled:cursor-not-allowed'

const VARIANTES: Record<VarianteBoton, string> = {
  primario: 'bg-[var(--color-primario)] text-white',
  secundario: 'border-[1.5px] border-[var(--color-secundario)] bg-transparent text-[var(--color-texto)]',
  destructivo: 'bg-[var(--color-error)] text-white',
}

const DESHABILITADO =
  'disabled:bg-[var(--color-deshabilitado-fondo)] disabled:text-[var(--color-deshabilitado-texto)] disabled:border-transparent'

/** Para elementos que no son <button> (ej. <Link>) pero deben verse como uno. */
export function claseBoton(variante: VarianteBoton = 'primario', className = '') {
  return `${BASE} ${VARIANTES[variante]} ${className}`
}

export function Button({ variante = 'primario', className = '', ...props }: Props) {
  return (
    <button
      className={`${BASE} ${VARIANTES[variante]} ${DESHABILITADO} ${className}`}
      {...props}
    />
  )
}
