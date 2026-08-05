# Etapa 2 (v2) — Autenticación por nombre de usuario

> **Reemplaza a `02_autenticacion.md`.** El cambio central: se entra con **usuario**, no con correo.

## Por qué cambió
Los empleados no necesariamente tienen correo electrónico propio, y el acceso debe poder crearse y revocarse sin depender de una cuenta de correo externa.

## Cómo funciona técnicamente
Supabase Auth siempre requiere un correo internamente — no se puede evitar a nivel de motor. La solución es una **capa de traducción**:

- El usuario escribe `chio` y su contraseña.
- El frontend construye el correo interno de forma determinística: `chio@nexo.local`.
- Ese correo sintético es lo que se envía a Supabase Auth. El usuario nunca lo ve ni necesita que exista de verdad.

**No hacer una consulta de "buscar el correo de este usuario"** — eso expondría la lista de cuentas al navegador. La construcción es directa por convención de dominio, sin consultar nada.

La tabla `perfiles` (ver `01b_migracion_v2.md`) guarda el `usuario` y `nombre_completo` para mostrarlo en la interfaz y para el panel de administración.

## Reglas de negocio

1. **Formato de usuario:** minúsculas, sin espacios ni acentos, 3–20 caracteres (letras, números, guión bajo). Debe ser único en todo el sistema.
2. **Alta de usuarios:** solo Joel puede crear cuentas, desde un panel de administración. No existe registro público — nadie se da de alta solo.
3. **Asignación de negocios:** al crear un usuario, se elige a qué negocio(s) tiene acceso (filas en `usuarios_negocio`).
   - Joel → Glam Nails by Chio y Don camisa.
   - Chio → solo Glam Nails by Chio.
4. **Flujo posterior al login:**
   - Un solo negocio asignado → entra directo, sin ver selector.
   - Dos o más → muestra el selector de negocio. Al elegir uno, **se aplica su tema visual** (ver `09_identidad_visual.md`).
   - Debe poder cambiarse de negocio sin cerrar sesión.
5. **Contraseña olvidada — consecuencia aceptada:** al no haber correo real, **no existe recuperación automática**. Joel restablece la contraseña desde el panel de administración (botón "Restablecer contraseña" por usuario, que asigna una temporal). Esto fue confirmado explícitamente como trade-off aceptable.
6. **Revocar acceso:** cuando alguien deja de trabajar, se le quita su fila en `usuarios_negocio` (pierde acceso al negocio) o se desactiva su cuenta. Nunca se borran sus registros históricos de ventas o citas.
7. **Sesión:** persistente en el dispositivo. Opción de "Cerrar sesión" visible en el menú de perfil.
8. **Roles:** el campo `rol` existe pero no restringe nada todavía. Todos son "dueño" con acceso completo al negocio asignado. Dejar preparado para permisos granulares a futuro (ej. empleado que registra ventas pero no ve reportes).

## Panel de administración (solo Joel)
Pantalla mínima con: lista de usuarios, crear usuario (usuario + nombre + contraseña inicial + negocios asignados), restablecer contraseña, y revocar acceso a un negocio.

## Criterios de aceptación
- Se entra escribiendo `chio`, nunca un correo.
- El correo sintético no aparece en ninguna pantalla.
- El navegador nunca recibe una lista de usuarios o correos de otras cuentas.
- Chio entra directo a Glam Nails by Chio, sin selector, y **jamás ve datos de Don camisa** (verificable: probar su sesión y confirmar que RLS bloquea el acceso).
- Al cambiar de negocio, el tema visual cambia sin recargar la página.

## Estado
Implementado en `app/` y en el proyecto real de Supabase (`hfatlqwdafitipqjlkhb`):

- **`sql/0015_login_sintetico.sql`**: renombra el usuario de Joel de `joel.guzman` a `joel_guzman` (el punto no cumplía el nuevo formato), agrega el `CHECK` de formato sobre `perfiles.usuario`, y elimina la función `email_para_usuario` de la Etapa 1b — ese enfoque (consultar la base de datos para resolver usuario → correo) es exactamente el "oráculo de existencia de usuarios" que este documento pide evitar.
- **`app/src/lib/auth.ts`**: `emailSintetico(usuario)` construye `usuario@nexo.local` de forma pura, local, sin red — reemplaza la consulta RPC anterior.
- **Login/"Olvidé mi contraseña"**: `LoginPage` ya no hace ninguna consulta antes de loguearse. Se eliminaron `OlvideContrasenaPage` y `RestablecerContrasenaPage` (no aplican sin correo real).
- **Edge Function `crear-usuario`** (reutiliza el mismo slug de la Etapa 1b, ahora con 4 acciones vía `body.accion`): `crear` (valida formato de usuario en servidor, construye el correo sintético, crea el usuario + perfil + accesos), `listar` (todos los usuarios con sus accesos, solo dueños), `resetear_password`, `revocar_acceso`. Todas verifican que quien llama tenga `rol = 'dueño'` en algún negocio.
- **`/admin/usuarios`** (antes `/admin/crear-usuario`): panel completo — lista de usuarios con sus accesos y botón "Revocar" por acceso, botón "Restablecer contraseña" por usuario, y formulario de alta (usuario con validación de formato en vivo, nombre completo, contraseña inicial, negocios + rol). Sin campo de correo en ninguna pantalla, como pide el criterio de aceptación.

**Bug encontrado al probar y corregido:** renombrar `perfiles.usuario` no cambia el correo real en `auth.users` — la cuenta de Joel se había creado originalmente con su correo real (`jagolc@gmail.com`), y el nuevo login siempre calcula `usuario@nexo.local`, así que quedó bloqueado hasta sincronizar `auth.users.email` y `auth.identities.identity_data->>'email'` a `joel_guzman@nexo.local`. Se agregó ese paso al final de `sql/0015_login_sintetico.sql` para que quede documentado (relevante si el esquema se replica en otro proyecto con cuentas preexistentes).

Pendiente de que Joel reintente el login con `joel_guzman` y su contraseña de siempre tras el fix, y luego cree la cuenta de Chio desde `/admin/usuarios` para confirmar que ella entra directo a Glam Nails by Chio sin selector y sin ver nada de Don camisa.
