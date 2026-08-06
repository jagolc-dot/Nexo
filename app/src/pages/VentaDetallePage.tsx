import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { cancelarVenta, obtenerEmpleadaDeVenta, obtenerVenta, type VentaConLineas } from '../lib/ventas'
import { OPCIONES_ZONA_NEGOCIO } from '../lib/tiempoNegocio'

function IconoVolver() {
  return (
    <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M14.5 6 8.5 12l6 6" />
    </svg>
  )
}
function IconoAdvertencia() {
  return (
    <svg width={17} height={17} viewBox="0 0 24 24" fill="none" stroke="var(--color-error)" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 shrink-0">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7.5v5.5" />
      <path d="M12 16.5h.01" />
    </svg>
  )
}

export function VentaDetallePage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [venta, setVenta] = useState<VentaConLineas | null>(null)
  const [empleada, setEmpleada] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [cancelando, setCancelando] = useState(false)

  function cargar() {
    if (!id) return
    Promise.all([obtenerVenta(id), obtenerEmpleadaDeVenta(id)])
      .then(([v, e]) => {
        setVenta(v)
        setEmpleada(e)
      })
      .catch(() => setError('No se pudo cargar la venta.'))
  }

  useEffect(cargar, [id])

  if (error) return <p className="p-4 text-sm text-[var(--color-error)]">{error}</p>
  if (!venta) return <p className="p-4 text-sm text-[var(--color-texto-suave)]">Cargando...</p>

  async function cancelar() {
    if (!id) return
    if (!confirm('¿Cancelar esta venta? Se conserva el registro, pero se excluye de ingresos y reportes.')) return
    setCancelando(true)
    try {
      await cancelarVenta(id)
      cargar()
    } catch {
      setError('No se pudo cancelar la venta.')
    } finally {
      setCancelando(false)
    }
  }

  const cancelada = venta.estado === 'cancelada'
  const servicios = venta.venta_detalle.filter((d) => d.items?.tipo === 'servicio')
  const productos = venta.venta_detalle.filter((d) => d.items?.tipo === 'producto')
  const cliente = venta.clientes?.nombre ?? venta.nombre_ocasional ?? 'Público general'

  return (
    <div className="p-4 md:p-[22px] lg:p-7">
      <div className="flex items-center gap-2.5">
        <button onClick={() => navigate('/ventas')} className="flex h-9 w-9 items-center justify-center rounded-lg text-[var(--color-texto)] hover:bg-[var(--color-hover-nav)]" aria-label="Volver">
          <IconoVolver />
        </button>
        <span className="text-[13px] text-[var(--color-texto-suave)]">Ventas</span>
      </div>

      <div className="mt-3.5 max-w-[560px]">
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex-1 text-[22px] font-medium text-[var(--color-texto)]" style={{ fontFamily: 'var(--fuente-titulos)' }}>
            Venta #{venta.id.slice(0, 6).toUpperCase()}
          </div>
          <span
            className="inline-flex rounded-full px-2.5 py-[3px] text-xs font-medium"
            style={{
              background: `color-mix(in srgb, ${cancelada ? 'var(--color-error)' : 'var(--color-exito)'} 12%, white)`,
              color: cancelada ? 'var(--color-error)' : 'var(--color-exito)',
            }}
          >
            {cancelada ? 'Cancelada' : 'Completada'}
          </span>
        </div>

        <div className="mt-3 rounded-xl bg-[var(--color-superficie)] p-5 shadow-[0_1px_3px_rgba(74,50,43,.07)]">
          <div className="flex items-center gap-3">
            <span
              className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-full text-sm font-medium"
              style={{ background: 'color-mix(in srgb, var(--color-secundario) 18%, white)', color: '#68785B' }}
            >
              {cliente.charAt(0).toUpperCase()}
            </span>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium text-[var(--color-texto)]">{cliente}</div>
              <div className="text-[12.5px] text-[var(--color-texto-suave)]">
                {new Date(venta.fecha).toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric', month: 'short', ...OPCIONES_ZONA_NEGOCIO })} ·{' '}
                {new Date(venta.fecha).toLocaleTimeString('es-MX', { hour: 'numeric', minute: '2-digit', ...OPCIONES_ZONA_NEGOCIO })}
                {empleada && ` · Atendió ${empleada}`}
              </div>
            </div>
            <div className="shrink-0 text-right">
              <div className="text-[11.5px] font-medium uppercase tracking-[.07em] text-[var(--color-texto-suave)]">Pago</div>
              <div className="mt-0.5 text-[13.5px] capitalize text-[var(--color-texto)]">{venta.metodo_pago}</div>
            </div>
          </div>

          {servicios.length > 0 && (
            <>
              <div className="mt-4 text-[11.5px] font-medium uppercase tracking-[.07em] text-[var(--color-texto-suave)]">Servicios</div>
              {servicios.map((s, i) => (
                <div key={i} className="mt-1.5 flex justify-between gap-2 text-[13.5px]">
                  <span className="text-[var(--color-texto)]">{s.items?.nombre}</span>
                  <span className="text-[var(--color-texto-suave)]">${(s.precio_unitario * s.cantidad).toFixed(0)}</span>
                </div>
              ))}
            </>
          )}

          {productos.length > 0 && (
            <>
              <div className="mt-4 text-[11.5px] font-medium uppercase tracking-[.07em] text-[var(--color-texto-suave)]">Productos</div>
              {productos.map((p, i) => (
                <div key={i} className="mt-1.5 flex justify-between gap-2 text-[13.5px]">
                  <span className="text-[var(--color-texto)]">
                    {p.items?.nombre} × {p.cantidad}
                  </span>
                  <span className="text-[var(--color-texto-suave)]">${(p.precio_unitario * p.cantidad).toFixed(0)}</span>
                </div>
              ))}
            </>
          )}

          <div className="mt-3.5 flex justify-between gap-2 border-t pt-3 text-[15px] font-medium text-[var(--color-texto)]" style={{ borderColor: 'var(--color-divisor-fuerte)' }}>
            <span>Total</span>
            <span className="text-[20px] text-[var(--color-primario)]" style={{ fontFamily: 'var(--fuente-titulos)' }}>
              ${venta.total.toFixed(0)}
            </span>
          </div>
        </div>

        {!cancelada ? (
          <>
            <button
              onClick={cancelar}
              disabled={cancelando}
              className="mt-3.5 flex min-h-11 w-full items-center justify-center rounded-lg bg-[var(--color-error)] text-[13.5px] font-medium text-white"
            >
              {cancelando ? 'Cancelando...' : 'Cancelar venta'}
            </button>
            <p className="mt-2 text-center text-xs leading-[1.5] text-[var(--color-texto-suave)]">
              Una venta confirmada no se edita ni se borra. Si la cancelas, seguirá visible en la lista marcada como cancelada.
            </p>
          </>
        ) : (
          <div className="mt-3.5 flex gap-2.5 rounded-[10px] p-3" style={{ background: 'color-mix(in srgb, var(--color-error) 9%, white)' }}>
            <IconoAdvertencia />
            <p className="text-[13px] leading-[1.45]" style={{ color: '#A03A31' }}>
              Venta cancelada. No cuenta para ingresos ni reportes.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
