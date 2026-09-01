import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import * as XLSX from 'xlsx'
import { formatearCantidad, formatearMoneda } from './formato'

export type FormatoColumna = 'moneda' | 'cantidad' | 'texto'

function textoCelda(valor: string | number, formato: FormatoColumna): string {
  if (typeof valor === 'number') {
    if (formato === 'moneda') return formatearMoneda(valor)
    if (formato === 'cantidad') return formatearCantidad(valor)
    return String(valor)
  }
  return valor
}

export function exportarPDF(
  titulo: string,
  columnas: string[],
  filas: (string | number)[][],
  formatos: FormatoColumna[] = [],
) {
  const doc = new jsPDF()
  doc.text(titulo, 14, 14)
  autoTable(doc, {
    head: [columnas],
    body: filas.map((f) => f.map((c, i) => textoCelda(c, formatos[i] ?? 'texto'))),
    startY: 20,
  })
  doc.save(`${titulo}.pdf`)
}

export function exportarExcel(
  titulo: string,
  columnas: string[],
  filas: (string | number)[][],
  formatos: FormatoColumna[] = [],
) {
  const hoja = XLSX.utils.aoa_to_sheet([columnas, ...filas])
  // Celdas de dinero/cantidad: se dejan como número con formato de
  // presentación, para que sigan siendo sumables en Excel pero se vean
  // con separador de miles (criterio de aceptación A.3 / Etapa 23).
  for (let r = 0; r < filas.length; r++) {
    for (let c = 0; c < columnas.length; c++) {
      const formato = formatos[c] ?? 'texto'
      const valor = filas[r][c]
      if (typeof valor !== 'number' || formato === 'texto') continue
      const ref = XLSX.utils.encode_cell({ r: r + 1, c })
      hoja[ref] = { t: 'n', v: valor, z: formato === 'moneda' ? '"$"#,##0.00' : '#,##0' }
    }
  }
  const libro = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(libro, hoja, 'Reporte')
  XLSX.writeFile(libro, `${titulo}.xlsx`)
}
