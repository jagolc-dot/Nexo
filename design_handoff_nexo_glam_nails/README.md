# Handoff: Nexo · Glam Nails by Chio — Sistema administrativo completo

## Overview
Diseño completo del sistema administrativo interno **Nexo** para el negocio **Glam Nails by Chio** (salón de uñas). Cubre las 13 pantallas del brief: Inicio (dashboard), Agenda (Día/Semana/Mes + ficha de cita), Agendar cita (5 pasos), Finalizar servicio (3 pasos), Catálogo, Clientes, Ventas, Gastos, Reportes, Login, Selector de negocio, Administración de usuarios y Ajustes — con estados vacío/cargando/error y versiones escritorio/tablet/celular.

El brief funcional original está incluido: `BRIEF_DISENO_glam_nails.md`. **La lógica de negocio del brief manda**; si algo en los mocks contradice el brief, gana el brief.

## About the Design Files
Los archivos de este paquete son **referencias de diseño creadas en HTML** (Design Components `.dc.html`): prototipos que muestran la apariencia y el comportamiento buscado, **no código de producción para copiar**. La tarea es **recrear estos diseños en el entorno del codebase destino** (React, Vue, etc.) usando sus patrones y librerías. Si aún no existe un entorno, elige el framework más apropiado (una SPA React + variables CSS es un mapeo natural).

Cómo leer los `.dc.html`: el markup vive entre `<x-dc>…</x-dc>` con estilos inline; la lógica/datos de ejemplo están en la clase `Component` dentro del `<script data-dc-script>`; `{{ hueco }}` son bindings; `<sc-if>`/`<sc-for>` son condicionales/bucles; `<dc-import name="X">` monta el componente hermano `X.dc.html` con props (kebab-case → camelCase). `Nexo Glam Nails.dc.html` es el lienzo de presentación (turnos 1–16) y muestra cada pantalla con las props exactas de cada variante — úsalo como índice visual.

## Fidelity
**High-fidelity (hifi).** Colores, tipografía, espaciado, copys y estados son finales y aprobados por el usuario. Recrear con precisión de píxel usando el sistema de tokens de abajo. Los datos (clientas, precios, KPIs) son de ejemplo, pero los formatos de presentación (MXN `$12,480`, fechas `Lun 3 ago`, horas `4:00 pm`) son intencionales.

## Arquitectura de temas (crítico)
- **Todos los colores se consumen como variables CSS** (`--color-primario`, etc.), nunca hardcodeados. Cambiar de negocio activo = reasignar variables; estructura, espaciado y componentes idénticos.
- Tema `boutique` (Glam Nails) es el de todos los mocks. Tema `neutro` (negocio sin tema, y pantallas de marca Nexo como Login/Selector): primario `#1F3357`, acento `#2E8C82`, fondo `#F5F7FA`.
- Los **colores de estado NO se tematizan**: éxito `#2F9E5B`, advertencia `#D9A441`, error `#C1443A`.
- La tipografía de títulos también es variable (`--fuente-titulos`), decisión final: **Playfair Display** (ver Design Tokens).

## Screens / Views

### 1. Chrome (navegación compartida) — `Chrome.dc.html`
- **Escritorio (≥1024px)**: sidebar fija 232px, fondo `--color-superficie`, borde derecho 1px `#F1E4DE`, padding 20px 14px. Arriba: logo del negocio (40px, círculo) + "Glam Nails" (14.5px, `--fuente-titulos`, peso 500) / "by Chio" (11.5px, texto-suave). Módulos en orden fijo: **Inicio, Agenda, Clientes, Catálogo, Ventas, Gastos, Reportes**; al pie: usuario (avatar inicial 30px), Ajustes, Cerrar sesión. **No hay botón "Agendar cita" en el menú.**
- Ítem de nav: flex, gap 10px, padding 10px, radio 8px, 13.5px; ícono lineal 18px stroke 1.6. Inactivo: color texto-suave, hover fondo `#FAF3EF`. **Activo**: color primario, peso 500, fondo `color-mix(in srgb, var(--color-primario) 10%, white)`.
- **Tablet (768–1023px)**: rail de 64px solo íconos (44×44px, mismos estados), logo 36px arriba, Ajustes + avatar abajo. Máximo dos columnas de contenido.
- **Celular (<768px)**: topbar (hamburguesa 22px + logo 30px + nombre + avatar 28px, borde inferior). **Una sola columna, sin scroll horizontal jamás.**
- Íconos: set lineal consistente stroke 1.5–1.8, `stroke-linecap/linejoin: round`, sin rellenos (los SVG exactos están en los archivos).

