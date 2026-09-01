import { useEffect, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useNegocio } from '../context/NegocioContext'
import {
  obtenerDashboardBoutique,
  obtenerDashboardSastreria,
  type DashboardBoutique,
  type DashboardSastreria,
} from '../lib/dashboard'
import { claseBoton } from '../components/ui/Button'
import { OPCIONES_ZONA_NEGOCIO, hoyEnNegocio } from '../lib/tiempoNegocio'
import { formatearCantidad, formatearMoneda } from '../lib/formato'

type Estado = 'cargando' | 'normal' | 'vacio' | 'error'

function fechaLarga(d: Date): string {
  return d
    .toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long', ...OPCIONES_ZONA_NEGOCIO })
    .replace(',', '')
}

function nombreMesAnterior(): string {
  const [y, m] = hoyEnNegocio().split('-').map(Number)
  const d = new Date(y, m - 1 - 1, 1)
  return d.toLocaleDateString('es-MX', { month: 'long' })
}

function moneda(n: number): string {
  return formatearMoneda(n, { signo: true })
}

function Etiqueta({ children }: { children: ReactNode }) {
  return (
    <div className="text-[11.5px] font-medium uppercase tracking-[0.07em] text-[var(--color-texto-suave)]">
      {children}
    </div>
  )
}

function Tarjeta({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`min-w-0 rounded-xl bg-[var(--color-superficie)] px-5 py-[18px] shadow-[0_1px_3px_rgba(74,50,43,.07)] ${className}`}
    >
      {children}
    </div>
  )
}

function Pill({ tono, children }: { tono: 'exito' | 'advertencia'; children: ReactNode }) {
  const clases =
    tono === 'exito'
      ? 'bg-[color-mix(in_srgb,var(--color-exito)_12%,white)] text-[var(--color-exito)]'
      : 'bg-[color-mix(in_srgb,var(--color-advertencia)_15%,white)] text-[#9A7420]'
  return <span className={`inline-flex rounded-full px-2.5 py-[3px] text-xs font-medium ${clases}`}>{children}</span>
}

function TarjetaHero({
  etiqueta,
  valor,
  tam,
  colorPrimario = false,
  className = '',
  children,
}: {
  etiqueta: string
  valor: string
  tam: 32 | 24
  colorPrimario?: boolean
  className?: string
  children?: ReactNode
}) {
  return (
    <Tarjeta className={className}>
      <Etiqueta>{etiqueta}</Etiqueta>
      <div
        className={`mt-2 whitespace-nowrap font-medium leading-[1.1] ${colorPrimario ? 'text-[var(--color-primario)]' : 'text-[var(--color-texto)]'}`}
        style={{ fontFamily: 'var(--fuente-titulos)', fontSize: tam }}
      >
        {valor}
      </div>
      {children}
    </Tarjeta>
  )
}

function TarjetaSecundaria({
  etiqueta,
  valor,
  pastilla,
  sublabel,
  className = '',
  children,
}: {
  etiqueta: string
  valor: ReactNode
  pastilla?: ReactNode
  sublabel?: string
  className?: string
  children?: ReactNode
}) {
  return (
    <Tarjeta className={className}>
      <Etiqueta>{etiqueta}</Etiqueta>
      {valor !== '' && (
        <div className="mt-1.5 flex flex-wrap items-baseline gap-2">
          <span className="text-[21px] font-medium text-[var(--color-texto)]">{valor}</span>
          {pastilla}
        </div>
      )}
      {sublabel && <div className="mt-1 text-xs text-[var(--color-texto-suave)]">{sublabel}</div>}
      {children}
    </Tarjeta>
  )
}

function Encabezado({ nombre, negocioNombre, tam = 26 }: { nombre: string; negocioNombre: string; tam?: number }) {
  return (
    <div>
      <div className="font-medium leading-[1.15] text-[var(--color-texto)]" style={{ fontFamily: 'var(--fuente-titulos)', fontSize: tam }}>
        Hola, {nombre}
      </div>
      <div className="mt-1 text-[13px] text-[var(--color-texto-suave)]">
        {fechaLarga(new Date())} · {negocioNombre}
      </div>
    </div>
  )
}

