# Etapa 5 — Agenda de Citas

## Objetivo
Módulo condicional: solo visible cuando el negocio activo tiene ítems con `requiere_agenda = true` (en la práctica, solo Uñas).

## Nodo "Agendar"
Al presionar, se despliega el catálogo de servicios (ya con precio y `duracion_minutos` cargados desde la Etapa 3). Se debe capturar:
- Servicio a agendar.
- Fecha y hora.
- Nombre de la clienta.
- Al menos un dato de contacto: teléfono **o** red social (Instagram/Facebook) — no es obligatorio tener ambos.

**Cálculo de disponibilidad:** usando `duracion_minutos` del servicio elegido, el sistema debe evitar que dos citas se encimen en el mismo horario. No se maneja tiempo de preparación adicional entre citas (confirmado explícitamente — el tiempo estimado ya contempla todo lo necesario).

La cita se crea con `estado = 'pendiente'`.

## Nodo "Finalizar servicio"
Disponible sobre una cita existente. Al presionar, se despliega un mini-flujo:
1. Captura del **costo manual** del servicio (obligatorio — no se puede continuar sin este dato).
2. Botón opcional **"Agregar productos"**: permite sumar productos **del mismo negocio de la cita** (ej. Uñas puede vender esmalte propio al terminar un servicio) — nunca productos del otro negocio. Ver nota en Estado sobre por qué se ajustó así.
3. Botón **"Finalizar recibo"**: genera **una sola venta** (servicio + productos si los hubo, un solo total, un solo recibo) siguiendo las reglas de la Etapa 4.
4. Al finalizar, la cita pasa automáticamente a `estado = 'completada'` y se guarda el vínculo `citas.venta_id` apuntando a la venta recién creada.

No se captura una hora de inicio real del servicio — solo se usa la marca de tiempo de la venta generada (`ventas.fecha`) como referencia de cuándo terminó.

## Nodo "Cancelar cita"
Disponible sobre una cita `pendiente` o `confirmada` (para cuando la clienta no se presenta o cancela con anticipación). Cambia el `estado` a `cancelada`. No genera ninguna venta.

## Relación entre cancelar una venta y su cita origen
Si posteriormente se cancela la venta que generó una cita completada (ver Etapa 4), **la cita permanece en estado `completada`** — son dos hechos independientes: uno es que el servicio ocurrió, otro es el registro financiero de esa venta.

## Criterios de aceptación
- No se pueden crear dos citas que se encimen en horario para el mismo negocio, considerando la duración del servicio.
- "Finalizar servicio" no permite continuar sin costo manual capturado.
- Al finalizar, la cita queda completada y ligada a su venta (`citas.venta_id` no nulo).
- "Cancelar cita" nunca genera una venta ni modifica inventario.

## Estado
Implementado en `app/`: `/agenda` (lista), `/agenda/nueva` (agendar), `/agenda/:id/finalizar` (costo + método de pago + agregar productos del mismo negocio). El enlace "Agenda" en la navegación solo aparece si el negocio activo tiene ítems con `requiere_agenda = true`.

Se agregó el trigger `validar_disponibilidad_cita` (`sql/0011_disponibilidad_citas.sql`) para impedir citas encimadas a nivel de base de datos.

Probado por Joel con cuenta real: agendar cita, cancelar cita (sin generar venta), y finalizar servicio. Pendiente de probar explícitamente: intentar agendar dos citas encimadas en el mismo horario.

**Historial de la decisión "Agregar productos":** primero se construyó cruzando el catálogo de Don camisa (Joel lo pidió tras la primera pregunta); al probarlo se decidió que rompía el aislamiento entre negocios y se quitó. Pero la necesidad real era otra: **Uñas también vende productos propios** (ej. esmalte), no productos de Don camisa. Eso reveló que el Catálogo (Etapa 3) estaba mal restringido — obligaba a cada negocio a un solo tipo de ítem (Uñas = solo servicios, Don camisa = solo productos), algo que la base de datos nunca exigió, fue una simplificación mía. Se corrigió: cualquier negocio puede tener ítems de ambos tipos (ver Estado en `03_catalogo.md`), y "Agregar productos" ahora lista productos del **mismo negocio de la cita**, nunca del otro.
