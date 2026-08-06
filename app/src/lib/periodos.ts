import { inicioDiaNegocio, finDiaNegocio, hoyEnNegocio, diaCalendarioDesdeYMD } from './tiempoNegocio'

export type Periodo = 'hoy' | 'semana' | 'mes' | 'año' | 'personalizado'

/** Fecha calendario (Y/M/D locales, sin hora) → "YYYY-MM-DD". Pensado solo
 * para "fechas calendario" construidas por componentes (nunca para un
 * instante real como citas.fecha_hora). */
export function formatoFechaISO(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/**
 * Límites del periodo como instantes UTC listos para consultar columnas
 * timestamptz (.gte/.lte). Siempre calculados sobre el calendario de la
 * zona del negocio, nunca la del dispositivo — "hoy" y "este mes" deben
 * cortar igual sin importar desde dónde se consulte.
 */
export function calcularRango(
  periodo: Periodo,
  personalizado?: { inicio: string; fin: string },
): { inicio: Date; fin: Date } {
  const hoyYMD = hoyEnNegocio()

  switch (periodo) {
    case 'hoy':
      return { inicio: inicioDiaNegocio(hoyYMD), fin: finDiaNegocio(hoyYMD) }

    case 'semana': {
      const hoyCal = diaCalendarioDesdeYMD(hoyYMD)
      const dia = hoyCal.getDay()
      const offsetLunes = dia === 0 ? 6 : dia - 1
      const lunes = new Date(hoyCal)
      lunes.setDate(hoyCal.getDate() - offsetLunes)
      const domingo = new Date(lunes)
      domingo.setDate(lunes.getDate() + 6)
      return { inicio: inicioDiaNegocio(formatoFechaISO(lunes)), fin: finDiaNegocio(formatoFechaISO(domingo)) }
    }

    case 'mes': {
      const [y, m] = hoyYMD.split('-').map(Number)
      const inicioYMD = `${y}-${String(m).padStart(2, '0')}-01`
      const ultimoDia = new Date(y, m, 0).getDate()
      const finYMD = `${y}-${String(m).padStart(2, '0')}-${String(ultimoDia).padStart(2, '0')}`
      return { inicio: inicioDiaNegocio(inicioYMD), fin: finDiaNegocio(finYMD) }
    }

    case 'año': {
      const [y] = hoyYMD.split('-').map(Number)
      return { inicio: inicioDiaNegocio(`${y}-01-01`), fin: finDiaNegocio(`${y}-12-31`) }
    }

    case 'personalizado': {
      const inicioYMD = personalizado?.inicio || hoyYMD
      const finYMD = personalizado?.fin || hoyYMD
      return { inicio: inicioDiaNegocio(inicioYMD), fin: finDiaNegocio(finYMD) }
    }
  }
}