function IconoCalendarioMas() {
  return (
    <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <rect x="3.5" y="5" width="17" height="15.5" rx="2" />
      <path d="M3.5 9.5h17" />
      <path d="M8 3v4" />
      <path d="M16 3v4" />
      <path d="M12 13v5" />
      <path d="M9.5 15.5h5" />
    </svg>
  )
}
function IconoCarritoMas() {
  return (
    <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M3.5 4.5h2l2.3 11.2a1.8 1.8 0 0 0 1.76 1.4h7.3a1.8 1.8 0 0 0 1.76-1.42L20.5 8.5H6.2" />
      <circle cx="9.5" cy="20" r="1.3" />
      <circle cx="17" cy="20" r="1.3" />
    </svg>
  )
}

function AccionesRapidas({ nuevaCita }: { nuevaCita: boolean }) {
  return (
    <div className="mt-3.5 flex flex-wrap gap-2.5">
      {nuevaCita && (
        <Link to="/agenda?nueva=1" className={claseBoton('primario', '!min-h-11 flex-1 gap-1.5 px-4 text-[13.5px] sm:flex-none')}>
          <IconoCalendarioMas />
          Nueva cita
        </Link>
      )}
      <Link
        to="/ventas/nueva"
        className={claseBoton(nuevaCita ? 'secundario' : 'primario', '!min-h-11 flex-1 gap-1.5 px-4 text-[13.5px] sm:flex-none')}
      >
        <IconoCarritoMas />
        Nueva venta
      </Link>
    </div>
  )
}

function BloqueEsqueleto({ className = '' }: { className?: string }) {
  return <div className={`animar-brillo rounded bg-[var(--color-esqueleto)] ${className}`} />
}

function EstadoCargando() {
  return (
    <div className="p-4 md:p-[22px] lg:p-7">
      <BloqueEsqueleto className="h-[26px] w-[150px] !rounded-md" />
      <BloqueEsqueleto className="mt-2 h-[13px] w-[220px]" />
      <div className="mt-[18px] grid grid-cols-1 gap-4 lg:grid-cols-[1fr_340px]">
        <div className="grid grid-cols-2 gap-3.5 md:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Tarjeta key={i}>
              <BloqueEsqueleto className="h-[11px] w-24" />
              <BloqueEsqueleto className="mt-3 h-[26px] w-32 !rounded-md" />
              <BloqueEsqueleto className="mt-3 h-3 w-36" />
            </Tarjeta>
          ))}
        </div>
        <Tarjeta>
          <BloqueEsqueleto className="h-[15px] w-32" />
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="mt-[18px] flex items-center gap-3">
              <BloqueEsqueleto className="h-9 w-9 shrink-0 !rounded-full" />
              <div className="flex-1">
                <BloqueEsqueleto className="h-3 w-3/5" />
                <BloqueEsqueleto className="mt-1.5 h-2.5 w-4/5" />
              </div>
            </div>
          ))}
        </Tarjeta>
      </div>
    </div>
  )
}

function EstadoError({ onReintentar, nombre, negocioNombre }: { onReintentar: () => void; nombre: string; negocioNombre: string }) {
  return (
    <div className="p-4 md:p-[22px] lg:p-7">
      <Encabezado nombre={nombre} negocioNombre={negocioNombre} />
      <Tarjeta className="mt-[18px] flex flex-col items-center px-6 py-10 text-center">
        <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="var(--color-error)" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7.5v5.5" />
          <path d="M12 16.5h.01" />
        </svg>
        <div className="mt-3 text-[15px] font-medium text-[var(--color-texto)]">No pudimos cargar tu resumen</div>
        <p className="mt-1 max-w-[260px] text-[13px] text-[var(--color-texto-suave)]">
          Revisa tu conexión e inténtalo de nuevo.
        </p>
        <button onClick={onReintentar} className={`mt-4 ${claseBoton('secundario')}`}>
          Reintentar
        </button>
      </Tarjeta>
    </div>
  )
}

