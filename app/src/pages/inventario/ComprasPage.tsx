import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useNegocio } from '../../context/NegocioContext'
import { listarCompras } from '../../lib/inventario'
import type { Compra } from '../../types'
import { claseBoton } from '../../components/ui/Button'
import { EstadoBadge } from '../../components/ui/EstadoBadge'
import { formatearFechaSolo } from '../../lib/tiempoNegocio'

export function ComprasPage() {
  const { negocioActivo } = useNegocio()
  const [compras, setCompras] = useState<Compra[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!negocioActivo) return
    listarCompras(negocioActivo.id).then(setCompras).catch(() => setError('No se pudo cargar el historial de compras.'))
  }, [negocioActivo])

  if (!negocioActivo) return null

  return (
    <div className="p-4 md:p-[22px] lg:p-7">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex-1 text-[22px] font-medium text-[var(--color-texto)]" style={{ fontFamily: 'var(--fuente-titulos)' }}>
          Compras
        </div>
        <Link to="/inventario/compras/nueva" className={claseBoton('primario', '!min-h-10 px-4 text-[13.5px]')}>
          Nueva compra
        </Link>
      </div>

      <div className="mt-4 max-w-[820px]">
        {error && <p className="text-sm text-[var(--color-error)]">{error}</p>}
        {!compras && !error && <p className="text-sm text-[var(--color-texto-suave)]">Cargando...</p>}

        {compras && compras.length === 0 && (
          <div className="mt-4 flex flex-col items-center rounded-xl bg-[var(--color-superficie)] px-6 py-12 text-center shadow-[0_1px_3px_rgba(74,50,43,.07)]">
            <div className="text-[14.5px] font-medium text-[var(--color-texto)]">Aún no hay compras registradas</div>
            <Link to="/inventario/compras/nueva" className={`mt-4 ${claseBoton('primario')}`}>
              Nueva compra
            </Link>
          </div>
        )}

        {compras && compras.length > 0 && (
          <div className="rounded-xl bg-[var(--color-superficie)] px-4 shadow-[0_1px_3px_rgba(74,50,43,.07)]">
            {compras.map((c, i) => (
              <Link
                key={c.id}
                to={`/inventario/compras/${c.id}`}
                className={`flex items-center gap-3 py-3 ${i > 0 ? 'border-t' : ''}`}
                style={{ borderColor: 'var(--color-divisor)' }}
              >
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium text-[var(--color-texto)]">{c.proveedor ?? 'Sin proveedor'}</div>
                  <div className="text-[12.5px] text-[var(--color-texto-suave)]">
                    {formatearFechaSolo(c.fecha)}
                    {c.folio && ` · folio ${c.folio}`}
                  </div>
                </div>
                {c.estado === 'cancelada' && <EstadoBadge tipo="neutral" texto="Cancelada" />}
                <div className="shrink-0 text-right text-sm font-medium text-[var(--color-texto)]">${c.total.toFixed(2)}</div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