### 2. Inicio (dashboard) — `Inicio.dc.html` + `InicioContenido.dc.html`
- Saludo "Hola, {nombre del usuario autenticado}" (26px escritorio / 24 tablet / 22 celular, `--fuente-titulos` 500) + fecha "lunes 3 de agosto · Glam Nails by Chio" (13px suave).
- **Fila principal de KPI** (grid `1.35fr 1fr 1fr` escritorio; celular: 2 col con Utilidad a lo ancho): **Utilidad del mes** (32px, color primario, la cifra más importante), **Ingresos de hoy** y **Citas de hoy** (24px). Etiquetas: 11.5px uppercase, letter-spacing .07em, peso 500, texto-suave.
- **Utilidad negativa (pérdida)**: la cifra usa `−$2,340` en **color de texto normal (no rojo de error)** + píldora ámbar "Mes con pérdida" + nota "Los gastos superaron a los ingresos por $X". Nunca debe parecer error del sistema.
- **Fila secundaria** (grid 3 col escritorio / 2 tablet y celular): Clientes activos (últimos 2 meses), Ticket promedio, Ingresos del mes vs anterior (+ píldora verde `+12%`), Clientas nuevas vs recurrentes (mini barra bicolor primario/salvia), Tasa de cancelación, Top 3 servicios (numerales en `--color-acento`).
- **Próximas citas**: panel derecho 340px en escritorio (abajo en tablet/celular). 5 citas cronológicas sin límite de fecha: avatar inicial 36px (fondo salvia 18%), clienta (14px 500), servicios (12.5px suave, ellipsis), hora + día a la derecha. Enlace "Ver todas". Estado vacío: ícono calendario, "Sin citas próximas", botón "Ir a Agenda".
- Estados: **cargando** = esqueleto animado (bloques `#F0E2DB`, keyframe opacidad .45→1, 1.4s); **vacío** = valores `—`/`$0` con mensajes útiles; **error** = tarjeta con ícono, "No pudimos cargar tu resumen", botón secundario "Reintentar".

### 3. Agenda — `Agenda.dc.html`
- Cabecera: segmented **Día/Semana/Mes** (track `#F4E9E3` radio 9px; tab activo: fondo blanco, sombra, peso 500), chevrons anterior/siguiente (32px), título del periodo (16px serif), y botón primario **"Agendar cita"** (solo aquí, no en el menú).
- **Día**: rejilla vertical 9 am–8 pm, 56px por hora, líneas `#F7EDE7`, columna de horas 52px. Bloques de cita absolutos, altura proporcional a duración real, radio 8px, padding 6px 9px. **Color del bloque = estado** (fondo `color-mix(estado 13%, white)`, hora y etiqueta de estado en el color pleno), **nunca por tipo de servicio**; el servicio se lee en texto. Soporta columnas paralelas por empleada (1 hoy; probado con 3, cabecera con nombres) sin rehacerse.
- **Semana**: 7 columnas, cabecera día+número (hoy: círculo primario 28px con número en blanco), chips resumidos (hora + nombre, tinte por estado).
- **Mes**: cuadrícula 7×6 (celdas min-height 88px), días de otro mes en `#C9B4AA`, hoy en círculo primario; puntos de 6px por cita coloreados por estado. Tocar un día abre su detalle.
- **Ficha de cita**: panel derecho 340px en escritorio / pantalla completa en celular. Contenido: píldora de estado, "Hoy · 4:00 – 5:30 pm" (18px serif), "90 min · Atiende Chio", bloque clienta (avatar, nombre, contacto) sobre fondo `--color-fondo` radio 10px, **botón WhatsApp (outline salvia) SOLO si hay teléfono — si el contacto es red social el botón NO EXISTE (no deshabilitado, oculto)**, lista de servicios con precio·duración y total, Forma de uña, Estado, Notas, Historial. Acciones: **"Finalizar servicio"** (primario) y **"Cancelar cita"** (destructivo `#C1443A`; el texto destructivo siempre dice "Cancelar", nunca "Eliminar").
- Estados del día: vacío ("Sin citas este día" + botón Agendar cita), cargando (esqueleto de bloques), error (Reintentar).

