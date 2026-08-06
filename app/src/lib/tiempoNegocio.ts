import { fromZonedTime, formatInTimeZone } from 'date-fns-tz'

/**
 * La agenda pertenece al salón, no al teléfono desde el que se captura.
 * Todas las horas se interpretan y muestran en esta zona, sin importar el
 * dispositivo. Cambiar esto es lo único que haría falta para un negocio
 * futuro en otro huso horario.
 */
export const ZONA_NEGOCIO = 'America/Mexico_City'

/** Para pasar directo a toLocaleDateString/toLocaleTimeString y que el
 * resultado no dependa de la zona horaria del dispositivo. */
export const OPCIONES_ZONA_NEGOCIO = { timeZone: ZONA_NEGOCIO } as const

/**
 * Combina fecha (YYYY-MM-DD) y hora (HH:mm) capturadas en la zona del
 * negocio y devuelve el instante UTC correspondiente. Nunca construir esto
 * con `new Date(cadena)`: el resultado depende del motor del navegador.
 */
export function horaNegocioAUtc(fechaYYYYMMDD: string, horaHHMM: string): Date {
  return fromZonedTime(`${fechaYYYYMMDD}T${horaHHMM}:00.000`, ZONA_NEGOCIO)
}

/** Inicio (00:00:00.000) del día calendario indicado, en la zona del
 * negocio, como instante UTC — para límites de consultas ("hoy", rangos). */
export function inicioDiaNegocio(fechaYYYYMMDD: string): Date {
  return fromZonedTime(`${fechaYYYYMMDD}T00:00:00.000`, ZONA_NEGOCIO)
}

/** Fin (23:59:59.999) del día calendario indicado, en la zona del negocio,
 * como instante UTC. */
export function finDiaNegocio(fechaYYYYMMDD: string): Date {
  return fromZonedTime(`${fechaYYYYMMDD}T23:59:59.999`, ZONA_NEGOCIO)
}

/** "YYYY-MM-DD" de hoy en la zona del negocio — no en la del dispositivo ni
 * en UTC. Evita el salto de día cerca de medianoche. */
export function hoyEnNegocio(): string {
  return formatInTimeZone(new Date(), ZONA_NEGOCIO, 'yyyy-MM-dd')
}

/**
 * Hora y minuto de un instante UTC (columna timestamptz), tal como se ven
 * en la zona del negocio. Nunca usar d.getHours()/d.getMinutes() sobre un
 * Date construido desde fecha_hora: esos getters leen la zona del
 * dispositivo, no la del negocio.
 */
export function horaMinutoNegocio(fechaUtc: string | Date): { horas: number; minutos: number } {
  return {
    horas: Number(formatInTimeZone(fechaUtc, ZONA_NEGOCIO, 'H')),
    minutos: Number(formatInTimeZone(fechaUtc, ZONA_NEGOCIO, 'm')),
  }
}

/**
 * Día calendario (como Date con componentes locales, sin hora) que
 * corresponde a un instante UTC en la zona del negocio. Pensado para
 * comparar contra otras "fechas calendario" (fechaRef, días de la grilla),
 * construidas igual a partir de componentes explícitos — nunca por parseo
 * de cadena.
 */
export function diaCalendarioNegocio(fechaUtc: string | Date): Date {
  return diaCalendarioDesdeYMD(formatInTimeZone(fechaUtc, ZONA_NEGOCIO, 'yyyy-MM-dd'))
}

/** Construye una "fecha calendario" (solo año/mes/día, sin zona) a partir
 * de un YYYY-MM-DD. Construcción por componentes: segura, no ambigua. */
export function diaCalendarioDesdeYMD(fechaYYYYMMDD: string): Date {
  const [y, m, d] = fechaYYYYMMDD.split('-').map(Number)
  return new Date(y, m - 1, d)
}

/** Año/mes/día (mes en 1-12) de un instante UTC, tal como se ven en la
 * zona del negocio — para etiquetas/títulos que hoy leían
 * getFullYear()/getMonth()/getDate() del dispositivo. */
export function componentesFechaNegocio(fechaUtc: string | Date): { anio: number; mes: number; dia: number } {
  const [anio, mes, dia] = fechaISOEnNegocio(fechaUtc).split('-').map(Number)
  return { anio, mes, dia }
}

/** "YYYY-MM-DD" de un instante UTC, tal como se ve en la zona del negocio.
 * Útil para comparar "mismo día" contra hoyEnNegocio() u otra fecha. */
export function fechaISOEnNegocio(fechaUtc: string | Date): string {
  return formatInTimeZone(fechaUtc, ZONA_NEGOCIO, 'yyyy-MM-dd')
}

const MESES_CORTOS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']

/**
 * Formatea una columna DATE pura (ej. gastos.fecha_gasto: "YYYY-MM-DD",
 * sin hora) como "8 ago". A propósito NO pasa por Date/Intl: una columna
 * DATE no tiene zona horaria que convertir, y construir un Date a partir
 * de esa cadena (con o sin "T00:00:00") es exactamente la ambigüedad que
 * hay que evitar.
 */
export function formatearFechaSolo(fechaYYYYMMDD: string): string {
  const [, mes, dia] = fechaYYYYMMDD.split('-').map(Number)
  return `${dia} ${MESES_CORTOS[mes - 1]}`
}
