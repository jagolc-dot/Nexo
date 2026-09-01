import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useNegocio } from '../../context/NegocioContext'
import { confirmarCompra, listarProductosInventario, obtenerAlmacen, type ProductoInventario } from '../../lib/inventario'
import { hoyEnNegocio } from '../../lib/tiempoNegocio'
import { Button } from '../../components/ui/Button'
import { CampoMoneda } from '../../components/ui/CampoMoneda'
import { formatearMonedaPrecisa } from '../../lib/formato'

const CAMPO =
  'flex min-h-11 w-full items-center rounded-[10px] border bg-[var(--color-superficie)] px-3 text-sm text-[var(--color-texto)] outline-none focus:border-[var(--color-primario)]'
const ESTILO_CAMPO = { borderColor: 'var(--color-borde-campo)' }

interface FilaPartida {
  itemId: string
  varianteId: string
  cantidad: string
  costoPartida: string
}

function filaVacia(): FilaPartida {
  return { itemId: '', varianteId: '', cantidad: '', costoPartida: '' }
}

export function CompraFormPage() {
  const { negocioActivo } = useNegocio()
  const navigate = useNavigate()

  const [almacenId, setAlmacenId] = useState<string | null>(null)
  const [productos, setProductos] = useState<ProductoInventario[]>([])
  const [proveedor, setProveedor] = useState('')
  const [folio, setFolio] = useState('')
  const [fecha, setFecha] = useState(hoyEnNegocio())
  const [notas, setNotas] = useState('')
  const [costoEnvio, setCostoEnvio] = useState('')
  const [partidas, setPartidas] = useState<FilaPartida[]>([filaVacia()])
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!negocioActivo) return
    Promise.all([obtenerAlmacen(negocioActivo.id), listarProductosInventario(negocioActivo.id)]).then(([a, p]) => {
      setAlmacenId(a.id)
      setProductos(p)
    })
  }, [negocioActivo])

  if (!negocioActivo) return null

  function actualizarPartida(i: number, cambios: Partial<FilaPartida>) {
    setPartidas((prev) => prev.map((p, idx) => (idx === i ? { ...p, ...cambios } : p)))
  }

  function agregarPartida() {
    setPartidas((prev) => [...prev, filaVacia()])
  }

  function quitarPartida(i: number) {
    setPartidas((prev) => prev.filter((_, idx) => idx !== i))
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)

    if (!almacenId) return
    const partidasValidas = partidas.filter((p) => p.itemId && Number(p.cantidad) > 0 && Number(p.costoPartida) > 0)
    if (partidasValidas.length === 0) {
      setError('Agrega al menos una partida con producto, cantidad y costo mayores a cero.')
      return
    }
    for (const p of partidasValidas) {
      const producto = productos.find((x) => x.id === p.itemId)
      if (producto?.tiene_variantes && !p.varianteId) {
        setError(`Selecciona la variante de "${producto.nombre}".`)
        return
      }
    }
    const envio = Number(costoEnvio)
    if (costoEnvio && (Number.isNaN(envio) || envio < 0)) {
      setError('El costo de envío no es un número válido.')
      return
    }

    setEnviando(true)
    try {
      await confirmarCompra(
        negocioActivo!.id,
        almacenId,
        proveedor || null,
        folio || null,
        fecha,
        notas || null,
        costoEnvio ? envio : 0,
        partidasValidas.map((p) => {
          const producto = productos.find((x) => x.id === p.itemId)
          return {
            item_id: producto?.tiene_variantes ? null : p.itemId,
            variante_id: producto?.tiene_variantes ? p.varianteId : null,
            cantidad: Number(p.cantidad),
            costo_total_partida: Number(p.costoPartida),
          }
        }),
      )
      navigate('/inventario/compras', { replace: true })
    } catch (err) {
      console.error(err)
      setError(err instanceof Error ? err.message : 'No se pudo registrar la compra.')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="mx-auto w-full max-w-[720px] p-4 md:p-[22px] lg:p-7">
      <div className="text-[22px] font-medium text-[var(--color-texto)]" style={{ fontFamily: 'var(--fuente-titulos)' }}>
        Nueva compra
      </div>

      <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-3.5">
        <div className="flex flex-wrap gap-3">
          <label className="flex flex-1 flex-col gap-1.5 text-xs font-medium text-[var(--color-texto)]">
            Proveedor
            <input value={proveedor} onChange={(e) => setProveedor(e.target.value)} className={CAMPO} style={ESTILO_CAMPO} />
          </label>
          <label className="flex flex-1 flex-col gap-1.5 text-xs font-medium text-[var(--color-texto)]">
            Folio / factura
            <input value={folio} onChange={(e) => setFolio(e.target.value)} className={CAMPO} style={ESTILO_CAMPO} />
          </label>
          <label className="flex flex-col gap-1.5 text-xs font-medium text-[var(--color-texto)]">
            Fecha
            <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className={CAMPO} style={ESTILO_CAMPO} />
          </label>
        </div>

        <label className="flex flex-col gap-1.5 text-xs font-medium text-[var(--color-texto)]">
          Notas (opcional)
          <input value={notas} onChange={(e) => setNotas(e.target.value)} className={CAMPO} style={ESTILO_CAMPO} />
        </label>

        <div className="text-xs font-medium text-[var(--color-texto)]">Partidas</div>
        {partidas.map((p, i) => {
          const producto = productos.find((x) => x.id === p.itemId)
          const cantidadNum = Number(p.cantidad)
          const costoNum = Number(p.costoPartida)
          const costoUnitario = cantidadNum > 0 && costoNum > 0 ? costoNum / cantidadNum : null
          return (
            <div key={i} className="flex flex-wrap items-end gap-2 rounded-lg border border-dashed border-black/20 p-3">
              <label className="flex flex-1 min-w-[160px] flex-col gap-1.5 text-xs text-[var(--color-texto-suave)]">
                Producto
                <select value={p.itemId} onChange={(e) => actualizarPartida(i, { itemId: e.target.value, varianteId: '' })} className={CAMPO} style={ESTILO_CAMPO}>
                  <option value="">Selecciona...</option>
                  {productos.map((prod) => (
                    <option key={prod.id} value={prod.id}>
                      {prod.nombre}
                    </option>
                  ))}
                </select>
              </label>
              {producto?.tiene_variantes && (
                <label className="flex flex-1 min-w-[140px] flex-col gap-1.5 text-xs text-[var(--color-texto-suave)]">
                  Variante
                  <select value={p.varianteId} onChange={(e) => actualizarPartida(i, { varianteId: e.target.value })} className={CAMPO} style={ESTILO_CAMPO}>
                    <option value="">Selecciona...</option>
                    {producto.variantes.map((v) => (
                      <option key={v.id} value={v.id}>
                        {[v.color, v.talla].filter(Boolean).join(' / ') || 'Sin color/talla'}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              <label className="flex w-24 flex-col gap-1.5 text-xs text-[var(--color-texto-suave)]">
                Cantidad
                <input type="number" min="1" step="1" value={p.cantidad} onChange={(e) => actualizarPartida(i, { cantidad: e.target.value })} className={CAMPO} style={ESTILO_CAMPO} />
              </label>
              <label className="flex w-36 flex-col gap-1.5 text-xs text-[var(--color-texto-suave)]">
                Costo total
                <CampoMoneda valor={p.costoPartida} onChange={(v) => actualizarPartida(i, { costoPartida: v })} />
              </label>
              {costoUnitario !== null && (
                <span className="pb-3 text-xs text-[var(--color-texto-suave)]">unitario: {formatearMonedaPrecisa(costoUnitario)}</span>
              )}
              {partidas.length > 1 && (
                <button type="button" onClick={() => quitarPartida(i)} className="pb-3 text-xs" style={{ color: 'var(--color-error)' }}>
                  Quitar
                </button>
              )}
            </div>
          )
        })}
        <Button type="button" variante="secundario" onClick={agregarPartida} className="self-start">
          + Agregar partida
        </Button>

        <label className="flex max-w-[240px] flex-col gap-1.5 text-xs font-medium text-[var(--color-texto)]">
          Costo de envío (opcional)
          <CampoMoneda valor={costoEnvio} onChange={setCostoEnvio} />
        </label>
        <p className="-mt-2 text-xs text-[var(--color-texto-suave)]">
          El envío se prorratea entre las partidas en proporción a su costo.
        </p>

        {error && <p className="text-sm text-[var(--color-error)]">{error}</p>}

        <Button type="submit" disabled={enviando} className="mt-1 w-full">
          {enviando ? 'Guardando...' : 'Confirmar compra'}
        </Button>
      </form>
    </div>
  )
}
