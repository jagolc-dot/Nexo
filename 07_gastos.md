# Etapa 7 — Gastos

## Objetivo
Registro de gastos por negocio, con categorías consistentes para alimentar el Estado de Resultados (Etapa 8).

## Categorías
Lista fija, igual para ambos negocios: **Insumos, Renta, Servicios, Nómina, Publicidad, Otros.** Todo gasto lleva una de estas seis categorías, sin excepción — esto es lo que mantiene los reportes agrupados de forma consistente.

## Conceptos recurrentes (`tipos_gasto`)
Catálogo propio de cada negocio (no se mezcla entre Uñas y Don camisa) de gastos que se repiten periódicamente (ej. "Renta local", "Internet", "Nómina quincenal"). Cada tipo de gasto tiene una categoría fija asociada. Se pueden dar de alta o de baja (`activo`/`inactivo`) según cambien las circunstancias del negocio (ej. cambio de proveedor).

## Registro de un gasto
Dos caminos:
1. **Gasto recurrente:** se selecciona un `tipo_gasto` existente de la lista; la categoría se autocompleta desde ese tipo.
2. **Gasto extraordinario:** no se selecciona ningún tipo de gasto (algo que ocurre una sola vez y no amerita crear un concepto fijo). En este caso, la categoría se marca como **"Otros"** y se habilita un campo de descripción libre para detallar de qué se trató. El gasto extraordinario **sí lleva categoría** (siempre "Otros", para no romper la consistencia de los reportes por categoría) — lo que no lleva es un tipo de concepto específico del catálogo recurrente.

## Fechas
Cada gasto guarda dos fechas distintas:
- `fecha_gasto`: cuándo ocurrió realmente el gasto (la que importa para reportes mensuales precisos).
- `fecha_registro`: cuándo se capturó en el sistema (puede ser días después, si se acumulan tickets).

## Edición y baja
Un gasto capturado por error **no se borra** — se marca `estado = 'cancelado'` (se conserva el rastro, pero se excluye de los totales de reportes).

## Criterios de aceptación
- Todo gasto tiene una de las seis categorías fijas, sin excepción.
- Un gasto extraordinario no requiere seleccionar un `tipo_gasto`, pero sí permite (y exige) una descripción libre.
- Los reportes de gasto por periodo usan `fecha_gasto`, no `fecha_registro`.
- Cancelar un gasto no lo elimina, solo lo excluye de los totales activos.

## Estado
Implementado en `app/`: `/gastos` (lista + cancelar), `/gastos/nuevo` (recurrente con categoría autocompletada, o extraordinario con categoría fija "Otros" y descripción obligatoria), `/gastos/tipos` (alta/baja de conceptos recurrentes por negocio). Enlace "Gastos" agregado a la navegación.

`fecha_gasto` se captura con un selector de fecha propio; `fecha_registro` se llena sola con el default de la base de datos (`now()`), tal como pide el documento.
