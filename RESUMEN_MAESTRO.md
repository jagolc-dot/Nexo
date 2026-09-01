# Nexo — Resumen Maestro del Proyecto

> Documento de traspaso. Pégalo completo al inicio de una conversación nueva para que Claude continúe sin perder contexto. Refleja el estado real al **1 de septiembre de 2026**, después de la Etapa 22. Los documentos originales de cada etapa (`00_...md` a `09_...md`, sus variantes `v2`, y los `sql/*.sql`) siguen siendo la fuente de verdad detallada — esto es el mapa general.

## Qué es

**Nexo** es un sistema web para administrar dos negocios independientes de Joel (jagolc@gmail.com) bajo un mismo login:

- **Glam Nails by Chio** (@glamnailsbychio) — servicios, opera con agenda de citas. Sin variantes, sin inventario de productos propios.
- **Don camisa** — productos (camisas), opera con inventario por variante (color/talla) y módulo de compras/kardex.

Usuarios actuales: **Joel** (dueño, acceso a ambos negocios, usuario `joel_guzman`) y **Chio** (acceso a Glam Nails by Chio).

## ⚠️ Disciplina beta → producción (léelo primero)

Existen **dos proyectos Supabase separados** y **dos ramas de git**. Nunca se escribe directo a producción sin pasar por beta primero.

| | Beta | Producción |
|---|---|---|
| Rama git | `dev` | `main` |
| Proyecto Supabase | `hfatlqwdafitipqjlkhb` | `mhxvtlccgpiaqtuspvfq` |
| Uso | Todo cambio de esquema y de código se prueba aquí primero | Solo recibe lo ya verificado en beta |
| Datos | Datos de prueba — nunca datos reales de Chio | Datos reales de negocio |

Flujo estándar por etapa: escribir migración `sql/NNNN_*.sql` → aplicar en **beta** vía `apply_migration` → construir/probar el frontend en la rama `dev` → el usuario verifica → cuando el usuario dice "pásalo a producción", **entonces y solo entonces** se aplica la misma migración a producción y se hace merge `dev` → `main`.

**Nunca asumir que "aplicar en beta" implica aplicar en producción.** Cada promoción a producción requiere confirmación explícita del usuario.

## Principios arquitectónicos centrales

1. **Aislamiento total entre negocios.** Cada tabla relevante lleva `negocio_id` y está protegida por Row Level Security (RLS) vía `is_negocio_member()` — nunca por lógica de frontend. El frontend además filtra por "negocio activo" (capa adicional, no la única).
2. **Mismo código para ambos negocios, configurable por dato — nunca condicional por nombre.** Catálogo, Ventas, Clientes, Gastos, Reportes son las mismas pantallas; lo que cambia es el dato (`negocios.tema`, `negocios.usa_variantes`, `negocios.logo_url`, etc.), nunca un `if (negocio.nombre === 'Don camisa')`. Agenda es la única sección condicional real (solo aparece si el negocio tiene ítems con `requiere_agenda = true`).
3. **Nunca se borra físicamente** un registro con historial (ítems, variantes, clientes, ventas, gastos, citas, categorías, compras). Se marca `activo = false` / `estado = 'cancelado'`.
4. **Costos y precios se congelan al momento de la venta/compra.** Cambios posteriores en catálogo nunca alteran ventas o compras ya registradas.
5. **Costeo promedio ponderado** (NIF C-4) para inventario, recalculado en cada entrada, nunca afecta ventas pasadas.
6. **Estado de Resultados con estructura NIF B-3** (Ingresos − Costo de ventas = Utilidad bruta; Utilidad bruta − Gastos = Utilidad neta).
7. **Integridad resuelta en la base de datos, no en el frontend.** Cuando una operación toca varias tablas a la vez (una venta, una cita, una compra), se usa una función SQL atómica (`crear_venta`, `agendar_cita`, `confirmar_compra`, `registrar_ajuste_inventario`, `cancelar_venta`, `cancelar_compra`) en vez de confiar en que el frontend haga los inserts en orden correcto.
8. **Ningún error falla en silencio (regla añadida en Etapa 22).** Todo `catch` debe: (a) `console.error(err)` para diagnóstico técnico, y (b) mostrar al usuario el mensaje real (`err instanceof Error ? err.message : '<fallback>'`), nunca un mensaje genérico fijo que oculte la causa real.

## Stack técnico

