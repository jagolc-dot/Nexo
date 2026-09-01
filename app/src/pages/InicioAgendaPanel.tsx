import { useEffect, useMemo, useState } from 'react'
import { useNegocio } from '../context/NegocioContext'
import { listarCategorias } from '../lib/catalogo'
import { FORMAS_UNA, agendarCita, editarCita, listarEmpleadas, listarServiciosConAgenda, verificarDisponibilidad, type Cita } from '../lib/agenda'
import { crearClienteRapido, listarClientes } from '../lib/ventas'
import { formatearDuracion } from '../lib/formato'
import { horaNegocioAUtc, OPCIONES_ZONA_NEGOCIO, hoyEnNegocio, diaCalendarioDesdeYMD, fechaISOEnNegocio, horaMinutoNegocio } from '../lib/tiempoNegocio'
import type { CategoriaItem, Cliente, Empleada, Item } from '../types'
import { claseBoton } from '../components/ui/Button'

const CAMPO =
  'flex min-h-11 w-full items-center rounded-[10px] border bg-[var(--color-superficie)] px-3 text-sm text-[var(--color-texto)] outline-none focus:border-[var(--color-primario)]'
const ESTILO_CAMPO = { borderColor: 'var(--color-borde-campo)' }

const NOMBRES_PASO = ['Servicios', 'Forma de uña', 'Fecha y hora', 'Clienta', 'Resumen']
const DIAS_CORTOS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']

