import { useEffect, useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { actualizarCompra, cancelarCompra, obtenerCompraConPartidas, type PartidaCompraConNombre } from '../../lib/inventario'
import type { Compra } from '../../types'
import { Button } from '../../components/ui/Button'
import { EstadoBadge } from '../../components/ui/EstadoBadge'
import { formatearFechaSolo } from '../../lib/tiempoNegocio'

const CAMPO =
  'flex min-h-11 w-full items-center rounded-[10px] border bg-[var(--color-superficie)] px-3 text-sm text-[var(--color-texto)] outline-none focus:border-[var(--color-primario)]'
const ESTILO_CAMPO = { borderColor: 'var(--color-borde-campo)' }

export function CompraDetallePage() {
  const { id } = useParams<{ id: string }>()
  const [compra, setCompra] = useState<Compra | null>(null)
  const [partidas, setPartidas] = useState<PartidaCompraConNombre[]>([])
  const [error, setError] = useState<string | null>(null)
  const [cancelando, setCancelando] = useState(false)
  const [editando, setEditando] = useState(false)
  const [proveedor, setProveedor] = useState('')
  const [folio, setFolio] = useState('')
  const [fecha, setFecha] = useState('')
  const [notas, setNotas] = useState('')
  const [guardando, setGuardando] = useState(false)

  function cargar() {
    if (!id) return
    obtenerCompraConPartidas(id)
      .then(({ compra, partidas }) => {
        setCompra(compra)
        setPartidas(partidas)
        setProveedor(compra.proveedor ?? '')
        setFolio(compra.folio ?? '')
        setFecha(compra.fecha)
        setNotas(compra.notas ?? '')
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
      console.error(err)
      alert(err instanceof Error ? err.message : 'No se pudo cancelar la compra.')
    } finally {
      setCancelando(false)
    }
  }

  async function guardarEdicion(e: FormEvent) {
    e.preventDefault()
    if (!id) return
    setGuardando(true)
    try {
      await actualizarCompra(id, { proveedor: proveedor || null, folio: folio || null, fecha, notas: notas || null })
      setEditando(false)
      cargar()
    } catch (err) {
      console.error(err)
      alert(err instanceof Error ? err.message : 'No se pudo guardar. Intenta de nuevo.')
    } finally {
      setGuardando(false)
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
        {!editando && (
          <button onClick={() => setEditando(true)} className="text-xs text-[var(--color-texto-suave)] underline">
            Editar proveedor/folio/fecha/notas
          </button>
        )}
      </div>

      {editando ? (
        <form onSubmit={guardarEdicion} className="mt-3 flex max-w-[480px] flex-col gap-3">
          <label className="flex flex-col gap-1.5 text-xs font-medium text-[var(--color-texto)]">
            Proveedor
            <input value={proveedor} onChange={(e) => setProveedor(e.target.value)} className={CAMPO} style={ESTILO_CAMPO} />
          </label>
          <label className="flex flex-col gap-1.5 text-xs font-medium text-[var(--color-texto)]">
            Folio
            <input value={folio} onChange={(e) => setFolio(e.target.value)} className={CAMPO} style={ESTILO_CAMPO} />
          </label>
          <label className="flex flex-col gap-1.5 text-xs font-medium text-[var(--color-texto)]">
            Fecha
            <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className={CAMPO} style={ESTILO_CAMPO} />
          </label>
          <label className="flex flex-col gap-1.5 text-xs font-medium text-[var(--color-texto)]">
            Notas
            <input value={notas} onChange={(e) => setNotas(e.target.value)} className={CAMPO} style={ESTILO_CAMPO} />
          </label>
          <div className="flex gap-2">
            <Button type="submit" disabled={guardando}>
              {guardando ? 'Guardando...' : 'Guardar'}
            </Button>
            <Button type="button" variante="secundario" onClick={() => setEditando(false)}>
              Cancelar
            </Button>
          </div>
        </form>
      ) : (
        <p className="text-sm text-[var(--color-texto-suave)]">
          {formatearFechaSolo(compra.fecha)}
          {compra.folio && ` · folio ${compra.folio}`}
          {compra.notas && ` · ${compra.notas}`}
        </p>
      )}

      <div className="mt-4 max-w-[720px] overflow-x-auto rounded-xl border border-black/10">
        <table className="w-full text-left text-sm">
          <thead className="bg-[var(--color-fondo)]">
            <tr>
              {['Producto', 'Cantidad', 'Costo partida', 'Flete asignado', 'Costo unitario final'].map((c) => (
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
                <td className="whitespace-nowrap px-3 py-2 text-[var(--color-texto)]">${p.costo_total_partida.toFixed(2)}</td>
                <td className="whitespace-nowrap px-3 py-2 text-[var(--color-texto)]">${p.flete_asignado.toFixed(4)}</td>
                <td className="whitespace-nowrap px-3 py-2 font-medium text-[var(--color-texto)]">${p.costo_unitario_final.toFixed(4)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-1 max-w-[720px] text-xs text-[var(--color-texto-suave)]">
        Cantidades y costos son definitivos — recalcularlos cambiaría el costo de ventas ya registrado. Para corregir, cancela la compra.
      </p>

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
