import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useNegocio } from '../../context/NegocioContext'
import { listarProductosInventario, obtenerAlmacen, registrarAjuste, type ProductoInventario } from '../../lib/inventario'
import { hoyEnNegocio } from '../../lib/tiempoNegocio'
import type { TipoAjuste } from '../../types'
import { Button } from '../../components/ui/Button'

const CAMPO =
  'flex min-h-11 w-full items-center rounded-[10px] border bg-[var(--color-superficie)] px-3 text-sm text-[var(--color-texto)] outline-none focus:border-[var(--color-primario)]'
const ESTILO_CAMPO = { borderColor: 'var(--color-borde-campo)' }

const TIPOS: { valor: TipoAjuste; etiqueta: string }[] = [
  { valor: 'merma', etiqueta: 'Merma' },
  { valor: 'caducidad', etiqueta: 'Caducidad' },
  { valor: 'perdida', etiqueta: 'Pérdida' },
  { valor: 'obsequio', etiqueta: 'Obsequio' },
  { valor: 'uso_interno', etiqueta: 'Uso interno' },
  { valor: 'ajuste_conteo', etiqueta: 'Corrección de conteo físico' },
]

export function AjusteFormPage() {
  const { negocioActivo } = useNegocio()
  const navigate = useNavigate()

  const [almacenId, setAlmacenId] = useState<string | null>(null)
  const [productos, setProductos] = useState<ProductoInventario[]>([])
  const [itemId, setItemId] = useState('')
  const [varianteId, setVarianteId] = useState('')
  const [tipo, setTipo] = useState<TipoAjuste>('merma')
  const [signoConteo, setSignoConteo] = useState<'mas' | 'menos'>('menos')
  const [cantidad, setCantidad] = useState('')
  const [motivo, setMotivo] = useState('')
  const [fecha, setFecha] = useState(hoyEnNegocio())
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

  const producto = productos.find((p) => p.id === itemId)
  const esConteo = tipo === 'ajuste_conteo'

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)

    if (!almacenId || !itemId) {
      setError('Selecciona un producto.')
      return
    }
    if (producto?.tiene_variantes && !varianteId) {
      setError('Selecciona la variante.')
      return
    }
    const cantidadNum = Number(cantidad)
    if (!cantidadNum || cantidadNum <= 0) {
      setError('La cantidad debe ser mayor a 0.')
      return
    }
    if (!motivo.trim()) {
      setError('El motivo es obligatorio.')
      return
    }

    const cantidadConSigno = esConteo && signoConteo === 'mas' ? cantidadNum : -cantidadNum

    setEnviando(true)
    try {
      await registrarAjuste(
        negocioActivo!.id,
        almacenId,
        producto?.tiene_variantes ? { varianteId } : { itemId },
        tipo,
        cantidadConSigno,
        motivo.trim(),
        fecha,
      )
      navigate('/inventario', { replace: true })
    } catch (err) {
      console.error(err)
      setError(err instanceof Error ? err.message : 'No se pudo registrar el ajuste.')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="mx-auto w-full max-w-[480px] p-4 md:p-[22px] lg:p-7">
      <div className="text-[22px] font-medium text-[var(--color-texto)]" style={{ fontFamily: 'var(--fuente-titulos)' }}>
        Ajuste de inventario
      </div>

      <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-3.5">
        <label className="flex flex-col gap-1.5 text-xs font-medium text-[var(--color-texto)]">
          Producto
          <select
            value={itemId}
            onChange={(e) => {
              setItemId(e.target.value)
              setVarianteId('')
            }}
            className={CAMPO}
            style={ESTILO_CAMPO}
          >
            <option value="">Selecciona...</option>
            {productos.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nombre}
              </option>
            ))}
          </select>
        </label>

        {producto?.tiene_variantes && (
          <label className="flex flex-col gap-1.5 text-xs font-medium text-[var(--color-texto)]">
            Variante
            <select value={varianteId} onChange={(e) => setVarianteId(e.target.value)} className={CAMPO} style={ESTILO_CAMPO}>
              <option value="">Selecciona...</option>
              {producto.variantes.map((v) => (
                <option key={v.id} value={v.id}>
                  {[v.color, v.talla].filter(Boolean).join(' / ') || 'Sin color/talla'}
                </option>
              ))}
            </select>
          </label>
        )}

        <label className="flex flex-col gap-1.5 text-xs font-medium text-[var(--color-texto)]">
          Tipo de ajuste
          <select value={tipo} onChange={(e) => setTipo(e.target.value as TipoAjuste)} className={CAMPO} style={ESTILO_CAMPO}>
            {TIPOS.map((t) => (
              <option key={t.valor} value={t.valor}>
                {t.etiqueta}
              </option>
            ))}
          </select>
        </label>

        {esConteo && (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setSignoConteo('mas')}
              className={`flex-1 rounded-lg border-2 py-2 text-sm font-medium ${signoConteo === 'mas' ? 'border-[var(--color-primario)] text-[var(--color-primario)]' : 'border-[var(--color-hairline)] text-[var(--color-texto-suave)]'}`}
            >
              Encontré más de lo registrado
            </button>
            <button
              type="button"
              onClick={() => setSignoConteo('menos')}
              className={`flex-1 rounded-lg border-2 py-2 text-sm font-medium ${signoConteo === 'menos' ? 'border-[var(--color-primario)] text-[var(--color-primario)]' : 'border-[var(--color-hairline)] text-[var(--color-texto-suave)]'}`}
            >
              Encontré menos de lo registrado
            </button>
          </div>
        )}

        <label className="flex flex-col gap-1.5 text-xs font-medium text-[var(--color-texto)]">
          Cantidad
          <input type="number" min="1" value={cantidad} onChange={(e) => setCantidad(e.target.value)} className={CAMPO} style={ESTILO_CAMPO} />
        </label>

        <label className="flex flex-col gap-1.5 text-xs font-medium text-[var(--color-texto)]">
          Fecha
          <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className={CAMPO} style={ESTILO_CAMPO} />
        </label>

        <label className="flex flex-col gap-1.5 text-xs font-medium text-[var(--color-texto)]">
          Motivo
          <input
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            placeholder="Describe qué pasó"
            className={CAMPO}
            style={ESTILO_CAMPO}
          />
        </label>

        {error && <p className="text-sm text-[var(--color-error)]">{error}</p>}

        <Button type="submit" disabled={enviando} className="mt-1 w-full">
          {enviando ? 'Guardando...' : 'Registrar ajuste'}
        </Button>
      </form>
    </div>
  )
}