- **Backend:** Supabase (PostgreSQL + Auth + RLS + Edge Functions).
- **Frontend:** `app/` — Vite + React 19 + TypeScript + Tailwind CSS v4, React Router v7, `@supabase/supabase-js`.
- **Exportación (Reportes):** `jspdf` + `jspdf-autotable` (PDF), `xlsx` (Excel) — **instalado desde `cdn.sheetjs.com`, no desde npm** (la versión de npm tiene vulnerabilidades sin parche). ⚠️ Si trabajas desde un entorno Claude Code en la nube (sandbox remoto), la política de red de ese sandbox **bloquea `cdn.sheetjs.com`**, así que `npm install` falla al reinstalar `xlsx` ahí. Workaround usado: quitar temporalmente `xlsx` de `package.json`/lockfile para correr `tsc`/`vite build` localmente, y restaurar el original antes de commitear. Esto **no afecta** el build real de Netlify.
- **Variable de entorno del cliente:** `.env` con `VITE_SUPABASE_URL` y `VITE_SUPABASE_PUBLISHABLE_KEY` (llave publishable `sb_publishable_...`, no la anon JWT clásica). `.env` está en `.gitignore` — no viene en el repo, hay que confirmar/crear en cada entorno nuevo, **verificando siempre que apunte a beta (`hfatlqwdafitipqjlkhb`) antes de levantar el servidor de desarrollo**, para no escribir datos de prueba en la base real de Chio.
- **Regla dura: Claude nunca debe escribir contraseñas reales en ningún formulario**, ni siquiera de prueba. El login lo hace Joel directamente; Claude verifica antes/después vía compilación, SQL, RLS, o navegación sin sesión (Playwright puede llegar hasta la pantalla de login, no más allá).

## Estructura de archivos

```
Nexo/
  RESUMEN_MAESTRO.md               — este documento
  00_resumen_ejecutivo.md          — documento raíz, reglas transversales
  01_base_de_datos.md              — esquema v1 + índice de sql/
  01b_migracion_v2.md              — migración incremental (citas múltiples, categorías, temas)
  02_autenticacion_v2.md           — login por usuario + correo sintético (VIGENTE)
  03_catalogo.md                   — servicios/productos, variantes opcionales
  04_ventas.md                     — POS, crear_venta atómico
  05_agenda.md                     — citas múltiples servicios + forma de uña
  06_clientes.md                   — ficha, historial, gasto acumulado
  07_gastos.md                     — recurrentes y extraordinarios
  08_reportes.md                   — Estado de Resultados + operativos
  09_identidad_visual.md           — sistema de diseño "Nexo"
  docs/superpowers/plans/          — planes de implementación por etapa grande (ej. módulo de inventario)
  sql/0001...0026_*.sql            — migraciones en orden secuencial, cada una aplicada primero a beta
  app/                             — frontend
    src/pages/                    — una página por pantalla
    src/pages/inventario/         — pantallas del módulo de Inventario (compras, ajustes, kardex)
    src/lib/                      — capa de datos (una función por operación, llaman a supabase-js o RPC)
    src/components/ui/            — Button, Card, EstadoBadge, Logo, Toggle (sistema de diseño)
    src/components/reportes/      — vistas de cada reporte + TablaReporte compartida
    src/context/                  — AuthContext, NegocioContext (incluye lógica de tema y usa_variantes)
```

## Estado por etapa

| Etapa | Estado | Notas |
|---|---|---|
| 1. Base de datos | ✅ Completa | RLS en todas las tablas, triggers de costeo/inventario, funciones `search_path`-hardened |
| 1b. Migración v2 | ✅ Completa | Citas múltiples servicios, categorías cerradas, temas |
| 2. Autenticación v2 | ✅ Completa | Login por usuario, correo sintético `usuario@nexo.local`, panel admin |
| 3. Catálogo | ✅ Completa | Categorías cerradas por negocio; productos pueden no tener variantes reales |
| 4. Ventas | ✅ Completa | `crear_venta` RPC atómico; cancelar nunca borra |
| 5. Agenda | ✅ Completa | `agendar_cita` RPC atómico; varios servicios por cita; sin venta cruzada entre negocios |
| 6. Clientes | ✅ Completa | Ficha, historial, gasto acumulado (excluye canceladas) |
| 7. Gastos | ✅ Completa | Recurrentes (`tipos_gasto`) y extraordinarios (categoría fija "Otros") |
| 8. Reportes | ✅ Completa | Periodos, resumen/detalle, export PDF/Excel, nunca mezcla negocios |
| 9. Identidad visual | ✅ Completa | Temas por negocio vía CSS vars + `data-tema` |
| 20. Ordenamiento de clientas | ✅ En producción | Shipeada tras "pasalo a produccion" del usuario |
| 21. Módulo de Inventario (v1 + v2) | ✅ En beta, **pendiente pasar a producción** | Ver detalle abajo. Bloqueado en el gate de producción (backup + dry-run + aplicar + fusionar) |
| 22. Correcciones (errores, código, variantes, etiquetas) | ✅ En beta, pusheada (`dev`, commit `83afd3e`) | Ver detalle abajo. **Un fix urgente sigue sin aplicar en producción** |

