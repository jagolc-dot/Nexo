# Nexo — Resumen Maestro del Proyecto

> Documento de traspaso. Resume todo lo construido hasta ahora para que otra conversación pueda continuar sin perder contexto. Los documentos originales de cada etapa (`00_...md` a `09_...md`, y sus variantes `v2`) siguen siendo la fuente de verdad detallada — esto es el mapa general.

## Qué es

**Nexo** es un sistema web para administrar dos negocios independientes de Joel bajo un mismo login:

- **Glam Nails by Chio** (@glamnailsbychio) — servicios, opera con agenda de citas. (Antes se llamaba "Uñas".)
- **Don camisa** — productos (camisas), opera con inventario por variante (color/talla).

Usuarios actuales: **Joel** (dueño, acceso a ambos negocios, usuario `joel_guzman`) y **Chio** (pendiente de crear, acceso solo a Glam Nails by Chio).

## Principios arquitectónicos centrales

1. **Aislamiento total entre negocios.** Cada tabla relevante lleva `negocio_id` y está protegida por Row Level Security (RLS) en Supabase — nunca por lógica de frontend. El frontend además filtra por "negocio activo" (capa adicional, no la única).
2. **Mismo código para ambos negocios.** Catálogo, Ventas, Clientes, Gastos, Reportes son las mismas pantallas; lo que cambia es el dato. Agenda es la única sección condicional (solo aparece si el negocio tiene ítems con `requiere_agenda = true`).
3. **Nunca se borra físicamente** un registro con historial (ítems, variantes, clientes, ventas, gastos, citas, categorías). Se marca `activo = false` / `estado = 'cancelado'`.
4. **Costos y precios se congelan al momento de la venta.** Cambios posteriores en catálogo nunca alteran ventas ya registradas.
5. **Costeo promedio ponderado** (NIF C-4) para inventario, recalculado en cada entrada, nunca afecta ventas pasadas.
6. **Estado de Resultados con estructura NIF B-3** (Ingresos − Costo de ventas = Utilidad bruta; Utilidad bruta − Gastos = Utilidad neta).
7. **Integridad resuelta en la base de datos, no en el frontend.** Cuando una operación toca varias tablas a la vez (una venta, una cita), se usa una función SQL atómica (`crear_venta`, `agendar_cita`) en vez de confiar en que el frontend haga los inserts en orden correcto.

## Stack técnico

- **Backend:** Supabase (PostgreSQL + Auth + RLS + Edge Functions). Proyecto real: `hfatlqwdafitipqjlkhb` ("Joe Proyect's", org `nupcdayiyycvdujnzclj`, región us-west-2). No hay ambiente local/dev separado — todo se aplica directo al proyecto real vía Supabase MCP.
- **Frontend:** `app/` — Vite + React + TypeScript + Tailwind CSS v4, React Router v7, `@supabase/supabase-js`.
- **Exportación (Reportes):** `jspdf` + `jspdf-autotable` (PDF), `xlsx` (Excel) — **instalado desde `cdn.sheetjs.com`, no desde npm** (la versión de npm tiene vulnerabilidades sin parche).
- **Dev server:** `.claude/launch.json` → corre `dev.bat` (en la raíz del proyecto), que fija el PATH a Node.js manualmente antes de `npm run dev`. Esto es necesario porque el proceso que lanza el preview no hereda un PATH de Node.js instalado después de iniciar la sesión.

## Estructura de archivos

```
Joe Project/
  00_resumen_ejecutivo.md          — documento raíz, reglas transversales
  01_base_de_datos.md              — esquema v1 + índice de sql/
  01b_migracion_v2.md              — migración incremental (citas múltiples, categorías, temas)
  02_autenticacion.md              — [OBSOLETO] login por correo original
  02_autenticacion_v2.md           — login por usuario + correo sintético (VIGENTE)
  03_catalogo.md                   — servicios/productos, variantes opcionales
  04_ventas.md                     — POS, crear_venta atómico
  05_agenda.md                     — citas múltiples servicios + forma de uña
  06_clientes.md                   — ficha, historial, gasto acumulado
  07_gastos.md                     — recurrentes y extraordinarios
  08_reportes.md                   — Estado de Resultados + operativos
  09_identidad_visual.md           — sistema de diseño "Nexo"
  sql/0001...0015_*.sql            — migraciones en orden, cada una aplicada al proyecto real
  app/                             — frontend
    src/pages/                    — una página por pantalla
    src/lib/                      — capa de datos (una función por operación, llaman a supabase-js o RPC)
    src/components/ui/            — Button, Card, EstadoBadge, Logo (sistema de diseño)
    src/components/reportes/      — vistas de cada reporte + TablaReporte compartida
    src/context/                  — AuthContext, NegocioContext (incluye lógica de tema)
  dev.bat, .claude/launch.json    — arranque del dev server
```

## Estado por etapa

