/** Minutos siempre es lo que se guarda; esto solo cambia cómo se muestra. */
export function formatearDuracion(minutos: number): string {
  if (minutos < 60) return `${minutos} min`
  const horas = Math.floor(minutos / 60)
  const resto = minutos % 60
  return resto === 0 ? `${horas} h` : `${horas} h ${resto} min`
}

// --- Formato numérico (Etapa 23) -------------------------------------------
// Única fuente de formato de dinero y cantidades. La precisión interna vive
// en la base (numeric(12,4)); aquí solo se redondea para mostrar.

const nfEntero = new Intl.NumberFormat('es-MX', { minimumFractionDigits: 0, maximumFractionDigits: 0 })

function nf(decimales: number): Intl.NumberFormat {
  return new Intl.NumberFormat('es-MX', { minimumFractionDigits: decimales, maximumFractionDigits: decimales })
}

export function formatearNumero(n: number, decimales: number): string {
  if (n == null || Number.isNaN(n)) return decimales > 0 ? (0).toFixed(decimales) : '0'
  return nf(decimales).format(n)
}

/** `$1,234.56`. `decimales` default 2. `signo: true` antepone `−` en negativos
 *  (nunca paréntesis). Valores no numéricos se tratan como 0. */
export function formatearMoneda(n: number, opciones: { decimales?: number; signo?: boolean } = {}): string {
  const decimales = opciones.decimales ?? 2
  const valor = n == null || Number.isNaN(n) ? 0 : n
  if (opciones.signo && valor < 0) return `−$${formatearNumero(Math.abs(valor), decimales)}`
  return `$${formatearNumero(valor, decimales)}`
}

/** 2 decimales si el valor ya es exacto a 2; si no, hasta 4 (recortando ceros
 *  de relleno sobrantes, mínimo 2). Para el costo unitario en vivo del
 *  formulario de compra, donde el usuario coteja contra su factura (A.2). */
export function formatearMonedaPrecisa(n: number): string {
  const valor = n == null || Number.isNaN(n) ? 0 : n
  const red2 = Math.round(valor * 100) / 100
  if (red2 === valor) return formatearMoneda(valor, { decimales: 2 })
  const s = valor.toFixed(4).replace(/(\.\d\d)(\d*?)0+$/, '$1$2').replace(/\.$/, '')
  const [ent, dec = ''] = s.split('.')
  return `$${nfEntero.format(Number(ent))}${dec ? '.' + dec : ''}`
}

/** `1,500`. Cantidades de inventario: enteras, con separador de miles. */
export function formatearCantidad(n: number): string {
  if (n == null || Number.isNaN(n)) return '0'
  return nfEntero.format(Math.round(n))
}

/** Quita todo lo que no sea dígito, `.` o `-`. `'1,234.56' → 1234.56`,
 *  `'' → NaN`. Para normalizar lo que se teclea antes de mandarlo a la base. */
export function parsearNumero(texto: string): number {
  const limpio = texto.replace(/[^\d.-]/g, '')
  if (limpio === '' || limpio === '-' || limpio === '.') return NaN
  return Number(limpio)
}
