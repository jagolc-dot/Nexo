import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useNegocio } from '../context/NegocioContext'
import { listarClientes, obtenerResumenVentasPorCliente, type ResumenCliente } from '../lib/clientes'
import type { Cliente } from '../types'
import { claseBoton } from '../components/ui/Button'
import { formatearMoneda } from '../lib/formato'

function IconoBuscar() {
  return (
    <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="#B99A8D" strokeWidth={1.7} strokeLinecap="round">
      <circle cx="11" cy="11" r="6.5" />
      <path d="m16 16 4.5 4.5" />
    </svg>
  )
}
function IconoClientes({ size = 30 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#B99A8D" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="8.5" r="3.25" />
      <path d="M3.5 19c.6-3 2.8-4.75 5.5-4.75s4.9 1.75 5.5 4.75" />
      <circle cx="16.75" cy="9.75" r="2.5" />
      <path d="M17.6 14.6c1.8.55 2.7 1.85 3.1 3.9" />
    </svg>
  )
}
function IconoMas() {
  return (
    <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round">
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </svg>
  )
}
function IconoChevron() {
  return (
    <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="#C9B4AA" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
      <path d="m9.5 6 6 6-6 6" />
    </svg>
  )
}

type OrdenClientes = 'alfabetico' | 'visitas' | 'consumo'

