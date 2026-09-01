import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useNegocio } from '../context/NegocioContext'
import {
  actualizarVariante,
  cambiarActivoItem,
  cambiarActivoVariante,
  crearVariante,
  eliminarVariante,
  generarCodigoSugerido,
  listarVariantes,
  obtenerItem,
  verificarCodigoDisponible,
} from '../lib/catalogo'
import type { Item, VarianteItem } from '../types'
import { formatearCantidad, formatearDuracion, formatearMoneda } from '../lib/formato'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { EstadoBadge } from '../components/ui/EstadoBadge'
import { Toggle } from '../components/ui/Toggle'

const CAMPO =
  'rounded-lg border border-black/15 bg-[var(--color-superficie)] px-2 py-1 text-sm text-[var(--color-texto)] outline-none focus:border-[var(--color-primario)]'

function FormularioVariante({
  itemId, itemNombre, negocioId, onCreada,
}: { itemId: string; itemNombre: string; negocioId: string; onCreada: () => void }) {
  const [color, setColor] = useState('')
  const [talla, setTalla] = useState('')
  const [codigo, setCodigo] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (!codigo.trim()) {
      setError('El código es obligatorio para cada variante.')
      return
    }
    setEnviando(true)
    try {
      const disponibilidad = await verificarCodigoDisponible(codigo.trim(), { tipo: 'variante' })
      if (!disponibilidad.disponible) {
        setError(`Ese código ya lo usa "${disponibilidad.perteneceA}".`)
        setEnviando(false)
        return
      }
      await crearVariante({
        item_id: itemId,
        color: color || null,
        talla: talla || null,
        codigo: codigo.trim(),
      })
      setColor('')
      setTalla('')
      setCodigo('')
      onCreada()
    } catch (err) {
      console.error(err)
      setError(err instanceof Error ? err.message : 'No se pudo agregar la variante.')
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
        <input value={color} onChange={(e) => setColor(e.target.value)} autoCapitalize="off" autoCorrect="off" spellCheck={false} className={`w-24 ${CAMPO}`} />
      </label>
      <label className="flex flex-col gap-1 text-xs text-[var(--color-texto-suave)]">
        Talla
        <input value={talla} onChange={(e) => setTalla(e.target.value)} autoCapitalize="off" autoCorrect="off" spellCheck={false} className={`w-20 ${CAMPO}`} />
      </label>
      <label className="flex flex-col gap-1 text-xs text-[var(--color-texto-suave)]">
        Código *
        <input value={codigo} onChange={(e) => setCodigo(e.target.value)} autoCapitalize="off" autoCorrect="off" spellCheck={false} className={`w-24 ${CAMPO}`} />
      </label>
      <button
        type="button"
        onClick={async () => setCodigo(await generarCodigoSugerido(negocioId, itemNombre, [color, talla]))}
        className="min-h-0 rounded-lg border-[1.5px] border-black/15 px-2 py-1.5 text-xs text-[var(--color-texto-suave)]"
      >
        Generar
      </button>
      <Button type="submit" disabled={enviando} className="min-h-0 px-3 py-1.5 text-sm">
        Agregar variante
      </Button>
      {error && <p className="w-full text-xs text-[var(--color-error)]">{error}</p>}
    </form>
  )
}

