# Sistema Administrativo Multi-Negocio — Resumen Ejecutivo

## Contexto

Sistema web para administrar dos negocios independientes bajo un mismo login:

- **Glam Nails by Chio** (@glamnailsbychio, antes "Uñas") — negocio de servicios, opera con agenda de citas.
- **Don camisa** — negocio de productos (camisas), opera con inventario por variante (color/talla).

**Usuarios:**
- Joel (dueño) — acceso a ambos negocios.
- Su pareja — acceso únicamente a Uñas.

## Principio arquitectónico central

Un solo sistema, una sola base de datos, **aislamiento total de información entre negocios**:

- Cada tabla relevante lleva `negocio_id` y está protegida por Row Level Security (RLS) en Supabase — un usuario nunca puede leer ni escribir datos de un negocio al que no pertenece, sin importar lo que haga el frontend.
- El frontend además usa un **selector de negocio activo**: si el usuario solo tiene acceso a un negocio, entra directo a él; si tiene acceso a varios, elige uno al iniciar sesión.
- Los módulos (Catálogo, Ventas, Clientes, Gastos, Reportes) son **el mismo código para ambos negocios** — lo que cambia es el dato, no la pantalla. La única sección condicional es **Agenda de citas**, que solo aparece si el negocio activo tiene ítems con `requiere_agenda = true`.

## Reglas transversales (aplican a todos los módulos)

1. **Nunca se elimina físicamente** un registro que pueda tener historial (ítems, clientes, ventas, gastos). Se marca como inactivo/cancelado. Esto preserva la integridad de los reportes financieros.
2. **Los costos y precios se "congelan" al momento de la venta.** Cambios posteriores en catálogo (precio, costo promedio) nunca alteran ventas ya registradas.
3. **Costeo promedio ponderado** (NIF C-4) para el inventario de Don camisa: cada entrada de mercancía recalcula el costo promedio hacia adelante; nunca afecta ventas pasadas.
4. **El Estado de Resultados sigue la estructura de NIF B-3** (ingresos − costo de ventas = utilidad bruta; utilidad bruta − gastos = utilidad neta), aunque los negocios operen de forma informal por ahora.

## Stack tecnológico recomendado

- **Backend:** Supabase (PostgreSQL + Auth + Row Level Security)
- **Frontend:** React + Vite + TypeScript, estilos con Tailwind CSS, diseño mobile-first (se va a usar principalmente desde celular en el mostrador/salón)
- **Cliente de datos:** `@supabase/supabase-js`
- **Exportación:** `jspdf` (PDF) y `xlsx`/SheetJS (Excel) para el módulo de Reportes
- **Despliegue:** Vercel o Netlify (plan gratuito es suficiente para esta etapa)

Claude Code puede ajustar detalles de implementación libremente; lo que no debe cambiar son las reglas de negocio documentadas en cada etapa.

## Orden de construcción

1. `01_base_de_datos.md` — esquema completo en Supabase (tablas, seguridad, triggers)
2. `02_autenticacion.md` — login y selector de negocio
3. `03_catalogo.md` — servicios, productos con variantes, inventario y costeo promedio
4. `04_ventas.md` — flujo de venta (POS)
5. `05_agenda.md` — agenda de citas (solo Uñas)
6. `06_clientes.md` — ficha y reglas de cliente por negocio
7. `07_gastos.md` — registro de gastos y conceptos recurrentes
8. `08_reportes.md` — Estado de Resultados y reportes operativos

Cada etapa depende de que la anterior esté funcionando. No hay atajos entre etapas: por ejemplo, Ventas depende de que Catálogo ya exista, y Reportes depende de que Ventas y Gastos ya estén generando datos reales.

## Actualizaciones posteriores

Después de construir las 8 etapas, se aplicó **`01b_migracion_v2.md`** — una migración incremental (no rehace nada desde cero) que ajusta supuestos que cambiaron con el uso real: citas con varios servicios combinados, forma de uña, categorías de catálogo como lista cerrada por negocio, y una primera versión de acceso por nombre de usuario. Luego **`09_identidad_visual.md`** agregó el sistema de diseño "Nexo" con temas por negocio, aplicado retroactivamente a toda la app. Por último, **`02_autenticacion_v2.md`** reemplazó por completo el login por correo: ahora se entra con usuario + contraseña, el correo es sintético (`usuario@nexo.local`, nunca visible), y Joel administra las cuentas (crear, resetear contraseña, revocar acceso) desde `/admin/usuarios` — no hay registro público. Ver esos archivos y las secciones "Estado" de cada etapa para el detalle.
