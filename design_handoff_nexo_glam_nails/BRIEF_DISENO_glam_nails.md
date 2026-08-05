# Brief de Diseño — Nexo · Glam Nails by Chio

> **Para Claude Design.** Este documento define el diseño visual de todas las pantallas. La lógica de negocio ya está definida y **no se cambia desde el diseño**: si algo parece faltar o sobrar, es una decisión tomada, no un descuido.

---

## 1. Contexto

**Nexo** es un sistema administrativo interno multi-negocio. Este brief cubre el negocio **Glam Nails by Chio** (salón de uñas). Un segundo negocio, Don camisa, está en pausa pero el diseño debe soportar que la misma estructura cambie de tema visual.

**Usuarias:** Joel (dueño, acceso a ambos negocios) y Chio (solo Glam Nails). No hay acceso público ni pantallas para clientas finales. **Ninguna pantalla usa lenguaje de marketing dirigido al cliente final** — es una herramienta de trabajo.

**Uso real:** escritorio, tablet y celular **por igual**. Chio agenda entre clientas desde el teléfono; los reportes se revisan en computadora. Ninguna pantalla puede quedar inutilizable en ningún formato.

---

## 2. Identidad

**Nombre:** Nexo. Aparece en login y en el selector de negocio. **Dentro del área de trabajo manda la marca del negocio activo** (logo + "Glam Nails by Chio" en el encabezado del menú lateral), no Nexo.

### Tema `boutique` (Glam Nails by Chio)
Derivado del logo del negocio: caligrafía terracota, estrellas doradas, hojas verde salvia sobre crema.

| Token | Hex | Uso |
|---|---|---|
| `--color-primario` | `#A9705F` | Botones principales, ítem activo del menú, títulos |
| `--color-acento` | `#C9A227` | Resaltados puntuales, detalles |
| `--color-secundario` | `#8A9A7B` | Elementos de apoyo, iconografía secundaria |
| `--color-fondo` | `#FDF6F3` | Fondo de la aplicación |
| `--color-superficie` | `#FFFFFF` | Tarjetas y paneles |
| `--color-texto` | `#4A322B` | Texto principal |
| `--color-texto-suave` | `#8A6A5E` | Texto secundario, etiquetas |

### Colores de estado — NO se tematizan
Su significado debe ser inequívoco en cualquier negocio:

| Estado | Hex |
|---|---|
| Éxito · confirmada, completada | `#2F9E5B` |
| Advertencia · pendiente, existencia baja | `#D9A441` |
| Error · cancelada | `#C1443A` |

### Arquitectura de temas
Todos los colores se consumen como **variables CSS**, nunca hardcodeados. Al cambiar de negocio activo se reasignan las variables; la estructura, el espaciado y los componentes son idénticos. Un negocio sin tema asignado usa `neutro` (azul marino `#1F3357` / acento `#2E8C82` / fondo `#F5F7FA`).

### Tipografía — decisión pendiente de confirmar
La especificación original pide **sans-serif** (Inter / system-ui). Las referencias visuales aprobadas por el usuario usaban **títulos en serif display** con cuerpo sans-serif, y gustaron. **Proponer ambas versiones de la pantalla de Inicio** para que el usuario elija:
- **A)** Todo sans-serif — más neutro y consistente con los otros temas.
- **B)** Títulos en serif display + cuerpo sans-serif — más carácter, alineado al giro de belleza.

En ambos casos: máximo dos pesos (400 y 500), cuerpo 14–16px, etiquetas 12–13px.

### Iconografía
Set de líneas finas, consistente en todo el sistema. Sin iconos rellenos mezclados con lineales.

---

## 3. Componentes base

**Botones**
- Primario: relleno `--color-primario`, texto blanco, radio 8px.
- Secundario: borde 1.5px `--color-secundario`, fondo transparente.
- Destructivo: relleno `#C1443A`. **Su texto siempre dice "Cancelar", nunca "Eliminar"** — en este sistema nada se borra, todo se cancela o desactiva.
- Deshabilitado: fondo `#E4E4E1`, texto `#9C9C97`.

**Tarjetas:** fondo `--color-superficie`, radio 12px, sombra muy suave o borde hairline. Nunca ambos.

