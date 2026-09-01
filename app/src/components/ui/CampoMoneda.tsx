import { type ChangeEvent } from 'react'
import { formatearNumero } from '../../lib/formato'

interface Props {
  valor: string
  onChange: (limpio: string) => void
  id?: string
  placeholder?: string
  className?: string
}

/** Convierte la cadena limpia ("1234.56") en la que se muestra ("1,234.56"),
 *  agregando el separador de miles conforme se teclea. Conserva el punto
 *  recién tecleado y hasta 2 decimales. */
function paraMostrar(limpio: string): string {
  if (limpio === '' || limpio === '-') return limpio
  const [entero, decimal] = limpio.split('.')
  const enteroNum = Number(entero || '0')
  const enteroFmt = Number.isNaN(enteroNum) ? entero : formatearNumero(enteroNum, 0)
  return decimal === undefined ? enteroFmt : `${enteroFmt}.${decimal}`
}

/** Deja solo dígitos y un punto decimal, con máximo 2 decimales. */
function limpiar(texto: string): string {
  const soloValidos = texto.replace(/[^\d.]/g, '')
  const partes = soloValidos.split('.')
  if (partes.length === 1) return partes[0]
  return `${partes[0]}.${partes.slice(1).join('').slice(0, 2)}`
}

/** Input de dinero. `valor`/`onChange` manejan siempre la cadena numérica
 *  limpia sin comas; el formato con separador es solo de presentación
 *  (Etapa 23, A.1). */
export function CampoMoneda({ valor, onChange, id, placeholder, className = '' }: Props) {
  function handle(e: ChangeEvent<HTMLInputElement>) {
    onChange(limpiar(e.target.value))
  }

  return (
    <div
      className={`flex min-h-11 w-full items-center rounded-[10px] border bg-[var(--color-superficie)] px-3 text-sm text-[var(--color-texto)] focus-within:border-[var(--color-primario)] ${className}`}
      style={{ borderColor: 'var(--color-borde-campo)' }}
    >
      <span className="mr-1 text-[var(--color-texto-suave)]">$</span>
      <input
        id={id}
        inputMode="decimal"
        placeholder={placeholder}
        value={paraMostrar(valor)}
        onChange={handle}
        className="min-w-0 flex-1 bg-transparent outline-none"
      />
    </div>
  )
}
