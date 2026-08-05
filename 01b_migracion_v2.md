# Etapa 1b — Migración de esquema v2

> **Importante:** el esquema v1 ya está aplicado en el proyecto real de Supabase. Este archivo es una **migración incremental**, no un script de creación desde cero.

## Por qué existe esta migración
Los ajustes al negocio de uñas rompen tres supuestos del diseño original:
1. Una cita ahora puede incluir **varios servicios combinados** (ej. retiro + escultura). El esquema v1 solo admitía uno (`citas.item_id`).
2. Se agrega **forma de la uña** como característica de la cita — no es un servicio, no cuesta ni suma tiempo.
3. Las **categorías del catálogo** deben ser una lista cerrada por negocio (el panel de Inicio agrupa por ellas; texto libre las fragmentaría).

Además se agregan: tema visual por negocio, logo por negocio, y el soporte de acceso por nombre de usuario.

## Notas de implementación

- **`citas.item_id` se deja existente pero opcional** en vez de eliminarse, para no romper registros de prueba previos. Todo código nuevo lee los servicios desde `cita_servicios`, nunca desde `citas.item_id`.
- **`cita_servicios` copia precio y duración al agendar.** Congelamiento consistente con la regla transversal del proyecto: si Chio edita después la duración o el precio de un servicio en el catálogo, las citas ya agendadas conservan lo pactado.
- **`forma_una` es nullable a propósito.** Una cita de solo retiro no lleva forma; obligarla forzaría a capturar un dato falso.
- **La duración total de una cita** es la suma de `cita_servicios.duracion_minutos`. Es el valor que se usa para detectar traslapes.
- **Categorías:** los ítems existentes con `categoria` de texto libre se reasignaron a la categoría cerrada equivalente antes de borrar la columna vieja.

## Estado
Aplicado contra el proyecto real de Supabase (`hfatlqwdafitipqjlkhb`) en `sql/0012_migracion_v2.sql`, `sql/0013_agendar_cita.sql` y `sql/0014_email_para_usuario.sql`. Decisiones tomadas junto con Joel antes de aplicar:

- **Backfill de citas existentes:** las 6 citas de prueba que ya existían se migraron automáticamente a `cita_servicios` (copiando `item_id`/`precio_base`/`duracion_minutos` de ese momento), para que ninguna se quedara sin servicio visible.
- **Backfill de categorías:** además de "Escultura" y "Retiro y mantenimiento" (las únicas que pedía el script original), se crearon "Joyeria" y "Cuidado" para no perder la clasificación de los ítems que ya existían con esos valores de texto libre.
- **Disponibilidad de citas:** el trigger `validar_disponibilidad_cita` de la Etapa 5 ya no funciona con múltiples servicios (la duración total no se conoce hasta insertar `cita_servicios`, y el trigger corría antes). Se reemplazó por una función `agendar_cita(...)` que hace todo en una sola transacción atómica — mismo patrón que `crear_venta` (Etapa 4).
- **Login por nombre de usuario:** se agregó la tabla `perfiles` (usuario ↔ auth.users) y una función `email_para_usuario(usuario)` (`security definer`, invocable sin sesión) que traduce usuario → correo antes de intentar el login. Ver `02_autenticacion.md` para el cambio de flujo completo (registro abierto → creación por administrador).
- **Categorías cerradas en Catálogo:** ver `03_catalogo.md`.
- **Múltiples servicios + forma de uña en Agenda:** ver `05_agenda.md`.
- **Tema/logo por negocio:** las columnas `negocios.tema` y `negocios.logo_url` quedaron creadas y pobladas, pero **sin pantalla en el frontend todavía** — no había especificación de cómo debían usarse visualmente. Pendiente para una futura etapa si se quiere aplicar el tema al diseño de la app.