**Selección activa** (servicio elegido, forma de uña elegida): fondo tenue del primario + borde 2px del primario.

**Etiquetas de estado:** píldora con fondo tenue del color de estado y texto en el color pleno.

**Campos de formulario:** etiqueta arriba, campo con borde suave, mensaje de error debajo en `#C1443A`. Áreas táctiles mínimo 44×44px.

**Estados obligatorios en toda pantalla con datos:** cargando (esqueleto, no spinner suelto), vacío (mensaje útil + acción sugerida), error (mensaje claro + reintentar). Diseñar los tres, no solo el estado ideal.

---

## 4. Layout y navegación

**Escritorio (≥1024px)** — menú lateral fijo. De arriba a abajo: logo + nombre del negocio; módulos (**Inicio, Agenda, Clientes, Catálogo, Ventas, Gastos, Reportes**); al pie: usuario, Ajustes, Cerrar sesión. **No hay botón "Agendar cita" en el menú** — vive solo dentro de Agenda.

**Tablet (768–1023px)** — menú colapsado a íconos, expandible. Máximo dos columnas de contenido.

**Celular (<768px)** — menú tras hamburguesa o barra inferior. **Una sola columna**: los paneles laterales se convierten en pantallas completas o sheets deslizantes. Sin scroll horizontal en ninguna pantalla.

---

## 5. Pantallas

### 5.1 Login
Monograma de Nexo, campo **usuario** (no correo), campo contraseña, botón entrar. **Sin "registrarse"** ni "olvidé mi contraseña": las cuentas las crea el dueño y él restablece contraseñas. Diseñar el estado de error de credenciales.

### 5.2 Selector de negocio
Solo lo ve quien tiene 2+ negocios (Joel). Tarjetas con logo y nombre de cada negocio. Al elegir uno se aplica su tema. Debe existir un control para cambiar de negocio sin cerrar sesión.

### 5.3 Inicio (dashboard)
Saludo con el **nombre del usuario autenticado**.

**Tarjetas de KPI** — jerarquía visual, no todas del mismo tamaño:
- Fila principal: **Utilidad del mes**, **Ingresos del día**, **Citas de hoy**
- Fila secundaria: **Clientes activos** (últimos 2 meses), **Ticket promedio**, **Ingresos del mes vs. mes anterior**, **Clientas nuevas vs. recurrentes**, **Tasa de cancelación**, **Top 3 servicios del mes**

La **utilidad** debe leerse como el número más importante, y su diseño debe contemplar **valores negativos** (pérdida) sin verse como un error del sistema.

**Próximas citas:** las 5 siguientes en orden cronológico, sin límite de fecha (pueden ser de días posteriores). Cada una: inicial/avatar, clienta, servicios, hora y día. Enlace "Ver todas" a Agenda. Diseñar el estado vacío ("sin citas próximas").

### 5.4 Agenda
Cabecera con selector **Día / Semana / Mes**, navegación a periodo anterior/siguiente, y botón **"Agendar cita"**.

- **Día:** franja horaria vertical con bloques proporcionales a la duración real. Preparado para **columnas paralelas por empleada** (hoy solo Chio; el diseño debe funcionar con 1 y con 3 sin rehacerse).
- **Semana:** 7 columnas con citas resumidas.
- **Mes:** cuadrícula con indicador en días con citas; al tocar un día se abre su detalle.

**El color del bloque = estado**, nunca tipo de servicio. El servicio se lee en el texto. (Regla explícita: colorear por tipo de servicio fue descartado.)

**Ficha de cita** — panel lateral derecho en escritorio, pantalla completa en celular: clienta y contacto, servicios, forma de uña, hora y duración, quién atiende, estado, notas e historial. **Botón de WhatsApp solo si hay teléfono** — si la clienta se contactó solo por Instagram/Facebook, el botón **se oculta**, no se muestra deshabilitado. Acciones: "Finalizar servicio" y "Cancelar cita".

