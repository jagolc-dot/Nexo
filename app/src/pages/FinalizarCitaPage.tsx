import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { completarCita, obtenerCita, type Cita } from '../lib/agenda'
import { crearVenta, listarItemsVendibles, type ItemConVariantes } from '../lib/ventas'
import type { LineaVenta, MetodoPago } from '../types'
import { claseBoton } from '../components/ui/Button'
import { OPCIONES_ZONA_NEGOCIO, hoyEnNegocio, fechaISOEnNegocio } from '../lib/tiempoNegocio'

const NOMBRES_PASO = ['Precios', 'Agregar productos', 'Recibo']
const METODOS: { valor: MetodoPago; etiqueta: string }[] = [
  { valor: 'efectivo', etiqueta: 'Efectivo' },
  { valor: 'transferencia', etiqueta: 'Transferencia' },
  { valor: 'tarjeta', etiqueta: 'Tarjeta' },
]

const CAMPO =
  'flex min-h-11 w-full items-center gap-1.5 rounded-[10px] border bg-[var(--color-superficie)] px-3 text-[15px] font-medium text-[var(--color-texto)] outline-none focus:border-[var(--color-primario)]'
const ESTILO_CAMPO = { borderColor: 'var(--color-borde-campo)' }

function IconoVolver() {
  return (
    <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M14.5 6 8.5 12l6 6" />
    </svg>
  )
}
function IconoBuscar() {
  return (
    <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="#B99A8D" strokeWidth={1.7} strokeLinecap="round">
      <circle cx="11" cy="11" r="6.5" />
      <path d="m16 16 4.5 4.5" />
    </svg>
  )
}

function nombreDiaCorto(fecha: Date): string {
  if (fechaISOEnNegocio(fecha) === hoyEnNegocio()) return 'Hoy'
  return fecha.toLocaleDateString('es-MX', { day: 'numeric', month: 'short', ...OPCIONES_ZONA_NEGOCIO })
}

