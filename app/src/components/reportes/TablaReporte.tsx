import { exportarExcel, exportarPDF } from '../../lib/exportar'

export function TablaReporte({
  titulo,
  columnas,
  filas,
}: {
  titulo: string
  columnas: string[]
  filas: (string | number)[][]
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-[var(--color-texto)]">{titulo}</h3>
        <div className="flex gap-2">
          <button
            onClick={() => exportarPDF(titulo, columnas, filas)}
            className="min-h-11 rounded-lg border-[1.5px] border-[var(--color-secundario)] px-2 text-xs text-[var(--color-texto)]"
          >
            PDF
          </button>
          <button
            onClick={() => exportarExcel(titulo, columnas, filas)}
            className="min-h-11 rounded-lg border-[1.5px] border-[var(--color-secundario)] px-2 text-xs text-[var(--color-texto)]"
          >
            Excel
          </button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-black/10">
        <table className="w-full text-left text-sm">
          <thead className="bg-[var(--color-fondo)]">
            <tr>
              {columnas.map((c) => (
                <th key={c} className="whitespace-nowrap px-3 py-2 font-medium text-[var(--color-texto-suave)]">
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filas.length === 0 && (
              <tr>
                <td colSpan={columnas.length} className="px-3 py-3 text-[var(--color-texto-suave)]">
                  Sin datos en este periodo.
                </td>
              </tr>
            )}
            {filas.map((fila, i) => (
              <tr key={i} className="border-t border-black/10">
                {fila.map((c, j) => (
                  <td key={j} className="whitespace-nowrap px-3 py-2 text-[var(--color-texto)]">
                    {c}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
