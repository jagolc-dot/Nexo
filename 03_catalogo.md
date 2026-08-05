# Etapa 3 — Catálogo

## Objetivo
CRUD de ítems (servicios y productos), con el flujo de inventario y costeo promedio ponderado para Don camisa.

## Alta de un servicio (Uñas)
Campos: nombre, categoría (opcional, ej. "Manicure", "Uñas acrílicas"), precio, **duración en minutos** (obligatoria — se usa en Etapa 5 para calcular disponibilidad en la agenda y no encimar citas).
- `requiere_agenda = true` por default.
- Los servicios **no llevan costo en el catálogo**. El costo se captura manualmente en cada venta (ver Etapa 4).

## Alta de un producto con variantes (Don camisa)
1. Se crea el "modelo" (`items`, `tipo = 'producto'`, `tiene_variantes = true`): nombre, categoría, precio base de referencia.
2. Se agregan una o más variantes (`variantes_item`): color, talla, precio (opcional — si se deja vacío, se usa `precio_base` del modelo).
3. El costo **no se teclea directamente en la variante**. Se alimenta a través de "entradas de inventario":
   - Cada vez que llega mercancía nueva, se registra: variante, cantidad, costo unitario de esa entrada.
   - El sistema recalcula automáticamente el costo promedio ponderado (el trigger de la Etapa 1 ya lo resuelve) y suma la cantidad a la existencia.
   - Fórmula: `nuevo promedio = ((existencia actual × costo actual) + (cantidad entrante × costo entrante)) ÷ (existencia actual + cantidad entrante)`.
   - Este recálculo **nunca afecta ventas ya registradas** — el costo queda congelado en cada venta pasada (ver Etapa 4).

## Reglas de estado
- **Nunca se borra** un ítem o variante que ya tenga ventas asociadas. "Eliminar" = marcar `activo = false` (deja de aparecer para nuevas ventas, pero el histórico que lo referencia permanece intacto).
- **"Agotado" ≠ "Inactivo".** Si `existencia = 0`, el producto sigue activo y visible en el catálogo (marcado visualmente como sin existencia), pero **no se puede vender** hasta que entre inventario nuevo. El sistema no lo desactiva automáticamente — la baja definitiva (ej. modelo descontinuado) es una decisión manual del usuario.
- **No se permite registrar una venta de una variante con existencia insuficiente.** Esto ya está resuelto a nivel de base de datos (trigger `validar_existencia`), pero el frontend debe prevenir el intento antes de enviarlo (ej. no mostrar variantes en cero como seleccionables, o mostrar un error claro).

## Criterios de aceptación
- Dar de alta un servicio no pide costo ni existencia.
- Dar de alta un producto exige crear al menos una variante antes de poder aparecer en Ventas.
- Registrar una entrada de inventario actualiza automáticamente `costo_promedio` y `existencia` de la variante correspondiente.
- Intentar vender una variante en cero muestra un error claro y no permite continuar.

## Estado
Implementado en `app/` (rutas `/catalogo`, `/catalogo/nuevo?tipo=servicio|producto`, `/catalogo/:id`). Probado manualmente por Joel con su cuenta real: alta de producto, variantes y entradas de inventario funcionando.

Nota: el último criterio ("intentar vender una variante en cero") es responsabilidad de la Etapa 4 (Ventas), no de Catálogo — aquí solo se resuelve mostrando el badge "Agotado".

**Ajuste (Etapa 5):** originalmente el tipo de ítem se infería de `negocios.tipo` (Uñas = solo servicios, Don camisa = solo productos, sin poder elegir). Esa restricción era una simplificación mía, no algo que pidiera este documento ni la base de datos. Se corrigió al descubrir que Uñas también necesita vender productos propios (ej. esmalte) al finalizar un servicio: ahora **cualquier negocio puede tener ítems de ambos tipos** — el Catálogo muestra dos botones ("+ Nuevo servicio" / "+ Nuevo producto") y cada ítem trae una etiqueta visible con su tipo.

**Ajuste — productos sin variantes reales:** no todos los productos necesitan desglosarse por color/talla (ej. los productos propios de Uñas no aplican a ese estándar, que es específico de Don camisa). Al dar de alta un producto hay un checkbox "Este producto maneja variantes (color/talla)", desmarcado por default:
- Desmarcado (caso simple): se crea una variante implícita sin color/talla, y el detalle del ítem muestra un panel de "Inventario" directo (existencia, costo promedio, registrar entrada) sin pedir esos campos.
- Marcado: se mantiene el flujo original de variantes múltiples con color/talla.

No cierra la puerta a futuro: desde el detalle de un producto simple hay un enlace "¿Necesitas manejar variantes?" que revela el formulario para agregar una variante real; en cuanto el producto tiene 2 o más variantes, la pantalla cambia automáticamente a la vista de lista de variantes.
