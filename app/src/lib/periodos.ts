export type Periodo = 'hoy' | 'semana' | 'mes' | 'año' | 'personalizado'

function inicioDelDia(d: Date): Date {
  const r = new Date(d)
  r.setHours(0, 0, 0, 0)
  return r
}

function finDelDia(d: Date): Date {
  const r = new Date(d)
  r.setHours(23, 59, 59, 999)
  return r
}

export function calcularRango(
  periodo: Periodo,
  personalizado?: { inicio: string; fin: string },
): { inicio: Date; fin: Date } {
  const hoy = new Date()

  switch (periodo) {
    case 'hoy':
      return { inicio: inicioDelDia(hoy), fin: finDelDia(hoy) }

    case 'semana': {
      const dia = hoy.getDay()
      const offsetLunes = dia === 0 ? 6 : dia - 1
      const lunes = new Date(hoy)
      lunes.setDate(hoy.getDate() - offsetLunes)
      const domingo = new Date(lunes)
      domingo.setDate(lunes.getDate() + 6)
      return { inicio: inicioDelDia(lunes), fin: finDelDia(domingo) }
    }

    case 'mes': {
      const inicio = new Date(hoy.getFullYear(), hoy.getMonth(), 1)
      const fin = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0)
      return { inicio: inicioDelDia(inicio), fin: finDelDia(fin) }
    }

    case 'año': {
      const inicio = new Date(hoy.getFullYear(), 0, 1)
      const fin = new Date(hoy.getFullYear(), 11, 31)
      return { inicio: inicioDelDia(inicio), fin: finDelDia(fin) }
    }

    case 'personalizado': {
      const inicio = personalizado?.inicio ? new Date(`${personalizado.inicio}T00:00:00`) : hoy
      const fin = personalizado?.fin ? new Date(`${personalizado.fin}T00:00:00`) : hoy
      return { inicio: inicioDelDia(inicio), fin: finDelDia(fin) }
    }
  }
}

export function formatoFechaISO(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}