### 4. Agendar cita (flujo 5 pasos) — `AgendarCita.dc.html`
Hoja mobile-first (ancho completo en celular; en escritorio, panel centrado de 560px sobre telón `rgba(74,50,43,.32)`). Cabecera: volver + "Agendar cita" + "Paso N de 5 · {nombre}" + barra de progreso 4px (ancho = N×20%).
1. **Servicios**: secciones generadas desde el catálogo (número variable de categorías). Tarjetas en cuadrícula 2 col (texto centrado, nombre 13.5px 500, precio·duración 12px suave). **Multi-selección**: check circular 18px primario en esquina sup. der. Selección activa: **borde 2px primario + fondo primario 8%** (patrón de selección de TODO el sistema). Pie: "2 servicios seleccionados · 120 min · $600" + Continuar.
2. **Forma de uña**: 4 tarjetas con ícono lineal de la forma — Almendrada, Cuadrada, Coffin, Stiletto. **Opcional** (enlace "Omitir este paso" bajo el botón) y **una sola por cita**.
3. **Fecha y hora**: chips de fecha (7 días flex iguales; **cualquier día es agendable, domingos incluidos, sin restricción de horario**), grid de horas 3 col (chips 44px min). **Error de traslape**: chip de hora en borde/tinte error + banner "Chio ya tiene una cita de 4:00 a 5:30 pm. Elige otra hora o cambia el día." + **botón Continuar deshabilitado** (fondo `#E4E4E1`, texto `#9C9C97`). Selector de empleada **oculto/preseleccionado** cuando solo hay una activa (fila informativa "Atiende Chio · única empleada activa").
4. **Clienta**: tabs Existente/Nueva. Existente: búsqueda + resultados seleccionables + enlace "Crear nueva clienta" (sin salir del flujo). Nueva: Nombre obligatorio; **teléfono O red social (al menos uno, no ambos obligatorios)** — helper: "Captura teléfono o red social — con uno basta."
5. **Resumen**: clienta, fecha/hora, atiende, servicios, forma, duración total y **precio total** (18px serif primario) antes de "Confirmar cita".

### 5. Finalizar servicio (3 pasos) — `FinalizarServicio.dc.html`
Misma hoja con progreso (N de 3). Abre desde la ficha de cita.
1. **Costo por servicio**: un campo de monto **obligatorio por cada servicio** de la cita (probado con 1 y con 3), con "catálogo: $450" como referencia y el valor sugerido precargado.
2. **Agregar productos** (opcional, venta cruzada): búsqueda + filas de producto; agregado = tarjeta seleccionada con stepper `− 1 +` (34px por tap); no agregado = botón outline "+ Agregar". Enlace "Omitir — sin productos".
3. **Recibo**: clienta y contexto, servicios cobrados, productos, **Total** (20px serif primario), nota "Se genera una sola venta con todos los conceptos", selector de **forma de pago** (Efectivo/Transferencia/Tarjeta, chips con patrón de selección) y botón "Finalizar recibo".