export function ClientesPage() {
  const { negocioActivo } = useNegocio()
  const [clientes, setClientes] = useState<Cliente[] | null>(null)
  const [resumenes, setResumenes] = useState<Record<string, ResumenCliente>>({})
  const [busqueda, setBusqueda] = useState('')
  const [orden, setOrden] = useState<OrdenClientes>('alfabetico')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!negocioActivo) return
    Promise.all([listarClientes(negocioActivo.id, true), obtenerResumenVentasPorCliente(negocioActivo.id)])
      .then(([c, r]) => {
        setClientes(c)
        setResumenes(r)
      })
      .catch(() => setError('No se pudo cargar la lista de clientes.'))
  }, [negocioActivo])

  const filtrados = useMemo(() => {
    if (!clientes) return []
    const q = busqueda.trim().toLowerCase()
    const base = !q
      ? clientes
      : clientes.filter(
          (c) =>
            c.nombre.toLowerCase().includes(q) ||
            (c.telefono ?? '').includes(q) ||
            (c.contacto_red_social ?? '').toLowerCase().includes(q),
        )

    const metrica = orden === 'visitas' ? 'visitas' : orden === 'consumo' ? 'gasto' : null
    if (!metrica) return [...base].sort((a, b) => a.nombre.localeCompare(b.nombre))

    return [...base].sort((a, b) => {
      const diff = (resumenes[b.id]?.[metrica] ?? 0) - (resumenes[a.id]?.[metrica] ?? 0)
      return diff !== 0 ? diff : a.nombre.localeCompare(b.nombre)
    })
  }, [clientes, busqueda, orden, resumenes])

  if (!negocioActivo) return null

  const activas = clientes?.filter((c) => c.activo).length ?? 0
  const desactivadas = clientes?.filter((c) => !c.activo).length ?? 0

  return (
    <div className="p-4 md:p-[22px] lg:p-7">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex-1 text-[22px] font-medium text-[var(--color-texto)]" style={{ fontFamily: 'var(--fuente-titulos)' }}>
          Clientes
        </div>
        <Link to="/clientes/nuevo" className={claseBoton('primario', '!min-h-10 gap-1.5 px-4 text-[13.5px]')}>
          <IconoMas />
          Nueva clienta
        </Link>
      </div>

      <div className="max-w-[760px]">
        <div className="mt-4 flex items-center gap-2.5">
          <div className="flex min-w-0 flex-1 items-center gap-2.5 rounded-[10px] border px-3" style={{ borderColor: 'var(--color-borde-campo)', minHeight: 44 }}>
            <IconoBuscar />
            <input
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar por nombre, teléfono o red"
              className="min-w-0 flex-1 bg-transparent text-[13.5px] text-[var(--color-texto)] outline-none"
            />
          </div>
          <select
            value={orden}
            onChange={(e) => setOrden(e.target.value as OrdenClientes)}
            aria-label="Ordenar por"
            className="shrink-0 rounded-[10px] border px-3 text-[13px] text-[var(--color-texto)] outline-none"
            style={{ borderColor: 'var(--color-borde-campo)', minHeight: 44 }}
          >
            <option value="alfabetico">A–Z</option>
            <option value="visitas">Más visitas</option>
            <option value="consumo">Más consumo</option>
          </select>
        </div>

        {error && <p className="mt-4 text-sm text-[var(--color-error)]">{error}</p>}
        {clientes === null && !error && <p className="mt-4 text-sm text-[var(--color-texto-suave)]">Cargando...</p>}

        {clientes && clientes.length === 0 && (
          <div className="mt-4 flex flex-col items-center rounded-xl bg-[var(--color-superficie)] px-6 py-12 text-center shadow-[0_1px_3px_rgba(74,50,43,.07)]">
            <IconoClientes />
            <div className="mt-3 text-[14.5px] font-medium text-[var(--color-texto)]">Aún no hay clientas</div>
            <p className="mt-1 max-w-[260px] text-[13px] text-[var(--color-texto-suave)]">Se crean aquí o directamente al agendar una cita.</p>
            <Link to="/clientes/nuevo" className={`mt-4 ${claseBoton('primario')}`}>
              Nueva clienta
            </Link>
          </div>
        )}

        {clientes && clientes.length > 0 && filtrados.length === 0 && (
          <div className="mt-4 flex flex-col items-center rounded-xl bg-[var(--color-superficie)] px-6 py-10 text-center shadow-[0_1px_3px_rgba(74,50,43,.07)]">
            <IconoBuscar />
            <div className="mt-3 text-[14.5px] font-medium text-[var(--color-texto)]">Sin resultados para «{busqueda}»</div>
            <p className="mt-1 max-w-[280px] text-[13px] text-[var(--color-texto-suave)]">Revisa la escritura o créala como nueva clienta.</p>
            <Link to={`/clientes/nuevo?nombre=${encodeURIComponent(busqueda)}`} className={`mt-4 ${claseBoton('secundario')}`}>
              Crear «{busqueda}»
            </Link>
          </div>
        )}

        {clientes && filtrados.length > 0 && (
          <>
            <p className="mt-3 text-xs text-[var(--color-texto-suave)]">
              {activas} clienta{activas === 1 ? '' : 's'} activa{activas === 1 ? '' : 's'}
              {desactivadas > 0 && ` · ${desactivadas} desactivada${desactivadas === 1 ? '' : 's'}`}
            </p>
            <div className="mt-2.5 rounded-xl bg-[var(--color-superficie)] px-4 shadow-[0_1px_3px_rgba(74,50,43,.07)]">
              {filtrados.map((c, i) => {
                const r = resumenes[c.id]
                return (
                  <Link
                    key={c.id}
                    to={`/clientes/${c.id}`}
                    className={`flex items-center gap-3 py-3 ${i > 0 ? 'border-t' : ''}`}
                    style={{ borderColor: 'var(--color-divisor)' }}
                  >
                    <span
                      className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-full text-sm font-medium"
                      style={{
                        background: 'color-mix(in srgb, var(--color-secundario) 18%, white)',
                        color: '#68785B',
                        opacity: c.activo ? 1 : 0.45,
                      }}
                    >
                      {c.nombre.charAt(0).toUpperCase()}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium" style={{ color: c.activo ? 'var(--color-texto)' : '#9C9C97' }}>
                          {c.nombre}
                        </span>
                        {!c.activo && (
                          <span className="inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium" style={{ background: '#F0EDEA', color: '#9C9C97' }}>
                            Desactivada
                          </span>
                        )}
                      </div>
                      <div className="truncate text-[12.5px] text-[var(--color-texto-suave)]">
                        {[c.telefono, c.contacto_red_social].filter(Boolean).join(' · ') || 'Sin contacto'}
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <div className="text-[13px] font-medium text-[var(--color-texto)]">{formatearMoneda(r?.gasto ?? 0)}</div>
                      <div className="mt-0.5 text-xs text-[var(--color-texto-suave)]">
                        {r?.visitas ?? 0} visita{(r?.visitas ?? 0) === 1 ? '' : 's'}
                      </div>
                    </div>
                    <IconoChevron />
                  </Link>
                )
              })}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