function EditorVariante({
  variante, itemNombre, negocioId, onGuardada, onCancelar,
}: { variante: VarianteItem; itemNombre: string; negocioId: string; onGuardada: () => void; onCancelar: () => void }) {
  const [color, setColor] = useState(variante.color ?? '')
  const [talla, setTalla] = useState(variante.talla ?? '')
  const [codigo, setCodigo] = useState(variante.codigo ?? '')
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (!codigo.trim()) {
      setError('El código es obligatorio para cada variante.')
      return
    }
    setGuardando(true)
    try {
      const disponibilidad = await verificarCodigoDisponible(codigo.trim(), { tipo: 'variante', excluirId: variante.id })
      if (!disponibilidad.disponible) {
        setError(`Ese código ya lo usa "${disponibilidad.perteneceA}".`)
        setGuardando(false)
        return
      }
      await actualizarVariante(variante.id, { color: color || null, talla: talla || null, codigo: codigo.trim() })
      onGuardada()
    } catch (err) {
      console.error(err)
      setError(err instanceof Error ? err.message : 'No se pudo guardar. Intenta de nuevo.')
    } finally {
      setGuardando(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-2 rounded-lg border border-dashed border-black/20 p-3">
      <label className="flex flex-col gap-1 text-xs text-[var(--color-texto-suave)]">
        Color
        <input value={color} onChange={(e) => setColor(e.target.value)} autoCapitalize="off" autoCorrect="off" spellCheck={false} className={`w-24 ${CAMPO}`} />
      </label>
      <label className="flex flex-col gap-1 text-xs text-[var(--color-texto-suave)]">
        Talla
        <input value={talla} onChange={(e) => setTalla(e.target.value)} autoCapitalize="off" autoCorrect="off" spellCheck={false} className={`w-20 ${CAMPO}`} />
      </label>
      <label className="flex flex-col gap-1 text-xs text-[var(--color-texto-suave)]">
        Código *
        <input value={codigo} onChange={(e) => setCodigo(e.target.value)} autoCapitalize="off" autoCorrect="off" spellCheck={false} className={`w-24 ${CAMPO}`} />
      </label>
      <button
        type="button"
        onClick={async () => setCodigo(await generarCodigoSugerido(negocioId, itemNombre, [color, talla]))}
        className="min-h-0 rounded-lg border-[1.5px] border-black/15 px-2 py-1.5 text-xs text-[var(--color-texto-suave)]"
      >
        Generar
      </button>
      <Button type="submit" disabled={guardando} className="min-h-0 px-3 py-1.5 text-sm">
        {guardando ? 'Guardando...' : 'Guardar'}
      </Button>
      <button type="button" onClick={onCancelar} className="text-xs text-[var(--color-texto-suave)]">
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
  const [editandoId, setEditandoId] = useState<string | null>(null)

  async function cargar() {
    if (!id) return
    try {
      const itemCargado = await obtenerItem(id)
      setItem(itemCargado)
      if (itemCargado.tiene_variantes) {
        setVariantes(await listarVariantes(id))
      }
    } catch (err) {
      console.error(err)
      setError(err instanceof Error ? err.message : 'No se pudo cargar el ítem.')
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
      console.error(err)
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
            <p className="text-sm text-[var(--color-texto)]">{formatearMoneda(item.precio_base)}</p>
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
              Código: {item.codigo ?? '—'} · Existencia: {formatearCantidad(item.stock)} · Costo promedio: {formatearMoneda(item.costo_promedio)}
              {item.stock === 0 && <EstadoBadge tipo="advertencia" texto="Agotado" />}
              {!item.codigo && <EstadoBadge tipo="advertencia" texto="Sin código" />}
            </p>
            <Link to={`/inventario/productos/${item.id}`} className="mt-2 inline-block text-xs text-[var(--color-texto-suave)] underline">
              Ver movimientos en Inventario
            </Link>
          </Card>

          {!mostrarFormularioVariante ? (
            <button
              onClick={() => setMostrarFormularioVariante(true)}
              className="self-start text-xs text-[var(--color-texto-suave)] underline"
            >
              ¿Necesitas manejar variantes (color/talla) para este producto?
            </button>
          ) : (
            <FormularioVariante itemId={item.id} itemNombre={item.nombre} negocioId={negocioActivo.id} onCreada={cargar} />
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
                  {editandoId === v.id ? (
                    <EditorVariante
                      variante={v}
                      itemNombre={item.nombre}
                      negocioId={negocioActivo.id}
                      onGuardada={() => {
                        setEditandoId(null)
                        cargar()
                      }}
                      onCancelar={() => setEditandoId(null)}
                    />
                  ) : (
                    <Card className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="text-sm text-[var(--color-texto)]">
                        <span className="font-medium">
                          {[v.color, v.talla].filter(Boolean).join(' / ') || 'Sin color/talla'}
                        </span>
                        {!v.activo && <EstadoBadge tipo="neutral" texto="Inactiva" />}
                        {v.existencia === 0 && <EstadoBadge tipo="advertencia" texto="Agotado" />}
                        {!v.codigo && <EstadoBadge tipo="advertencia" texto="Sin código" />}
                        <p className="text-xs text-[var(--color-texto-suave)]">
                          Código: {v.codigo ?? '—'} · Existencia: {formatearCantidad(v.existencia)} · Costo promedio: {formatearMoneda(v.costo_promedio)}
                        </p>
                      </div>

                      <div className="flex items-center gap-3">
                        <Link to={`/inventario/productos/${item.id}/variantes/${v.id}`} className="text-xs text-[var(--color-texto-suave)] underline">
                          Ver movimientos
                        </Link>
                        <button onClick={() => setEditandoId(v.id)} className="text-xs text-[var(--color-texto-suave)] underline">
                          Editar
                        </button>
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
                  )}
                </li>
              ))}
          </ul>

          <FormularioVariante itemId={item.id} itemNombre={item.nombre} negocioId={negocioActivo.id} onCreada={cargar} />
        </div>
      )}
    </div>
  )
}
