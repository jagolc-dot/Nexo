import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import * as XLSX from 'xlsx'

export function exportarPDF(titulo: string, columnas: string[], filas: (string | number)[][]) {
  const doc = new jsPDF()
  doc.text(titulo, 14, 14)
  autoTable(doc, {
    head: [columnas],
    body: filas.map((f) => f.map((c) => String(c))),
    startY: 20,
  })
  doc.save(`${titulo}.pdf`)
}

export function exportarExcel(titulo: string, columnas: string[], filas: (string | number)[][]) {
  const hoja = XLSX.utils.aoa_to_sheet([columnas, ...filas])
  const libro = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(libro, hoja, 'Reporte')
  XLSX.writeFile(libro, `${titulo}.xlsx`)
}
