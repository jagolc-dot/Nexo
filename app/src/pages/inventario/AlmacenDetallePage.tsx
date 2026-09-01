import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useNegocio } from '../../context/NegocioContext'
import { listarProductosInventario, type ProductoInventario } from '../../lib/inventario'
import { listarCategorias } from '../../lib/catalogo'
import type { CategoriaItem } from '../../types'
import { claseBoton } from '../../components/ui/Button'
import { TablaReporte } from '../../components/reportes/TablaReporte'
import type { FormatoColumna } from '../../lib/exportar'

export function AlmacenDetallePage() {
  const { negocioActivo } = useNegocio()
  const [productos, setProductos] = useState<ProductoInventario[] | null>(null)
  const [categorias, setCategorias] = useState<CategoriaItem[]>([])
  const [categoriaFiltro, setCategoriaFiltro] = useState('')
  const [soloBajos, setSoloBajos] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!negocioActivo) return
    Promise.all([listarProductosInventario(negocioActivo.id), listarCategorias(negocioActivo.id, false, 'producto')])
      .then(([p, c]) => {
        setProductos(p)
        setCategorias(c)
      })
      .catch(() => setError('No se pudo cargar el inventario.'))
  }, [negocioActivo])

  const filtrados = useMemo(() => {
    if (!productos) return []
    return productos.filter((p) => {
      if (categoriaFiltro && p.categoria !== categoriaFiltro) return false
      if (soloBajos) {
        const unidades = p.tiene_variantes ? p.variantes.reduce((a, v) => a + v.existencia, 0) : p.stock
        if (unidades > 5) return false
      }
      return true
    })
  }, [productos, categoriaFiltro, soloBajos])

  if (!negocioActivo) return null

  const filas: (string | number)[][] = []
  for (const p of filtrados) {
    if (!p.tiene_variantes) {
      filas.push([p.codigo ?? '—', p.nombre, p.categoria ?? '—', p.unidad ?? '—', p.stock, p.costo_promedio, p.stock * p.costo_promedio])
      continue
    }
    for (const v of p.variantes) {
      const desc = [v.color, v.talla].filter(Boolean).join(' / ') || 'Sin color/talla'
      filas.push([
        v.codigo ?? '—',
        `${p.nombre} (${desc})`,
        p.categoria ?? '—',
        p.unidad ?? '—',
        v.existencia,
        v.costo_promedio,
        v.existencia * v.costo_promedio,
      ])
    }
  }
  const formatosTabla: FormatoColumna[] = ['texto', 'texto', 'texto', 'texto', 'cantidad', 'moneda', 'moneda']

  return (
    <div className="p-4 md:p-[22px] lg:p-7">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex-1 text-[22px] font-medium text-[var(--color-texto)]" style={{ fontFamily: 'var(--fuente-titulos)' }}>
          Almacén
        </div>
        <Link to="/inventario/compras" className={claseBoton('secundario', '!min-h-10 px-3.5 text-[13px]')}>
          Historial de compras
        </Link>
        <Link to="/inventario/ajuste" className={claseBoton('secundario', '!min-h-10 px-3.5 text-[13px]')}>
          Ajuste de inventario
        </Link>
        <Link to="/inventario/compras/nueva" className={claseBoton('primario', '!min-h-10 px-4 text-[13.5px]')}>
          Agregar compra
        </Link>
      </div>

      <div className="mt-3.5 flex flex-wrap items-center gap-2.5">
        <select
          value={categoriaFiltro}
          onChange={(e) => setCategoriaFiltro(e.target.value)}
          className="min-h-9 rounded-full border px-3 text-[12.5px] font-medium text-[var(--color-texto)] outline-none"
          style={{ borderColor: 'var(--color-borde-campo)' }}
        >
          <option value="">Categoría: Todas</option>
          {categorias.map((c) => (
            <option key={c.id} value={c.nombre}>
              Categoría: {c.nombre}
            </option>
          ))}
        </select>
        <label className="flex items-center gap-1.5 text-[12.5px] font-medium text-[var(--color-texto-suave)]">
          <input type="checkbox" checked={soloBajos} onChange={(e) => setSoloBajos(e.target.checked)} />
          Existencia baja o cero
        </label>
      </div>

      <div className="mt-4 flex flex-col gap-4">
        {error && <p className="text-sm text-[var(--color-error)]">{error}</p>}
        {!productos && !error && <p className="text-sm text-[var(--color-texto-suave)]">Cargando...</p>}
        {productos && (
          <>
            <div className="flex flex-wrap gap-2">
              {filtrados.map((p) => (
                <Link
                  key={p.id}
                  to={`/inventario/productos/${p.id}`}
                  className="rounded-full border px-3 py-1.5 text-xs font-medium text-[var(--color-texto)]"
                  style={{ borderColor: 'var(--color-borde-campo)' }}
                >
                  {p.nombre} — ver kardex
                </Link>
              ))}
            </div>
            <TablaReporte
              titulo="Productos en inventario"
              columnas={['Código', 'Producto', 'Categoría', 'Unidad', 'Existencia', 'Costo promedio', 'Valor total']}
              filas={filas}
              formatos={formatosTabla}
            />
          </>
        )}
      </div>
    </div>
  )
}
