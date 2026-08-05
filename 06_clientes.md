# Etapa 6 — Clientes

## Objetivo
Gestión de clientes, con reglas deliberadamente distintas entre los dos negocios.

## Reglas por negocio

**Uñas:** todo servicio requiere un cliente formal. Nombre obligatorio + al menos un dato de contacto (teléfono o red social). Este registro se crea la primera vez que se atiende a la clienta (ya sea al agendar una cita o al registrar una venta directa) y se reutiliza en visitas futuras.

**Don camisa:** el cliente formal es **opcional**, reservado solo para quienes regresan a comprar más de una vez. Una venta de mostrador puede usar `ventas.nombre_ocasional` (texto libre, sin crear un registro en `clientes`) para una compra única. No hay detección automática de "cliente recurrente" — es Joel quien decide manualmente, al notar que alguien ya compró varias veces, darlo de alta formalmente en `clientes` para empezar a llevarle historial desde ese punto en adelante.

## Ficha de cliente
Debe mostrar:
- Datos de contacto (nombre, teléfono, red social, notas libres — ej. preferencias, alergias a ciertos productos).
- Historial de visitas/compras: fecha, qué se hizo o compró, monto pagado.
- Gasto total acumulado (suma de sus ventas confirmadas — las canceladas no cuentan).

## Edición y baja
Igual que en Catálogo: un cliente **nunca se borra** si ya tiene historial de compras asociado. Para clientes que ya no vuelven, se marca `activo = false` (deja de aparecer en listados activos, pero su historial permanece intacto para reportes).

## Criterios de aceptación
- No se puede registrar una venta de servicio (Uñas) sin un cliente con al menos un dato de contacto.
- Una venta de Don camisa puede completarse sin ningún cliente asociado (usando `nombre_ocasional`).
- La ficha de un cliente siempre refleja su historial real y actualizado tras cada nueva venta confirmada.

## Estado
Implementado en `app/`: `/clientes` (lista, con filtro para ver inactivos), `/clientes/nuevo` (alta completa con notas), `/clientes/:id` (ficha: editar datos, marcar inactivo/reactivar, historial de visitas con ítems y monto, gasto total acumulado excluyendo ventas canceladas).

Las reglas de "cliente obligatorio con contacto" (Uñas) y "cliente opcional / nombre_ocasional" (Don camisa) ya estaban resueltas desde la Etapa 4 (Ventas) y la restricción `al_menos_un_contacto` de la Etapa 1; esta etapa agrega la gestión completa de la ficha (edición, baja lógica, historial, gasto acumulado) que faltaba.