## Módulo de Inventario (Etapa 21) — arquitectura

Tablas: `almacenes`, `compras` (proveedor, folio, fecha, notas, costo_envio, creado_por), `compra_partidas` (cantidad, costo_total_partida, flete_asignado, costo_unitario_final), `ajustes_inventario` (tipo: merma/caducidad/perdida/obsequio/uso_interno/ajuste_conteo; cantidad con signo; motivo obligatorio), `movimientos_inventario` (tipo: compra/venta/ajuste/cancelacion_venta/cancelacion_compra/recosteo; cantidad con signo; existencia_resultante; costo_promedio_resultante; `creado_en timestamptz default clock_timestamp()` — **no `now()`**, ver Lecciones abajo).

- **`fn_registrar_movimiento` es el único escritor** de `items.stock/costo_promedio` y `variantes_item.existencia/costo_promedio`. Se invoca solo insertando una fila en `movimientos_inventario`. Cada tipo de movimiento tiene su propia aritmética (suma ponderada en compra, resta ponderada/reversión en cancelación de compra, solo cantidad en venta/ajuste/cancelación de venta, adopción absoluta de checkpoint en recosteo).
- **Código obligatorio por ítem:** un producto **sin** variantes debe tener `items.codigo` (único). Un producto **con** variantes no lleva código a nivel ítem — cada `variantes_item.codigo` es obligatorio y único globalmente (constraint `items_codigo_solo_sin_variantes`). Generador asistido: `generarCodigoSugerido()` + botón "Generar código"; disponibilidad se valida con `verificarCodigoDisponible()`. Seguimiento no bloqueante: badge "Sin código" visible donde falte.
- **Recosteo:** `calcular_recosteo` reproduce el historial completo del kardex para detectar/corregir drift. `previsualizar_recosteo` / `aplicar_recosteo`. Una fila de tipo `recosteo` previa debe adoptarse como **checkpoint absoluto** (existencia Y costo), nunca como delta.
- **`cancelar_venta` devuelve unidades al inventario** (antes no lo hacía).
- **Variantes configurables:** `negocios.usa_variantes boolean` (Etapa 22) — el checkbox "maneja variantes" en el formulario de producto se muestra solo si `negocioActivo.usa_variantes` es `true`. Hoy solo `Don camisa` lo tiene en `true`; siempre oculto para servicios.

## Lecciones aprendidas / trampas a evitar (importante para quien continúe)

1. **`create or replace function` solo reemplaza cuando la firma es idéntica.** Si cambias parámetros (tipo, orden, cantidad), Postgres crea una función **nueva que coexiste** con la vieja en vez de reemplazarla. PostgREST entonces no puede resolver cuál llamar y responde **404** en el RPC (ambigüedad de overload). **Siempre** que una migración cambie la firma de una función existente, debe empezar con `drop function if exists nombre(tipos_viejos);` explícito. Este bug ya causó dos incidentes reales en este proyecto: `confirmar_compra` (introducido en Etapa 21 v2, corregido en Etapa 22) y **`agendar_cita`** (bug preexistente, no relacionado con Inventario, encontrado en la auditoría preventiva de la Etapa 22 — **corregido en beta pero sigue sin corregirse en producción**, ver "Pendientes urgentes" abajo). Diagnóstico: un RPC que antes funcionaba empieza a responder 404 — confirmar con `query_logs`/`edge_logs` buscando `POST | 404 | .../rpc/<función>`.
2. **`now()` es por transacción, no por statement.** Si una función inserta varias filas en la misma transacción (ej. varias `compra_partidas` desde un solo `confirmar_compra`), todas comparten el mismo `now()`. Para orden monotónico real por fila (kardex, tie-breaking), usar `clock_timestamp()`.
3. **Auditoría preventiva de overloads:** después del hallazgo anterior, se revisaron todas las funciones en beta y producción buscando duplicados de firma. Beta ya está limpia; producción tiene el `agendar_cita` duplicado pendiente.
4. **`revoke ... from anon, authenticated` no basta** para quitar acceso público a una función — Postgres otorga `EXECUTE` a `PUBLIC` por defecto al crearla; hay que revocar de `PUBLIC` explícitamente.
5. **No se puede eliminar ni renombrar una Edge Function** con las herramientas disponibles — por eso `crear-usuario` maneja 4 acciones (`crear`, `listar`, `resetear_password`, `revocar_acceso`) vía `body.accion` en vez de 4 funciones separadas.
6. **Multi-statement en `execute_sql` (Supabase MCP) solo devuelve el resultado del último statement.** Si necesitas varios resultados distintos, haz llamadas separadas de un solo statement cada una.
7. **Después de cualquier cambio de esquema, correr `get_advisors` (tipo `security`)** para detectar RLS o permisos mal configurados.
8. **Proyecto Supabase free-tier se auto-pausa (`status: INACTIVE`) por inactividad**, y hay un límite de 2 proyectos free activos simultáneos por cuenta (cruza organizaciones) que puede bloquear `restore_project` — a veces requiere que el usuario libere espacio desde su cuenta.