### 6. Catálogo — `Catalogo.dc.html`
- **Acomodo aprobado: tarjetas** (`acomodo="tarjetas"`): por cada categoría, encabezado (uppercase 11.5px + conteo) y cuadrícula de 3 col (2 en tablet, var `--cols-tarjetas`) de tarjetas: nombre (14px 500), lápiz de editar arriba a la derecha, **precio protagonista** (18px serif primario) + duración (12px suave) abajo. Servicio desactivado: nombre gris `#9C9C97` + píldora "Inactivo" — **desactivar, nunca eliminar**.
- Cabecera: "Catálogo" + botón outline "Categorías" + primario "Nuevo servicio".
- **Alta/edición de servicio** (hoja): Nombre*, Categoría* (chips píldora con selección), Precio*, Duración* (min). En modo editar: + botón "Desactivar servicio" (outline gris) con nota.
- **Gestionar categorías** (pantalla aparte): filas con asa de arrastre (reordenar), nombre + conteo, lápiz (renombrar), **toggle** activo/inactivo (38×22px, encendido = primario); input + "Crear" al pie. Nota: "Una categoría desactivada oculta sus servicios al agendar — nada se elimina."
- El layout por secciones admite la futura vista de productos con variantes (Don camisa) sin rehacerse.

### 7. Clientes — `Clientes.dc.html`
- **Lista**: búsqueda ("Buscar por nombre, teléfono o red"), contador "38 clientas activas · 2 desactivadas", filas: avatar inicial, nombre + píldora "Desactivada" si aplica (fila al 45% de opacidad en avatar y nombre gris), contacto, gasto acumulado + visitas a la derecha, chevron.
- **Ficha**: 2 columnas en escritorio (340px | resto; 1 col en celular vía `--cols-ficha:1fr`). Izquierda: tarjeta de identidad (avatar 52px, nombre 19px serif, "Clienta desde feb 2026", Teléfono con botón WhatsApp — misma regla de ocultamiento —, Instagram, botones **Editar** y **Desactivar** outline) y tarjeta **Notas** libres (preferencias/alergias, editable). Derecha: 3 stats (Visitas, **Gasto acumulado** en primario, Última visita; 22px serif) + **Historial de visitas** (fecha, servicios, monto).
- **Editar clienta** (hoja): Nombre*, Teléfono/Red social (uno basta), Notas textarea, Guardar + "Desactivar clienta" con nota "su historial permanece".
- Estados: vacío ("Aún no hay clientas… se crean aquí o al agendar") y **búsqueda sin resultados** ("Sin resultados para «Renata»" + botón outline "Crear «Renata»").

### 8. Ventas — `Ventas.dc.html`
- **Lista del periodo** (segmented Hoy/Semana/Mes): total del periodo (20px serif primario) + "6 ventas esta semana · 1 cancelada". Filas: fecha+hora, cliente, conceptos, forma de pago, total, píldora de estado (Completada verde / Cancelada roja). **La cancelada permanece visible**: monto tachado y gris, nunca se borra. En celular se ocultan forma de pago y chevron (vars `--col-pago`, `--col-flecha`).
- **Detalle** ("Venta #0142"): tarjeta con clienta, fecha, atendió, forma de pago; líneas de servicios y productos; total. **Una venta confirmada no se edita ni borra**: única acción "Cancelar venta" (destructivo) + leyenda explícita. Detalle de cancelada: banner rojo "Venta cancelada el … por …. No cuenta para ingresos ni reportes."
- Vacío: "Sin ventas en este periodo — las ventas se generan al finalizar un servicio desde la Agenda."

### 9. Gastos — `Gastos.dc.html`
- **Lista**: segmented Semana/Mes/Año + chip dropdown "Categoría: Todas"; total del periodo; filas: **fecha del gasto** + "capt. {fecha}" debajo (la fecha de captura es distinta y visible), nombre, "Tipo recurrente"/"Extraordinario", píldora de categoría neutra (`#F4EDE7`), monto.
- **Nuevo gasto** (hoja): Monto*, **Fecha del gasto*** (puede ser anterior a hoy; nota explícita), toggle **Tipo recurrente / Extraordinario**. Recurrente: lista seleccionable de tipos del catálogo (nombre + categoría). Extraordinario: Descripción libre* + nota "se registra en la categoría «Otros»".
- **Tipos de gasto** (pantalla): filas nombre + categoría + toggle alta/baja; input + Crear. "Un tipo dado de baja deja de sugerirse al capturar; sus gastos históricos no se tocan."

