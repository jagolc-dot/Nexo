import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useNegocio } from '../context/NegocioContext'
import { listarCategorias, listarItems } from '../lib/catalogo'
import { formatearDuracion } from '../lib/formato'
import type { CategoriaItem, Item, TipoItem } from '../types'
import { claseBoton } from '../components/ui/Button'

function IconoCatalogo({ size = 30 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#B99A8D" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 4h6.6L20 13.4a1.8 1.8 0 0 1 0 2.6l-4 4a1.8 1.8 0 0 1-2.6 0L4 10.6z" />
      <circle cx="8.3" cy="8.3" r="1.1" />
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
    <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round">
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </svg>
  )
}

export function CatalogoPage() {
  const { negocioActivo } = useNegocio()
  const [items, setItems] = useState<Item[] | null>(null)
  const [categorias, setCategorias] = useState<CategoriaItem[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!negocioActivo) return
    Promise.all([listarItems(negocioActivo.id), listarCategorias(negocioActivo.id, true)])
      .then(([i, c]) => {
        setItems(i)
        setCategorias(c)
      })
      .catch(() => setError('No se pudo cargar el catálogo.'))
  }, [negocioActivo])

  function secciones(tipo: TipoItem) {
    if (!items) return []
    const itemsTipo = items.filter((i) => i.tipo === tipo)
    const grupos = categorias
      .filter((c) => c.tipo === tipo)
      .map((cat) => ({ categoria: cat, items: itemsTipo.filter((i) => i.categoria_id === cat.id) }))
      .filter((g) => g.items.length > 0)
    const sinCategoria = itemsTipo.filter((i) => !i.categoria_id)
    if (sinCategoria.length > 0) {
      grupos.push({ categoria: { id: `sin-categoria-${tipo}`, nombre: 'Sin categoría' } as CategoriaItem, items: sinCategoria })
    }
    return grupos
  }

  const seccionesServicios = secciones('servicio')
  const seccionesProductos = secciones('producto')

  if (!negocioActivo) return null

  function Bloque({ titulo, grupos, sustantivo }: { titulo: string; grupos: ReturnType<typeof secciones>; sustantivo: string }) {
    if (grupos.length === 0) return null
    return (
      <div className="mt-6">
        <div className="text-[13px] font-semibold text-[var(--color-texto)]">{titulo}</div>
        {grupos.map(({ categoria, items: itemsCategoria }) => (
          <div key={categoria.id} className="mt-4">
            <div className="mb-2.5 flex items-baseline gap-2">
              <div className="text-[11.5px] font-medium uppercase tracking-[.07em] text-[var(--color-texto-suave)]">{categoria.nombre}</div>
              <div className="text-[11.5px]" style={{ color: '#C9B4AA' }}>
                {itemsCategoria.length} {sustantivo}
                {itemsCategoria.length === 1 ? '' : 's'}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
              {itemsCategoria.map((item) => (
                <div key={item.id} className="min-w-0 rounded-xl bg-[var(--color-superficie)] p-4 shadow-[0_1px_3px_rgba(74,50,43,.07)]">
                  <div className="flex items-start gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium" style={{ color: item.activo ? 'var(--color-texto)' : '#9C9C97' }}>
                        {item.nombre}
                      </div>
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        {!item.activo && (
                          <span className="inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium" style={{ background: '#F0EDEA', color: '#9C9C97' }}>
                            Inactivo
                          </span>
                        )}
                        {item.tipo === 'servicio' && item.costo == null && (
                          <span
                            className="inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium"
                            style={{ background: 'color-mix(in srgb, var(--color-advertencia) 15%, white)', color: 'var(--color-advertencia)' }}
                          >
                            Sin costo
                          </span>
                        )}
                      </div>
                    </div>
                    <Link
                      to={item.tipo === 'producto' ? `/catalogo/${item.id}` : `/catalogo/${item.id}/editar`}
                      aria-label="Editar"
                      className="-mr-1.5 -mt-1.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[var(--color-texto-suave)] hover:bg-[var(--color-hover-nav)]"
                    >
                      <IconoEditar />
                    </Link>
                  </div>
                  <div className="mt-3.5 flex items-baseline justify-between gap-2">
                    {item.precio_base != null ? (
                      <span className="text-[18px] text-[var(--color-primario)]" style={{ fontFamily: 'var(--fuente-titulos)' }}>
                        ${item.precio_base.toFixed(0)}
                      </span>
                    ) : (
                      <span />
                    )}
                    {item.duracion_minutos != null && (
                      <span className="text-xs text-[var(--color-texto-suave)]">{formatearDuracion(item.duracion_minutos)}</span>
                    )}
                    {item.tipo === 'producto' && !item.tiene_variantes && (
                      <span className="text-xs" style={{ color: item.stock === 0 ? 'var(--color-advertencia)' : 'var(--color-texto-suave)' }}>
                        {item.stock === 0 ? 'Agotado' : `${item.stock} en existencia`}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="p-4 md:p-[22px] lg:p-7">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex-1 text-[22px] font-medium text-[var(--color-texto)]" style={{ fontFamily: 'var(--fuente-titulos)' }}>
          Catálogo
        </div>
        <Link to="/catalogo/categorias" className={claseBoton('secundario', '!min-h-10 px-3.5 text-[13px]')}>
          Categorías
        </Link>
        <Link to="/catalogo/nuevo?tipo=producto" className={claseBoton('secundario', '!min-h-10 gap-1.5 px-4 text-[13.5px]')}>
          <IconoMas />
          Nuevo producto
        </Link>
        <Link to="/catalogo/nuevo?tipo=servicio" className={claseBoton('primario', '!min-h-10 gap-1.5 px-4 text-[13.5px]')}>
          <IconoMas />
          Nuevo servicio
        </Link>
      </div>

      {error && <p className="mt-4 text-sm text-[var(--color-error)]">{error}</p>}
      {items === null && !error && <p className="mt-4 text-sm text-[var(--color-texto-suave)]">Cargando...</p>}

      {items && items.length === 0 && (
        <div className="mt-5 flex max-w-[760px] flex-col items-center rounded-xl bg-[var(--color-superficie)] px-6 py-12 text-center shadow-[0_1px_3px_rgba(74,50,43,.07)]">
          <IconoCatalogo />
          <div className="mt-3 text-[14.5px] font-medium text-[var(--color-texto)]">Tu catálogo está vacío</div>
          <p className="mt-1 max-w-[260px] text-[13px] text-[var(--color-texto-suave)]">Crea tu primer servicio para poder agendar citas.</p>
          <Link to="/catalogo/nuevo?tipo=servicio" className={`mt-4 ${claseBoton('primario')}`}>
            Nuevo servicio
          </Link>
        </div>
      )}

      <div className="max-w-[760px]">
        <Bloque titulo="Servicios" grupos={seccionesServicios} sustantivo="servicio" />
        <Bloque titulo="Productos" grupos={seccionesProductos} sustantivo="producto" />
      </div>
    </div>
  )
}
