import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useNegocio } from '../context/NegocioContext'
import { cancelarCita, eliminarCita, listarCitasRango, listarEmpleadas, type Cita } from '../lib/agenda'
import { obtenerHistorialCliente, type VisitaCliente } from '../lib/clientes'
import type { Empleada } from '../types'
import { Button, claseBoton } from '../components/ui/Button'
import { EstadoBadge, type TipoEstado } from '../components/ui/EstadoBadge'
import { formatearDuracion } from '../lib/formato'
import { InicioAgendaPanel } from './InicioAgendaPanel'
import { formatoFechaISO } from '../lib/periodos'
import {
  ZONA_NEGOCIO,
  OPCIONES_ZONA_NEGOCIO,
  hoyEnNegocio,
  diaCalendarioDesdeYMD,
  diaCalendarioNegocio,
  horaMinutoNegocio,
  inicioDiaNegocio,
} from '../lib/tiempoNegocio'

type Vista = 'dia' | 'semana' | 'mes'

const ETIQUETAS_ESTADO: Record<Cita['estado'], string> = {
  pendiente: 'Pendiente',
  confirmada: 'Confirmada',
  completada: 'Completada',
  cancelada: 'Cancelada',
}

const TIPO_ESTADO: Record<Cita['estado'], TipoEstado> = {
  pendiente: 'advertencia',
  confirmada: 'exito',
  completada: 'exito',
  cancelada: 'error',
}

const COLOR_ESTADO: Record<Cita['estado'], string> = {
  pendiente: 'var(--color-advertencia)',
  confirmada: 'var(--color-exito)',
  completada: 'var(--color-exito)',
  cancelada: 'var(--color-error)',
}

function inicioDia(d: Date) {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}
function sumarDias(d: Date, n: number) {
  const x = new Date(d)
  x.setDate(x.getDate() + n)
  return x
}
/** Semana inicia en lunes, igual que calcularRango() en lib/periodos.ts. */
function inicioSemana(d: Date) {
  const x = inicioDia(d)
  const dia = x.getDay()
  const offset = dia === 0 ? 6 : dia - 1
  x.setDate(x.getDate() - offset)
  return x
}
function inicioMes(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1)
}
function sumarMeses(d: Date, n: number) {
  return new Date(d.getFullYear(), d.getMonth() + n, 1)
}
function mismodia(a: Date, b: Date) {
  return a.toDateString() === b.toDateString()
}
function duracionCita(c: Cita) {
  return c.cita_servicios.reduce((acc, s) => acc + s.duracion_minutos, 0)
}
function nombreServicios(c: Cita) {
  return c.cita_servicios.map((s) => s.items?.nombre).filter(Boolean).join(' + ')
}
function capitalizar(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1)
}
function etiquetaDiaCorta(fecha: Date): string {
  const hoyCal = diaCalendarioDesdeYMD(hoyEnNegocio())
  const fechaCal = diaCalendarioNegocio(fecha)
  if (mismodia(fechaCal, hoyCal)) return 'Hoy'
  if (mismodia(fechaCal, sumarDias(hoyCal, 1))) return 'Mañana'
  return capitalizar(fecha.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'short', ...OPCIONES_ZONA_NEGOCIO }))
}

const FORMATO_HORA: Intl.DateTimeFormatOptions = { hour: 'numeric', minute: '2-digit', timeZone: ZONA_NEGOCIO }
const NOMBRES_DIA = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']
const NOMBRES_MES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