### 10. Reportes — `Reportes.dc.html` + `ReportesOperativos.dc.html`
- Cabecera: "Reportes" + botones outline **PDF** y **Excel** (exportan **el nivel de detalle que se esté viendo**). Filtros: segmented **Hoy/Semana/Mes/Año** + chip **"Rango libre"** + "Agosto 2026 · al día 3" + **conmutador Gráfica/Documento** (decisión aprobada: ambas vistas conviven tras un botón; `acomodo="cascada"` es la predeterminada).
- **Vista Gráfica (cascada)**: el Estado de Resultados como barras (altura ∝ monto, base 130px): Ingresos → (−) Costo de ventas → = Utilidad bruta → (−) Gastos de operación → = **Utilidad neta** (barra en primario pleno; las restas en `#EBDCD3`). Montos 14px 500 sobre cada barra + píldora verde "margen 52%".
- **Vista Documento**: tarjeta centrada 640px estilo estado financiero impreso: "GLAM NAILS BY CHIO" (11px, tracking .14em), "Estado de Resultados" (26px serif), periodo; renglones con guías punteadas; utilidad neta tras **doble filo** (`border-top:3px double`) en 28px serif primario.
- **Resumen ↔ Detalle** (en el acomodo panel, conmutador dentro de la tarjeta): detalle = **transacción por transacción**: cada venta con su **margen** (verde) y cada gasto con categoría; enlace "Ver las N restantes".
- **Operativos** (componente reutilizable): Ventas por forma de pago (barras primario), Servicios más vendidos (ranking con numerales dorados), Clientas más frecuentes, Gastos por categoría (barras salvia), Citas completadas vs. canceladas (33/3 + barra bicolor + tasa 8%).
- Los números cuadran entre pantallas: Ingresos $23,900 − Costo $4,100 = Bruta $19,800 − Gastos $7,320 = **Neta $12,480** (la misma del dashboard).

### 11. Login y Selector de negocio — `LoginNexo.dc.html` (tema neutro Nexo)
- **Login**: fondo `#F5F7FA`, tarjeta centrada 380px (radio 14px, sombra `0 4px 24px rgba(31,51,87,.08)`): monograma "N" (48px, radio 12, navy `#1F3357`), "Nexo" + "Administración de negocios". Campos **Usuario** (no correo) y Contraseña (con ojo). Botón navy "Entrar" 48px. **Sin registro ni "olvidé mi contraseña"**; nota: "Las cuentas las crea el dueño del negocio." **Error de credenciales**: banner rojo tinte 9% "Usuario o contraseña incorrectos…" + bordes de campo en error.
- **Selector** (solo usuarios con 2+ negocios): "Hola, Joel" + "¿Con qué negocio quieres trabajar hoy?"; tarjetas 260px por negocio (logo 64px, nombre, giro, 3 puntos con la paleta del tema; hover borde teal `#2E8C82` + sombra). Don camisa con píldora ámbar "En pausa". Al elegir se aplica el tema. Nota: se puede **cambiar de negocio desde el menú sin cerrar sesión**. Enlace "Cerrar sesión".

### 12. Administración de usuarios (solo dueño) — `AdminUsuarios.dc.html`
- **Lista** (bajo Ajustes, breadcrumb): "Usuarios" + píldora dorada "Solo dueño" + subtítulo "Tú creas las cuentas y restableces contraseñas; aquí no hay autoservicio." Filas: avatar, nombre (+píldora "Dueño"), usuario, **chips de negocios asignados con × para revocar** (revocar no borra nada), botón outline "Restablecer contraseña".
- **Crear usuario** (hoja): Nombre*, Usuario*, **Contraseña inicial*** (+ enlace "Generar"; "podrá cambiarla desde Ajustes"), **Negocios asignados*** (tarjetas seleccionables con check).
- **Restablecer contraseña**: modal 440px sobre telón: usuario objetivo, Nueva contraseña* + Generar, aviso "La sesión actual se cerrará…", botones Volver (outline) + Restablecer (primario).

