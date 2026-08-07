import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useNegocio } from '../context/NegocioContext'
import {
  cambiarActivoItem,
  cambiarActivoVariante,
  crearVariante,
  eliminarVariante,
  listarVariantes,
  obtenerItem,
  registrarEntradaInventario,
} from '../lib/catalogo'
import type { Item, VarianteItem } from '../types'
import { formatearDuracion } from '../lib/formato'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { EstadoBadge } from '../components/ui/EstadoBadge'
import { Toggle } from '../components/ui/Toggle'

const CAMPO =
  'rounded-lg border border-black/15 bg-[var(--color-superficie)] px-2 py-1 text-sm text-[var(--color-texto)] outline-none focus:border-[var(--color-primario)]'

function FormularioVariante({ itemId, onCreada }: { itemId: string; onCreada: () => void }) {
  const [color, setColor] = useState('')
  const [talla, setTalla] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setEnviando(true)
    try {
      await crearVariante({
        item_id: itemId,
        color: color || null,
        talla: talla || null,
      })
      setColor('')
      setTalla('')
      onCreada()
    } catch {
      setError('No se pudo agregar la variante.')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-wrap items-end gap-2 rounded-lg border border-dashed border-black/20 p-3"
    >
      <label className="flex flex-col gap-1 text-xs text-[var(--color-texto-suave)]">
        Color
        <input value={color} onChange={(e) => setColor(e.target.value)} className={`w-24 ${CAMPO}`} />
      </label>
      <label className="flex flex-col gap-1 text-xs text-[var(--color-texto-suave)]">
        Talla
        <input value={talla} onChange={(e) => setTalla(e.target.value)} className={`w-20 ${CAMPO}`} />
      </label>
      <Button type="submit" disabled={enviando} className="min-h-0 px-3 py-1.5 text-sm">
        Agregar variante
      </Button>
      {error && <p className="w-full text-xs text-[var(--color-error)]">{error}</p>}
    </form>
  )
}

function FormularioEntrada({
  negocioId,
  destino,
  onRegistrada,
}: {
  negocioId: string
  destino: { varianteId: string } | { itemId: string }
  onRegistrada: () => void
}) {
  const [abierto, setAbierto] = useState(false)
  const [cantidad, setCantidad] = useState('')
  const [costoTotal, setCostoTotal] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const cantidadNum = Number(cantidad)
  const costoTotalNum = Number(costoTotal)
  const costoUnitarioPreview = cantidadNum > 0 && costoTotalNum > 0 ? costoTotalNum / cantidadNum : null

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (!cantidadNum || cantidadNum <= 0) {
      setError('La cantidad debe ser mayor a 0.')
      return
    }
    if (!costoTotalNum || costoTotalNum < 0) {
      setError('Captura el costo total de la compra.')
      return
    }

    setEnviando(true)
    try {
      await registrarEntradaInventario(negocioId, destino, cantidadNum, costoTotalNum)
      setCantidad('')
      setCostoTotal('')
      setAbierto(false)
      onRegistrada()
    } catch {
      setError('No se pudo registrar la entrada.')
    } finally {
      setEnviando(false)
    }
  }

  if (!abierto) {
    return (
      <button onClick={() => setAbierto(true)} className="text-xs text-[var(--color-texto-suave)] underline">
        Registrar entrada
      </button>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-2">
      <label className="flex flex-col gap-1 text-xs text-[var(--color-texto-suave)]">
        Piezas
        <input
          type="number"
          min="1"
          required
          value={cantidad}
          onChange={(e) => setCantidad(e.target.value)}
          className={`w-20 ${CAMPO}`}
        />
      </label>
      <label className="flex flex-col gap-1 text-xs text-[var(--color-texto-suave)]">
        Costo total de la compra
        <input
          type="number"
          step="0.01"
          min="0"
          required
          value={costoTotal}
          onChange={(e) => setCostoTotal(e.target.value)}
          className={`w-32 ${CAMPO}`}
        />
      </label>
      {costoUnitarioPreview !== null && (
        <span className="text-xs text-[var(--color-texto-suave)]">costo unitario: ${costoUnitarioPreview.toFixed(4)}</span>
      )}
      <Button type="submit" disabled={enviando} className="min-h-0 px-3 py-1.5 text-xs">
        Confirmar
      </Button>
      <button type="button" onClick={() => setAbierto(false)} className="text-xs text-[var(--color-texto-suave)]">
        Cancelar
      </button>
      {error && <p className="w-full text-xs text-[var(--color-error)]">{error}</p>}
    </form>
  )
}

