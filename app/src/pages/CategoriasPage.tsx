import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useNegocio } from '../context/NegocioContext'
import { actualizarCategoria, cambiarActivoCategoria, crearCategoria, listarCategorias, listarItems } from '../lib/catalogo'
import type { CategoriaItem, TipoItem } from '../types'
import { claseBoton } from '../components/ui/Button'
import { Toggle } from '../components/ui/Toggle'

function IconoVolver() {
  return (
    <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M14.5 6 8.5 12l6 6" />
    </svg>
  )
}
function IconoAsa() {
  return (
    <svg width={14} height={14} viewBox="0 0 24 24" fill="#C9B4AA" className="shrink-0 cursor-grab">
      <circle cx="9" cy="5" r="1.7" />
      <circle cx="15" cy="5" r="1.7" />
      <circle cx="9" cy="12" r="1.7" />
      <circle cx="15" cy="12" r="1.7" />
      <circle cx="9" cy="19" r="1.7" />
      <circle cx="15" cy="19" r="1.7" />
    </svg>
  )
}
function IconoEditar() {
  return (
    <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
      <path d="m5 16 11.5-11.5a2.1 2.1 0 0 1 3 3L8 19l-4 1z" />
    </svg>
  )
}
function IconoMas() {
  return (
    <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </svg>
  )
}