### 13. Ajustes — `Ajustes.dc.html`
Tarjetas apiladas (max 640px): **Perfil** (avatar, nombre, usuario, botón "Cambiar contraseña"), **Negocio** (logo + "Cambiar logo"; selector de **Tema** con muestras de paleta — Boutique seleccionado, Neutro disponible — y nota "la estructura no cambia"), acceso a **Administración de usuarios** (píldora "Solo dueño", chevron), y **Cerrar sesión** (outline gris).

## Interactions & Behavior
- Navegación: sidebar/rail/topbar → módulos; "Ver todas" → Agenda; ficha de cita → Finalizar servicio; fila de venta → detalle; día del mes → detalle del día.
- Hover: ítems de nav e íconos-botón `background:#FAF3EF`; tarjetas del selector: borde teal + sombra.
- Selección (servicios, formas, chips, pagos, tipos): borde 2px primario + fondo primario 8% + texto/check primario. Los no seleccionados: borde 2px `#F1E4DE`.
- Deshabilitado (Continuar con traslape): fondo `#E4E4E1`, texto `#9C9C97`, sin hover.
- Esqueletos: animación `brillo` (opacity .45↔1, 1.4s ease-in-out infinite), bloques `#F0E2DB`/`#F6EAE4`.
- Toggle: 38×22px, knob blanco 18px; encendido fondo primario (knob derecha), apagado `#E0D4CC` (knob izquierda).
- Formularios: etiqueta arriba (12.5px 500), campo 44–46px min, borde `#E8D8CF` radio 10px, `*` en error-color; mensajes de error debajo en `#C1443A`. **Áreas táctiles mínimo 44×44px.**
- Validaciones clave: costo obligatorio por servicio; nombre de clienta obligatorio; teléfono O red social (≥1); traslape de empleada bloquea Continuar; forma de uña opcional y única.
- Responsive: escritorio ≥1024 sidebar; tablet 768–1023 rail + máx 2 col; celular <768 una columna, paneles → pantallas completas o hojas; **sin scroll horizontal en ninguna pantalla**.
- Copys destructivos: siempre "Cancelar" / "Desactivar" / "Revocar" — la palabra "Eliminar" no existe en el sistema.

## State Management
- Sesión: usuario autenticado (nombre para el saludo), rol (dueño ve Usuarios y Selector), negocio activo (define el tema → variables CSS).
- Agenda: vista (día/semana/mes), fecha/periodo, empleadas activas (1..n), cita seleccionada (panel/pantalla).
- Flujos por pasos: paso actual, selecciones acumuladas (servicios[], forma?, fecha/hora/empleada, clienta), validación por paso; traslape se verifica al elegir hora.
- Estados por pantalla con datos: `cargando | normal | vacío | error` — los tres no-ideales están diseñados; ver variantes en el lienzo.
- Reportes: periodo, vista (gráfica/documento), nivel (resumen/detalle); exportación usa el estado visible.

## Design Tokens
**Tema `boutique`** (derivado del logo):
- `--color-primario: #A9705F` (botones primarios, ítem activo, títulos/cifras clave)
- `--color-acento: #C9A227` (resaltados puntuales: numerales de ranking, píldora "Dueño"/"Solo dueño")
- `--color-secundario: #8A9A7B` (botones outline secundarios, avatares de clienta al 18%, barras de apoyo)
- `--color-fondo: #FDF6F3` · `--color-superficie: #FFFFFF`
- `--color-texto: #4A322B` · `--color-texto-suave: #8A6A5E`
- Estados (no tematizables): éxito `#2F9E5B` · advertencia `#D9A441` · error `#C1443A`
- Deshabilitado: fondo `#E4E4E1`, texto `#9C9C97`
- Bordes/divisores derivados: hairline cálido `#F1E4DE`, divisor de filas `#F7EDE7`/`#F3E7E1`, borde de campo `#E8D8CF`, track segmented `#F4E9E3`
- Tema `neutro`: primario `#1F3357`, acento `#2E8C82`, fondo `#F5F7FA`, borde `#DFE5EC`, texto `#242E3C`, suave `#5C6B7E`
- Tintes de estado/selección: `color-mix(in srgb, <color> 8–16%, white)` (selección 8%, píldoras 12–16%, bloques de agenda 13%)