export function FinalizarCitaPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [paso, setPaso] = useState(1)
  const [cita, setCita] = useState<Cita | null>(null)
  const [productosDelNegocio, setProductosDelNegocio] = useState<ItemConVariantes[]>([])
  const [cargando, setCargando] = useState(true)

  const [preciosServicios, setPreciosServicios] = useState<Record<string, string>>({})
  const [confirmacionesCeroServicio, setConfirmacionesCeroServicio] = useState<Record<string, boolean>>({})
  const [confirmacionesCeroProducto, setConfirmacionesCeroProducto] = useState<Record<number, boolean>>({})
  const [metodoPago, setMetodoPago] = useState<MetodoPago>('efectivo')
  const [lineasProductos, setLineasProductos] = useState<LineaVenta[]>([])
  const [busquedaProducto, setBusquedaProducto] = useState('')
  const [expandidoId, setExpandidoId] = useState<string | null>(null)

  const [error, setError] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  useEffect(() => {
    if (!id) return
    async function cargar() {
      const citaCargada = await obtenerCita(id!)
      setCita(citaCargada)
      const items = await listarItemsVendibles(citaCargada.negocio_id)
      setProductosDelNegocio(items.filter((i) => i.tipo === 'producto'))
      setCargando(false)
    }
    cargar()
  }, [id])

  const productosFiltrados = useMemo(() => {
    const q = busquedaProducto.trim().toLowerCase()
    const lista = q ? productosDelNegocio.filter((p) => p.nombre.toLowerCase().includes(q)) : productosDelNegocio
    return lista
  }, [productosDelNegocio, busquedaProducto])

  if (cargando || !cita) {
    return <p className="p-4 text-sm text-[var(--color-texto-suave)]">Cargando...</p>
  }

  function lineaDe(itemId: string, varianteId: string | null) {
    return lineasProductos.find((l) => l.item_id === itemId && l.variante_id === varianteId)
  }

  function agregarLineaVariante(item: ItemConVariantes, variante: ItemConVariantes['variantes_item'][number]) {
    setLineasProductos((prev) => [
      ...prev,
      {
        item_id: item.id,
        item_nombre: item.nombre,
        variante_id: variante.id,
        variante_descripcion: [variante.color, variante.talla].filter(Boolean).join(' / ') || null,
        cantidad: 1,
        precio_unitario: item.precio_base ?? 0,
        costo_unitario: variante.costo_promedio,
      },
    ])
  }

  function agregarLineaSimple(item: ItemConVariantes) {
    setLineasProductos((prev) => [
      ...prev,
      {
        item_id: item.id,
        item_nombre: item.nombre,
        variante_id: null,
        variante_descripcion: null,
        cantidad: 1,
        precio_unitario: item.precio_base ?? 0,
        costo_unitario: item.costo_promedio,
      },
    ])
  }

  function ajustarCantidad(itemId: string, varianteId: string | null, delta: number, existenciaMax: number) {
    setLineasProductos((prev) => {
      const idx = prev.findIndex((l) => l.item_id === itemId && l.variante_id === varianteId)
      if (idx === -1) return prev
      const nueva = prev[idx].cantidad + delta
      if (nueva <= 0) return prev.filter((_, i) => i !== idx)
      if (nueva > existenciaMax) return prev
      const copia = [...prev]
      copia[idx] = { ...copia[idx], cantidad: nueva }
      return copia
    })
  }

  function precioServicio(s: Cita['cita_servicios'][number]): number {
    const texto = preciosServicios[s.item_id]
    return texto !== undefined ? Number(texto) || 0 : s.precio
  }

  const totalServicios = cita.cita_servicios.reduce((acc, s) => acc + precioServicio(s), 0)
  const totalProductos = lineasProductos.reduce((acc, l) => acc + l.cantidad * l.precio_unitario, 0)
  const totalRecibo = totalServicios + totalProductos

  function actualizarPrecioProducto(index: number, valor: string) {
    setLineasProductos((prev) => {
      const copia = [...prev]
      copia[index] = { ...copia[index], precio_unitario: Number(valor) || 0 }
      return copia
    })
  }

  function irAtras() {
    setError(null)
    if (paso === 1) {
      navigate(-1)
      return
    }
    setPaso((p) => p - 1)
  }

  function irSiguiente() {
    setError(null)
    if (paso === 1) {
      for (const s of cita!.cita_servicios) {
        const precio = precioServicio(s)
        if (precio < 0) {
          setError(`El precio de "${s.items?.nombre ?? 'servicio'}" no puede ser negativo.`)
          return
        }
        if (precio === 0 && !confirmacionesCeroServicio[s.item_id]) {
          setError(`Confirma que "${s.items?.nombre ?? 'servicio'}" se cobra en $0.`)
          return
        }
      }
    }
    if (paso === 3) {
      for (const [i, l] of lineasProductos.entries()) {
        if (l.precio_unitario < 0) {
          setError(`El precio de "${l.item_nombre}" no puede ser negativo.`)
          return
        }
        if (l.precio_unitario === 0 && !confirmacionesCeroProducto[i]) {
          setError(`Confirma que "${l.item_nombre}" se cobra en $0.`)
          return
        }
      }
      finalizarRecibo()
      return
    }
    setPaso((p) => p + 1)
  }

  async function finalizarRecibo() {
    if (!cita!.cliente_id) {
      setError('Esta cita no tiene clienta asociada.')
      return
    }
    const lineasServicios: LineaVenta[] = cita!.cita_servicios.map((s) => ({
      item_id: s.item_id,
      item_nombre: s.items?.nombre ?? 'Servicio',
      variante_id: null,
      variante_descripcion: null,
      cantidad: 1,
      precio_unitario: precioServicio(s),
      costo_unitario: s.items?.costo ?? 0,
    }))

    setEnviando(true)
    try {
      const ventaId = await crearVenta({
        negocio_id: cita!.negocio_id,
        cliente_id: cita!.cliente_id,
        nombre_ocasional: null,
        metodo_pago: metodoPago,
        lineas: [...lineasServicios, ...lineasProductos],
      })
      await completarCita(cita!.id, ventaId)
      navigate('/agenda', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo finalizar el servicio.')
    } finally {
      setEnviando(false)
    }
  }

  const fechaCita = new Date(cita.fecha_hora)

  return (
    <div className="mx-auto flex max-h-full w-full max-w-[560px] flex-col overflow-hidden rounded-[14px] border bg-[var(--color-superficie)] lg:mt-8 lg:shadow-[0_18px_50px_rgba(74,50,43,.15)]" style={{ borderColor: 'var(--color-hairline)' }}>
      <div className="px-4 pt-3.5">
        <div className="flex items-center gap-2.5">
          <button onClick={irAtras} className="flex h-9 w-9 items-center justify-center rounded-lg text-[var(--color-texto)] hover:bg-[var(--color-hover-nav)]" aria-label="Volver">
            <IconoVolver />
          </button>
          <div className="min-w-0 flex-1">
            <div className="text-[17px] font-medium text-[var(--color-texto)]" style={{ fontFamily: 'var(--fuente-titulos)' }}>
              Finalizar servicio
            </div>
            <div className="mt-0.5 truncate text-xs text-[var(--color-texto-suave)]">
              {cita.clientes?.nombre ?? 'Sin clienta'} · {nombreDiaCorto(fechaCita)} {fechaCita.toLocaleTimeString('es-MX', { hour: 'numeric', minute: '2-digit', ...OPCIONES_ZONA_NEGOCIO })} — Paso {paso} de 3 · {NOMBRES_PASO[paso - 1]}
            </div>
          </div>
        </div>
        <div className="mt-3 h-1 overflow-hidden rounded-full" style={{ background: 'var(--color-track-segmentado)' }}>
          <div className="h-full rounded-full bg-[var(--color-primario)] transition-all" style={{ width: `${Math.round((paso / 3) * 100)}%` }} />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-[18px]">
        {paso === 1 && (
          <div>
            <p className="mb-3.5 text-[13px] leading-[1.45] text-[var(--color-texto-suave)]">
              Confirma el precio de cada servicio. Ya viene precargado desde lo cotizado al agendar — ajústalo solo si hubo algún cambio.
            </p>
            <div className="flex flex-col gap-3.5">
              {cita.cita_servicios.map((s) => {
                const precio = precioServicio(s)
                return (
                  <div key={s.item_id}>
                    <div className="mb-1.5 flex justify-between gap-2">
                      <div className="text-[12.5px] font-medium text-[var(--color-texto)]">{s.items?.nombre}</div>
                      <div className="text-[11.5px] text-[var(--color-texto-suave)]">cotizado: ${s.precio.toFixed(0)}</div>
                    </div>
                    <div className={CAMPO} style={ESTILO_CAMPO}>
                      <span className="font-normal text-[var(--color-texto-suave)]">$</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={preciosServicios[s.item_id] ?? String(s.precio)}
                        onChange={(e) => setPreciosServicios((prev) => ({ ...prev, [s.item_id]: e.target.value }))}
                        className="min-w-0 flex-1 bg-transparent outline-none"
                      />
                    </div>
                    {precio === 0 && (
                      <label className="mt-1.5 flex items-center gap-1.5 text-xs text-[var(--color-advertencia)]">
                        <input
                          type="checkbox"
                          checked={confirmacionesCeroServicio[s.item_id] ?? false}
                          onChange={(e) => setConfirmacionesCeroServicio((prev) => ({ ...prev, [s.item_id]: e.target.checked }))}
                        />
                        Confirmo cobrar $0 (cortesía o promoción)
                      </label>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {paso === 2 && (
          <div>
            <p className="mb-3 text-[13px] text-[var(--color-texto-suave)]">Opcional — agrega productos vendidos junto con el servicio.</p>
            <div className="flex items-center gap-2.5 rounded-[10px] border px-3" style={{ borderColor: 'var(--color-borde-campo)', minHeight: 44 }}>
              <IconoBuscar />
              <input
                value={busquedaProducto}
                onChange={(e) => setBusquedaProducto(e.target.value)}
                placeholder="Buscar producto"
                className="min-w-0 flex-1 bg-transparent text-[13.5px] text-[var(--color-texto)] outline-none"
              />
            </div>

            <div className="mt-3 flex flex-col gap-2">
              {productosFiltrados.map((item) => {
                // Producto sin variantes: su existencia/costo viven en el
                // ítem mismo (items.stock/costo_promedio), no en variantes_item.
                if (!item.tiene_variantes) {
                  if (item.stock === 0) {
                    return (
                      <div key={item.id} className="flex items-center gap-3 rounded-[10px] border-2 px-3.5 py-3 opacity-50" style={{ borderColor: 'var(--color-hairline)' }}>
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-medium text-[var(--color-texto)]">{item.nombre}</div>
                          <div className="text-xs text-[var(--color-texto-suave)]">Agotado</div>
                        </div>
                      </div>
                    )
                  }
                  const linea = lineaDe(item.id, null)
                  return (
                    <div
                      key={item.id}
                      className="flex items-center gap-3 rounded-[10px] border-2 px-3.5 py-3"
                      style={{
                        borderColor: linea ? 'var(--color-primario)' : 'var(--color-hairline)',
                        background: linea ? 'color-mix(in srgb, var(--color-primario) 8%, white)' : 'var(--color-superficie)',
                      }}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium text-[var(--color-texto)]">{item.nombre}</div>
                        <div className="text-xs text-[var(--color-texto-suave)]">${(item.precio_base ?? 0).toFixed(0)}</div>
                      </div>
                      {linea ? (
                        <div className="flex items-center overflow-hidden rounded-lg border" style={{ borderColor: '#E0CCC2' }}>
                          <button onClick={() => ajustarCantidad(item.id, null, -1, item.stock)} className="flex h-[34px] w-[34px] items-center justify-center text-base text-[var(--color-primario)]" aria-label="Quitar uno">
                            −
                          </button>
                          <div className="w-7 text-center text-[13.5px] font-medium">{linea.cantidad}</div>
                          <button onClick={() => ajustarCantidad(item.id, null, 1, item.stock)} className="flex h-[34px] w-[34px] items-center justify-center text-base text-[var(--color-primario)]" aria-label="Agregar uno">
                            +
                          </button>
                        </div>
                      ) : (
                        <button onClick={() => agregarLineaSimple(item)} className={claseBoton('secundario', '!min-h-[34px] px-3 text-xs')}>
                          + Agregar
                        </button>
                      )}
                    </div>
                  )
                }

                const variantes = item.variantes_item.filter((v) => v.activo && v.existencia > 0)
                if (variantes.length === 0) {
                  return (
                    <div key={item.id} className="flex items-center gap-3 rounded-[10px] border-2 px-3.5 py-3 opacity-50" style={{ borderColor: 'var(--color-hairline)' }}>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium text-[var(--color-texto)]">{item.nombre}</div>
                        <div className="text-xs text-[var(--color-texto-suave)]">Agotado</div>
                      </div>
                    </div>
                  )
                }
                if (variantes.length === 1) {
                  const v = variantes[0]
                  const linea = lineaDe(item.id, v.id)
                  return (
                    <div
                      key={item.id}
                      className="flex items-center gap-3 rounded-[10px] border-2 px-3.5 py-3"
                      style={{
                        borderColor: linea ? 'var(--color-primario)' : 'var(--color-hairline)',
                        background: linea ? 'color-mix(in srgb, var(--color-primario) 8%, white)' : 'var(--color-superficie)',
                      }}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium text-[var(--color-texto)]">{item.nombre}</div>
                        <div className="text-xs text-[var(--color-texto-suave)]">${(item.precio_base ?? 0).toFixed(0)}</div>
                      </div>
                      {linea ? (
                        <div className="flex items-center overflow-hidden rounded-lg border" style={{ borderColor: '#E0CCC2' }}>
                          <button onClick={() => ajustarCantidad(item.id, v.id, -1, v.existencia)} className="flex h-[34px] w-[34px] items-center justify-center text-base text-[var(--color-primario)]" aria-label="Quitar uno">
                            −
                          </button>
                          <div className="w-7 text-center text-[13.5px] font-medium">{linea.cantidad}</div>
                          <button onClick={() => ajustarCantidad(item.id, v.id, 1, v.existencia)} className="flex h-[34px] w-[34px] items-center justify-center text-base text-[var(--color-primario)]" aria-label="Agregar uno">
                            +
                          </button>
                        </div>
                      ) : (
                        <button onClick={() => agregarLineaVariante(item, v)} className={claseBoton('secundario', '!min-h-[34px] px-3 text-xs')}>
                          + Agregar
                        </button>
                      )}
                    </div>
                  )
                }
                return (
                  <div key={item.id} className="rounded-[10px] border-2 px-3.5 py-3" style={{ borderColor: 'var(--color-hairline)' }}>
                    <div className="flex items-center gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium text-[var(--color-texto)]">{item.nombre}</div>
                        <div className="text-xs text-[var(--color-texto-suave)]">{variantes.length} variantes</div>
                      </div>
                      <button
                        onClick={() => setExpandidoId((prev) => (prev === item.id ? null : item.id))}
                        className={claseBoton('secundario', '!min-h-[34px] px-3 text-xs')}
                      >
                        {expandidoId === item.id ? 'Cerrar' : 'Elegir variante'}
                      </button>
                    </div>
                    {expandidoId === item.id && (
                      <div className="mt-2.5 flex flex-wrap gap-1.5">
                        {variantes.map((v) => {
                          const linea = lineaDe(item.id, v.id)
                          const etiqueta = [v.color, v.talla].filter(Boolean).join(' / ') || 'Única'
                          return (
                            <button
                              key={v.id}
                              onClick={() => (linea ? ajustarCantidad(item.id, v.id, 1, v.existencia) : agregarLineaVariante(item, v))}
                              className="rounded-full border-2 px-3 py-1 text-xs font-medium"
                              style={{
                                borderColor: linea ? 'var(--color-primario)' : 'var(--color-hairline)',
                                color: linea ? 'var(--color-primario)' : 'var(--color-texto)',
                              }}
                            >
                              {etiqueta} {linea ? `× ${linea.cantidad}` : ''}
                            </button>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
              })}
              {productosFiltrados.length === 0 && <p className="text-sm text-[var(--color-texto-suave)]">Sin productos que coincidan.</p>}
            </div>
          </div>
        )}

        {paso === 3 && (
          <div>
            <div className="flex items-center gap-3 rounded-[10px] p-3" style={{ background: 'var(--color-fondo)' }}>
              <span
                className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-full text-sm font-medium"
                style={{ background: 'color-mix(in srgb, var(--color-secundario) 18%, white)', color: '#68785B' }}
              >
                {(cita.clientes?.nombre ?? '?').charAt(0).toUpperCase()}
              </span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium text-[var(--color-texto)]">{cita.clientes?.nombre ?? 'Sin clienta'}</div>
                <div className="truncate text-[12.5px] text-[var(--color-texto-suave)]">
                  {nombreDiaCorto(fechaCita)} · {fechaCita.toLocaleTimeString('es-MX', { hour: 'numeric', minute: '2-digit', ...OPCIONES_ZONA_NEGOCIO })} · Atendió {cita.empleadas?.nombre ?? '—'}
                </div>
              </div>
            </div>

            <div className="mb-2 mt-4 text-[11.5px] font-medium uppercase tracking-[.07em] text-[var(--color-texto-suave)]">Servicios</div>
            {cita.cita_servicios.map((s, i) => (
              <div key={i} className="mt-1.5 flex justify-between gap-2 text-[13.5px]">
                <span className="text-[var(--color-texto)]">{s.items?.nombre}</span>
                <span className="text-[var(--color-texto-suave)]">${precioServicio(s).toFixed(0)}</span>
              </div>
            ))}

            {lineasProductos.length > 0 && (
              <>
                <div className="mb-2 mt-4 text-[11.5px] font-medium uppercase tracking-[.07em] text-[var(--color-texto-suave)]">Productos</div>
                {lineasProductos.map((l, i) => (
                  <div key={i} className="mt-1.5">
                    <div className="flex items-center justify-between gap-2 text-[13.5px]">
                      <span className="text-[var(--color-texto)]">
                        {l.item_nombre} × {l.cantidad}
                      </span>
                      <div className="flex items-center gap-1 whitespace-nowrap text-[var(--color-texto-suave)]">
                        <span className="font-normal">$</span>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={l.precio_unitario}
                          onChange={(e) => actualizarPrecioProducto(i, e.target.value)}
                          className="w-16 rounded-md border bg-transparent px-1.5 py-0.5 text-right text-[13.5px] text-[var(--color-texto)] outline-none focus:border-[var(--color-primario)]"
                          style={{ borderColor: 'var(--color-borde-campo)' }}
                        />
                        <span>c/u</span>
                      </div>
                    </div>
                    {l.precio_unitario === 0 && (
                      <label className="mt-1 flex items-center gap-1.5 text-xs text-[var(--color-advertencia)]">
                        <input
                          type="checkbox"
                          checked={confirmacionesCeroProducto[i] ?? false}
                          onChange={(e) => setConfirmacionesCeroProducto((prev) => ({ ...prev, [i]: e.target.checked }))}
                        />
                        Confirmo cobrar $0 (cortesía o promoción)
                      </label>
                    )}
                  </div>
                ))}
              </>
            )}

            <div className="mt-4 border-t pt-3" style={{ borderColor: 'var(--color-divisor-fuerte)' }}>
              <div className="flex justify-between gap-2 text-[15px] font-medium text-[var(--color-texto)]">
                <span>Total</span>
                <span className="text-[20px] text-[var(--color-primario)]" style={{ fontFamily: 'var(--fuente-titulos)' }}>
                  ${totalRecibo.toFixed(0)}
                </span>
              </div>
              <p className="mt-1 text-xs text-[var(--color-texto-suave)]">Se genera una sola venta con todos los conceptos.</p>
            </div>

            <div className="mb-2 mt-4 text-[11.5px] font-medium uppercase tracking-[.07em] text-[var(--color-texto-suave)]">Forma de pago</div>
            <div className="flex gap-2">
              {METODOS.map((m) => (
                <button
                  key={m.valor}
                  onClick={() => setMetodoPago(m.valor)}
                  className="flex min-h-11 flex-1 items-center justify-center rounded-[10px] border-2 text-[13px] font-medium"
                  style={{
                    borderColor: metodoPago === m.valor ? 'var(--color-primario)' : 'var(--color-hairline)',
                    background: metodoPago === m.valor ? 'color-mix(in srgb, var(--color-primario) 8%, white)' : 'transparent',
                    color: metodoPago === m.valor ? 'var(--color-primario)' : 'var(--color-texto-suave)',
                  }}
                >
                  {m.etiqueta}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="border-t px-4 pb-4 pt-3" style={{ borderColor: 'var(--color-divisor-fuerte)' }}>
        {paso === 1 && (
          <div className="mb-2.5 flex justify-between gap-2 text-xs text-[var(--color-texto-suave)]">
            <span>
              {cita.cita_servicios.length} servicio{cita.cita_servicios.length === 1 ? '' : 's'}
            </span>
            <span>${totalServicios.toFixed(0)} total</span>
          </div>
        )}
        {error && <p className="mb-2.5 text-sm text-[var(--color-error)]">{error}</p>}
        <button onClick={irSiguiente} disabled={enviando} className={claseBoton('primario', 'w-full !min-h-12')}>
          {enviando ? 'Finalizando...' : paso === 3 ? 'Finalizar recibo' : 'Continuar'}
        </button>
        {paso === 2 && (
          <button onClick={() => setPaso(3)} className="mt-1 flex min-h-11 w-full items-center justify-center text-[13.5px] font-medium text-[var(--color-texto-suave)]">
            Omitir — sin productos
          </button>
        )}
      </div>
    </div>
  )
}