function PanelProximasCitas({ citas }: { citas: Array<{ id: string; fecha_hora: string; clienta: string; servicios: string }> }) {
  return (
    <Tarjeta className="!pb-2">
      <div className="flex items-baseline justify-between gap-2 pb-2.5">
        <div className="text-[16.5px] font-medium text-[var(--color-texto)]" style={{ fontFamily: 'var(--fuente-titulos)' }}>
          Próximas citas
        </div>
        <Link to="/agenda" className="text-[13px] font-medium text-[var(--color-primario)]">
          Ver todas
        </Link>
      </div>

      {citas.length === 0 ? (
        <div className="flex flex-col items-center px-3 py-6 text-center">
          <svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="#B99A8D" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
            <rect x="3.5" y="5" width="17" height="15.5" rx="2" />
            <path d="M3.5 9.5h17" />
            <path d="M8 3v4" />
            <path d="M16 3v4" />
          </svg>
          <div className="mt-3 text-[14.5px] font-medium text-[var(--color-texto)]">Sin citas próximas</div>
          <p className="mt-1 max-w-[230px] text-[13px] text-[var(--color-texto-suave)]">
            Cuando agendes una cita aparecerá aquí.
          </p>
          <Link to="/agenda" className={`mt-4 ${claseBoton('primario')}`}>
            Ir a Agenda
          </Link>
        </div>
      ) : (
        citas.map((c) => (
          <div key={c.id} className="flex items-center gap-3 border-t py-3" style={{ borderColor: 'var(--color-divisor)' }}>
            <span
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-medium"
              style={{ background: 'color-mix(in srgb, var(--color-secundario) 18%, white)', color: '#68785B' }}
            >
              {c.clienta.charAt(0).toUpperCase()}
            </span>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium text-[var(--color-texto)]">{c.clienta}</div>
              <div className="truncate text-xs text-[var(--color-texto-suave)]">{c.servicios || '—'}</div>
            </div>
            <div className="shrink-0 text-right">
              <div className="text-[13px] font-medium text-[var(--color-texto)]">
                {new Date(c.fecha_hora).toLocaleTimeString('es-MX', { hour: 'numeric', minute: '2-digit', ...OPCIONES_ZONA_NEGOCIO })}
              </div>
              <div className="mt-0.5 text-xs text-[var(--color-texto-suave)]">
                {new Date(c.fecha_hora).toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric', month: 'short', ...OPCIONES_ZONA_NEGOCIO })}
              </div>
            </div>
          </div>
        ))
      )}
    </Tarjeta>
  )
}

function ContenidoBoutique({ data, nombre, negocioNombre }: { data: DashboardBoutique; nombre: string; negocioNombre: string }) {
  const cambioUtilidad =
    data.utilidadMesAnterior > 0 ? ((data.utilidadMes - data.utilidadMesAnterior) / data.utilidadMesAnterior) * 100 : null
  const cambioIngresos =
    data.ingresosMesAnterior > 0 ? ((data.ingresosMes - data.ingresosMesAnterior) / data.ingresosMesAnterior) * 100 : null
  const totalClientas = data.clientasNuevas + data.clientasRecurrentes
  const pctNuevas = totalClientas === 0 ? 0 : (data.clientasNuevas / totalClientas) * 100

  return (
    <div className="p-4 md:p-[22px] lg:p-7">
      <Encabezado nombre={nombre} negocioNombre={negocioNombre} />
      <AccionesRapidas nuevaCita />

      <div className="mt-[18px] grid grid-cols-1 items-start gap-4 lg:grid-cols-[1fr_340px]">
        <div className="min-w-0">
          <div className="grid grid-cols-2 gap-3.5 md:grid-cols-3 lg:grid-cols-[1.35fr_1fr_1fr]">
            <TarjetaHero etiqueta="Utilidad del mes" valor={moneda(data.utilidadMes)} tam={32} colorPrimario className="col-span-2 md:col-span-1">
              {data.utilidadMes >= 0 ? (
                <div className="mt-2.5 flex flex-wrap items-center gap-2">
                  {cambioUtilidad !== null && (
                    <Pill tono="exito">
                      {cambioUtilidad >= 0 ? '+' : ''}
                      {cambioUtilidad.toFixed(0)}% vs {nombreMesAnterior()}
                    </Pill>
                  )}
                  <span className="text-xs text-[var(--color-texto-suave)]">
                    Ingresos {moneda(data.ingresosMes)} − Gastos {moneda(data.gastosMes)}
                  </span>
                </div>
              ) : (
                <div className="mt-2.5 flex flex-wrap items-center gap-2">
                  <Pill tono="advertencia">Mes con pérdida</Pill>
                  <span className="text-xs text-[var(--color-texto-suave)]">
                    Los gastos superaron a los ingresos por {moneda(Math.abs(data.utilidadMes))}
                  </span>
                </div>
              )}
            </TarjetaHero>

            <TarjetaHero etiqueta="Ingresos de hoy" valor={moneda(data.ingresosDia)} tam={24}>
              <div className="mt-2 text-xs text-[var(--color-texto-suave)]">
                {data.ventasHoyCount === 0 ? 'Sin ventas registradas hoy' : `${data.ventasHoyCount} venta${data.ventasHoyCount === 1 ? '' : 's'} cobrada${data.ventasHoyCount === 1 ? '' : 's'}`}
              </div>
            </TarjetaHero>

            <TarjetaHero etiqueta="Citas de hoy" valor={String(data.citasHoy.total)} tam={24}>
              <div className="mt-2 text-xs text-[var(--color-texto-suave)]">
                {data.citasHoy.total === 0
                  ? 'Nada agendado para hoy'
                  : `${data.citasHoy.completadas} completadas · ${data.citasHoy.pendientes} pendientes`}
              </div>
            </TarjetaHero>
          </div>

          <div className="mt-3.5 grid grid-cols-2 gap-3.5 lg:grid-cols-3">
            <TarjetaSecundaria etiqueta="Clientes activos" valor={data.clientesActivos} sublabel="últimos 2 meses" />
            <TarjetaSecundaria etiqueta="Ticket promedio" valor={moneda(data.ticketPromedio)} sublabel="por venta del mes" />
            <TarjetaSecundaria
              etiqueta="Ingresos del mes"
              valor={moneda(data.ingresosMes)}
              pastilla={
                cambioIngresos !== null && (
                  <Pill tono={cambioIngresos >= 0 ? 'exito' : 'advertencia'}>
                    {cambioIngresos >= 0 ? '+' : ''}
                    {cambioIngresos.toFixed(0)}%
                  </Pill>
                )
              }
              sublabel={`${nombreMesAnterior()}: ${moneda(data.ingresosMesAnterior)}`}
            />
            <TarjetaSecundaria
              etiqueta="Clientas del mes"
              valor={
                <>
                  {data.clientasNuevas} <span className="text-xs font-normal text-[var(--color-texto-suave)]">nuevas</span>{' '}
                  <span className="ml-1">{data.clientasRecurrentes}</span>{' '}
                  <span className="text-xs font-normal text-[var(--color-texto-suave)]">recurrentes</span>
                </>
              }
            >
              <div className="mt-2.5 flex h-1.5 overflow-hidden rounded-full">
                <div className="bg-[var(--color-primario)]" style={{ width: `${pctNuevas}%` }} />
                <div className="flex-1" style={{ background: 'color-mix(in srgb, var(--color-secundario) 40%, white)' }} />
              </div>
            </TarjetaSecundaria>
            <TarjetaSecundaria
              etiqueta="Tasa de cancelación"
              valor={`${(data.tasaCancelacion * 100).toFixed(0)}%`}
              sublabel={`${data.citasMesCanceladas} de ${data.citasMesTotal} citas`}
            />
            <TarjetaSecundaria etiqueta="Top 3 servicios del mes" valor="" className="col-span-2 md:col-span-1">
              {data.topServicios.length === 0 ? (
                <p className="mt-1 text-sm text-[var(--color-texto-suave)]">Sin datos este mes.</p>
              ) : (
                <div className="mt-1 flex flex-col gap-1.5">
                  {data.topServicios.map((s, i) => (
                    <div key={s.nombre} className="flex items-baseline gap-2">
                      <span className="w-3 text-xs font-medium text-[var(--color-acento)]">{i + 1}</span>
                      <span className="flex-1 truncate text-sm text-[var(--color-texto)]">{s.nombre}</span>
                      <span className="text-xs font-medium text-[var(--color-texto-suave)]">{s.cantidad}</span>
                    </div>
                  ))}
                </div>
              )}
            </TarjetaSecundaria>
            {data.topProductos.length > 0 && (
              <TarjetaSecundaria etiqueta="Top 3 productos del mes" valor="" className="col-span-2 md:col-span-1">
                <div className="mt-1 flex flex-col gap-1.5">
                  {data.topProductos.map((p, i) => (
                    <div key={p.nombre} className="flex items-baseline gap-2">
                      <span className="w-3 text-xs font-medium text-[var(--color-acento)]">{i + 1}</span>
                      <span className="flex-1 truncate text-sm text-[var(--color-texto)]">{p.nombre}</span>
                      <span className="text-xs font-medium text-[var(--color-texto-suave)]">{p.cantidad}</span>
                    </div>
                  ))}
                </div>
              </TarjetaSecundaria>
            )}
          </div>
        </div>

        <PanelProximasCitas citas={data.proximasCitas} />
      </div>
    </div>
  )
}

function ContenidoSastreria({ data, nombre, negocioNombre }: { data: DashboardSastreria; nombre: string; negocioNombre: string }) {
  const cambioUtilidad =
    data.utilidadMesAnterior > 0 ? ((data.utilidadMes - data.utilidadMesAnterior) / data.utilidadMesAnterior) * 100 : null

  return (
    <div className="p-4 md:p-[22px] lg:p-7">
      <Encabezado nombre={nombre} negocioNombre={negocioNombre} />
      <AccionesRapidas nuevaCita={false} />

      <div className="mt-[18px] grid grid-cols-1 items-start gap-4 lg:grid-cols-[1fr_340px]">
        <div className="min-w-0">
          <div className="grid grid-cols-2 gap-3.5">
            <TarjetaHero etiqueta="Utilidad del mes" valor={moneda(data.utilidadMes)} tam={32} colorPrimario>
              {data.utilidadMes >= 0 ? (
                cambioUtilidad !== null && (
                  <div className="mt-2.5">
                    <Pill tono="exito">
                      {cambioUtilidad >= 0 ? '+' : ''}
                      {cambioUtilidad.toFixed(0)}% vs {nombreMesAnterior()}
                    </Pill>
                  </div>
                )
              ) : (
                <div className="mt-2.5">
                  <Pill tono="advertencia">Mes con pérdida</Pill>
                </div>
              )}
            </TarjetaHero>
            <TarjetaHero etiqueta="Ventas del día" valor={moneda(data.ventasDia)} tam={24} />
          </div>

          <div className="mt-3.5 grid grid-cols-2 gap-3.5">
            <TarjetaSecundaria etiqueta="Ticket promedio" valor={moneda(data.ticketPromedio)} sublabel="por venta del mes" />
            <TarjetaSecundaria etiqueta="Clientes activos" valor={data.clientesActivos} sublabel="últimos 2 meses" />
          </div>
        </div>

        <Tarjeta className="!pb-2">
          <div className="pb-2.5 text-[16.5px] font-medium text-[var(--color-texto)]" style={{ fontFamily: 'var(--fuente-titulos)' }}>
            Productos agotados o con existencia baja
          </div>
          {data.productosBajaExistencia.length === 0 ? (
            <p className="py-4 text-sm text-[var(--color-texto-suave)]">Todo con buen nivel.</p>
          ) : (
            data.productosBajaExistencia.map((p, i) => (
              <div key={i} className="flex items-center justify-between border-t py-2.5 text-sm" style={{ borderColor: 'var(--color-divisor)' }}>
                <span className="text-[var(--color-texto)]">
                  {p.nombre}
                  {p.variante && <span className="text-[var(--color-texto-suave)]"> ({p.variante})</span>}
                </span>
                <span className={p.existencia === 0 ? 'text-[var(--color-error)]' : 'text-[var(--color-advertencia)]'}>
                  {p.existencia === 0 ? 'Agotado' : `Quedan ${formatearCantidad(p.existencia)}`}
                </span>
              </div>
            ))
          )}
          <Link to="/catalogo" className="mb-3 mt-1 inline-block text-xs font-medium text-[var(--color-primario)]">
            Ver catálogo
          </Link>
        </Tarjeta>
      </div>
    </div>
  )
}

function EstadoVacio({ nombre, negocioNombre }: { nombre: string; negocioNombre: string }) {
  return (
    <div className="p-4 md:p-[22px] lg:p-7">
      <Encabezado nombre={nombre} negocioNombre={negocioNombre} />
      <div className="mt-[18px] grid grid-cols-1 items-start gap-4 lg:grid-cols-[1fr_340px]">
        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-3">
          <TarjetaHero etiqueta="Utilidad del mes" valor="—" tam={32}>
            <div className="mt-2 text-xs text-[var(--color-texto-suave)]">Sin movimientos registrados este mes</div>
          </TarjetaHero>
          <TarjetaHero etiqueta="Ingresos de hoy" valor="$0" tam={24}>
            <div className="mt-2 text-xs text-[var(--color-texto-suave)]">Sin ventas registradas hoy</div>
          </TarjetaHero>
          <TarjetaHero etiqueta="Citas de hoy" valor="0" tam={24}>
            <div className="mt-2 text-xs text-[var(--color-texto-suave)]">Nada agendado para hoy</div>
          </TarjetaHero>
        </div>
        <PanelProximasCitas citas={[]} />
      </div>
    </div>
  )
}

export function DashboardPage() {
  const { user, nombreUsuario } = useAuth()
  const { negocioActivo } = useNegocio()
  const [estado, setEstado] = useState<Estado>('cargando')
  const [datosBoutique, setDatosBoutique] = useState<DashboardBoutique | null>(null)
  const [datosSastreria, setDatosSastreria] = useState<DashboardSastreria | null>(null)

  const tema = negocioActivo?.tema ?? ''

  function cargar() {
    if (!negocioActivo) return
    setEstado('cargando')

    if (tema === 'boutique') {
      obtenerDashboardBoutique(negocioActivo.id)
        .then((d) => {
          setDatosBoutique(d)
          const vacio = d.ingresosMes === 0 && d.citasHoy.total === 0 && d.proximasCitas.length === 0
          setEstado(vacio ? 'vacio' : 'normal')
        })
        .catch(() => setEstado('error'))
    } else if (tema === 'sastreria') {
      obtenerDashboardSastreria(negocioActivo.id)
        .then((d) => {
          setDatosSastreria(d)
          const vacio = d.ventasDia === 0 && d.utilidadMes === 0
          setEstado(vacio ? 'vacio' : 'normal')
        })
        .catch(() => setEstado('error'))
    } else {
      setEstado('vacio')
    }
  }

  useEffect(cargar, [negocioActivo, tema])

  if (!negocioActivo) return null

  const nombre = nombreUsuario ?? user?.email?.split('@')[0] ?? ''

  if (estado === 'cargando') return <EstadoCargando />
  if (estado === 'error') return <EstadoError onReintentar={cargar} nombre={nombre} negocioNombre={negocioActivo.nombre} />
  if (estado === 'vacio') return <EstadoVacio nombre={nombre} negocioNombre={negocioActivo.nombre} />

  if (tema === 'boutique' && datosBoutique) {
    return <ContenidoBoutique data={datosBoutique} nombre={nombre} negocioNombre={negocioActivo.nombre} />
  }
  if (tema === 'sastreria' && datosSastreria) {
    return <ContenidoSastreria data={datosSastreria} nombre={nombre} negocioNombre={negocioActivo.nombre} />
  }
  return null
}
