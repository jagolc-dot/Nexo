# Etapa 4 — Ventas

## Objetivo
Flujo de registro de venta (tipo punto de venta), compartido por ambos negocios, con las reglas de costo y cliente que cambian según el negocio activo.

## Flujo general
1. **Cliente:**
   - **Uñas:** obligatorio. Nombre + al menos un dato de contacto (teléfono **o** red social — no ambos forzosamente). Ver Etapa 6 para el detalle de la ficha.
   - **Don camisa:** opcional. Puede venderse a un cliente formal registrado (`cliente_id`) **o** a "público general" con un nombre libre sin registrar (`nombre_ocasional`, campo de texto simple en la venta, no crea un registro en `clientes`). Nunca deben llenarse ambos campos en la misma venta.
2. **Agregar líneas a la venta:**
   - Si es **producto** (Don camisa): se elige modelo → variante (color/talla) → el precio se autocompleta desde `variantes_item.precio` (o `precio_base` si la variante no tiene uno propio) → el costo se autocompleta con `variantes_item.costo_promedio` **vigente en ese momento** y se copia (congela) en `venta_detalle.costo_unitario`. No se puede seleccionar una variante con existencia en 0.
   - Si es **servicio** (Uñas): se elige el servicio → el precio se autocompleta → el **costo es obligatorio y se teclea manualmente** por el usuario; la línea no puede cerrarse sin este dato (varía mucho según insumos usados en cada caso particular).
   - Cantidad libre en ambos casos.
3. **Total:** se calcula automáticamente sumando todas las líneas.
4. **Método de pago:** selección simple entre `efectivo`, `tarjeta`, `transferencia`. Este dato alimenta el reporte de ventas por forma de pago (Etapa 8).
5. **Cerrar venta:** al confirmar, se crea el registro en `ventas` (estado `confirmada`) y sus líneas en `venta_detalle`, cada una con su `costo_unitario` ya congelado.

## Ventas originadas desde una cita (Uñas)
Cuando la venta se genera desde el botón "Finalizar servicio" de la Agenda (ver Etapa 5), debe quedar vinculada: `citas.venta_id` apunta a esta venta. Ver Etapa 5 para el detalle completo de ese flujo.

## Edición y cancelación
- **Una venta confirmada nunca se edita ni se borra.** Si hubo un error, se cambia su `estado` a `cancelada` (permanece visible en el historial, pero se excluye de los totales de reportes de ventas activas) y se registra una venta nueva correcta.
- Cancelar una venta que provino de una cita **no revierte el estado de la cita** — la cita se queda como `completada` (el servicio sí ocurrió; cancelar la venta es un tema exclusivamente financiero/administrativo).

## Criterios de aceptación
- No se puede cerrar una línea de servicio sin costo manual capturado.
- No se puede seleccionar una variante de producto con existencia 0.
- Una venta con `cliente_id` no puede tener `nombre_ocasional` al mismo tiempo (y viceversa).
- El total de la venta siempre es la suma exacta de sus líneas.
- Cancelar una venta cambia su estado pero conserva el registro completo (no se elimina).

## Estado
Implementado en `app/`: `/ventas/nueva` (alta) y `/ventas` (historial + cancelar). Se agregó la función SQL `crear_venta` (`sql/0010_crear_venta.sql`) para que cabecera y líneas se registren en una sola transacción atómica. Probado por Joel con cuenta real: venta de servicio con cliente nuevo, venta de producto con variante, y bloqueo correcto al intentar vender más existencia de la disponible.

Cancelar una venta desde `/ventas` también fue probado y funciona: cambia el estado a `cancelada` sin borrar el registro. Lo de "Ventas originadas desde una cita" queda para la Etapa 5 (Agenda).
