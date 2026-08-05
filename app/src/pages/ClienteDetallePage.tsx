import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { cambiarActivoCliente, obtenerCliente, obtenerHistorialCliente, type VisitaCliente } from '../lib/clientes'
import type { Cliente } from '../types'
import { claseBoton } from '../components/ui/Button'

function IconoVolver() {
  return (
    <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M14.5 6 8.5 12l6 6" />
    </svg>
  )
}
function IconoWhatsapp() {
  return (
    <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="#68785B" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3a9 9 0 0 0-7.8 13.4L3 21l4.7-1.2A9 9 0 1 0 12 3z" />
    </svg>
  )
}

function mesAño(iso: string): string {
  return new Date(iso).toLocaleDateString('es-MX', { month: 'short', year: 'numeric' })
}

function Tarjeta({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`rounded-xl bg-[var(--color-superficie)] shadow-[0_1px_3px_rgba(74,50,43,.07)] ${className}`}>{children}</div>
}

export function ClienteDetallePage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [cliente, setCliente] = useState<Cliente | null>(null)
  const [historial, setHistorial] = useState<VisitaCliente[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function cargar() {
    if (!id) return
    try {
      const [c, h] = await Promise.all([obtenerCliente(id), obtenerHistorialCliente(id)])
      setCliente(c)
      setHistorial(h)
    } catch {
      setError('No se pudo cargar el cliente.')
    }
  }

  useEffect(() => {
    cargar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  if (error) return <p className="p-4 text-sm text-[var(--color-error)]">{error}</p>
  if (!cliente || !historial) return <p className="p-4 text-sm text-[var(--color-texto-suave)]">Cargando...</p>

  const confirmadas = historial.filter((v) => v.estado === 'confirmada')
  const gastoTotal = confirmadas.reduce((acc, v) => acc + v.total, 0)
  const telefonoLimpio = cliente.telefono?.replace(/\D/g, '') ?? ''
  const [redPlataforma, ...redResto] = (cliente.contacto_red_social ?? '').split(' ')
  const redEsPlataforma = /instagram|facebook|tiktok/i.test(redPlataforma)

  return (
    <div className="p-4 md:p-[22px] lg:p-7">
      <div className="flex items-center gap-2.5">
        <button onClick={() => navigate('/clientes')} className="flex h-9 w-9 items-center justify-center rounded-lg text-[var(--color-texto)] hover:bg-[var(--color-hover-nav)]" aria-label="Volver">
          <IconoVolver />
        </button>
        <span className="text-[13px] text-[var(--color-texto-suave)]">Clientes</span>
      </div>

      <div className="mt-3.5 grid max-w-[980px] grid-cols-1 items-start gap-4 lg:grid-cols-[340px_1fr]">
        <div className="flex min-w-0 flex-col gap-4">
          <Tarjeta className="p-5">
            <div className="flex items-center gap-3.5">
              <span
                className="flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-full text-xl font-medium"
                style={{ background: 'color-mix(in srgb, var(--color-secundario) 18%, white)', color: '#68785B' }}
              >
                {cliente.nombre.charAt(0).toUpperCase()}
              </span>
              <div className="min-w-0">
                <div className="text-[19px] font-medium text-[var(--color-texto)]" style={{ fontFamily: 'var(--fuente-titulos)' }}>
                  {cliente.nombre}
                </div>
                <div className="mt-0.5 text-[12.5px] text-[var(--color-texto-suave)]">Clienta desde {mesAño(cliente.creado_en)}</div>
              </div>
            </div>

            {cliente.telefono && (
              <div className="mt-4 flex items-center gap-2.5 rounded-[10px] p-3" style={{ background: 'var(--color-fondo)' }}>
                <div className="min-w-0 flex-1">
                  <div className="text-[11.5px] font-medium uppercase tracking-[.07em] text-[var(--color-texto-suave)]">Teléfono</div>
                  <div className="mt-0.5 text-[13.5px] text-[var(--color-texto)]">{cliente.telefono}</div>
                </div>
                {telefonoLimpio && (
                  <a
                    href={`https://wa.me/${telefonoLimpio}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex shrink-0 items-center gap-1.5 rounded-lg border-[1.5px] px-3 text-xs font-medium text-[var(--color-texto)]"
                    style={{ borderColor: 'var(--color-secundario)', minHeight: 36 }}
                  >
                    <IconoWhatsapp />
                    WhatsApp
                  </a>
                )}
              </div>
            )}

            {cliente.contacto_red_social && (
              <div className="mt-2 rounded-[10px] p-3" style={{ background: 'var(--color-fondo)' }}>
                <div className="text-[11.5px] font-medium uppercase tracking-[.07em] text-[var(--color-texto-suave)]">
                  {redEsPlataforma ? redPlataforma : 'Red social'}
                </div>
                <div className="mt-0.5 text-[13.5px] text-[var(--color-texto)]">{redEsPlataforma ? redResto.join(' ') || redPlataforma : cliente.contacto_red_social}</div>
              </div>
            )}

            <div className="mt-4 flex gap-2">
              <Link to={`/clientes/${cliente.id}/editar`} className={claseBoton('secundario', 'flex-1')}>
                Editar
              </Link>
              <button
                onClick={async () => {
                  if (!confirm('¿Desactivar esta clienta? Se oculta de búsquedas y agendado; su historial permanece.')) return
                  await cambiarActivoCliente(cliente.id, !cliente.activo)
                  cargar()
                }}
                className="flex-1 rounded-lg border-[1.5px] text-[13.5px] font-medium text-[var(--color-texto-suave)]"
                style={{ borderColor: '#E0CCC2', minHeight: 44 }}
              >
                {cliente.activo ? 'Desactivar' : 'Reactivar'}
              </button>
            </div>
          </Tarjeta>

          <Tarjeta className="p-5">
            <div className="flex items-center justify-between gap-2">
              <div className="text-[11.5px] font-medium uppercase tracking-[.07em] text-[var(--color-texto-suave)]">Notas</div>
              <Link to={`/clientes/${cliente.id}/editar`} aria-label="Editar notas" className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--color-texto-suave)] hover:bg-[var(--color-hover-nav)]">
                <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
                  <path d="m5 16 11.5-11.5a2.1 2.1 0 0 1 3 3L8 19l-4 1z" />
                </svg>
              </Link>
            </div>
            <p className="mt-1.5 text-[13px] leading-[1.55] text-[var(--color-texto)]">{cliente.notas || 'Sin notas.'}</p>
          </Tarjeta>
        </div>

        <div className="flex min-w-0 flex-col gap-4">
          <div className="grid grid-cols-3 gap-3">
            <Tarjeta className="min-w-0 px-4 py-3.5">
              <div className="text-[11.5px] font-medium uppercase tracking-[.07em] text-[var(--color-texto-suave)]">Visitas</div>
              <div className="mt-1 text-[22px] text-[var(--color-texto)]" style={{ fontFamily: 'var(--fuente-titulos)' }}>
                {confirmadas.length}
              </div>
            </Tarjeta>
            <Tarjeta className="min-w-0 px-4 py-3.5">
              <div className="text-[11.5px] font-medium uppercase tracking-[.07em] text-[var(--color-texto-suave)]">Gasto acumulado</div>
              <div className="mt-1 text-[22px] text-[var(--color-primario)]" style={{ fontFamily: 'var(--fuente-titulos)' }}>
                ${gastoTotal.toFixed(0)}
              </div>
            </Tarjeta>
            <Tarjeta className="min-w-0 px-4 py-3.5">
              <div className="text-[11.5px] font-medium uppercase tracking-[.07em] text-[var(--color-texto-suave)]">Última visita</div>
              <div className="mt-1 text-[22px] text-[var(--color-texto)]" style={{ fontFamily: 'var(--fuente-titulos)' }}>
                {confirmadas[0] ? new Date(confirmadas[0].fecha).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' }) : '—'}
              </div>
            </Tarjeta>
          </div>

          <Tarjeta className="px-5 pb-2 pt-1.5">
            <div className="py-2.5 text-[11.5px] font-medium uppercase tracking-[.07em] text-[var(--color-texto-suave)]">Historial de visitas</div>
            {historial.length === 0 && <p className="pb-4 text-sm text-[var(--color-texto-suave)]">Sin visitas todavía.</p>}
            {historial.map((v, i) => (
              <div key={v.id} className={`flex items-center gap-3 py-2.5 ${i > 0 ? 'border-t' : ''}`} style={{ borderColor: 'var(--color-divisor)' }}>
                <span className="w-16 shrink-0 text-[12.5px] text-[var(--color-texto-suave)]">
                  {new Date(v.fecha).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}
                </span>
                <span className="min-w-0 flex-1 truncate text-[13.5px] text-[var(--color-texto)]">
                  {v.items}
                  {v.estado === 'cancelada' && <span className="ml-2 text-xs text-[var(--color-error)]">Cancelada</span>}
                </span>
                <span
                  className="shrink-0 text-[13px] font-medium"
                  style={v.estado === 'cancelada' ? { color: 'var(--color-texto-suave)', textDecoration: 'line-through' } : { color: 'var(--color-texto)' }}
                >
                  ${v.total.toFixed(0)}
                </span>
              </div>
            ))}
          </Tarjeta>
        </div>
      </div>
    </div>
  )
}
