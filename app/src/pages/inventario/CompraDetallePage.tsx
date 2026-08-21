import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { cancelarCompra, obtenerCompraConPartidas, type PartidaCompraConNombre } from '../../lib/inventario'
import type { Compra } from '../../types'
import { Button } from '../../components/ui/Button'
import { EstadoBadge } from '../../components/ui/EstadoBadge'
import { formatearFechaSolo } from '../../lib/tiempoNegocio'

export function CompraDetallePage() {
  const { id } = useParams<{ id: string }>()
  const [compra, setCompra] = useState<Compra | null>(null)
  const [partidas, setPartidas] = useState<PartidaCompraConNombre[]>([])
  const [error, setError] = useState<string | null>(null)
  const [cancelando, setCancelando] = useState(false)

  function cargar() {
    if (!id) return
    obtenerCompraConPartidas(id)
      .then(({ compra, partidas }) => {
        setCompra(compra)
        setPartidas(partidas)
      })
      .catch(() => setError('No se pudo cargar la compra.'))
  }

  useEffect(cargar, [id])

  async function cancelar() {
    if (!id) return
    if (!confirm('¿Cancelar esta compra? Revierte las cantidades sin borrar el historial. No se puede deshacer.')) return
    setCancelando(true)
    try {
      await cancelarCompra(id)
      cargar()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'No se pudo cancelar la compra.')
    } finally {
      setCancelando(false)
    }
  }

  if (error) return <p className="p-4 text-sm text-[var(--color-error)]">{error}</p>
  if (!compra) return <p className="p-4 text-sm text-[var(--color-texto-suave)]">Cargando...</p>

  return (
    <div className="p-4 md:p-[22px] lg:p-7">
      <Link to="/inventario/compras" className="text-sm text-[var(--color-texto-suave)]">
        ← Volver a Compras
      </Link>

      <div className="mt-2 flex flex-wrap items-center gap-3">
        <div className="text-[22px] font-medium text-[var(--color-texto)]" style={{ fontFamily: 'var(--fuente-titulos)' }}>
          {compra.proveedor ?? 'Sin proveedor'}
        </div>
        {compra.estado === 'cancelada' && <EstadoBadge tipo="neutral" texto="Cancelada" />}
      </div>
      <p className="text-sm text-[var(--color-texto-suave)]">
        {formatearFechaSolo(compra.fecha)}
        {compra.folio && ` · folio ${compra.folio}`}
      </p>

      <div className="mt-4 max-w-[720px] overflow-x-auto rounded-xl border border-black/10">
        <table className="w-full text-left text-sm">
          <thead className="bg-[var(--color-fondo)]">
            <tr>
              {['Producto', 'Cantidad', 'Costo partida', 'Envío prorrateado', 'Costo unitario final'].map((c) => (
                <th key={c} className="whitespace-nowrap px-3 py-2 font-medium text-[var(--color-texto-suave)]">
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {partidas.map((p) => (
              <tr key={p.id} className="border-t border-black/10">
                <td className="whitespace-nowrap px-3 py-2 text-[var(--color-texto)]">{p.nombre}</td>
                <td className="whitespace-nowrap px-3 py-2 text-[var(--color-texto)]">{p.cantidad}</td>
                <td className="whitespace-nowrap px-3 py-2 text-[var(--color-texto)]">${p.costo_partida.toFixed(2)}</td>
                <td className="whitespace-nowrap px-3 py-2 text-[var(--color-texto)]">${p.envio_prorrateado.toFixed(4)}</td>
                <td className="whitespace-nowrap px-3 py-2 font-medium text-[var(--color-texto)]">${p.costo_unitario_final.toFixed(4)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-3 max-w-[720px] text-right text-sm text-[var(--color-texto)]">
        <div>Subtotal: ${compra.subtotal.toFixed(2)}</div>
        <div>Envío: ${compra.costo_envio.toFixed(2)}</div>
        <div className="font-medium">Total: ${compra.total.toFixed(2)}</div>
      </div>

      {compra.estado === 'confirmada' && (
        <Button variante="destructivo" onClick={cancelar} disabled={cancelando} className="mt-4">
          {cancelando ? 'Cancelando...' : 'Cancelar compra'}
        </Button>
      )}
    </div>
  )
}
