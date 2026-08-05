# Etapa 2 — Autenticación

> **Reemplazado por [`02_autenticacion_v2.md`](02_autenticacion_v2.md).** El login por correo descrito aquí ya no existe — ahora se entra por nombre de usuario. Este archivo se conserva como historial.

## Objetivo
Login funcional con Supabase Auth y la lógica de acceso multi-negocio.

## Reglas de negocio confirmadas

1. **Método:** correo + contraseña (Supabase Auth nativo).
2. **Asignación de acceso:**
   - Joel → acceso a "Uñas" y "Don camisa".
   - Su pareja → acceso únicamente a "Uñas".
   - Esto se resuelve dando de alta filas en `usuarios_negocio` (no vía código, es un dato).
3. **Flujo posterior al login:**
   - Si el usuario tiene acceso a **un solo** negocio → entra directo a ese negocio, sin mostrar selector.
   - Si tiene acceso a **dos o más** → se muestra un selector de negocio (tarjetas simples) antes de entrar al panel principal.
   - El negocio elegido queda como "negocio activo" durante toda la sesión; debe poder cambiarse desde un botón visible en la navegación (no hace falta cerrar sesión para cambiar de negocio).
4. **Recuperación de contraseña:** flujo estándar de Supabase ("olvidé mi contraseña" → correo con link).
5. **Sesión:** persistente en el dispositivo (no pedir login en cada apertura de la app). Debe existir una opción de "Cerrar sesión" visible en algún menú de configuración/perfil.
6. **Roles:** el campo `rol` en `usuarios_negocio` existe desde ahora pero no se usa para restringir permisos todavía — todos los usuarios actuales son "dueño" con acceso completo al negocio que tienen asignado. Dejar el campo listo para una futura fase de permisos granulares (ej. empleado que solo registra ventas).

## Criterios de aceptación
- Un usuario con un solo negocio asignado nunca ve la pantalla de selector.
- Cambiar de negocio activo no requiere cerrar sesión.
- Toda consulta a la base de datos respeta el negocio activo Y la seguridad RLS de la Etapa 1 (doble capa: RLS a nivel de base de datos + filtro de negocio activo en frontend).

## Estado
Implementado en `app/` (React + Vite + TS + Tailwind, Supabase Auth). Probado manualmente contra el proyecto real:
- Sin fila en `usuarios_negocio` → pantalla "Sin negocio asignado" (`/sin-acceso`).
- Un solo negocio asignado → entra directo al panel, sin selector.
- Dos negocios asignados → botón "Cambiar negocio" muestra el selector de tarjetas; cambiar de negocio no cierra sesión.
- "Cerrar sesión" funciona y regresa a `/login`.

**Ajuste (Etapa 1b) — login por nombre de usuario, registro cerrado:** Joel pidió controlar él mismo qué cuentas existen y con qué permisos ("de momento solo necesito 2 usuarios"), en vez de un registro público. Esto cambió el método de acceso:

- **Login:** ahora pide **usuario + contraseña**, no correo + contraseña. Antes de llamar a Supabase Auth, el frontend resuelve usuario → correo con la función `email_para_usuario(usuario)` (Etapa 1b). El correo sigue existiendo (tabla `perfiles`, campo `usuario` distinto del correo de `auth.users`) para recuperar contraseña.
- **`/registro` (autoregistro abierto) se eliminó.** En su lugar, `/admin/crear-usuario` — visible solo para usuarios con `rol = 'dueño'` en algún negocio — permite crear una cuenta nueva especificando usuario, correo, contraseña inicial, nombre completo y a qué negocio(s) con qué rol tiene acceso. Llama a la Edge Function `crear-usuario` (usa `service_role`, verifica que quien llama sea dueño, crea el usuario en Auth con `email_confirm: true`, inserta su fila en `perfiles` y sus accesos en `usuarios_negocio` — revierte todo si algún paso falla).
- **"Olvidé mi contraseña"** también pide usuario en vez de correo; internamente resuelve el correo antes de pedir el link de reseteo.
- Joel ya tiene usuario **`joel.guzman`** (nombre completo "Joel Guzmán") vinculado a su cuenta existente, para no perder acceso tras el cambio.

Pendiente: que Joel cree la cuenta de Chio desde `/admin/crear-usuario` (usuario + correo + contraseña + acceso solo a "Glam Nails by Chio").
