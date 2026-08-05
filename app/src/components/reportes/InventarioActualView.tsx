import { useEffect, useState } from 'react'
import { obtenerInventarioActual, type FilaInventario } from '../../lib/reportes'
import { TablaReporte } from './TablaReporte'

export function InventarioActualView({ negocioId }: { negocioId: string }) {
  const [datos, setDatos] = useState<FilaInventario[] | null>(null)

  useEffect(() => {
    setDatos(null)
    obtenerInventarioActual(negocioId).then(setDatos)
  }, [negocioId])

  if (!datos) return <p className="text-sm text-[var(--color-texto-suave)]">Cargando...</p>

  const filas: (string | number)[][] = datos.map((f) => [
    f.item,
    f.color ?? '—',
    f.talla ?? '—',
    f.existencia,
    f.costo_promedio.toFixed(2),
  ])

  return (
    <TablaReporte
      titulo="Inventario actual"
      columnas={['Producto', 'Color', 'Talla', 'Existencia', 'Costo promedio']}
      filas={filas}
    />
  )
}
