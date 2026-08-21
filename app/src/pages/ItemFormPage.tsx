import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useNegocio } from '../context/NegocioContext'
import {
  actualizarItem,
  cambiarActivoItem,
  crearItem,
  eliminarItem,
  generarCodigoSugerido,
  listarCategorias,
  obtenerItem,
  verificarCodigoDisponible,
} from '../lib/catalogo'
import type { CategoriaItem, TipoItem, Unidad } from '../types'

const UNIDADES: Unidad[] = ['Pieza', 'Caja', 'Paquete', 'Par', 'Juego', 'Gramo', 'Kilogramo', 'Mililitro', 'Litro', 'Metro']
import { claseBoton } from '../components/ui/Button'

const CAMPO =
  'flex min-h-11 w-full items-center rounded-[10px] border bg-[var(--color-superficie)] px-3 text-sm text-[var(--color-texto)] outline-none focus:border-[var(--color-primario)]'
const ESTILO_CAMPO = { borderColor: 'var(--color-borde-campo)' }

function IconoVolver() {
  return (
    <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M14.5 6 8.5 12l6 6" />
    </svg>
  )
}

export function ItemFormPage() {
  const { negocioActivo } = useNegocio()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { id } = useParams<{ id: string }>()
  const esEdicion = Boolean(id)

  const [nombre, setNombre] = useState('')
  const [categorias, setCategorias] = useState<CategoriaItem[]>([])
  const [categoriaId, setCategoriaId] = useState('')
  const [precioBase, setPrecioBase] = useState('')
  const [duracionHoras, setDuracionHoras] = useState('')
  const [duracionMins, setDuracionMins] = useState('')
  const [costo, setCosto] = useState('')
  const [manejaVariantes, setManejaVariantes] = useState(false)
  const [tieneVariantesEdicion, setTieneVariantesEdicion] = useState(false)
  const [codigo, setCodigo] = useState('')
  const [unidad, setUnidad] = useState<Unidad>('Pieza')
  const [tipoEdicion, setTipoEdicion] = useState<TipoItem | null>(null)
  const [activoActual, setActivoActual] = useState(true)
  const [stockActual, setStockActual] = useState(0)
  const [cargando, setCargando] = useState(esEdicion)
  const [error, setError] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)
  const [desactivando, setDesactivando] = useState(false)
  const [eliminando, setEliminando] = useState(false)

  const tipo: TipoItem = esEdicion ? tipoEdicion ?? 'servicio' : searchParams.get('tipo') === 'producto' ? 'producto' : 'servicio'
  const esServicio = tipo === 'servicio'
  const tieneVariantes = esEdicion ? tieneVariantesEdicion : manejaVariantes
  const duracionTotalMinutos = Number(duracionHoras || 0) * 60 + Number(duracionMins || 0)

  useEffect(() => {
    if (!negocioActivo) return
    if (esEdicion && !tipoEdicion) return // esperar a saber el tipo real del ítem
    listarCategorias(negocioActivo.id, false, tipo).then(setCategorias)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [negocioActivo, tipo, tipoEdicion])

  useEffect(() => {
    if (!id) return
    obtenerItem(id)
      .then((item) => {
        setNombre(item.nombre)
        setCategoriaId(item.categoria_id ?? '')
        setPrecioBase(item.precio_base != null ? String(item.precio_base) : '')
        if (item.duracion_minutos != null) {
          setDuracionHoras(item.duracion_minutos >= 60 ? String(Math.floor(item.duracion_minutos / 60)) : '')
          setDuracionMins(item.duracion_minutos % 60 ? String(item.duracion_minutos % 60) : '')
        }
        setCosto(item.costo != null ? String(item.costo) : '')
        setCodigo(item.codigo ?? '')
        setUnidad(item.unidad ?? 'Pieza')
        setTieneVariantesEdicion(item.tiene_variantes)
        setTipoEdicion(item.tipo)
        setActivoActual(item.activo)
        setStockActual(item.stock)
      })
      .catch(() => setError('No se pudo cargar el ítem.'))
      .finally(() => setCargando(false))
  }, [id])

  if (!negocioActivo) return null
  if (cargando) return <p className="p-4 text-sm text-[var(--color-texto-suave)]">Cargando...</p>

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)

    if (!nombre) {
      setError('El nombre es obligatorio.')
      return
    }
    if (!categoriaId) {
      setError('La categoría es obligatoria.')
      return
    }
    if (!precioBase) {
      setError('El precio es obligatorio.')
      return
    }
    if (esServicio && duracionTotalMinutos <= 0) {
      setError('La duración es obligatoria para un servicio.')
      return
    }
    if (esServicio && !esEdicion && !costo) {
      setError('El costo es obligatorio.')
      return
    }
    if (!esServicio && !tieneVariantes && !codigo.trim()) {
      setError('El código es obligatorio para un producto sin variantes.')
      return
    }
    if (!esServicio && !tieneVariantes && codigo.trim()) {
      const disponibilidad = await verificarCodigoDisponible(codigo.trim(), {
        tipo: 'item', negocioId: negocioActivo!.id, excluirId: id,
      })
      if (!disponibilidad.disponible) {
        setError(`Ese código ya lo usa "${disponibilidad.perteneceA}".`)
        return
      }
    }

    setEnviando(true)
    try {
      if (esEdicion && id) {
        await actualizarItem(id, {
          nombre,
          categoria_id: categoriaId || null,
          precio_base: precioBase ? Number(precioBase) : null,
          duracion_minutos: esServicio && duracionTotalMinutos > 0 ? duracionTotalMinutos : null,
          costo: esServicio && costo ? Number(costo) : null,
          codigo: !esServicio && !tieneVariantes ? codigo || null : undefined,
          unidad: !esServicio ? unidad : undefined,
        })
        navigate('/catalogo', { replace: true })
        return
      }

      const item = await crearItem(
        {
          negocio_id: negocioActivo!.id,
          nombre,
          tipo,
          categoria_id: categoriaId || null,
          precio_base: precioBase ? Number(precioBase) : null,
          duracion_minutos: esServicio && duracionTotalMinutos > 0 ? duracionTotalMinutos : null,
          costo: esServicio && costo ? Number(costo) : null,
          codigo: !esServicio && !tieneVariantes ? codigo || null : null,
          unidad: !esServicio ? unidad : null,
        },
        manejaVariantes,
      )

      if (tipo === 'producto') {
        navigate(`/catalogo/${item.id}`, { replace: true })
      } else {
        navigate('/catalogo', { replace: true })
      }
    } catch {
      setError('No se pudo guardar. Intenta de nuevo.')
    } finally {
      setEnviando(false)
    }
  }

  async function alternarActivo() {
    if (!id) return
    if (activoActual) {
      if (!confirm(`¿Desactivar este ${esServicio ? 'servicio' : 'producto'}? Deja de ofrecerse; su historial no se toca.`)) return
    }
    setDesactivando(true)
    try {
      await cambiarActivoItem(id, !activoActual)
      if (activoActual) {
        navigate('/catalogo', { replace: true })
      } else {
        setActivoActual(true)
        setDesactivando(false)
      }
    } catch {
      setError(`No se pudo ${activoActual ? 'desactivar' : 'reactivar'}.`)
      setDesactivando(false)
    }
  }

  async function eliminar() {
    if (!id) return
    if (tipo === 'producto' && stockActual > 0) {
      if (!confirm(`Este producto tiene ${stockActual} en existencia registrada. Eliminarlo hace desaparecer ese inventario del sistema sin dejar rastro de la salida. ¿Continuar de todas formas?`)) return
    }
    if (!confirm(`¿Eliminar este ${esServicio ? 'servicio' : 'producto'}? No se puede deshacer.`)) return
    setEliminando(true)
    try {
      await eliminarItem(id)
      navigate('/catalogo', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo eliminar.')
      setEliminando(false)
    }
  }

  return (
    <div className="mx-auto flex max-h-full w-full max-w-[560px] flex-col overflow-hidden rounded-[14px] border bg-[var(--color-superficie)] lg:mt-8 lg:shadow-[0_18px_50px_rgba(74,50,43,.15)]" style={{ borderColor: 'var(--color-hairline)' }}>
      <div className="flex items-center gap-2.5 border-b px-4 py-3.5" style={{ borderColor: 'var(--color-divisor-fuerte)' }}>
        <button onClick={() => navigate(-1)} className="flex h-9 w-9 items-center justify-center rounded-lg text-[var(--color-texto)] hover:bg-[var(--color-hover-nav)]" aria-label="Volver">
          <IconoVolver />
        </button>
        <div className="text-[17px] font-medium text-[var(--color-texto)]" style={{ fontFamily: 'var(--fuente-titulos)' }}>
          {esEdicion ? (esServicio ? 'Editar servicio' : 'Editar producto') : esServicio ? 'Nuevo servicio' : 'Nuevo producto'}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-1 flex-col gap-3.5 overflow-y-auto px-4 py-[18px]">
        <label className="flex flex-col gap-1.5 text-xs font-medium text-[var(--color-texto)]">
          Nombre <span style={{ color: 'var(--color-error)' }}>*</span>
          <input
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            className={CAMPO}
            style={ESTILO_CAMPO}
          />
        </label>

        <div>
          <div className="mb-1.5 text-xs font-medium text-[var(--color-texto)]">
            Categoría <span style={{ color: 'var(--color-error)' }}>*</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {categorias.map((c) => {
              const sel = categoriaId === c.id
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setCategoriaId(c.id)}
                  className="inline-flex min-h-[38px] items-center rounded-full border-2 px-3.5 text-[13px] font-medium"
                  style={{
                    borderColor: sel ? 'var(--color-primario)' : 'var(--color-hairline)',
                    background: sel ? 'color-mix(in srgb, var(--color-primario) 8%, white)' : 'transparent',
                    color: sel ? 'var(--color-primario)' : 'var(--color-texto-suave)',
                  }}
                >
                  {c.nombre}
                </button>
              )
            })}
            {categorias.length === 0 && (
              <p className="text-xs text-[var(--color-texto-suave)]">
                Sin categorías de {esServicio ? 'servicio' : 'producto'} todavía — créalas en "Categorías".
              </p>
            )}
          </div>
        </div>

        <label className="flex flex-col gap-1.5 text-xs font-medium text-[var(--color-texto)]">
          Precio <span style={{ color: 'var(--color-error)' }}>*</span>
          <div className={CAMPO} style={ESTILO_CAMPO}>
            <span className="mr-1 font-normal text-[var(--color-texto-suave)]">$</span>
            <input
              type="number"
              step="0.01"
              min="0"
              value={precioBase}
              onChange={(e) => setPrecioBase(e.target.value)}
              className="min-w-0 flex-1 bg-transparent font-medium outline-none"
            />
          </div>
        </label>

        {esServicio && (
          <div className="flex flex-col gap-1.5 text-xs font-medium text-[var(--color-texto)]">
            Duración <span style={{ color: 'var(--color-error)' }}>*</span>
            <div className="flex gap-2">
              <div className={`flex-1 ${CAMPO}`} style={ESTILO_CAMPO}>
                <input
                  type="number"
                  min="0"
                  value={duracionHoras}
                  onChange={(e) => setDuracionHoras(e.target.value)}
                  className="w-full min-w-0 bg-transparent font-medium outline-none"
                />
                <span className="ml-1 shrink-0 font-normal text-[var(--color-texto-suave)]">h</span>
              </div>
              <div className={`flex-1 ${CAMPO}`} style={ESTILO_CAMPO}>
                <input
                  type="number"
                  min="0"
                  max="59"
                  value={duracionMins}
                  onChange={(e) => setDuracionMins(e.target.value)}
                  className="w-full min-w-0 bg-transparent font-medium outline-none"
                />
                <span className="ml-1 shrink-0 font-normal text-[var(--color-texto-suave)]">min</span>
              </div>
            </div>
          </div>
        )}

        {esServicio && (
          <label className="flex flex-col gap-1.5 text-xs font-medium text-[var(--color-texto)]">
            Costo {!esEdicion && <span style={{ color: 'var(--color-error)' }}>*</span>}
            <div className={CAMPO} style={ESTILO_CAMPO}>
              <span className="mr-1 font-normal text-[var(--color-texto-suave)]">$</span>
              <input
                type="number"
                step="0.01"
                min="0"
                value={costo}
                onChange={(e) => setCosto(e.target.value)}
                className="min-w-0 flex-1 bg-transparent font-medium outline-none"
              />
            </div>
            <p className="font-normal text-[var(--color-texto-suave)]">
              Costo estándar de insumos para este servicio. Información interna — nunca se le muestra a la clienta.
            </p>
          </label>
        )}

        {!esServicio && !tieneVariantes && (
          <label className="flex flex-col gap-1.5 text-xs font-medium text-[var(--color-texto)]">
            Código <span style={{ color: 'var(--color-error)' }}>*</span>
            <div className="flex gap-2">
              <input
                value={codigo}
                onChange={(e) => setCodigo(e.target.value)}
                autoCapitalize="off"
                autoCorrect="off"
                spellCheck={false}
                className={`flex-1 ${CAMPO}`}
                style={ESTILO_CAMPO}
              />
              <button
                type="button"
                onClick={async () => setCodigo(await generarCodigoSugerido(negocioActivo!.id, nombre || 'Producto'))}
                disabled={!nombre}
                className="shrink-0 rounded-lg border-[1.5px] px-3 text-xs font-medium text-[var(--color-texto-suave)] disabled:opacity-50"
                style={{ borderColor: 'var(--color-hairline)' }}
              >
                Generar código
              </button>
            </div>
          </label>
        )}

        {!esServicio && (
          <label className="flex flex-col gap-1.5 text-xs font-medium text-[var(--color-texto)]">
            Unidad
            <select value={unidad} onChange={(e) => setUnidad(e.target.value as Unidad)} className={CAMPO} style={ESTILO_CAMPO}>
              {UNIDADES.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>
          </label>
        )}

        {!esServicio && !esEdicion && (
          <>
            <label className="flex items-center gap-2 text-sm text-[var(--color-texto-suave)]">
              <input type="checkbox" checked={manejaVariantes} onChange={(e) => setManejaVariantes(e.target.checked)} />
              Este producto maneja variantes (color/talla)
            </label>
            <p className="-mt-2 text-xs text-[var(--color-texto-suave)]">
              {manejaVariantes
                ? 'Después de crear el producto podrás agregar sus variantes (color/talla). El costo y la existencia se registran después, desde Inventario, al capturar la primera compra.'
                : 'El costo y la existencia se registran después, desde Inventario, al capturar la primera compra.'}
            </p>
          </>
        )}

        {error && <p className="text-sm text-[var(--color-error)]">{error}</p>}
      </form>

      <div className="border-t px-4 pb-4 pt-3" style={{ borderColor: 'var(--color-divisor-fuerte)' }}>
        <button onClick={handleSubmit} disabled={enviando} className={claseBoton('primario', 'w-full !min-h-12')}>
          {enviando ? 'Guardando...' : esEdicion ? 'Guardar servicio' : 'Guardar'}
        </button>
        {esEdicion && (
          <>
            {!activoActual && (
              <p className="mt-2 text-center text-xs font-medium text-[var(--color-advertencia)]">
                Inactivo — no aparece al agendar ni al vender.
              </p>
            )}
            <button
              onClick={alternarActivo}
              disabled={desactivando}
              className="mt-2 flex min-h-11 w-full items-center justify-center rounded-lg border-[1.5px] text-[13.5px] font-medium text-[var(--color-texto-suave)]"
              style={{ borderColor: '#E0CCC2' }}
            >
              {desactivando
                ? activoActual
                  ? 'Desactivando...'
                  : 'Reactivando...'
                : activoActual
                  ? `Desactivar ${esServicio ? 'servicio' : 'producto'}`
                  : `Reactivar ${esServicio ? 'servicio' : 'producto'}`}
            </button>
            <p className="mt-2 text-center text-xs text-[var(--color-texto-suave)]">
              {activoActual
                ? `Un ${esServicio ? 'servicio desactivado deja' : 'producto desactivado deja'} de ofrecerse al agendar; su historial no se toca.`
                : `Al reactivar, ${esServicio ? 'el servicio' : 'el producto'} vuelve a ofrecerse tal como estaba — su existencia y costo promedio no se reinician.`}
            </p>
            <button
              onClick={eliminar}
              disabled={eliminando}
              className="mt-3 flex min-h-11 w-full items-center justify-center rounded-lg border-[1.5px] text-[13.5px] font-medium"
              style={{ borderColor: 'var(--color-error)', color: 'var(--color-error)' }}
            >
              {eliminando ? 'Eliminando...' : `Eliminar ${esServicio ? 'servicio' : 'producto'}`}
            </button>
            <p className="mt-2 text-center text-xs text-[var(--color-texto-suave)]">
              Solo se puede eliminar si nunca se usó en ventas, citas o inventario (compras/ajustes). Si tiene historial, desactívalo en vez de eliminarlo.
            </p>
          </>
        )}
      </div>
    </div>
  )
}