function formatoFechaInput(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

const RUTAS_FORMA: Record<(typeof FORMAS_UNA)[number], string> = {
  Almendrada: 'M12 2C7.5 8 6 14 6 22a6 6 0 0 0 12 0c0-8-1.5-14-6-20Z',
  Cuadrada: 'M6.5 3h11v19a5.5 5.5 0 0 1-11 0Z',
  Coffin: 'M9 3h6l3 19a5.5 5.5 0 0 1-12 0Z',
  Stiletto: 'M12 2 7.5 21a4.7 4.7 0 0 0 9 0Z',
}

function IconoForma({ forma, seleccionada }: { forma: (typeof FORMAS_UNA)[number]; seleccionada: boolean }) {
  return (
    <svg width={26} height={36} viewBox="0 0 24 34" fill="none" stroke={seleccionada ? 'var(--color-primario)' : '#8A6A5E'} strokeWidth={1.5} strokeLinejoin="round">
      <path d={RUTAS_FORMA[forma]} />
    </svg>
  )
}

function IconoCheck() {
  return (
    <span className="absolute right-2 top-2 flex h-[18px] w-[18px] items-center justify-center rounded-full bg-[var(--color-primario)]">
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
        <path d="m5 12 5 5 9-10" />
      </svg>
    </span>
  )
}

function IconoVolver() {
  return (
    <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M14.5 6 8.5 12l6 6" />
    </svg>
  )
}
function IconoBuscar() {
  return (
    <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="#B99A8D" strokeWidth={1.7} strokeLinecap="round">
      <circle cx="11" cy="11" r="6.5" />
      <path d="m16 16 4.5 4.5" />
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

function TarjetaSeleccionable({
  seleccionada,
  onClick,
  children,
  className = '',
}: {
  seleccionada: boolean
  onClick: () => void
  children: React.ReactNode
  className?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative flex min-h-11 flex-col items-center justify-center gap-1 rounded-[10px] border-2 px-2.5 py-3.5 text-center ${className}`}
      style={{
        borderColor: seleccionada ? 'var(--color-primario)' : 'var(--color-hairline)',
        background: seleccionada ? 'color-mix(in srgb, var(--color-primario) 8%, white)' : 'var(--color-superficie)',
      }}
    >
      {seleccionada && <IconoCheck />}
      {children}
    </button>
  )
}

export function InicioAgendaPanel({ onListo, editando }: { onListo: () => void; editando?: Cita }) {
  const { negocioActivo } = useNegocio()
  const esEdicion = Boolean(editando)

  const [paso, setPaso] = useState(1)
  const [categorias, setCategorias] = useState<CategoriaItem[]>([])
  const [servicios, setServicios] = useState<Item[]>([])
  const [empleadas, setEmpleadas] = useState<Empleada[]>([])
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [cargando, setCargando] = useState(true)

  const [serviciosElegidos, setServiciosElegidos] = useState<Set<string>>(
    () => new Set(editando?.cita_servicios.map((s) => s.item_id) ?? []),
  )
  // Precio/duración congelados de los servicios que ya estaban en la cita
  // al entrar a editar — nunca se recalculan. Los que se agreguen durante
  // la edición usan el precio/duración vigentes del catálogo.
  const [preciosCongelados] = useState<Record<string, { precio: number; duracion: number }>>(() =>
    Object.fromEntries((editando?.cita_servicios ?? []).map((s) => [s.item_id, { precio: s.precio, duracion: s.duracion_minutos }])),
  )
  const [formaUna, setFormaUna] = useState(editando?.forma_una ?? '')
  const [empleadaId, setEmpleadaId] = useState(editando?.empleada_id ?? '')
  const [fecha, setFecha] = useState(() => (editando ? fechaISOEnNegocio(editando.fecha_hora) : hoyEnNegocio()))
  const [hora, setHora] = useState(() => {
    if (!editando) return ''
    const { horas, minutos } = horaMinutoNegocio(editando.fecha_hora)
    return `${String(horas).padStart(2, '0')}:${String(minutos).padStart(2, '0')}`
  })
  const [conflicto, setConflicto] = useState(false)
  const [verificando, setVerificando] = useState(false)

  const [tabClienta, setTabClienta] = useState<'existente' | 'nueva'>('existente')
  const [busquedaClienta, setBusquedaClienta] = useState('')
  const [clienteId, setClienteId] = useState(editando?.cliente_id ?? '')
  const [nuevoNombre, setNuevoNombre] = useState('')
  const [nuevoTelefono, setNuevoTelefono] = useState('')
  const [nuevoRedSocial, setNuevoRedSocial] = useState('')

  const [error, setError] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  useEffect(() => {
    if (!negocioActivo) return
    Promise.all([
      listarCategorias(negocioActivo.id, false, 'servicio'),
      listarServiciosConAgenda(negocioActivo.id, !esEdicion),
      listarEmpleadas(negocioActivo.id),
      listarClientes(negocioActivo.id),
    ]).then(([c, s, e, cl]) => {
      setCategorias(c)
      setServicios(s)
      setEmpleadas(e)
      if (e.length === 1) setEmpleadaId(e[0].id)
      setClientes(cl)
      setCargando(false)
    })
  }, [negocioActivo])

  const secciones = useMemo(() => {
    const grupos = categorias
      .map((cat) => ({ categoria: cat, servicios: servicios.filter((s) => s.categoria_id === cat.id) }))
      .filter((g) => g.servicios.length > 0)
    const sinCategoria = servicios.filter((s) => !s.categoria_id)
    if (sinCategoria.length > 0) {
      grupos.push({ categoria: { id: 'sin-categoria', nombre: 'Otros' } as CategoriaItem, servicios: sinCategoria })
    }
    return grupos
  }, [categorias, servicios])

  // Servicio ya congelado (venía en la cita al editar) -> conserva su
  // precio/duración originales. Servicio nuevo -> precio/duración vigentes
  // del catálogo. Nunca se recalcula lo que ya estaba.
  function datosServicio(s: Item): { precio: number; duracion: number } {
    return preciosCongelados[s.id] ?? { precio: s.precio_base ?? 0, duracion: s.duracion_minutos ?? 0 }
  }

  const elegidos = servicios.filter((s) => serviciosElegidos.has(s.id))
  const duracionTotal = elegidos.reduce((acc, s) => acc + datosServicio(s).duracion, 0)
  const precioTotal = elegidos.reduce((acc, s) => acc + datosServicio(s).precio, 0)
  const empleadaActiva = empleadas.length === 1 ? empleadas[0] : empleadas.find((e) => e.id === empleadaId) ?? null
  const clienteElegido = clientes.find((c) => c.id === clienteId) ?? null

  const clientesFiltrados = busquedaClienta.trim()
    ? clientes.filter((c) => {
        const q = busquedaClienta.trim().toLowerCase()
        return (
          c.nombre.toLowerCase().includes(q) ||
          (c.telefono ?? '').includes(q) ||
          (c.contacto_red_social ?? '').toLowerCase().includes(q)
        )
      })
    : clientes

  useEffect(() => {
    if (!negocioActivo || !fecha || !hora || !empleadaActiva || duracionTotal === 0) {
      setConflicto(false)
      return
    }
    let cancelado = false
    setVerificando(true)
    verificarDisponibilidad(negocioActivo.id, empleadaActiva.id, horaNegocioAUtc(fecha, hora), duracionTotal, editando?.id)
      .then((disponible) => {
        if (!cancelado) setConflicto(!disponible)
      })
      .finally(() => {
        if (!cancelado) setVerificando(false)
      })
    return () => {
      cancelado = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [negocioActivo, fecha, hora, empleadaActiva?.id, duracionTotal])

  if (!negocioActivo) return null
  if (cargando) return <p className="p-4 text-sm text-[var(--color-texto-suave)]">Cargando...</p>

  function alternarServicio(id: string) {
    setServiciosElegidos((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function agregarClienteRapido(): Promise<boolean> {
    if (!nuevoNombre || (!nuevoTelefono && !nuevoRedSocial)) {
      setError('La clienta necesita nombre y al menos un dato de contacto.')
      return false
    }
    try {
      const cliente = await crearClienteRapido(negocioActivo!.id, nuevoNombre, nuevoTelefono || null, nuevoRedSocial || null)
      setClientes((prev) => [...prev, cliente].sort((a, b) => a.nombre.localeCompare(b.nombre)))
      setClienteId(cliente.id)
      setError(null)
      return true
    } catch (err) {
      console.error(err)
      setError(err instanceof Error ? err.message : 'No se pudo crear la clienta.')
      return false
    }
  }

  async function confirmar() {
    setError(null)
    setEnviando(true)
    try {
      const payload = elegidos.map((s) => {
        const { precio, duracion } = datosServicio(s)
        return { item_id: s.id, precio, duracion_minutos: duracion }
      })
      const fechaHoraUtc = horaNegocioAUtc(fecha, hora).toISOString()
      if (esEdicion) {
        await editarCita(editando!.id, clienteId, fechaHoraUtc, payload, formaUna || null, empleadaActiva?.id || null)
      } else {
        await agendarCita(negocioActivo!.id, clienteId, fechaHoraUtc, payload, formaUna || null, empleadaActiva?.id || null)
      }
      onListo()
    } catch (err) {
      console.error(err)
      setError(err instanceof Error ? err.message : `No se pudo ${esEdicion ? 'guardar los cambios' : 'agendar la cita'}.`)
    } finally {
      setEnviando(false)
    }
  }

  async function irSiguiente() {
    setError(null)
    if (paso === 1) {
      if (serviciosElegidos.size === 0) {
        setError('Elige al menos un servicio.')
        return
      }
    }
    if (paso === 3) {
      if (!fecha || !hora) {
        setError('Elige fecha y hora.')
        return
      }
      if (empleadas.length > 1 && !empleadaId) {
        setError('Elige quién atiende.')
        return
      }
      if (conflicto) return
    }
    if (paso === 4) {
      if (tabClienta === 'nueva') {
        if (!clienteId) {
          const ok = await agregarClienteRapido()
          if (!ok) return
        }
      } else if (!clienteId) {
        setError('Elige una clienta.')
        return
      }
    }
    if (paso === 5) {
      await confirmar()
      return
    }
    setPaso((p) => p + 1)
  }

  function irAtras() {
    setError(null)
    if (paso === 1) {
      onListo()
      return
    }
    setPaso((p) => p - 1)
  }

  const fechasRapidas = Array.from({ length: 7 }, (_, i) => {
    const d = diaCalendarioDesdeYMD(hoyEnNegocio())
    d.setDate(d.getDate() + i)
    return d
  })

  return (
    <div className="mx-auto flex max-h-full w-full max-w-[560px] flex-col overflow-hidden rounded-[14px] border bg-[var(--color-superficie)] lg:mt-8 lg:shadow-[0_18px_50px_rgba(74,50,43,.15)]" style={{ borderColor: 'var(--color-hairline)' }}>
      <div className="px-4 pt-3.5">
        <div className="flex items-center gap-2.5">
          <button onClick={irAtras} className="flex h-9 w-9 items-center justify-center rounded-lg text-[var(--color-texto)] hover:bg-[var(--color-hover-nav)]" aria-label="Volver">
            <IconoVolver />
          </button>
          <div className="min-w-0 flex-1">
            <div className="text-[17px] font-medium text-[var(--color-texto)]" style={{ fontFamily: 'var(--fuente-titulos)' }}>
              {esEdicion ? 'Editar cita' : 'Agendar cita'}
            </div>
            <div className="mt-0.5 text-xs text-[var(--color-texto-suave)]">
              Paso {paso} de 5 · {NOMBRES_PASO[paso - 1]}
            </div>
          </div>
        </div>
        <div className="mt-3 h-1 overflow-hidden rounded-full" style={{ background: 'var(--color-track-segmentado)' }}>
          <div className="h-full rounded-full bg-[var(--color-primario)] transition-all" style={{ width: `${paso * 20}%` }} />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-[18px]">
        {paso === 1 && (
          <div className="flex flex-col gap-[18px]">
            {secciones.map(({ categoria, servicios: serviciosCategoria }) => (
              <div key={categoria.id}>
                <div className="mb-2 text-[11.5px] font-medium uppercase tracking-[.07em] text-[var(--color-texto-suave)]">{categoria.nombre}</div>
                <div className="grid grid-cols-2 gap-2.5">
                  {serviciosCategoria.map((s) => (
                    <TarjetaSeleccionable key={s.id} seleccionada={serviciosElegidos.has(s.id)} onClick={() => alternarServicio(s.id)}>
                      <span className="text-[13.5px] font-medium" style={{ color: serviciosElegidos.has(s.id) ? 'var(--color-primario)' : 'var(--color-texto)' }}>
                        {s.nombre}
                      </span>
                      <span className="text-xs text-[var(--color-texto-suave)]">
                        ${s.precio_base?.toFixed(0)} · {formatearDuracion(s.duracion_minutos ?? 0)}
                      </span>
                    </TarjetaSeleccionable>
                  ))}
                </div>
              </div>
            ))}
            {secciones.length === 0 && <p className="text-sm text-[var(--color-texto-suave)]">No hay servicios en el catálogo todavía.</p>}
          </div>
        )}

        {paso === 2 && (
          <div>
            <p className="mb-3 text-[13px] text-[var(--color-texto-suave)]">Opcional — puedes saltarte este paso. Una sola forma por cita.</p>
            <div className="grid grid-cols-2 gap-2.5">
              {FORMAS_UNA.map((f) => (
                <TarjetaSeleccionable key={f} seleccionada={formaUna === f} onClick={() => setFormaUna((prev) => (prev === f ? '' : f))}>
                  <IconoForma forma={f} seleccionada={formaUna === f} />
                  <span className="text-[13.5px] font-medium" style={{ color: formaUna === f ? undefined : 'var(--color-texto-suave)' }}>
                    {f}
                  </span>
                </TarjetaSeleccionable>
              ))}
            </div>
          </div>
        )}

        {paso === 3 && (
          <div>
            <div className="mb-2 text-[11.5px] font-medium uppercase tracking-[.07em] text-[var(--color-texto-suave)]">Fecha</div>
            <div className="flex gap-1.5">
              {fechasRapidas.map((d) => {
                const valor = formatoFechaInput(d)
                const sel = valor === fecha
                return (
                  <button
                    key={valor}
                    onClick={() => setFecha(valor)}
                    className="flex min-w-0 flex-1 flex-col items-center gap-0.5 rounded-[10px] border-2 py-2"
                    style={{
                      borderColor: sel ? 'var(--color-primario)' : 'var(--color-hairline)',
                      background: sel ? 'color-mix(in srgb, var(--color-primario) 8%, white)' : 'var(--color-superficie)',
                    }}
                  >
                    <span className="text-[10.5px] uppercase tracking-[.04em]" style={{ color: sel ? 'var(--color-primario)' : 'var(--color-texto-suave)' }}>
                      {DIAS_CORTOS[d.getDay()]}
                    </span>
                    <span className="text-[15px] font-medium" style={{ color: sel ? 'var(--color-primario)' : 'var(--color-texto)' }}>
                      {d.getDate()}
                    </span>
                  </button>
                )
              })}
            </div>
            <label className="mt-2 flex flex-col gap-1 text-xs text-[var(--color-texto-suave)]">
              Otra fecha
              <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className={CAMPO} style={ESTILO_CAMPO} />
            </label>

            <div className="mb-2 mt-4 text-[11.5px] font-medium uppercase tracking-[.07em] text-[var(--color-texto-suave)]">Hora</div>
            <input type="time" value={hora} onChange={(e) => setHora(e.target.value)} className={CAMPO} style={ESTILO_CAMPO} />

            {conflicto && !verificando && (
              <div className="mt-3.5 flex gap-2.5 rounded-[10px] p-3" style={{ background: 'color-mix(in srgb, var(--color-error) 9%, white)' }}>
                <IconoAdvertencia />
                <p className="text-[13px] leading-[1.45]" style={{ color: '#A03A31' }}>
                  {empleadaActiva?.nombre ?? 'Esta empleada'} ya tiene una cita que se encima en ese horario. Elige otra hora o cambia el día.
                </p>
              </div>
            )}

            {empleadas.length <= 1 && empleadaActiva && (
              <div className="mt-4 flex items-center gap-2.5 rounded-[10px] p-3" style={{ background: 'var(--color-fondo)' }}>
                <span
                  className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full text-xs font-medium"
                  style={{ background: 'color-mix(in srgb, var(--color-primario) 14%, white)', color: 'var(--color-primario)' }}
                >
                  {empleadaActiva.nombre.charAt(0).toUpperCase()}
                </span>
                <span className="text-[13px] text-[var(--color-texto)]">
                  Atiende <strong>{empleadaActiva.nombre}</strong>
                </span>
                <span className="flex-1" />
                <span className="text-[11.5px] text-[var(--color-texto-suave)]">única empleada activa</span>
              </div>
            )}
            {empleadas.length > 1 && (
              <label className="mt-4 flex flex-col gap-1 text-xs text-[var(--color-texto-suave)]">
                Quién atiende
                <select value={empleadaId} onChange={(e) => setEmpleadaId(e.target.value)} className={CAMPO} style={ESTILO_CAMPO}>
                  <option value="">Selecciona...</option>
                  {empleadas.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.nombre}
                    </option>
                  ))}
                </select>
              </label>
            )}
          </div>
        )}

        {paso === 4 && (
          <div>
            <div className="mb-3.5 inline-flex rounded-[9px] p-[3px]" style={{ background: 'var(--color-track-segmentado)' }}>
              {(['existente', 'nueva'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => {
                    setTabClienta(t)
                    if (t === 'nueva') setClienteId('')
                  }}
                  className={`rounded-[7px] px-3.5 py-[7px] text-[13px] ${
                    tabClienta === t ? 'bg-[var(--color-superficie)] font-medium text-[var(--color-texto)] shadow-[0_1px_2px_rgba(74,50,43,.1)]' : 'text-[var(--color-texto-suave)]'
                  }`}
                >
                  {t === 'existente' ? 'Clienta existente' : 'Nueva clienta'}
                </button>
              ))}
            </div>

            {tabClienta === 'existente' ? (
              <div>
                <div className="flex items-center gap-2.5 rounded-[10px] border px-3" style={{ borderColor: 'var(--color-borde-campo)', minHeight: 44 }}>
                  <IconoBuscar />
                  <input
                    value={busquedaClienta}
                    onChange={(e) => setBusquedaClienta(e.target.value)}
                    placeholder="Buscar por nombre, teléfono o red"
                    className="min-w-0 flex-1 bg-transparent text-[13.5px] text-[var(--color-texto)] outline-none"
                  />
                </div>
                <div className="mt-3 flex flex-col gap-2">
                  {clientesFiltrados.map((c) => (
                    <TarjetaSeleccionable key={c.id} seleccionada={clienteId === c.id} onClick={() => setClienteId(c.id)} className="!flex-row !items-center !justify-start !gap-3 !py-3 !text-left">
                      <span
                        className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-full text-[13px] font-medium"
                        style={{ background: 'color-mix(in srgb, var(--color-secundario) 18%, white)', color: '#68785B' }}
                      >
                        {c.nombre.charAt(0).toUpperCase()}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-medium text-[var(--color-texto)]">{c.nombre}</span>
                        <span className="block text-xs text-[var(--color-texto-suave)]">{c.telefono || c.contacto_red_social || 'Sin contacto'}</span>
                      </span>
                    </TarjetaSeleccionable>
                  ))}
                  {clientesFiltrados.length === 0 && (
                    <p className="text-sm text-[var(--color-texto-suave)]">Sin resultados para «{busquedaClienta}».</p>
                  )}
                </div>
                <button
                  onClick={() => {
                    setTabClienta('nueva')
                    setClienteId('')
                  }}
                  className="mt-3.5 inline-flex items-center gap-1.5 text-[13px] font-medium text-[var(--color-primario)]"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round">
                    <path d="M12 5v14" />
                    <path d="M5 12h14" />
                  </svg>
                  Crear nueva clienta
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-3.5">
                <label className="flex flex-col gap-1.5 text-xs font-medium text-[var(--color-texto)]">
                  Nombre <span style={{ color: 'var(--color-error)' }}>*</span>
                  <input
                    value={nuevoNombre}
                    onChange={(e) => setNuevoNombre(e.target.value)}
                    autoCapitalize="off"
                    autoCorrect="off"
                    spellCheck={false}
                    className={CAMPO}
                    style={ESTILO_CAMPO}
                  />
                </label>
                <label className="flex flex-col gap-1.5 text-xs font-medium text-[var(--color-texto)]">
                  Teléfono
                  <input value={nuevoTelefono} onChange={(e) => setNuevoTelefono(e.target.value)} className={CAMPO} style={ESTILO_CAMPO} />
                </label>
                <label className="flex flex-col gap-1.5 text-xs font-medium text-[var(--color-texto)]">
                  Red social
                  <input value={nuevoRedSocial} onChange={(e) => setNuevoRedSocial(e.target.value)} className={CAMPO} style={ESTILO_CAMPO} />
                </label>
                <p className="text-xs leading-[1.45] text-[var(--color-texto-suave)]">
                  Captura teléfono <strong>o</strong> red social — con uno basta. Sin ninguno no se puede guardar.
                </p>
              </div>
            )}
          </div>
        )}

        {paso === 5 && clienteElegido && (
          <div>
            <div className="flex items-center gap-3 rounded-[10px] p-3" style={{ background: 'var(--color-fondo)' }}>
              <span
                className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-full text-sm font-medium"
                style={{ background: 'color-mix(in srgb, var(--color-secundario) 18%, white)', color: '#68785B' }}
              >
                {clienteElegido.nombre.charAt(0).toUpperCase()}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium text-[var(--color-texto)]">{clienteElegido.nombre}</span>
                <span className="block text-xs text-[var(--color-texto-suave)]">{clienteElegido.telefono || clienteElegido.contacto_red_social}</span>
              </span>
            </div>

            <div className="mt-4 flex gap-6">
              <div>
                <div className="text-[11.5px] font-medium uppercase tracking-[.07em] text-[var(--color-texto-suave)]">Fecha y hora</div>
                <div className="mt-1 text-[13.5px] text-[var(--color-texto)]">
                  {horaNegocioAUtc(fecha, hora).toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric', month: 'short', ...OPCIONES_ZONA_NEGOCIO })} ·{' '}
                  {horaNegocioAUtc(fecha, hora).toLocaleTimeString('es-MX', { hour: 'numeric', minute: '2-digit', ...OPCIONES_ZONA_NEGOCIO })}
                </div>
              </div>
              <div>
                <div className="text-[11.5px] font-medium uppercase tracking-[.07em] text-[var(--color-texto-suave)]">Atiende</div>
                <div className="mt-1 text-[13.5px] text-[var(--color-texto)]">{empleadaActiva?.nombre ?? '—'}</div>
              </div>
            </div>

            <div className="mb-2 mt-4 text-[11.5px] font-medium uppercase tracking-[.07em] text-[var(--color-texto-suave)]">Servicios</div>
            {elegidos.map((s) => {
              const { precio, duracion } = datosServicio(s)
              return (
                <div key={s.id} className="mt-1.5 flex justify-between gap-2 text-[13.5px]">
                  <span className="text-[var(--color-texto)]">{s.nombre}</span>
                  <span className="whitespace-nowrap text-[var(--color-texto-suave)]">
                    ${precio.toFixed(0)} · {formatearDuracion(duracion)}
                  </span>
                </div>
              )
            })}

            {formaUna && (
              <div className="mt-4">
                <div className="text-[11.5px] font-medium uppercase tracking-[.07em] text-[var(--color-texto-suave)]">Forma de uña</div>
                <div className="mt-1 text-[13.5px] text-[var(--color-texto)]">{formaUna}</div>
              </div>
            )}

            <div className="mt-4 border-t pt-3" style={{ borderColor: 'var(--color-divisor-fuerte)' }}>
              <div className="flex justify-between gap-2 text-[13px] text-[var(--color-texto-suave)]">
                <span>Duración total</span>
                <span>{formatearDuracion(duracionTotal)}</span>
              </div>
              <div className="mt-2 flex justify-between gap-2 text-[15px] font-medium text-[var(--color-texto)]">
                <span>Total</span>
                <span className="text-[18px] text-[var(--color-primario)]" style={{ fontFamily: 'var(--fuente-titulos)' }}>
                  ${precioTotal.toFixed(0)}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="border-t px-4 pb-4 pt-3" style={{ borderColor: 'var(--color-divisor-fuerte)' }}>
        {paso === 1 && elegidos.length > 0 && (
          <div className="mb-2.5 flex justify-between gap-2 text-xs text-[var(--color-texto-suave)]">
            <span>
              {elegidos.length} servicio{elegidos.length === 1 ? '' : 's'} seleccionado{elegidos.length === 1 ? '' : 's'}
            </span>
            <span>
              {formatearDuracion(duracionTotal)} · ${precioTotal.toFixed(0)}
            </span>
          </div>
        )}
        {error && <p className="mb-2.5 text-sm text-[var(--color-error)]">{error}</p>}
        <button
          onClick={irSiguiente}
          disabled={enviando || (paso === 3 && conflicto)}
          className={paso === 3 && conflicto ? 'flex min-h-12 w-full items-center justify-center rounded-lg bg-[var(--color-deshabilitado-fondo)] text-sm font-medium text-[var(--color-deshabilitado-texto)]' : claseBoton('primario', 'w-full !min-h-12')}
        >
          {enviando
            ? esEdicion
              ? 'Guardando...'
              : 'Agendando...'
            : paso === 5
              ? esEdicion
                ? 'Guardar cambios'
                : 'Confirmar cita'
              : 'Continuar'}
        </button>
        {paso === 2 && (
          <button onClick={() => setPaso(3)} className="mt-1 flex min-h-11 w-full items-center justify-center text-[13.5px] font-medium text-[var(--color-texto-suave)]">
            Omitir este paso
          </button>
        )}
      </div>
    </div>
  )
}
