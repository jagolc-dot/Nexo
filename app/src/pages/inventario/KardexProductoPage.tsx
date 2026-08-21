import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useNegocio } from '../../context/NegocioContext'
import { aplicarRecosteo, listarKardex, obtenerAlmacen, previsualizarRecosteo, type PrevisualizacionRecosteo } from '../../lib/inventario'
import { listarVariantes, obtenerItem } from '../../lib/catalogo'
import { supabase } from '../../lib/supabaseClient'
import type { Item, MovimientoInventario, TipoMovimiento } from '../../types'
import { Button } from '../../components/ui/Button'
import { OPCIONES_ZONA_NEGOCIO } from '../../lib/tiempoNegocio'

const ETIQUETA_TIPO: Record<TipoMovimiento, string> = {
  compra: 'Compra',
  venta: 'Venta',
  ajuste: 'Ajuste',
  cancelacion_venta: 'Cancelación de venta',
  cancelacion_compra: 'Cancelación de compra',
  recosteo: 'Recosteo',
}

function formatearFecha(iso: string): string {
  return new Date(iso).toLocaleString('es-MX', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', ...OPCIONES_ZONA_NEGOCIO })
}

export function KardexProductoPage() {
  const { itemId, varianteId } = useParams<{ itemId: string; varianteId?: string }>()
  const { negocioActivo } = useNegocio()
  const [item, setItem] = useState<Item | null>(null)
  const [descripcionVariante, setDescripcionVariante] = useState<string | null>(null)
  const [movimientos, setMovimientos] = useState<MovimientoInventario[] | null>(null)
  const [motivosAjuste, setMotivosAjuste] = useState<Record<string, string>>({})
  const [desde, setDesde] = useState('')
  const [hasta, setHasta] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [previsualizacion, setPrevisualizacion] = useState<PrevisualizacionRecosteo | null>(null)
  const [aplicandoRecosteo, setAplicandoRecosteo] = useState(false)

  function cargar() {
    if (!itemId) return
    setMovimientos(null)
    const destino = varianteId ? { varianteId } : { itemId }
    Promise.all([
      obtenerItem(itemId),
      varianteId ? listarVariantes(itemId) : Promise.resolve([]),
      listarKardex(destino),
    ])
      .then(async ([i, variantes, mov]) => {
        setItem(i)
        if (varianteId) {
          const v = variantes.find((x) => x.id === varianteId)
          setDescripcionVariante(v ? [v.color, v.talla].filter(Boolean).join(' / ') || 'Sin color/talla' : null)
        }
        setMovimientos(mov)

        const idsAjuste = mov.filter((m) => m.tipo === 'ajuste' && m.referencia_id).map((m) => m.referencia_id as string)
        if (idsAjuste.length > 0) {
          const { data } = await supabase.from('ajustes_inventario').select('id, motivo').in('id', idsAjuste)
          const mapa: Record<string, string> = {}
          for (const a of (data ?? []) as Array<{ id: string; motivo: string }>) mapa[a.id] = a.motivo
          setMotivosAjuste(mapa)
        }
      })
      .catch(() => setError('No se pudo cargar el kardex.'))
  }

  useEffect(cargar, [itemId, varianteId])

  async function previsualizar() {
    if (!itemId) return
    const resultado = await previsualizarRecosteo(varianteId ? { varianteId } : { itemId })
    setPrevisualizacion(resultado)
  }

  async function confirmarRecosteo() {
    if (!itemId || !negocioActivo) return
    setAplicandoRecosteo(true)
    try {
      const almacen = await obtenerAlmacen(negocioActivo.id)
      await aplicarRecosteo(negocioActivo.id, almacen.id, varianteId ? { varianteId } : { itemId })
      setPrevisualizacion(null)
      cargar()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'No se pudo aplicar el recosteo.')
    } finally {
      setAplicandoRecosteo(false)
    }
  }

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

      <div className="mt-2 flex flex-wrap items-center gap-3">
        <div className="text-[22px] font-medium text-[var(--color-texto)]" style={{ fontFamily: 'var(--fuente-titulos)' }}>
          Kardex — {item?.nombre ?? '...'}
          {descripcionVariante && <span className="ml-2 text-base text-[var(--color-texto-suave)]">({descripcionVariante})</span>}
        </div>
        <Button variante="secundario" onClick={previsualizar} className="!min-h-9 px-3 text-xs">
          Recostear
        </Button>
      </div>

      {previsualizacion && (
        <div className="mt-3 max-w-[520px] rounded-xl border p-4" style={{ borderColor: 'var(--color-hairline)' }}>
          {previsualizacion.existencia_actual === previsualizacion.existencia_recalculada &&
          Math.abs(previsualizacion.costo_actual - previsualizacion.costo_recalculado) < 0.0001 ? (
            <>
              <p className="text-sm text-[var(--color-texto)]">El kardex ya cuadra con lo almacenado — no hay nada que corregir.</p>
              <button onClick={() => setPrevisualizacion(null)} className="mt-2 text-xs text-[var(--color-texto-suave)] underline">
                Cerrar
              </button>
            </>
          ) : (
            <>
              <p className="text-sm font-medium text-[var(--color-texto)]">Diferencia encontrada</p>
              <table className="mt-2 w-full text-left text-sm">
                <thead>
                  <tr className="text-xs text-[var(--color-texto-suave)]">
                    <th className="py-1 font-medium"> </th>
                    <th className="py-1 font-medium">Actual</th>
                    <th className="py-1 font-medium">Recalculado</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="py-1 text-[var(--color-texto-suave)]">Existencia</td>
                    <td className="py-1 text-[var(--color-texto)]">{previsualizacion.existencia_actual}</td>
                    <td className="py-1 font-medium text-[var(--color-texto)]">{previsualizacion.existencia_recalculada}</td>
                  </tr>
                  <tr>
                    <td className="py-1 text-[var(--color-texto-suave)]">Costo promedio</td>
                    <td className="py-1 text-[var(--color-texto)]">${previsualizacion.costo_actual.toFixed(4)}</td>
                    <td className="py-1 font-medium text-[var(--color-texto)]">${previsualizacion.costo_recalculado.toFixed(4)}</td>
                  </tr>
                </tbody>
              </table>
              <div className="mt-3 flex gap-2">
                <Button onClick={confirmarRecosteo} disabled={aplicandoRecosteo} className="!min-h-9 px-3 text-xs">
                  {aplicandoRecosteo ? 'Aplicando...' : 'Aplicar recosteo'}
                </Button>
                <Button variante="secundario" onClick={() => setPrevisualizacion(null)} className="!min-h-9 px-3 text-xs">
                  Cancelar
                </Button>
              </div>
            </>
          )}
        </div>
      )}

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
                {['Fecha', 'Tipo', 'Detalle', 'Cantidad', 'Costo unitario', 'Existencia resultante', 'Costo promedio resultante'].map((c) => (
                  <th key={c} className="whitespace-nowrap px-3 py-2 font-medium text-[var(--color-texto-suave)]">
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtrados.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-3 py-3 text-[var(--color-texto-suave)]">
                    Sin movimientos en este periodo.
                  </td>
                </tr>
              )}
              {filtrados.map((m) => (
                <tr key={m.id} className="border-t border-black/10">
                  <td className="whitespace-nowrap px-3 py-2 text-[var(--color-texto)]">{formatearFecha(m.fecha)}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-[var(--color-texto)]">{ETIQUETA_TIPO[m.tipo]}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-[var(--color-texto-suave)]">
                    {m.tipo === 'ajuste' && m.referencia_id ? (motivosAjuste[m.referencia_id] ?? '—') : '—'}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-[var(--color-texto)]">
                    {m.cantidad > 0 ? '+' : ''}{m.cantidad}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-[var(--color-texto)]">${m.costo_unitario.toFixed(4)}</td>
                  <td className="whitespace-nowrap px-3 py-2 font-medium text-[var(--color-texto)]">{m.existencia_resultante}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-[var(--color-texto)]">${m.costo_promedio_resultante.toFixed(4)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
