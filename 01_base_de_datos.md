# Etapa 1 — Base de Datos (Supabase / PostgreSQL)

## Objetivo
Crear el esquema completo, con seguridad por negocio (RLS) y la lógica automática de inventario/costeo promedio resuelta a nivel de base de datos (no depende de que el frontend la implemente correctamente).

## Notas de diseño que Claude Code debe respetar
- Ningún registro con historial se borra físicamente (ver regla transversal en `00_resumen_ejecutivo.md`). Por eso varias tablas usan `activo`/`estado` en lugar de DELETE.
- `variantes_item.costo_promedio` **no se edita manualmente** — solo cambia vía el trigger de `entradas_inventario`. Esto es intencional: es la única fuente de verdad del costeo promedio ponderado.
- `venta_detalle.costo_unitario` es una **copia congelada** del costo en el momento de la venta (promedio ponderado para productos, o el valor tecleado manualmente para servicios). Nunca se recalcula después.
- No se permite vender una variante con existencia insuficiente (trigger de validación incluido).

## Script SQL

El script completo está dividido en `sql/`, en el orden en que debe ejecutarse (los nombres llevan prefijo numérico por esa razón: cada archivo depende de que los anteriores ya hayan corrido, por FKs, triggers y políticas que referencian tablas previas):

1. [`sql/0001_negocios_y_usuarios.sql`](sql/0001_negocios_y_usuarios.sql) — extensión `pgcrypto`, `negocios`, `usuarios_negocio`
2. [`sql/0002_catalogo.sql`](sql/0002_catalogo.sql) — `items`, `variantes_item`, `entradas_inventario`
3. [`sql/0003_clientes_ventas_citas.sql`](sql/0003_clientes_ventas_citas.sql) — `clientes`, `ventas`, `venta_detalle`, `citas`
4. [`sql/0004_gastos.sql`](sql/0004_gastos.sql) — `tipos_gasto`, `gastos`
5. [`sql/0005_triggers.sql`](sql/0005_triggers.sql) — costeo promedio ponderado, validación y descuento de existencia
6. [`sql/0006_rls.sql`](sql/0006_rls.sql) — `is_negocio_member` y todas las políticas de Row Level Security
7. [`sql/0007_seed.sql`](sql/0007_seed.sql) — datos iniciales (los dos negocios)
8. [`sql/0008_hardening_funciones.sql`](sql/0008_hardening_funciones.sql) — fija `search_path` en las 4 funciones y revoca `EXECUTE` público de las funciones trigger que no deben invocarse por RPC directo
9. [`sql/0009_variantes_activo.sql`](sql/0009_variantes_activo.sql) — agrega `variantes_item.activo` (faltaba en el script original; la Etapa 3 requiere poder desactivar variantes sin borrarlas, igual que `items.activo`)
10. [`sql/0010_crear_venta.sql`](sql/0010_crear_venta.sql) — función `crear_venta(...)` (Etapa 4): registra cabecera + líneas de una venta en una sola transacción atómica, para que una línea inválida (ej. existencia insuficiente) revierta toda la venta en vez de dejarla a medias
11. [`sql/0011_disponibilidad_citas.sql`](sql/0011_disponibilidad_citas.sql) — trigger `validar_disponibilidad_cita` (Etapa 5): impide crear dos citas encimadas en el mismo negocio, considerando la duración del servicio
12. [`sql/0012_migracion_v2.sql`](sql/0012_migracion_v2.sql) — **Etapa 1b**: tema/logo por negocio, tabla `perfiles`, categorías cerradas (`categorias_item`), múltiples servicios por cita (`cita_servicios`), `forma_una`. Incluye backfills (citas y categorías existentes). Ver [`01b_migracion_v2.md`](01b_migracion_v2.md).
13. [`sql/0013_agendar_cita.sql`](sql/0013_agendar_cita.sql) — reemplaza el trigger de disponibilidad de la Etapa 5 (roto por el modelo de varios servicios) por la función `agendar_cita(...)`, atómica igual que `crear_venta`
14. ~~[`sql/0014_email_para_usuario.sql`](sql/0014_email_para_usuario.sql)~~ — **superada por `0015`**: esa función consultaba la base de datos para resolver usuario → correo, lo cual `02_autenticacion_v2.md` identificó como un riesgo (oráculo de existencia de usuarios expuesto a un cliente sin sesión). Se dejó el archivo como historial, pero la función ya no existe en la base.
15. [`sql/0015_login_sintetico.sql`](sql/0015_login_sintetico.sql) — **Etapa 2 v2**: renombra el usuario de Joel (`joel.guzman` → `joel_guzman`, el punto no era válido en el nuevo formato), agrega el `CHECK` de formato sobre `perfiles.usuario`, y elimina `email_para_usuario`. El correo ahora se construye en el frontend sin consultar nada (`usuario@nexo.local`).

Para aplicar el esquema completo en Supabase, correr los 15 archivos en ese orden (o concatenarlos en ese orden y pegar el resultado en el SQL Editor).

**Estado:** ya aplicado contra el proyecto real de Supabase (`Joe Proyect's`, `hfatlqwdafitipqjlkhb`). Las tablas existen con RLS habilitado y el advisor de seguridad está limpio salvo `is_negocio_member`, invocable por `anon`/`authenticated` intencionalmente porque las políticas RLS la llaman directamente.

## Pendiente después de correr este script
Crear la cuenta de Chio desde `/admin/usuarios` (Etapa 2 v2) — Joel ya está vinculado a ambos negocios.