| Etapa | Estado | Notas |
|---|---|---|
| 1. Base de datos | ✅ Completa | RLS en todas las tablas, triggers de costeo/inventario, funciones `search_path`-hardened |
| 1b. Migración v2 | ✅ Completa | Citas múltiples servicios, categorías cerradas, temas, backfills aplicados |
| 2. Autenticación v2 | ✅ Completa, recién corregido un bug | Login por usuario, correo sintético `usuario@nexo.local`, panel admin. Ver "Pendientes" |
| 3. Catálogo | ✅ Completa | Categorías cerradas por negocio; productos pueden no tener variantes reales (una implícita) |
| 4. Ventas | ✅ Completa | `crear_venta` RPC atómico; cancelar nunca borra |
| 5. Agenda | ✅ Completa | `agendar_cita` RPC atómico; varios servicios por cita; forma de uña opcional; **sin venta cruzada entre negocios** (se probó y se descartó a propósito) |
| 6. Clientes | ✅ Completa | Ficha, historial, gasto acumulado (excluye canceladas) |
| 7. Gastos | ✅ Completa | Recurrentes (`tipos_gasto`) y extraordinarios (categoría fija "Otros") |
| 8. Reportes | ✅ Completa | Periodos, resumen/detalle, export PDF/Excel, nunca mezcla negocios |
| 9. Identidad visual | ✅ Completa | Temas por negocio vía CSS vars + `data-tema`, sin modo oscuro |

## Autenticación — cómo funciona hoy (importante)

- **Login:** usuario + contraseña. El correo que se envía a Supabase Auth se calcula **localmente, sin consultar nada**: `emailSintetico(usuario) = usuario.toLowerCase() + '@nexo.local'` (`app/src/lib/auth.ts`).
- **No hay registro público.** Las cuentas las crea Joel desde `/admin/usuarios` (visible solo si `rol = 'dueño'` en algún negocio).
- **No hay recuperación de contraseña por correo** (no hay correo real detrás de `@nexo.local`). Joel restablece contraseñas desde el mismo panel.
- **Edge Function `crear-usuario`** (un solo slug, 4 acciones vía `body.accion`): `crear`, `listar`, `resetear_password`, `revocar_acceso`. Usa `service_role`; verifica que quien llama sea dueño. *(El nombre del slug quedó desactualizado — hace más que "crear" — pero no hay forma de renombrar/borrar Edge Functions vía las herramientas disponibles, así que se mantuvo y se le agregaron acciones.)*
- **Tabla `perfiles`:** `usuario_id` (FK a `auth.users`), `usuario` (único, formato `^[a-z0-9_]{3,20}$`, sin puntos ni acentos), `nombre_completo`.
- **Bug ya corregido:** al renombrar `perfiles.usuario` de Joel (de `joel.guzman` a `joel_guzman`), no se actualizó su correo real en `auth.users`/`auth.identities` — quedó bloqueado hasta sincronizar ambos a `joel_guzman@nexo.local`. Documentado en `sql/0015_login_sintetico.sql`.

## Diseño visual — cómo funciona hoy

- Tema por negocio, dato en `negocios.tema` (`boutique`, `sastreria`, `neutro`), nunca condicionales por nombre de negocio en código.
- `NegocioContext` fija `document.documentElement.dataset.tema` cuando cambia el negocio activo (default `neutro` si no hay negocio activo, ej. login).
- Variables CSS en `app/src/index.css`, `:root[data-tema="..."]`.
- Componentes compartidos en `app/src/components/ui/`: `Button` (primario/secundario/destructivo), `Card` (superficie/métrica), `EstadoBadge` (éxito/advertencia/error/neutral), `Logo` (monograma "N").
- **Sin modo oscuro** — se quitó al implementar el sistema de temas (el documento de diseño define una sola paleta clara por tema).

## Pendientes / próximos pasos conocidos

1. **Crear la cuenta de Chio** desde `/admin/usuarios` (usuario `chio`, acceso solo a Glam Nails by Chio) — bloqueado hasta ahora por el bug de login que ya se corrigió.
2. **Confirmar visualmente el cambio de tema** al entrar a cada negocio (boutique/sastreria) — construido pero no verificado en vivo todavía.
3. **Probar el caso de dos citas encimadas** en el mismo horario (Etapa 5) — la regla existe (`agendar_cita` la valida) pero no se confirmó explícitamente en vivo.
4. `negocios.logo_url` existe en el esquema pero no hay pantalla para subir un logo — sin especificación de cómo debería verse esa UI.
5. El campo `rol` (`dueño`/`empleado`) existe en `usuarios_negocio` pero no restringe nada todavía — dejado listo para una futura fase de permisos granulares.

## Notas técnicas para quien continúe

- **No hay ambiente de desarrollo local separado** — todas las migraciones (`sql/0001` a `0015`) ya están aplicadas al proyecto real vía Supabase MCP (`apply_migration`). Cualquier cambio de esquema nuevo debe seguir la misma numeración secuencial.
- **Nunca usar `revoke ... from anon, authenticated`** para quitar acceso público a una función — Postgres otorga `EXECUTE` a `PUBLIC` por defecto al crear una función, así que hay que revocar de `PUBLIC` explícitamente (aprendido de un intento fallido en la Etapa 1).
- **No se puede eliminar ni renombrar una Edge Function** con las herramientas disponibles — por eso la función `crear-usuario` terminó manejando 4 acciones distintas en vez de crear 4 funciones nuevas.
- **Claude no debe escribir contraseñas reales en ningún formulario**, ni siquiera de prueba — el login y las pruebas de flujos que requieren contraseña las hace Joel directamente; Claude verifica antes/después (compilación, datos vía SQL, RLS, navegación sin sesión).
- Después de cualquier cambio de esquema, correr `get_advisors` (tipo `security`) para detectar RLS o permisos mal configurados — ya atrapó un problema real una vez.
- El `dev.bat` en la raíz del proyecto es necesario para que el servidor de desarrollo encuentre Node.js — no borrarlo.
