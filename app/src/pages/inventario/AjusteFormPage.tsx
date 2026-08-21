import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useNegocio } from '../../context/NegocioContext'
import { listarProductosInventario, obtenerAlmacen, registrarAjuste, type ProductoInventario } from '../../lib/inventario'
import { Button } from '../../components/ui/Button'

const CAMPO =
  'flex min-h-11 w-full items-center rounded-[10px] border bg-[var(--color-superficie)] px-3 text-sm text-[var(--color-texto)] outline-none focus:border-[var(--color-primario)]'
const ESTILO_CAMPO = { borderColor: 'var(--color-borde-campo)' }

const MOTIVOS = ['Merma', 'Rotura', 'Caducidad', 'Pérdida', 'Obsequio', 'Corrección de conteo', 'Otro']

export function AjusteFormPage() {
  const { negocioActivo } = useNegocio()
  const navigate = useNavigate()

  const [almacenId, setAlmacenId] = useState<string | null>(null)
  const [productos, setProductos] = useState<ProductoInventario[]>([])
  const [itemId, setItemId] = useState('')
  const [varianteId, setVarianteId] = useState('')
  const [tipo, setTipo] = useState<'ajuste_positivo' | 'ajuste_negativo'>('ajuste_negativo')
  const [cantidad, setCantidad] = useState('')
  const [costoUnitario, setCostoUnitario] = useState('')
  const [motivo, setMotivo] = useState('')
  const [motivoLibre, setMotivoLibre] = useState('')
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
    const motivoFinal = motivo === 'Otro' ? motivoLibre.trim() : motivo
    if (!motivoFinal) {
      setError('El motivo es obligatorio.')
      return
    }
    if (tipo === 'ajuste_positivo' && !costoUnitario) {
      setError('Un ajuste positivo requiere capturar el costo unitario.')
      return
    }

    setEnviando(true)
    try {
      await registrarAjuste(
        negocioActivo!.id,
        almacenId,
        producto?.tiene_variantes ? { varianteId } : { itemId },
        tipo,
        cantidadNum,
        motivoFinal,
        tipo === 'ajuste_positivo' ? Number(costoUnitario) : undefined,
      )
      navigate('/inventario', { replace: true })
    } catch (err) {
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

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setTipo('ajuste_negativo')}
            className={`flex-1 rounded-lg border-2 py-2 text-sm font-medium ${tipo === 'ajuste_negativo' ? 'border-[var(--color-primario)] text-[var(--color-primario)]' : 'border-[var(--color-hairline)] text-[var(--color-texto-suave)]'}`}
          >
            Negativo (merma, pérdida...)
          </button>
          <button
            type="button"
            onClick={() => setTipo('ajuste_positivo')}
            className={`flex-1 rounded-lg border-2 py-2 text-sm font-medium ${tipo === 'ajuste_positivo' ? 'border-[var(--color-primario)] text-[var(--color-primario)]' : 'border-[var(--color-hairline)] text-[var(--color-texto-suave)]'}`}
          >
            Positivo (conteo físico)
          </button>
        </div>

        <label className="flex flex-col gap-1.5 text-xs font-medium text-[var(--color-texto)]">
          Cantidad
          <input type="number" min="1" value={cantidad} onChange={(e) => setCantidad(e.target.value)} className={CAMPO} style={ESTILO_CAMPO} />
        </label>

        {tipo === 'ajuste_positivo' && (
          <label className="flex flex-col gap-1.5 text-xs font-medium text-[var(--color-texto)]">
            Costo unitario
            <div className={CAMPO} style={ESTILO_CAMPO}>
              <span className="mr-1 font-normal text-[var(--color-texto-suave)]">$</span>
              <input
                type="number"
                step="0.01"
                min="0"
                value={costoUnitario}
                onChange={(e) => setCostoUnitario(e.target.value)}
                className="min-w-0 flex-1 bg-transparent font-medium outline-none"
              />
            </div>
          </label>
        )}

        <label className="flex flex-col gap-1.5 text-xs font-medium text-[var(--color-texto)]">
          Motivo
          <select value={motivo} onChange={(e) => setMotivo(e.target.value)} className={CAMPO} style={ESTILO_CAMPO}>
            <option value="">Selecciona...</option>
            {MOTIVOS.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </label>
        {motivo === 'Otro' && (
          <input
            value={motivoLibre}
            onChange={(e) => setMotivoLibre(e.target.value)}
            placeholder="Describe el motivo"
            className={CAMPO}
            style={ESTILO_CAMPO}
          />
        )}

        {error && <p className="text-sm text-[var(--color-error)]">{error}</p>}

        <Button type="submit" disabled={enviando} className="mt-1 w-full">
          {enviando ? 'Guardando...' : 'Registrar ajuste'}
        </Button>
      </form>
    </div>
  )
}
