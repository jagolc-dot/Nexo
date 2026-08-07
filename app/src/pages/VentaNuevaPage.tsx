import { useEffect, useState } from 'react'
import { useNegocio } from '../context/NegocioContext'
import {
  crearClienteRapido,
  crearVenta,
  listarClientes,
  listarItemsVendibles,
  type ItemConVariantes,
} from '../lib/ventas'
import type { Cliente, LineaVenta, MetodoPago } from '../types'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'

const METODOS: MetodoPago[] = ['efectivo', 'tarjeta', 'transferencia']
const CAMPO =
  'rounded-lg border border-black/15 bg-[var(--color-superficie)] px-3 py-2 text-sm text-[var(--color-texto)] outline-none focus:border-[var(--color-primario)]'
const CAMPO_SM =
  'rounded-lg border border-black/15 bg-[var(--color-superficie)] px-2 py-1 text-sm text-[var(--color-texto)] outline-none focus:border-[var(--color-primario)]'

export function VentaNuevaPage() {
  const { negocioActivo } = useNegocio()

  const [clientes, setClientes] = useState<Cliente[]>([])
  const [productos, setProductos] = useState<ItemConVariantes[]>([])
  const [cargando, setCargando] = useState(true)

  const [modoCliente, setModoCliente] = useState<'registrado' | 'publico'>('publico')
  const [clienteId, setClienteId] = useState<string>('')
  const [nombreOcasional, setNombreOcasional] = useState('')
  const [mostrarNuevoCliente, setMostrarNuevoCliente] = useState(false)
  const [nuevoNombre, setNuevoNombre] = useState('')
  const [nuevoTelefono, setNuevoTelefono] = useState('')
  const [nuevoRedSocial, setNuevoRedSocial] = useState('')

  const [itemId, setItemId] = useState('')
  const [varianteId, setVarianteId] = useState('')
  const [cantidad, setCantidad] = useState('1')
  const [precioUnitario, setPrecioUnitario] = useState('')
  const [errorLinea, setErrorLinea] = useState<string | null>(null)

  const [lineas, setLineas] = useState<LineaVenta[]>([])
  const [metodoPago, setMetodoPago] = useState<MetodoPago>('efectivo')
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [ventaConfirmada, setVentaConfirmada] = useState<string | null>(null)

  useEffect(() => {
    if (!negocioActivo) return
    setCargando(true)
    Promise.all([listarClientes(negocioActivo.id), listarItemsVendibles(negocioActivo.id)])
      .then(([c, i]) => {
        setClientes(c)
        // Nueva venta es solo mostrador: nunca muestra servicios. Una clienta
        // sin cita se agenda en el momento y se cobra con Finalizar servicio,
        // manteniendo un solo flujo para servicios.
        setProductos(i.filter((it) => it.tipo === 'producto' && it.activo))
      })
      .finally(() => setCargando(false))
  }, [negocioActivo])

  if (!negocioActivo) return null

  const itemSeleccionado = productos.find((i) => i.id === itemId)
  const variantesDisponibles =
    itemSeleccionado?.variantes_item.filter((v) => v.activo && v.existencia > 0) ?? []
  const varianteSeleccionada = variantesDisponibles.find((v) => v.id === varianteId)
  const existenciaSinVariante = itemSeleccionado && !itemSeleccionado.tiene_variantes ? itemSeleccionado.stock : null

  function seleccionarItem(id: string) {
    setItemId(id)
    setVarianteId('')
    setErrorLinea(null)
    const item = productos.find((i) => i.id === id)
    setPrecioUnitario(item?.precio_base != null ? String(item.precio_base) : '')
  }

  function seleccionarVariante(id: string) {
    setVarianteId(id)
    // El precio siempre es el del modelo (items.precio_base) — la variante ya
    // no tiene precio propio, solo color/talla/existencia/costo promedio.
    setPrecioUnitario(String(itemSeleccionado?.precio_base ?? 0))
  }

  function agregarLinea() {
    setErrorLinea(null)
    if (!itemSeleccionado) {
      setErrorLinea('Elige un producto.')
      return
    }
    const cantidadNum = Number(cantidad)
    if (!cantidadNum || cantidadNum <= 0) {
      setErrorLinea('La cantidad debe ser mayor a 0.')
      return
    }
    const precioNum = Number(precioUnitario)
    if (Number.isNaN(precioNum) || precioNum < 0) {
      setErrorLinea('Precio inválido.')
      return
    }

    if (itemSeleccionado.tiene_variantes) {
      if (!varianteSeleccionada) {
        setErrorLinea('Elige una variante con existencia disponible.')
        return
      }
      if (cantidadNum > varianteSeleccionada.existencia) {
        setErrorLinea(`Solo hay ${varianteSeleccionada.existencia} en existencia.`)
        return
      }
      setLineas((prev) => [
        ...prev,
        {
          item_id: itemSeleccionado.id,
          item_nombre: itemSeleccionado.nombre,
          variante_id: varianteSeleccionada.id,
          variante_descripcion:
            [varianteSeleccionada.color, varianteSeleccionada.talla].filter(Boolean).join(' / ') ||
            null,
          cantidad: cantidadNum,
          precio_unitario: precioNum,
          costo_unitario: varianteSeleccionada.costo_promedio,
        },
      ])
    } else {
      if (existenciaSinVariante != null && cantidadNum > existenciaSinVariante) {
        setErrorLinea(`Solo hay ${existenciaSinVariante} en existencia.`)
        return
      }
      setLineas((prev) => [
        ...prev,
        {
          item_id: itemSeleccionado.id,
          item_nombre: itemSeleccionado.nombre,
          variante_id: null,
          variante_descripcion: null,
          cantidad: cantidadNum,
          precio_unitario: precioNum,
          costo_unitario: itemSeleccionado.costo_promedio,
        },
      ])
    }

    setItemId('')
    setVarianteId('')
    setCantidad('1')
    setPrecioUnitario('')
  }

  function quitarLinea(index: number) {
    setLineas((prev) => prev.filter((_, i) => i !== index))
  }

  async function agregarClienteRapido() {
    if (!nuevoNombre || (!nuevoTelefono && !nuevoRedSocial)) {
      setError('El cliente necesita nombre y al menos un dato de contacto.')
      return
    }
    try {
      const cliente = await crearClienteRapido(
        negocioActivo!.id,
        nuevoNombre,
        nuevoTelefono || null,
        nuevoRedSocial || null,
      )
      setClientes((prev) => [...prev, cliente].sort((a, b) => a.nombre.localeCompare(b.nombre)))
      setClienteId(cliente.id)
      setMostrarNuevoCliente(false)
      setNuevoNombre('')
      setNuevoTelefono('')
      setNuevoRedSocial('')
    } catch {
      setError('No se pudo crear el cliente.')
    }
  }

  const total = lineas.reduce((acc, l) => acc + l.cantidad * l.precio_unitario, 0)

  async function confirmarVenta() {
    setError(null)

    if (lineas.length === 0) {
      setError('Agrega al menos un producto a la venta.')
      return
    }

    setEnviando(true)
    try {
      const id = await crearVenta({
        negocio_id: negocioActivo!.id,
        cliente_id: modoCliente === 'registrado' && clienteId ? clienteId : null,
        nombre_ocasional: modoCliente === 'publico' && nombreOcasional ? nombreOcasional : null,
        metodo_pago: metodoPago,
        lineas,
      })
      setVentaConfirmada(id)
      setLineas([])
      setClienteId('')
      setNombreOcasional('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo registrar la venta.')
    } finally {
      setEnviando(false)
    }
  }

  if (cargando) return <p className="p-4 text-sm text-[var(--color-texto-suave)]">Cargando...</p>

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-6 p-4">
      <h1 className="text-lg font-medium text-[var(--color-texto)]">Nueva venta</h1>
      <p className="-mt-4 text-xs text-[var(--color-texto-suave)]">
        Solo productos de mostrador. Los servicios se cobran desde Agenda al finalizar la cita.
      </p>

      {ventaConfirmada && (
        <p className="rounded-lg bg-[var(--color-exito)]/10 p-3 text-sm text-[var(--color-exito)]">
          Venta registrada correctamente.
        </p>
      )}

      {/* Cliente */}
      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-medium text-[var(--color-texto)]">Cliente</h2>

        <div className="flex gap-4 text-sm">
          <label className="flex items-center gap-1">
            <input type="radio" checked={modoCliente === 'publico'} onChange={() => setModoCliente('publico')} />
            Público general
          </label>
          <label className="flex items-center gap-1">
            <input type="radio" checked={modoCliente === 'registrado'} onChange={() => setModoCliente('registrado')} />
            Cliente registrado
          </label>
        </div>

        {modoCliente === 'registrado' && (
          <div className="flex flex-col gap-2">
            <select value={clienteId} onChange={(e) => setClienteId(e.target.value)} className={CAMPO}>
              <option value="">Selecciona un cliente...</option>
              {clientes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                </option>
              ))}
            </select>

            {!mostrarNuevoCliente ? (
              <button
                onClick={() => setMostrarNuevoCliente(true)}
                className="self-start text-xs text-[var(--color-texto-suave)] underline"
              >
                + Nuevo cliente
              </button>
            ) : (
              <div className="flex flex-col gap-2 rounded-lg border border-dashed border-black/20 p-3">
                <input
                  placeholder="Nombre"
                  value={nuevoNombre}
                  onChange={(e) => setNuevoNombre(e.target.value)}
                  className={CAMPO_SM}
                />
                <input
                  placeholder="Teléfono (opcional si hay red social)"
                  value={nuevoTelefono}
                  onChange={(e) => setNuevoTelefono(e.target.value)}
                  className={CAMPO_SM}
                />
                <input
                  placeholder="Red social (opcional si hay teléfono)"
                  value={nuevoRedSocial}
                  onChange={(e) => setNuevoRedSocial(e.target.value)}
                  className={CAMPO_SM}
                />
                <Button onClick={agregarClienteRapido} className="self-start min-h-0 px-3 py-1.5 text-xs">
                  Guardar cliente
                </Button>
              </div>
            )}
          </div>
        )}

        {modoCliente === 'publico' && (
          <input
            placeholder="Nombre (opcional)"
            value={nombreOcasional}
            onChange={(e) => setNombreOcasional(e.target.value)}
            className={CAMPO}
          />
        )}
      </section>

      {/* Agregar línea */}
      <Card className="flex flex-col gap-2 p-3">
        <h2 className="text-sm font-medium text-[var(--color-texto)]">Agregar producto</h2>

        <select value={itemId} onChange={(e) => seleccionarItem(e.target.value)} className={CAMPO}>
          <option value="">Selecciona...</option>
          {productos.map((i) => (
            <option key={i.id} value={i.id}>
              {i.nombre}
            </option>
          ))}
        </select>

        {itemSeleccionado?.tiene_variantes && (
          <select value={varianteId} onChange={(e) => seleccionarVariante(e.target.value)} className={CAMPO}>
            <option value="">
              {variantesDisponibles.length === 0 ? 'Sin existencia disponible' : 'Elige variante...'}
            </option>
            {variantesDisponibles.map((v) => (
              <option key={v.id} value={v.id}>
                {[v.color, v.talla].filter(Boolean).join(' / ') || 'Sin color/talla'} (existencia:{' '}
                {v.existencia})
              </option>
            ))}
          </select>
        )}

        {itemSeleccionado && !itemSeleccionado.tiene_variantes && (
          <p className="text-xs text-[var(--color-texto-suave)]">
            {existenciaSinVariante === 0 ? 'Sin existencia disponible.' : `Existencia: ${existenciaSinVariante}`}
          </p>
        )}

        <div className="flex gap-2">
          <label className="flex flex-1 flex-col gap-1 text-xs text-[var(--color-texto-suave)]">
            Cantidad
            <input
              type="number"
              min="1"
              value={cantidad}
              onChange={(e) => setCantidad(e.target.value)}
              className={CAMPO_SM}
            />
          </label>
          <label className="flex flex-1 flex-col gap-1 text-xs text-[var(--color-texto-suave)]">
            Precio
            <input
              type="number"
              step="0.01"
              min="0"
              value={precioUnitario}
              onChange={(e) => setPrecioUnitario(e.target.value)}
              className={CAMPO_SM}
            />
          </label>
        </div>

        {errorLinea && <p className="text-xs text-[var(--color-error)]">{errorLinea}</p>}

        <Button onClick={agregarLinea} className="self-start">
          Agregar a la venta
        </Button>
      </Card>

      {/* Líneas */}
      {lineas.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="text-sm font-medium text-[var(--color-texto)]">Líneas</h2>
          <ul className="flex flex-col gap-2">
            {lineas.map((l, i) => (
              <li key={i}>
                <Card className="flex items-center justify-between p-2 text-sm">
                  <span>
                    {l.item_nombre}
                    {l.variante_descripcion && ` (${l.variante_descripcion})`} × {l.cantidad}
                  </span>
                  <div className="flex items-center gap-2">
                    <span>${(l.cantidad * l.precio_unitario).toFixed(2)}</span>
                    <button onClick={() => quitarLinea(i)} className="text-xs text-[var(--color-error)]">
                      Quitar
                    </button>
                  </div>
                </Card>
              </li>
            ))}
          </ul>
          <p className="text-right text-sm font-medium text-[var(--color-texto)]">
            Total: ${total.toFixed(2)}
          </p>
        </section>
      )}

      {/* Método de pago y confirmación */}
      <section className="flex flex-col gap-2">
        <label className="flex flex-col gap-1 text-sm text-[var(--color-texto-suave)]">
          Método de pago
          <select
            value={metodoPago}
            onChange={(e) => setMetodoPago(e.target.value as MetodoPago)}
            className={CAMPO}
          >
            {METODOS.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </label>

        {error && <p className="text-sm text-[var(--color-error)]">{error}</p>}

        <Button onClick={confirmarVenta} disabled={enviando}>
          {enviando ? 'Registrando...' : 'Confirmar venta'}
        </Button>
      </section>
    </div>
  )
}