## Pendientes urgentes

1. **Aplicar en producción el fix de `agendar_cita` duplicado.** Es potencialmente un bug en vivo bloqueando el agendado real de citas de Chio ahora mismo en producción — el mismo síntoma que ya se vio en beta con `confirmar_compra` (RPC responde 404 sin explicación). Migración de un solo `drop function if exists agendar_cita(uuid,uuid,timestamp with time zone,jsonb,text);` — bajo riesgo, pero toca la base real, así que espera confirmación explícita del usuario antes de aplicar. **Verificar primero si el bug realmente está afectando producción** (revisar `query_logs`/`edge_logs` de `mhxvtlccgpiaqtuspvfq` buscando 404 en `/rpc/agendar_cita`) antes de asumir que hay que correr la migración con urgencia.
2. **Gate de producción para todo Inventario + Etapa 22** (tarea pendiente desde Etapa 21): backup del proyecto de producción → dry-run de las migraciones `0024`–`0026` → aplicar → fusionar `dev` → `main`. El usuario dijo que quiere acumular todo lo probado en local y hacer un solo despliegue a partir del **4 de septiembre de 2026** (cuando se restablecen los créditos de Netlify) — no desplegar a Netlify antes de esa fecha salvo instrucción explícita.
3. Confirmar visualmente en vivo (no solo por código) que el código obligatorio + botón "Generar" y las etiquetas producto/servicio se ven correctamente — la Etapa 22 lo verificó por revisión de código y `tsc`/`oxlint`, pero no hubo verificación visual en navegador con sesión real (por la regla de no escribir contraseñas).

## Estado de git al cierre de la Etapa 22

- Rama `dev`: último commit `83afd3e` — "Etapa 22: correcciones de errores, codigo obligatorio, variantes configurables" — pusheado a `origin/dev`.
- Rama `main`: no ha recibido nada desde Etapa 20 (Inventario y Etapa 22 siguen solo en beta).
- Migraciones aplicadas a **beta** hasta `sql/0026_etapa22_correcciones.sql` inclusive. Producción sigue en el estado de antes de Etapa 21.

## Autenticación — cómo funciona hoy

- **Login:** usuario + contraseña. El correo que se envía a Supabase Auth se calcula **localmente, sin consultar nada**: `emailSintetico(usuario) = usuario.toLowerCase() + '@nexo.local'` (`app/src/lib/auth.ts`).
- **No hay registro público.** Las cuentas las crea Joel desde `/admin/usuarios` (visible solo si `rol = 'dueño'` en algún negocio).
- **No hay recuperación de contraseña por correo.** Joel restablece contraseñas desde el mismo panel.
- **Tabla `perfiles`:** `usuario_id` (FK a `auth.users`), `usuario` (único, formato `^[a-z0-9_]{3,20}$`), `nombre_completo`.

## Diseño visual — cómo funciona hoy

- Tema por negocio, dato en `negocios.tema` (`boutique`, `sastreria`, `neutro`), nunca condicionales por nombre de negocio en código — mismo patrón que `usa_variantes`.
- `NegocioContext` fija `document.documentElement.dataset.tema` cuando cambia el negocio activo.
- Variables CSS en `app/src/index.css`, `:root[data-tema="..."]`.
- Componentes compartidos en `app/src/components/ui/`: `Button`, `Card`, `EstadoBadge`, `Logo`, `Toggle`.
- Sin modo oscuro.