### 5.5 Agendar cita (desde Agenda)
Flujo en pasos, cómodo en celular:
1. **Servicios** — agrupados en secciones por categoría (Escultura, Retiro y mantenimiento). Las secciones **se generan desde el catálogo**: diseñar para un número variable de categorías y servicios. **Selección múltiple** (retiro + escultura en la misma cita).
2. **Forma de uña** — 4 opciones con ícono: Almendrada, Cuadrada, Coffin, Stiletto. **Opcional** (debe poder saltarse sin fricción) y **una sola por cita**.
3. **Fecha, hora y quién atiende** — el selector de empleada se oculta o preselecciona cuando solo hay una activa.
4. **Datos de la clienta** — nombre obligatorio; **teléfono o red social** (al menos uno, no ambos). Debe poder elegirse una clienta existente o crear una nueva sin salir del flujo.
5. **Resumen** — servicios, forma, duración total y precio total antes de confirmar.

Diseñar el **error de traslape**: mensaje claro de que esa empleada ya tiene una cita en ese horario. No hay restricción de horario ni días inhábiles: se puede agendar cualquier día y hora, domingos incluidos.

### 5.6 Finalizar servicio
Abre desde la ficha de la cita:
1. **Costo por cada servicio** de la cita — un campo por servicio, todos obligatorios. Diseñar para 1 y para 3+ servicios.
2. **"Agregar productos"** (opcional) para venta cruzada.
3. **"Finalizar recibo"** — resumen del total y confirmación. Genera **una sola venta**.

### 5.7 Clientes
Lista con búsqueda. **Ficha:** contacto, notas libres (preferencias, alergias), historial de visitas y gasto acumulado. Editar y desactivar — **nunca eliminar**.

### 5.8 Catálogo
Lista de servicios agrupados por categoría, cada uno con precio, duración y **botón de editar**. Alta de servicio: nombre, categoría, precio, duración. Pantalla aparte para **gestionar categorías** (crear, renombrar, reordenar, desactivar). Desactivar en vez de eliminar.

*(La vista de productos con variantes de color/talla e inventario existe para Don camisa; no se diseña ahora, pero el layout de catálogo no debe imposibilitarla.)*

### 5.9 Ventas
Lista del periodo con cliente, total, forma de pago y estado. Detalle de venta con sus líneas. **Una venta confirmada no se edita ni se borra: solo se cancela**, y la cancelada permanece visible en la lista, claramente distinguida.

### 5.10 Gastos
Lista con filtro por periodo y categoría. Alta: monto, **fecha del gasto** (distinta de la fecha de captura), y o bien un **tipo de gasto recurrente** de catálogo, o bien un gasto extraordinario con descripción libre (categoría "Otros"). Pantalla para administrar tipos de gasto (alta/baja).

### 5.11 Reportes
Selector de periodo: accesos rápidos (hoy, semana, mes, año) + **rango libre**.

**Estado de Resultados** como reporte principal, en formato financiero legible:
```
Ingresos
(−) Costo de ventas
= Utilidad bruta
(−) Gastos de operación
= Utilidad neta
```
Dos niveles: **resumen del periodo** y **detalle transacción por transacción** (cada venta con su margen, cada gasto). Diseñar cómo se alterna entre ambos.

Reportes operativos: ventas por forma de pago, servicios más vendidos, clientas más frecuentes, gastos por categoría, citas completadas vs. canceladas.

**Exportar a PDF y Excel** desde cualquier reporte, con el nivel de detalle que se esté viendo.

### 5.12 Administración de usuarios (solo el dueño)
Lista de usuarios; crear usuario (usuario, nombre, contraseña inicial, negocios asignados); **restablecer contraseña**; revocar acceso a un negocio.

### 5.13 Ajustes
Perfil, cambio de contraseña, cerrar sesión. Datos del negocio (nombre, logo, tema).

---

## 6. Entregable esperado

Para cada pantalla: versión escritorio, tablet y celular, con los estados vacío / cargando / error donde apliquen. Componentes reutilizables documentados, y todos los colores expresados como variables CSS para que el cambio de tema por negocio no requiera rediseñar nada.

**Prioridad de diseño, en orden:** Inicio → Agenda (3 vistas + ficha) → Agendar cita → Finalizar servicio → Catálogo → Clientes → Ventas → Gastos → Reportes → Login y selector → Administración y Ajustes.