**Tipografía** (decisión final del usuario: versión B):
- Títulos/cifras protagonistas: `--fuente-titulos: 'Playfair Display', Georgia, serif`, peso 500 (Google Fonts 500/600). Se usa en: saludo, títulos de pantalla (22px), cifras hero (32/24px), totales (18–28px), nombres de panel (16.5px).
- Cuerpo: `--fuente-cuerpo: 'Inter', system-ui, sans-serif`, **solo pesos 400 y 500**.
- Escala: cuerpo 13–14px, etiquetas 11.5–12.5px (uppercase con tracking .07em para labels de sección), títulos de pantalla 22px, hero 32px. Nada bajo 10.5px.

**Radios**: tarjetas 12px · botones/campos 8–10px · chips/selección 10px · píldoras 999px · modales 14px.
**Sombras**: tarjetas `0 1px 3px rgba(74,50,43,.07)` (regla: sombra suave **o** borde hairline, **nunca ambos**) · modales `0 18px 50px rgba(74,50,43,.3)` · telón `rgba(74,50,43,.32)`.
**Espaciado**: padding de contenido 28px escritorio / 22 tablet / 16 celular; gaps de grid 12–16px; padding de tarjeta 16–20px.
**Botones**: primario relleno primario texto blanco 44–48px; secundario borde 1.5px `--color-secundario` fondo transparente; destructivo relleno `#C1443A` (texto "Cancelar…"); píldoras de estado: fondo tinte 12% + texto color pleno.

## Assets
- `assets/logo.jpeg` — logo real de Glam Nails by Chio (proporcionado por el usuario). Usado en sidebar (40px), topbar (30px), selector (64px), ajustes (46px), siempre recorte circular `object-fit:cover`.
- Íconos: SVG inline dibujados a mano (lineales, stroke 1.5–1.8 redondeado) — extraer de los `.dc.html`; en producción puede sustituirse por una librería lineal consistente (p. ej. Lucide) manteniendo grosor y tamaño.
- Monograma "N" de Nexo y formas de uña (Almendrada/Cuadrada/Coffin/Stiletto): SVG inline en `LoginNexo.dc.html` y `AgendarCita.dc.html`.

## Files
- `BRIEF_DISENO_glam_nails.md` — brief funcional original (fuente de verdad de reglas de negocio)
- `Nexo Glam Nails.dc.html` — lienzo de presentación con TODAS las variantes y sus props (índice visual, turnos 1–16)
- `Chrome.dc.html` — navegación (sidebar/rail/topbar)
- `Inicio.dc.html`, `InicioContenido.dc.html` — dashboard
- `Agenda.dc.html` — día/semana/mes + ficha de cita
- `AgendarCita.dc.html` — flujo 5 pasos
- `FinalizarServicio.dc.html` — flujo 3 pasos
- `Catalogo.dc.html` — catálogo + alta/edición + categorías
- `Clientes.dc.html` — lista + ficha + edición
- `Ventas.dc.html` — lista + detalle
- `Gastos.dc.html` — lista + alta + tipos
- `Reportes.dc.html`, `ReportesOperativos.dc.html` — ER (gráfica/documento) + operativos
- `LoginNexo.dc.html` — login + selector de negocio
- `AdminUsuarios.dc.html` — usuarios + crear + restablecer
- `Ajustes.dc.html` — ajustes
- `assets/logo.jpeg`
