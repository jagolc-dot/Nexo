import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { listarKardex } from '../../lib/inventario'
import { listarVariantes, obtenerItem } from '../../lib/catalogo'
import type { Item, MovimientoInventario, TipoMovimiento } from '../../types'
import { OPCIONES_ZONA_NEGOCIO } from '../../lib/tiempoNegocio'

const ETIQUETA_TIPO: Record<TipoMovimiento, string> = {
  entrada: 'Entrada (compra)',
  salida_venta: 'Salida (venta)',
  ajuste_positivo: 'Ajuste positivo',
  ajuste_negativo: 'Ajuste negativo',
  cancelacion_compra: 'Cancelación de compra',
}

const SIGNO: Record<TipoMovimiento, 1 | -1> = {
  entrada: 1,
  salida_venta: -1,
  ajuste_positivo: 1,
  ajuste_negativo: -1,
  cancelacion_compra: -1,
}

function formatearFecha(iso: string): string {
  return new Date(iso).toLocaleString('es-MX', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', ...OPCIONES_ZONA_NEGOCIO })
}

export function KardexProductoPage() {
  const { itemId, varianteId } = useParams<{ itemId: string; varianteId?: string }>()
  const [item, setItem] = useState<Item | null>(null)
  const [descripcionVariante, setDescripcionVariante] = useState<string | null>(null)
  const [movimientos, setMovimientos] = useState<MovimientoInventario[] | null>(null)
  const [desde, setDesde] = useState('')
  const [hasta, setHasta] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!itemId) return
    setMovimientos(null)
    Promise.all([
      obtenerItem(itemId),
      varianteId ? listarVariantes(itemId) : Promise.resolve([]),
      listarKardex(varianteId ? { varianteId } : { itemId }),
    ])
      .then(([i, variantes, mov]) => {
        setItem(i)
        if (varianteId) {
          const v = variantes.find((x) => x.id === varianteId)
          setDescripcionVariante(v ? [v.color, v.talla].filter(Boolean).join(' / ') || 'Sin color/talla' : null)
        }
        setMovimientos(mov)
      })
      .catch(() => setError('No se pudo cargar el kardex.'))
  }, [itemId, varianteId])

  const filtrados = (movimientos ?? []).filter((m) => {
    const fecha = m.fecha.slice(0, 10)
    if (desde && fecha < desde) return false
    if (hasta && fecha > hasta) return false
    return true
  })

  return (
    <div className="p-4 md:p-[22px] lg:p-7">
      <Link to="/inventario" className="text-sm text-[var(--color-texto-suave)]">
        ← Volver a Inventario
      </Link>

      <div className="mt-2 text-[22px] font-medium text-[var(--color-texto)]" style={{ fontFamily: 'var(--fuente-titulos)' }}>
        Kardex — {item?.nombre ?? '...'}
        {descripcionVariante && <span className="ml-2 text-base text-[var(--color-texto-suave)]">({descripcionVariante})</span>}
      </div>

      <div className="mt-3.5 flex flex-wrap items-center gap-2.5">
        <label className="flex items-center gap-1.5 text-xs text-[var(--color-texto-suave)]">
          Desde
          <input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} className="min-h-9 rounded-lg border px-2 text-[13px]" style={{ borderColor: 'var(--color-borde-campo)' }} />
        </label>
        <label className="flex items-center gap-1.5 text-xs text-[var(--color-texto-suave)]">
          Hasta
          <input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} className="min-h-9 rounded-lg border px-2 text-[13px]" style={{ borderColor: 'var(--color-borde-campo)' }} />
        </label>
      </div>

      <div className="mt-4 overflow-x-auto rounded-xl border border-black/10">
        {error && <p className="p-3 text-sm text-[var(--color-error)]">{error}</p>}
        {!movimientos && !error && <p className="p-3 text-sm text-[var(--color-texto-suave)]">Cargando...</p>}
        {movimientos && (
          <table className="w-full text-left text-sm">
            <thead className="bg-[var(--color-fondo)]">
              <tr>
                {['Fecha', 'Tipo', 'Referencia', 'Cantidad', 'Costo unitario', 'Saldo existencia', 'Saldo costo promedio', 'Motivo'].map((c) => (
                  <th key={c} className="whitespace-nowrap px-3 py-2 font-medium text-[var(--color-texto-suave)]">
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtrados.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-3 py-3 text-[var(--color-texto-suave)]">
                    Sin movimientos en este periodo.
                  </td>
                </tr>
              )}
              {filtrados.map((m) => (
                <tr key={m.id} className="border-t border-black/10">
                  <td className="whitespace-nowrap px-3 py-2 text-[var(--color-texto)]">{formatearFecha(m.fecha)}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-[var(--color-texto)]">{ETIQUETA_TIPO[m.tipo]}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-[var(--color-texto-suave)]">{m.referencia_tipo ?? '—'}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-[var(--color-texto)]">
                    {SIGNO[m.tipo] > 0 ? '+' : '−'}{m.cantidad}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-[var(--color-texto)]">${m.costo_unitario.toFixed(4)}</td>
                  <td className="whitespace-nowrap px-3 py-2 font-medium text-[var(--color-texto)]">{m.saldo_cantidad}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-[var(--color-texto)]">${m.saldo_costo_promedio.toFixed(4)}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-[var(--color-texto-suave)]">{m.motivo ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