export function CategoriasPage() {
  const { negocioActivo } = useNegocio()
  const navigate = useNavigate()

  const [categorias, setCategorias] = useState<CategoriaItem[] | null>(null)
  const [conteos, setConteos] = useState<Record<string, number>>({})
  const [nombre, setNombre] = useState('')
  const [tipoNuevo, setTipoNuevo] = useState<TipoItem>('servicio')
  const [error, setError] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)
  const [editandoId, setEditandoId] = useState<string | null>(null)
  const [nombreEdicion, setNombreEdicion] = useState('')
  const [arrastrandoId, setArrastrandoId] = useState<string | null>(null)

  function cargar() {
    if (!negocioActivo) return
    Promise.all([listarCategorias(negocioActivo.id, true), listarItems(negocioActivo.id)]).then(([cats, items]) => {
      setCategorias(cats)
      const mapa: Record<string, number> = {}
      for (const i of items) {
        if (!i.categoria_id) continue
        mapa[i.categoria_id] = (mapa[i.categoria_id] ?? 0) + 1
      }
      setConteos(mapa)
    })
  }

  useEffect(cargar, [negocioActivo])

  if (!negocioActivo) return null

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (!nombre) {
      setError('El nombre es obligatorio.')
      return
    }
    setEnviando(true)
    try {
      await crearCategoria(negocioActivo!.id, nombre, tipoNuevo)
      setNombre('')
      cargar()
    } catch {
      setError('No se pudo crear la categoría (puede que ya exista con ese nombre).')
    } finally {
      setEnviando(false)
    }
  }

  async function alternarActivo(cat: CategoriaItem) {
    await cambiarActivoCategoria(cat.id, !cat.activo)
    cargar()
  }

  function iniciarEdicion(cat: CategoriaItem) {
    setEditandoId(cat.id)
    setNombreEdicion(cat.nombre)
  }

  async function guardarRenombre(cat: CategoriaItem) {
    if (!nombreEdicion.trim()) return
    try {
      await actualizarCategoria(cat.id, { nombre: nombreEdicion.trim() })
      setEditandoId(null)
      cargar()
    } catch {
      setError('No se pudo renombrar (puede que ya exista una categoría con ese nombre).')
    }
  }

  async function soltarSobre(subset: CategoriaItem[], idDestino: string) {
    if (!arrastrandoId || arrastrandoId === idDestino) {
      setArrastrandoId(null)
      return
    }
    const origenIdx = subset.findIndex((c) => c.id === arrastrandoId)
    const destinoIdx = subset.findIndex((c) => c.id === idDestino)
    if (origenIdx === -1 || destinoIdx === -1) {
      setArrastrandoId(null)
      return
    }
    const actual = [...subset]
    const [movida] = actual.splice(origenIdx, 1)
    actual.splice(destinoIdx, 0, movida)
    setArrastrandoId(null)
    await Promise.all(actual.map((c, i) => actualizarCategoria(c.id, { orden: i + 1 })))
    cargar()
  }

  function Lista({ titulo, subset }: { titulo: string; subset: CategoriaItem[] }) {
    return (
      <div className="mb-5">
        <div className="mb-2 text-[11.5px] font-medium uppercase tracking-[.07em] text-[var(--color-texto-suave)]">{titulo}</div>
        <div className="flex flex-col gap-2">
          {subset.map((c) => (
            <div
              key={c.id}
              draggable
              onDragStart={() => setArrastrandoId(c.id)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => soltarSobre(subset, c.id)}
              className="flex items-center gap-2.5 rounded-[10px] border px-3.5 py-3"
              style={{ borderColor: 'var(--color-hairline)', background: c.activo ? 'var(--color-superficie)' : '#FBF8F6' }}
            >
              <IconoAsa />

              {editandoId === c.id ? (
                <form
                  onSubmit={(e) => {
                    e.preventDefault()
                    guardarRenombre(c)
                  }}
                  className="flex flex-1 items-center gap-2"
                >
                  <input
                    autoFocus
                    value={nombreEdicion}
                    onChange={(e) => setNombreEdicion(e.target.value)}
                    className="min-w-0 flex-1 rounded-lg border px-2 py-1 text-sm text-[var(--color-texto)] outline-none focus:border-[var(--color-primario)]"
                    style={{ borderColor: 'var(--color-borde-campo)' }}
                  />
                  <button type="submit" className="text-xs font-medium text-[var(--color-primario)]">
                    Guardar
                  </button>
                  <button type="button" onClick={() => setEditandoId(null)} className="text-xs text-[var(--color-texto-suave)]">
                    Cancelar
                  </button>
                </form>
              ) : (
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium" style={{ color: c.activo ? 'var(--color-texto)' : '#9C9C97' }}>
                    {c.nombre}
                  </div>
                  <div className="text-xs text-[var(--color-texto-suave)]">
                    {conteos[c.id] ? `${conteos[c.id]} ítem${conteos[c.id] === 1 ? '' : 's'}` : 'Sin ítems'}
                  </div>
                </div>
              )}

              {editandoId !== c.id && (
                <>
                  <button
                    onClick={() => iniciarEdicion(c)}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[var(--color-texto-suave)] hover:bg-[var(--color-hover-nav)]"
                    aria-label="Renombrar"
                  >
                    <IconoEditar />
                  </button>
                  <Toggle activo={c.activo} onClick={() => alternarActivo(c)} ariaLabel={c.activo ? 'Desactivar categoría' : 'Activar categoría'} />
                </>
              )}
            </div>
          ))}
          {subset.length === 0 && <p className="text-sm text-[var(--color-texto-suave)]">Sin categorías todavía.</p>}
        </div>
      </div>
    )
  }

  const categoriasServicio = (categorias ?? []).filter((c) => c.tipo === 'servicio')
  const categoriasProducto = (categorias ?? []).filter((c) => c.tipo === 'producto')

  return (
    <div className="mx-auto flex max-h-full w-full max-w-[560px] flex-col overflow-hidden rounded-[14px] border bg-[var(--color-superficie)] lg:mt-8 lg:shadow-[0_18px_50px_rgba(74,50,43,.15)]" style={{ borderColor: 'var(--color-hairline)' }}>
      <div className="flex items-center gap-2.5 border-b px-4 py-3.5" style={{ borderColor: 'var(--color-divisor-fuerte)' }}>
        <button onClick={() => navigate('/catalogo')} className="flex h-9 w-9 items-center justify-center rounded-lg text-[var(--color-texto)] hover:bg-[var(--color-hover-nav)]" aria-label="Volver">
          <IconoVolver />
        </button>
        <div className="flex-1 text-[17px] font-medium text-[var(--color-texto)]" style={{ fontFamily: 'var(--fuente-titulos)' }}>
          Categorías
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <p className="mb-3 text-xs leading-[1.45] text-[var(--color-texto-suave)]">
          Arrastra para reordenar. Una categoría desactivada oculta sus ítems al agendar o vender — nada se elimina.
        </p>

        <Lista titulo="Servicios" subset={categoriasServicio} />
        <Lista titulo="Productos" subset={categoriasProducto} />

        <form onSubmit={handleSubmit} className="mt-3.5 flex flex-col gap-2.5">
          <div className="inline-flex self-start rounded-[9px] p-[3px]" style={{ background: 'var(--color-track-segmentado)' }}>
            {(['servicio', 'producto'] as TipoItem[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTipoNuevo(t)}
                className={`rounded-[7px] px-3.5 py-[7px] text-[13px] capitalize ${
                  tipoNuevo === t ? 'bg-[var(--color-superficie)] font-medium text-[var(--color-texto)] shadow-[0_1px_2px_rgba(74,50,43,.1)]' : 'text-[var(--color-texto-suave)]'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              placeholder="Nombre de la categoría"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              className="min-h-11 min-w-0 flex-1 rounded-[10px] border px-3 text-[13.5px] text-[var(--color-texto)] outline-none focus:border-[var(--color-primario)]"
              style={{ borderColor: 'var(--color-borde-campo)' }}
            />
            <button type="submit" disabled={enviando} className={claseBoton('primario', '!min-h-11 gap-1.5 px-4 text-[13.5px]')}>
              <IconoMas />
              Crear
            </button>
          </div>
        </form>
        {error && <p className="mt-2 text-xs text-[var(--color-error)]">{error}</p>}
      </div>
    </div>
  )
}