function IconoCalendario({ size = 30, color = '#B99A8D' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <rect x="3.5" y="5" width="17" height="15.5" rx="2" />
      <path d="M3.5 9.5h17" />
      <path d="M8 3v4" />
      <path d="M16 3v4" />
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
function IconoCerrar() {
  return (
    <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round">
      <path d="M6 6l12 12" />
      <path d="M18 6 6 18" />
    </svg>
  )
}
function IconoVolver() {
  return (
    <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M14.5 6 8.5 12l6 6" />
    </svg>
  )
}
function IconoError() {
  return (
    <svg width={32} height={32} viewBox="0 0 24 24" fill="none" stroke="var(--color-error)" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7.5v5.5" />
      <path d="M12 16.5h.01" />
    </svg>
  )
}

function Tarjeta({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-xl bg-[var(--color-superficie)] shadow-[0_1px_3px_rgba(74,50,43,.07)] ${className}`}>
      {children}
    </div>
  )
}

export function AgendaPage() {
  const { negocioActivo } = useNegocio()
  const [vista, setVista] = useState<Vista>('dia')
  const [fechaRef, setFechaRef] = useState(() => diaCalendarioDesdeYMD(hoyEnNegocio()))
  const [citas, setCitas] = useState<Cita[] | null>(null)
  const [empleadas, setEmpleadas] = useState<Empleada[]>([])
  const [citaSeleccionada, setCitaSeleccionada] = useState<Cita | null>(null)
  const [historial, setHistorial] = useState<VisitaCliente[] | null>(null)
  const [error, setError] = useState(false)
  const [searchParams, setSearchParams] = useSearchParams()
  const [mostrarAgendar, setMostrarAgendar] = useState(() => searchParams.get('nueva') === '1')
  const [citaEditando, setCitaEditando] = useState<Cita | null>(null)

  useEffect(() => {
    // Acceso rápido desde el Dashboard (/agenda?nueva=1): abre el flujo de
    // agendar de una vez, y limpia el parámetro para que "atrás" no lo
    // vuelva a disparar.
    if (searchParams.get('nueva') === '1') {
      setMostrarAgendar(true)
      setSearchParams((prev) => {
        const siguiente = new URLSearchParams(prev)
        siguiente.delete('nueva')
        return siguiente
      }, { replace: true })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const rango = useMemo(() => {
    if (vista === 'dia') return { desde: inicioDia(fechaRef), hasta: sumarDias(inicioDia(fechaRef), 1) }
    if (vista === 'semana') {
      const desde = inicioSemana(fechaRef)
      return { desde, hasta: sumarDias(desde, 7) }
    }
    const desde = inicioSemana(inicioMes(fechaRef))
    return { desde, hasta: sumarDias(desde, 42) }
  }, [vista, fechaRef])

  const desdeMs = rango.desde.getTime()
  const hastaMs = rango.hasta.getTime()

  function cargar() {
    if (!negocioActivo) return
    setError(false)
    setCitas(null)
    const desdeUtc = inicioDiaNegocio(formatoFechaISO(rango.desde))
    const hastaUtc = inicioDiaNegocio(formatoFechaISO(rango.hasta))
    listarCitasRango(negocioActivo.id, desdeUtc.toISOString(), hastaUtc.toISOString())
      .then(setCitas)
      .catch(() => setError(true))
  }

  useEffect(cargar, [negocioActivo, desdeMs, hastaMs])

  useEffect(() => {
    if (!negocioActivo) return
    listarEmpleadas(negocioActivo.id).then(setEmpleadas)
  }, [negocioActivo])

  useEffect(() => {
    if (!citaSeleccionada?.cliente_id) {
      setHistorial(null)
      return
    }
    obtenerHistorialCliente(citaSeleccionada.cliente_id).then(setHistorial)
  }, [citaSeleccionada])

  if (!negocioActivo) return null

  if (mostrarAgendar || citaEditando) {
    return (
      <InicioAgendaPanel
        editando={citaEditando ?? undefined}
        onListo={() => {
          setMostrarAgendar(false)
          setCitaEditando(null)
          setCitaSeleccionada(null)
          cargar()
        }}
      />
    )
  }

  function irAnterior() {
    if (vista === 'dia') setFechaRef((f) => sumarDias(f, -1))
    else if (vista === 'semana') setFechaRef((f) => sumarDias(f, -7))
    else setFechaRef((f) => sumarMeses(f, -1))
  }
  function irSiguiente() {
    if (vista === 'dia') setFechaRef((f) => sumarDias(f, 1))
    else if (vista === 'semana') setFechaRef((f) => sumarDias(f, 7))
    else setFechaRef((f) => sumarMeses(f, 1))
  }
  function irHoy() {
    setFechaRef(diaCalendarioDesdeYMD(hoyEnNegocio()))
  }

  async function cancelar(cita: Cita) {
    if (!confirm('¿Cancelar esta cita?')) return
    try {
      await cancelarCita(cita.id)
      setCitaSeleccionada(null)
      cargar()
    } catch (err) {
      console.error(err)
      alert(err instanceof Error ? err.message : 'No se pudo cancelar la cita.')
    }
  }

  async function eliminar(cita: Cita) {
    if (!confirm('¿Eliminar esta cita? Fue un error de captura, no una cancelación — no se puede deshacer.')) return
    try {
      await eliminarCita(cita.id)
      setCitaSeleccionada(null)
      cargar()
    } catch (err) {
      console.error(err)
      alert(err instanceof Error ? err.message : 'No se pudo eliminar la cita.')
    }
  }

  const tituloPeriodo =
    vista === 'dia'
      ? capitalizar(fechaRef.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' }))
      : vista === 'semana'
        ? `${rango.desde.getDate()} – ${sumarDias(rango.hasta, -1).getDate()} de ${NOMBRES_MES[rango.desde.getMonth()].toLowerCase()}`
        : `${NOMBRES_MES[fechaRef.getMonth()]} ${fechaRef.getFullYear()}`

  function BloqueCita({ cita, compacto = false }: { cita: Cita; compacto?: boolean }) {
    const color = COLOR_ESTADO[cita.estado]
    return (
      <button
        onClick={() => setCitaSeleccionada(cita)}
        style={{ background: `color-mix(in srgb, ${color} 13%, white)` }}
        className={`w-full overflow-hidden rounded-lg px-2.5 py-1.5 text-left ${compacto ? '' : 'h-full'}`}
      >
        <div className="flex items-baseline gap-1.5 whitespace-nowrap">
          <span style={{ color }} className="text-[11.5px] font-medium">
            {new Date(cita.fecha_hora).toLocaleTimeString('es-MX', FORMATO_HORA)}
          </span>
          {!compacto && (
            <span style={{ color }} className="text-[10.5px] font-medium uppercase tracking-[.04em]">
              {ETIQUETAS_ESTADO[cita.estado]}
            </span>
          )}
        </div>
        <div className="truncate text-[13px] font-medium text-[var(--color-texto)]">{cita.clientes?.nombre ?? 'Sin clienta'}</div>
        {!compacto && <div className="truncate text-[11.5px] text-[var(--color-texto-suave)]">{nombreServicios(cita)}</div>}
      </button>
    )
  }

  function EstadoVacio({ mensaje }: { mensaje: string }) {
    return (
      <Tarjeta className="mt-4 flex flex-col items-center px-6 py-12 text-center">
        <IconoCalendario />
        <div className="mt-3 text-[14.5px] font-medium text-[var(--color-texto)]">{mensaje}</div>
        <p className="mt-1 max-w-[240px] text-[13px] text-[var(--color-texto-suave)]">
          Toca «Agendar cita» para ocupar este {vista === 'dia' ? 'día' : 'periodo'}.
        </p>
        <Button className="mt-4" onClick={() => setMostrarAgendar(true)}>
          Agendar cita
        </Button>
      </Tarjeta>
    )
  }

  function EstadoErrorAgenda() {
    return (
      <Tarjeta className="mt-4 flex flex-col items-center px-6 py-12 text-center">
        <IconoError />
        <div className="mt-3 text-[15px] font-medium text-[var(--color-texto)]">No pudimos cargar la agenda</div>
        <p className="mt-1 max-w-[260px] text-[13px] text-[var(--color-texto-suave)]">Revisa tu conexión e inténtalo de nuevo.</p>
        <button onClick={cargar} className={`mt-4 ${claseBoton('secundario')}`}>
          Reintentar
        </button>
      </Tarjeta>
    )
  }

  function EstadoCargando() {
    return (
      <Tarjeta className="mt-4 p-5">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="mb-[18px] flex items-center gap-3 last:mb-0">
            <div className="h-3 w-11 shrink-0 animar-brillo rounded bg-[var(--color-esqueleto)]" />
            <div className="h-[52px] flex-1 animar-brillo rounded-lg bg-[var(--color-esqueleto)]" />
          </div>
        ))}
      </Tarjeta>
    )
  }

  function VistaDia() {
    const citasDia = citas ?? []
    let minIni = 9 * 60
    let minFin = 20 * 60
    citasDia.forEach((c) => {
      const { horas, minutos } = horaMinutoNegocio(c.fecha_hora)
      const ini = horas * 60 + minutos
      const fin = ini + duracionCita(c)
      if (ini < minIni) minIni = Math.floor(ini / 60) * 60
      if (fin > minFin) minFin = Math.ceil(fin / 60) * 60
    })
    const PX_MIN = 56 / 60
    const alturaTotal = (minFin - minIni) * PX_MIN
    const horas: number[] = []
    for (let h = minIni; h < minFin; h += 60) horas.push(h)

    const columnas = empleadas.length > 1 ? empleadas : [null]

    return (
      <div className="mt-4">
        <Tarjeta className="min-w-0 overflow-hidden overflow-x-auto">
          {empleadas.length > 1 && (
            <div className="flex border-b" style={{ borderColor: 'var(--color-hairline)' }}>
              <div className="w-[52px] shrink-0" />
              {columnas.map((emp) => (
                <div
                  key={emp?.id ?? 'sola'}
                  className="flex-1 border-l px-1.5 py-2.5 text-center text-[13px] font-medium text-[var(--color-texto)]"
                  style={{ borderColor: 'var(--color-divisor-fuerte)', minWidth: 140 }}
                >
                  {emp?.nombre}
                </div>
              ))}
            </div>
          )}
          <div className="flex">
            <div className="w-[52px] shrink-0">
              {horas.map((h) => (
                <div key={h} className="box-border px-2 pt-1 text-right text-[11px] text-[var(--color-texto-suave)]" style={{ height: 56 }}>
                  {h % 60 === 0 ? `${h / 60 > 12 ? h / 60 - 12 : h / 60 === 0 ? 12 : h / 60} ${h / 60 >= 12 ? 'pm' : 'am'}` : ''}
                </div>
              ))}
            </div>
            {columnas.map((emp) => {
              const citasColumna = citasDia.filter((c) => (emp ? c.empleada_id === emp.id : true))
              return (
                <div
                  key={emp?.id ?? 'sola'}
                  className="relative min-w-0 flex-1 border-l"
                  style={{ borderColor: 'var(--color-divisor-fuerte)', height: alturaTotal, minWidth: empleadas.length > 1 ? 140 : undefined }}
                >
                  {horas.map((h) => (
                    <div key={h} className="absolute left-0 right-0 border-t box-border" style={{ top: (h - minIni) * PX_MIN, borderColor: 'var(--color-divisor)' }} />
                  ))}
                  {citasColumna.map((c) => {
                    const { horas, minutos } = horaMinutoNegocio(c.fecha_hora)
                    const ini = horas * 60 + minutos
                    const alto = Math.max(duracionCita(c) / 60 * 56 - 6, 30)
                    return (
                      <div key={c.id} className="absolute left-1.5 right-1.5" style={{ top: (ini - minIni) * PX_MIN + 2, height: alto }}>
                        <BloqueCita cita={c} />
                      </div>
                    )
                  })}
                </div>
              )
            })}
          </div>
        </Tarjeta>
      </div>
    )
  }

  function VistaSemana() {
    const dias = Array.from({ length: 7 }, (_, i) => sumarDias(rango.desde, i))
    return (
      <Tarjeta className="mt-4 flex overflow-hidden">
        {dias.map((dia, i) => {
          const citasDelDia = (citas ?? [])
            .filter((c) => mismodia(diaCalendarioNegocio(c.fecha_hora), dia))
            .sort((a, b) => a.fecha_hora.localeCompare(b.fecha_hora))
          const esHoy = mismodia(dia, diaCalendarioDesdeYMD(hoyEnNegocio()))
          return (
            <div key={dia.toISOString()} className={`min-w-0 flex-1 pb-3.5 ${i > 0 ? 'border-l' : ''}`} style={{ borderColor: 'var(--color-divisor-fuerte)' }}>
              <button
                onClick={() => {
                  setFechaRef(dia)
                  setVista('dia')
                }}
                className="flex w-full flex-col items-center gap-1 border-b px-1 pb-2.5 pt-3"
                style={{ borderColor: 'var(--color-divisor-fuerte)' }}
              >
                <span className="text-[11px] uppercase tracking-[.06em] text-[var(--color-texto-suave)]">{NOMBRES_DIA[i]}</span>
                {esHoy ? (
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--color-primario)] text-[13.5px] font-medium text-white">
                    {dia.getDate()}
                  </span>
                ) : (
                  <span className="mt-1 text-[14.5px] font-medium text-[var(--color-texto)]">{dia.getDate()}</span>
                )}
              </button>
              <div className="flex flex-col gap-1.5 px-1.5 pt-2">
                {citasDelDia.map((c) => (
                  <BloqueCita key={c.id} cita={c} compacto />
                ))}
              </div>
            </div>
          )
        })}
      </Tarjeta>
    )
  }

  function VistaMes() {
    const dias = Array.from({ length: 42 }, (_, i) => sumarDias(rango.desde, i))
    const mesActual = fechaRef.getMonth()
    return (
      <Tarjeta className="mt-4 overflow-hidden">
        <div className="grid grid-cols-7 border-b" style={{ borderColor: 'var(--color-hairline)' }}>
          {NOMBRES_DIA.map((n) => (
            <div key={n} className="px-1 py-2.5 text-center text-[11px] uppercase tracking-[.06em] text-[var(--color-texto-suave)]">
              {n}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {dias.map((dia) => {
            const citasDelDia = (citas ?? []).filter((c) => mismodia(diaCalendarioNegocio(c.fecha_hora), dia))
            const fueraDeMes = dia.getMonth() !== mesActual
            const esHoy = mismodia(dia, diaCalendarioDesdeYMD(hoyEnNegocio()))
            return (
              <button
                key={dia.toISOString()}
                onClick={() => {
                  setFechaRef(dia)
                  setVista('dia')
                }}
                className="box-border flex min-h-[88px] flex-col items-start gap-2 border-l border-t p-2 text-left"
                style={{ borderColor: 'var(--color-divisor)' }}
              >
                {esHoy ? (
                  <span className="flex h-[26px] w-[26px] items-center justify-center rounded-full bg-[var(--color-primario)] text-[12.5px] font-medium text-white">
                    {dia.getDate()}
                  </span>
                ) : (
                  <span className={`text-[12.5px] font-medium ${fueraDeMes ? '' : 'text-[var(--color-texto)]'}`} style={fueraDeMes ? { color: '#C9B4AA' } : undefined}>
                    {dia.getDate()}
                  </span>
                )}
                {citasDelDia.length > 0 && (
                  <span className="flex flex-wrap gap-1">
                    {citasDelDia.slice(0, 5).map((c) => (
                      <span key={c.id} className="h-1.5 w-1.5 rounded-full" style={{ background: COLOR_ESTADO[c.estado] }} />
                    ))}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </Tarjeta>
    )
  }

  function LineaServicio({ nombre, precio, duracion }: { nombre: string; precio: number; duracion: number }) {
    return (
      <div className="mt-2 flex justify-between gap-2 text-[13.5px]">
        <span className="text-[var(--color-texto)]">{nombre}</span>
        <span className="whitespace-nowrap text-[var(--color-texto-suave)]">
          ${precio.toFixed(0)} · {formatearDuracion(duracion)}
        </span>
      </div>
    )
  }

  function FichaCita({ cita: c, onCerrar, modoCelular = false }: { cita: Cita; onCerrar: () => void; modoCelular?: boolean }) {
    const telefonoLimpio = c.clientes?.telefono?.replace(/\D/g, '') ?? ''
    const inicio = new Date(c.fecha_hora)
    const fin = new Date(inicio.getTime() + duracionCita(c) * 60000)
    const total = c.cita_servicios.reduce((acc, s) => acc + s.precio, 0)

    const cuerpo = (
      <Tarjeta className="p-[18px]">
        {!modoCelular && (
          <div className="flex items-center justify-between gap-2">
            <EstadoBadge tipo={TIPO_ESTADO[c.estado]} texto={ETIQUETAS_ESTADO[c.estado]} />
            <button onClick={onCerrar} className="flex h-7 w-7 items-center justify-center rounded-lg text-[var(--color-texto-suave)] hover:bg-[var(--color-hover-nav)]" aria-label="Cerrar">
              <IconoCerrar />
            </button>
          </div>
        )}
        <div className={`font-medium text-[var(--color-texto)] ${modoCelular ? '' : 'mt-3'}`} style={{ fontFamily: 'var(--fuente-titulos)', fontSize: 18 }}>
          {etiquetaDiaCorta(inicio)} · {inicio.toLocaleTimeString('es-MX', FORMATO_HORA)} – {fin.toLocaleTimeString('es-MX', FORMATO_HORA)}
        </div>
        <div className="mt-0.5 text-[12.5px] text-[var(--color-texto-suave)]">
          {formatearDuracion(duracionCita(c))} · Atiende {c.empleadas?.nombre ?? '—'}
        </div>

        <div className="mt-3.5 flex items-center gap-3 rounded-[10px] bg-[var(--color-fondo)] p-3">
          <span
            className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-full text-sm font-medium"
            style={{ background: 'color-mix(in srgb, var(--color-secundario) 18%, white)', color: '#68785B' }}
          >
            {(c.clientes?.nombre ?? '?').charAt(0).toUpperCase()}
          </span>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-medium text-[var(--color-texto)]">{c.clientes?.nombre ?? 'Sin clienta'}</div>
            <div className="truncate text-[12.5px] text-[var(--color-texto-suave)]">
              {c.clientes?.telefono || c.clientes?.contacto_red_social || 'Sin contacto'}
            </div>
          </div>
          {telefonoLimpio && (
            <a
              href={`https://wa.me/${telefonoLimpio}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex shrink-0 items-center gap-1.5 rounded-lg border-[1.5px] px-3 text-[12.5px] font-medium text-[var(--color-texto)]"
              style={{ borderColor: 'var(--color-secundario)', minHeight: 36 }}
            >
              <IconoWhatsapp />
              WhatsApp
            </a>
          )}
        </div>

        <div className="mt-4 text-[11.5px] font-medium uppercase tracking-[.07em] text-[var(--color-texto-suave)]">Servicios</div>
        {c.cita_servicios.map((s, i) => (
          <LineaServicio key={i} nombre={s.items?.nombre ?? 'Servicio'} precio={s.precio} duracion={s.duracion_minutos} />
        ))}
        <div className="mt-2.5 flex justify-between gap-2 border-t pt-2.5 text-[13px] font-medium" style={{ borderColor: 'var(--color-divisor-fuerte)' }}>
          <span>Total</span>
          <span>
            {formatearDuracion(duracionCita(c))} · ${total.toFixed(0)}
          </span>
        </div>

        <div className="mt-3.5 flex gap-6">
          <div>
            <div className="text-[11.5px] font-medium uppercase tracking-[.07em] text-[var(--color-texto-suave)]">Forma de uña</div>
            <div className="mt-1 text-[13.5px] text-[var(--color-texto)]">{c.forma_una ?? '—'}</div>
          </div>
          <div>
            <div className="text-[11.5px] font-medium uppercase tracking-[.07em] text-[var(--color-texto-suave)]">Estado</div>
            <div className="mt-1 text-[13.5px] text-[var(--color-texto)]">{ETIQUETAS_ESTADO[c.estado]}</div>
          </div>
        </div>

        {c.clientes?.notas && (
          <>
            <div className="mt-3.5 text-[11.5px] font-medium uppercase tracking-[.07em] text-[var(--color-texto-suave)]">Notas</div>
            <p className="mt-1 text-[13px] leading-[1.45] text-[var(--color-texto-suave)]">{c.clientes.notas}</p>
          </>
        )}

        <div className="mt-3.5 text-[11.5px] font-medium uppercase tracking-[.07em] text-[var(--color-texto-suave)]">Historial</div>
        {historial === null ? (
          <p className="mt-1 text-[12.5px] text-[var(--color-texto-suave)]">Cargando...</p>
        ) : historial.length === 0 ? (
          <p className="mt-1 text-[12.5px] text-[var(--color-texto-suave)]">Sin visitas previas.</p>
        ) : (
          historial.map((v) => (
            <div key={v.id} className="mt-1.5 flex justify-between gap-2 text-[12.5px] text-[var(--color-texto-suave)]">
              <span>
                {new Date(v.fecha).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', ...OPCIONES_ZONA_NEGOCIO })} · {v.items}
              </span>
              <span>${v.total.toFixed(0)}</span>
            </div>
          ))
        )}

        {(c.estado === 'pendiente' || c.estado === 'confirmada') && (
          <div className="mt-4 flex flex-col gap-2">
            <Link to={`/agenda/${c.id}/finalizar`} className={claseBoton('primario')}>
              Finalizar servicio
            </Link>
            <button onClick={() => setCitaEditando(c)} className={claseBoton('secundario')}>
              Editar cita
            </button>
            <button onClick={() => cancelar(c)} className={claseBoton('destructivo')}>
              Cancelar cita
            </button>
            {!c.venta_id && (
              <button onClick={() => eliminar(c)} className={claseBoton('destructivo')}>
                Eliminar cita
              </button>
            )}
          </div>
        )}
      </Tarjeta>
    )

    if (!modoCelular) return cuerpo

    return (
      <div className="p-4">
        <div className="flex items-center gap-2.5">
          <button onClick={onCerrar} className="flex h-9 w-9 items-center justify-center rounded-lg text-[var(--color-texto)] hover:bg-[var(--color-hover-nav)]" aria-label="Volver">
            <IconoVolver />
          </button>
          <div className="flex-1 text-lg font-medium text-[var(--color-texto)]" style={{ fontFamily: 'var(--fuente-titulos)' }}>
            Cita
          </div>
          <EstadoBadge tipo={TIPO_ESTADO[c.estado]} texto={ETIQUETAS_ESTADO[c.estado]} />
        </div>
        <div className="mt-3.5">{cuerpo}</div>
      </div>
    )
  }

  return (
    <div className="flex items-start">
      {/* Contenido principal: en celular se oculta por completo detrás de la ficha a pantalla
          completa cuando hay una cita seleccionada; en escritorio siempre se ve, junto al panel. */}
      <div className={`min-w-0 flex-1 p-4 md:p-[22px] lg:p-7 ${citaSeleccionada ? 'hidden lg:block' : ''}`}>
      <div className="flex flex-wrap items-center gap-3">
        <div className="inline-flex flex-none rounded-[9px] p-[3px]" style={{ background: 'var(--color-track-segmentado)' }}>
          {(['dia', 'semana', 'mes'] as Vista[]).map((v) => (
            <button
              key={v}
              onClick={() => setVista(v)}
              className={`rounded-[7px] px-3.5 py-[7px] text-[13px] capitalize ${
                vista === v
                  ? 'bg-[var(--color-superficie)] font-medium text-[var(--color-texto)] shadow-[0_1px_2px_rgba(74,50,43,.1)]'
                  : 'text-[var(--color-texto-suave)]'
              }`}
            >
              {v}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={irAnterior}
            aria-label="Periodo anterior"
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--color-superficie)] text-[var(--color-texto-suave)] shadow-[0_1px_2px_rgba(74,50,43,.1)]"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
              <path d="M14.5 6 8.5 12l6 6" />
            </svg>
          </button>
          <button
            onClick={irSiguiente}
            aria-label="Periodo siguiente"
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--color-superficie)] text-[var(--color-texto-suave)] shadow-[0_1px_2px_rgba(74,50,43,.1)]"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
              <path d="m9.5 6 6 6-6 6" />
            </svg>
          </button>
          <button onClick={irHoy} className="rounded-lg px-2 py-1 text-xs text-[var(--color-texto-suave)] underline">
            Hoy
          </button>
          <div className="ml-1 whitespace-nowrap text-base font-medium text-[var(--color-texto)]" style={{ fontFamily: 'var(--fuente-titulos)' }}>
            {tituloPeriodo}
          </div>
        </div>

        <div className="flex-1" />
        <Button onClick={() => setMostrarAgendar(true)} className="flex-none">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round">
            <path d="M12 5v14" />
            <path d="M5 12h14" />
          </svg>
          Agendar cita
        </Button>
      </div>

      {error && <EstadoErrorAgenda />}
      {!error && citas === null && <EstadoCargando />}
      {!error && citas !== null && citas.length === 0 && (
        <EstadoVacio mensaje={vista === 'dia' ? 'Sin citas este día' : vista === 'semana' ? 'Sin citas esta semana' : 'Sin citas este mes'} />
      )}
      {!error && citas !== null && citas.length > 0 && (
        <>
          {vista === 'dia' && <VistaDia />}
          {vista === 'semana' && <VistaSemana />}
          {vista === 'mes' && <VistaMes />}
        </>
      )}
      </div>

      {citaSeleccionada && (
        <div className="hidden w-[340px] shrink-0 py-4 pr-4 lg:block lg:py-7 lg:pr-7">
          <FichaCita cita={citaSeleccionada} onCerrar={() => setCitaSeleccionada(null)} />
        </div>
      )}

      {citaSeleccionada && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-[var(--color-fondo)] lg:hidden">
          <FichaCita cita={citaSeleccionada} onCerrar={() => setCitaSeleccionada(null)} modoCelular />
        </div>
      )}
    </div>
  )
}