export function ItemDetallePage() {
  const { id } = useParams<{ id: string }>()
  const { negocioActivo } = useNegocio()
  const navigate = useNavigate()

  const [item, setItem] = useState<Item | null>(null)
  const [variantes, setVariantes] = useState<VarianteItem[]>([])
  const [error, setError] = useState<string | null>(null)
  const [mostrarFormularioVariante, setMostrarFormularioVariante] = useState(false)
  const [verInactivas, setVerInactivas] = useState(false)

  async function cargar() {
    if (!id) return
    try {
      const itemCargado = await obtenerItem(id)
      setItem(itemCargado)
      if (itemCargado.tiene_variantes) {
        setVariantes(await listarVariantes(id))
      }
    } catch {
      setError('No se pudo cargar el ítem.')
    }
  }

  useEffect(() => {
    cargar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  if (!negocioActivo) return null
  if (error) return <p className="p-4 text-sm text-[var(--color-error)]">{error}</p>
  if (!item) return <p className="p-4 text-sm text-[var(--color-texto-suave)]">Cargando...</p>

  async function alternarActivoItem() {
    await cambiarActivoItem(item!.id, !item!.activo)
    await cargar()
  }

  async function alternarActivoVariante(variante: VarianteItem) {
    await cambiarActivoVariante(variante.id, !variante.activo)
    await cargar()
  }

  async function eliminarVarianteClick(variante: VarianteItem) {
    if (variante.existencia > 0) {
      if (
        !confirm(
          `Esta variante tiene ${variante.existencia} en existencia registrada. Eliminarla hace desaparecer ese inventario del sistema sin dejar rastro de la salida. ¿Continuar de todas formas?`,
        )
      )
        return
    }
    if (!confirm('¿Eliminar esta variante? No se puede deshacer.')) return
    try {
      await eliminarVariante(variante.id)
      await cargar()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'No se pudo eliminar la variante.')
    }
  }

  return (
    <div className="p-4">
      <button onClick={() => navigate('/catalogo')} className="mb-4 text-sm text-[var(--color-texto-suave)]">
        ← Volver al catálogo
      </button>

      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-lg font-medium text-[var(--color-texto)]">{item.nombre}</h1>
          {item.categorias_item && (
            <p className="text-sm text-[var(--color-texto-suave)]">{item.categorias_item.nombre}</p>
          )}
          {item.precio_base != null && (
            <p className="text-sm text-[var(--color-texto)]">${item.precio_base.toFixed(2)}</p>
          )}
          {item.duracion_minutos != null && (
            <p className="text-sm text-[var(--color-texto)]">{formatearDuracion(item.duracion_minutos)}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Link to={`/catalogo/${item.id}/editar`} className="text-xs text-[var(--color-texto-suave)] underline">
            Editar
          </Link>
          <Button variante="secundario" onClick={alternarActivoItem} className="min-h-0 px-3 py-1.5 text-xs">
            {item.activo ? 'Marcar inactivo' : 'Reactivar'}
          </Button>
        </div>
      </div>

      {item.tipo === 'producto' && !item.tiene_variantes && (
        <div className="flex flex-col gap-3">
          <h2 className="text-sm font-medium text-[var(--color-texto)]">Inventario</h2>
          <Card className="p-3">
            <p className="text-sm text-[var(--color-texto)]">
              Existencia: {item.stock} · Costo promedio: ${item.costo_promedio.toFixed(2)}
              {item.stock === 0 && <EstadoBadge tipo="advertencia" texto="Agotado" />}
            </p>
            <div className="mt-2">
              <FormularioEntrada negocioId={negocioActivo.id} destino={{ itemId: item.id }} onRegistrada={cargar} />
            </div>
          </Card>

          {!mostrarFormularioVariante ? (
            <button
              onClick={() => setMostrarFormularioVariante(true)}
              className="self-start text-xs text-[var(--color-texto-suave)] underline"
            >
              ¿Necesitas manejar variantes (color/talla) para este producto?
            </button>
          ) : (
            <FormularioVariante itemId={item.id} onCreada={cargar} />
          )}
        </div>
      )}

      {item.tiene_variantes && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium text-[var(--color-texto)]">Variantes</h2>
            {variantes.some((v) => !v.activo) && (
              <label className="flex items-center gap-2 text-xs text-[var(--color-texto-suave)]">
                <Toggle activo={verInactivas} onClick={() => setVerInactivas((v) => !v)} ariaLabel="Ver variantes inactivas" />
                Ver inactivas ({variantes.filter((v) => !v.activo).length})
              </label>
            )}
          </div>

          <ul className="flex flex-col gap-2">
            {variantes
              .filter((v) => verInactivas || v.activo)
              .map((v) => (
                <li key={v.id}>
                  <Card className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="text-sm text-[var(--color-texto)]">
                      <span className="font-medium">
                        {[v.color, v.talla].filter(Boolean).join(' / ') || 'Sin color/talla'}
                      </span>
                      {!v.activo && <EstadoBadge tipo="neutral" texto="Inactiva" />}
                      {v.existencia === 0 && <EstadoBadge tipo="advertencia" texto="Agotado" />}
                      <p className="text-xs text-[var(--color-texto-suave)]">
                        Existencia: {v.existencia} · Costo promedio: ${v.costo_promedio.toFixed(2)}
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      <FormularioEntrada negocioId={negocioActivo.id} destino={{ varianteId: v.id }} onRegistrada={cargar} />
                      <button
                        onClick={() => alternarActivoVariante(v)}
                        className="text-xs text-[var(--color-texto-suave)] underline"
                      >
                        {v.activo ? 'Desactivar' : 'Reactivar'}
                      </button>
                      <button
                        onClick={() => eliminarVarianteClick(v)}
                        className="text-xs underline"
                        style={{ color: 'var(--color-error)' }}
                      >
                        Eliminar
                      </button>
                    </div>
                  </Card>
                </li>
              ))}
          </ul>

          <FormularioVariante itemId={item.id} onCreada={cargar} />
        </div>
      )}
    </div>
  )
}
