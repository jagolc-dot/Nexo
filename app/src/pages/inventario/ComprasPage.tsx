import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useNegocio } from '../../context/NegocioContext'
import { listarCompras } from '../../lib/inventario'
import type { Compra } from '../../types'
import { claseBoton } from '../../components/ui/Button'
import { EstadoBadge } from '../../components/ui/EstadoBadge'
import { formatearFechaSolo } from '../../lib/tiempoNegocio'
import { formatearMoneda } from '../../lib/formato'
import { exportarExcel, exportarPDF, type FormatoColumna } from '../../lib/exportar'

const CAMPO_FECHA = 'min-h-9 rounded-lg border px-2 text-[13px] text-[var(--color-texto)]'
const FORMATOS: FormatoColumna[] = ['texto', 'texto', 'texto', 'texto', 'moneda']

export function ComprasPage() {
  const { negocioActivo } = useNegocio()
  const [compras, setCompras] = useState<Compra[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [desde, setDesde] = useState('')
  const [hasta, setHasta] = useState('')
  const [proveedorFiltro, setProveedorFiltro] = useState('')

  useEffect(() => {
    if (!negocioActivo) return
    setCompras(null)
    setError(null)
    listarCompras(negocioActivo.id, { desde: desde || undefined, hasta: hasta || undefined })
      .then(setCompras)
      .catch((e) => {
        console.error(e)
        setError(e instanceof Error ? e.message : 'No se pudo cargar el historial de compras.')
      })
  }, [negocioActivo, desde, hasta])

  const filtradas = useMemo(() => {
    if (!compras) return []
    const q = proveedorFiltro.trim().toLowerCase()
    if (!q) return compras
    return compras.filter((c) => (c.proveedor ?? '').toLowerCase().includes(q))
  }, [compras, proveedorFiltro])

  if (!negocioActivo) return null

  const columnas = ['Fecha', 'Proveedor', 'Folio', 'Estado', 'Total']
  const filas: (string | number)[][] = filtradas.map((c) => [
    formatearFechaSolo(c.fecha),
    c.proveedor ?? '—',
    c.folio ?? '—',
    c.estado === 'cancelada' ? 'Cancelada' : 'Confirmada',
    c.total,
  ])
  const hayFiltro = Boolean(desde || hasta || proveedorFiltro.trim())

  return (
    <div className="p-4 md:p-[22px] lg:p-7">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex-1 text-[22px] font-medium text-[var(--color-texto)]" style={{ fontFamily: 'var(--fuente-titulos)' }}>
          Compras
        </div>
        {filas.length > 0 && (
          <>
            <button
              onClick={() => exportarPDF('Historial de compras', columnas, filas, FORMATOS)}
              className={claseBoton('secundario', '!min-h-10 px-3.5 text-[13px]')}
            >
              PDF
            </button>
            <button
              onClick={() => exportarExcel('Historial de compras', columnas, filas, FORMATOS)}
              className={claseBoton('secundario', '!min-h-10 px-3.5 text-[13px]')}
            >
              Excel
            </button>
          </>
        )}
        <Link to="/inventario/compras/nueva" className={claseBoton('primario', '!min-h-10 px-4 text-[13.5px]')}>
          Nueva compra
        </Link>
      </div>

      <div className="mt-3.5 flex flex-wrap items-center gap-2.5">
        <label className="flex items-center gap-1.5 text-xs text-[var(--color-texto-suave)]">
          Desde
          <input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} className={CAMPO_FECHA} style={{ borderColor: 'var(--color-borde-campo)' }} />
        </label>
        <label className="flex items-center gap-1.5 text-xs text-[var(--color-texto-suave)]">
          Hasta
          <input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} className={CAMPO_FECHA} style={{ borderColor: 'var(--color-borde-campo)' }} />
        </label>
        <input
          type="text"
          value={proveedorFiltro}
          onChange={(e) => setProveedorFiltro(e.target.value)}
          placeholder="Filtrar por proveedor"
          className="min-h-9 flex-1 min-w-[160px] rounded-lg border px-3 text-[13px] text-[var(--color-texto)] outline-none"
          style={{ borderColor: 'var(--color-borde-campo)' }}
        />
        {hayFiltro && (
          <button
            onClick={() => {
              setDesde('')
              setHasta('')
              setProveedorFiltro('')
            }}
            className="text-xs text-[var(--color-texto-suave)] underline"
          >
            Limpiar
          </button>
        )}
      </div>

      <div className="mt-4 max-w-[820px]">
        {error && <p className="text-sm text-[var(--color-error)]">{error}</p>}
        {!compras && !error && <p className="text-sm text-[var(--color-texto-suave)]">Cargando...</p>}

        {compras && compras.length === 0 && !hayFiltro && (
          <div className="mt-4 flex flex-col items-center rounded-xl bg-[var(--color-superficie)] px-6 py-12 text-center shadow-[0_1px_3px_rgba(74,50,43,.07)]">
            <div className="text-[14.5px] font-medium text-[var(--color-texto)]">Aún no hay compras registradas</div>
            <Link to="/inventario/compras/nueva" className={`mt-4 ${claseBoton('primario')}`}>
              Nueva compra
            </Link>
          </div>
        )}

        {compras && filtradas.length === 0 && hayFiltro && (
          <p className="mt-4 text-sm text-[var(--color-texto-suave)]">Ninguna compra coincide con el filtro.</p>
        )}

        {filtradas.length > 0 && (
          <div className="rounded-xl bg-[var(--color-superficie)] px-4 shadow-[0_1px_3px_rgba(74,50,43,.07)]">
            {filtradas.map((c, i) => (
              <Link
                key={c.id}
                to={`/inventario/compras/${c.id}`}
                className={`flex items-center gap-3 py-3 ${i > 0 ? 'border-t' : ''}`}
                style={{ borderColor: 'var(--color-divisor)' }}
              >
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium text-[var(--color-texto)]">{c.proveedor ?? 'Sin proveedor'}</div>
                  <div className="text-[12.5px] text-[var(--color-texto-suave)]">
                    {formatearFechaSolo(c.fecha)}
                    {c.folio && ` · folio ${c.folio}`}
                  </div>
                </div>
                {c.estado === 'cancelada' && <EstadoBadge tipo="neutral" texto="Cancelada" />}
                <div className="shrink-0 text-right text-sm font-medium text-[var(--color-texto)]">{formatearMoneda(c.total)}</div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
