import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useNegocio } from '../../context/NegocioContext'
import { listarProductosInventario, obtenerAlmacen, type ProductoInventario } from '../../lib/inventario'
import type { Almacen } from '../../types'
import { Card } from '../../components/ui/Card'

function valorProducto(p: ProductoInventario): number {
  if (!p.tiene_variantes) return p.stock * p.costo_promedio
  return p.variantes.reduce((acc, v) => acc + v.existencia * v.costo_promedio, 0)
}

function unidadesProducto(p: ProductoInventario): number {
  if (!p.tiene_variantes) return p.stock
  return p.variantes.reduce((acc, v) => acc + v.existencia, 0)
}

export function AlmacenesPage() {
  const { negocioActivo } = useNegocio()
  const [almacen, setAlmacen] = useState<Almacen | null>(null)
  const [productos, setProductos] = useState<ProductoInventario[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!negocioActivo) return
    Promise.all([obtenerAlmacen(negocioActivo.id), listarProductosInventario(negocioActivo.id)])
      .then(([a, p]) => {
        setAlmacen(a)
        setProductos(p)
      })
      .catch(() => setError('No se pudo cargar el inventario.'))
  }, [negocioActivo])

  if (!negocioActivo) return null

  const valorTotal = productos?.reduce((acc, p) => acc + valorProducto(p), 0) ?? 0
  const unidadesTotales = productos?.reduce((acc, p) => acc + unidadesProducto(p), 0) ?? 0
  const enCero = productos?.filter((p) => unidadesProducto(p) === 0).length ?? 0

  return (
    <div className="p-4 md:p-[22px] lg:p-7">
      <div className="text-[22px] font-medium text-[var(--color-texto)]" style={{ fontFamily: 'var(--fuente-titulos)' }}>
        Inventario
      </div>

      {error && <p className="mt-4 text-sm text-[var(--color-error)]">{error}</p>}
      {!almacen && !error && <p className="mt-4 text-sm text-[var(--color-texto-suave)]">Cargando...</p>}

      {almacen && productos && (
        <div className="mt-4 flex flex-col gap-4 lg:flex-row">
          <Link
            to={`/inventario/almacenes/${almacen.id}`}
            className="flex-1 rounded-xl bg-[var(--color-superficie)] p-4 shadow-[0_1px_3px_rgba(74,50,43,.07)] max-w-[420px]"
          >
            <div className="text-sm font-medium text-[var(--color-texto)]">{almacen.nombre}</div>
            <div className="mt-1 text-[20px] text-[var(--color-primario)]" style={{ fontFamily: 'var(--fuente-titulos)' }}>
              ${valorTotal.toFixed(0)}
            </div>
            <div className="text-xs text-[var(--color-texto-suave)]">valor total del inventario</div>
          </Link>

          <Card className="flex-1 max-w-[420px] p-4">
            <div className="text-sm font-medium text-[var(--color-texto)]">Resumen</div>
            <dl className="mt-2 flex flex-col gap-1.5 text-[13px]">
              <div className="flex justify-between">
                <dt className="text-[var(--color-texto-suave)]">Productos</dt>
                <dd className="font-medium text-[var(--color-texto)]">{productos.length}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-[var(--color-texto-suave)]">Unidades totales</dt>
                <dd className="font-medium text-[var(--color-texto)]">{unidadesTotales}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-[var(--color-texto-suave)]">Productos en cero</dt>
                <dd className="font-medium text-[var(--color-texto)]">{enCero}</dd>
              </div>
            </dl>
          </Card>
        </div>
      )}
    </div>
  )
}
