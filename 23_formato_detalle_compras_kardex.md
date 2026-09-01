# Etapa 23 — Formato numérico, detalle de compras y reporte de Kardex

> Documento de especificación, pegado por el usuario el 2026-09-01. Fuente de
> verdad para el plan `docs/superpowers/plans/2026-09-01-etapa23-formato-detalle-compras-kardex.md`.
> Decisiones tomadas antes de planear (2026-09-01):
> - **A (formato numérico):** barrido completo del sistema en esta etapa.
> - **A.1 inputs de dinero con separador al teclear:** solo el formulario de compra.
> - **D (reporte de Kardex):** sin migración — consultas desde el frontend.

## ⚠️ Procedimiento obligatorio

1. **Trabajar primero en BETA.** Probar ahí antes de tocar producción.
2. **Clasificar antes de producción:** cambios de presentación y consulta; no deberían requerir migración. Confirmarlo antes de aplicar y reportar si alguna implementación la necesita.
3. **Respaldo de producción** antes de desplegar.
4. **Orden:** si surge migración, aplicarla en producción **antes** de fusionar `dev` → `main`.
5. **Ningún cambio directo en Supabase Studio.**
6. **Todo error visible debe indicar el motivo** (regla permanente de la Etapa 22).

---

## A. Formato numérico — aplica a todo el sistema

### A.1 Separadores de miles
Todo valor **monetario** y toda **cantidad** se muestran con separador de miles: `$1,234.56`, `1,500 piezas`.

**Al capturar:**
- Campos **monetarios**: el separador se agrega automáticamente conforme se teclea. Aceptan decimales.
- Campos de **cantidad**: se muestran con separador **al desplegarlos**, pero **nunca se interfiere durante la captura** — el usuario teclea `1500` sin comas y sin que el campo reformatee mientras escribe. Las cantidades de inventario son enteras; no aceptan decimales.

**Requisito técnico:** el valor almacenado y enviado a la base de datos es siempre numérico limpio, sin comas. El formato es exclusivamente de presentación. Verificar que ningún campo envíe una cadena con comas, lo que provocaría errores de conversión.

### A.2 Decimales visibles
Todo importe se muestra redondeado a **2 decimales**, incluyendo los costos unitarios y promedios que hoy aparecen con 4 (`$100.0000` → `$100.00`).

**La precisión interna se conserva en 4 decimales.** El redondeo ocurre únicamente al mostrar; los cálculos, el costeo promedio ponderado y el prorrateo de flete siguen operando con la precisión completa.

**Excepción:** en el formulario de compra, donde el costo unitario se calcula al vuelo desde el costo total, mostrar los 4 decimales si el redondeo a 2 ocultara una diferencia relevante — por ejemplo, `$333.3333` no debe verse como `$333.33` cuando el usuario está verificando contra su factura. Evaluar caso por caso; el criterio general es 2 decimales.

### A.3 Alcance
Aplicar de forma consistente en: Inventario, compras, kardex, ventas, gastos, catálogo, dashboard, Estado de Resultados y todas las exportaciones a PDF y Excel.

---

## B. Detalle de una compra registrada

### B.1 Principio
El detalle de una compra muestra **lo que ocurrió en esa compra**, no el estado actual del producto.

**No incluir** existencia actual, costo promedio vigente ni valor total del inventario: esos valores cambian con cada movimiento posterior y, mostrados dentro de una compra pasada, dan información engañosa (si se compraron 10 anillos en agosto y hoy quedan 3, "existencia: 3" no dice nada sobre esa compra).

### B.2 Columnas del detalle
Por cada partida: **Código · Producto · Categoría · Unidad · Cantidad comprada · Costo total de la partida · Flete asignado · Costo unitario final**.

En Don camisa, la partida identifica la **variante** (modelo + color + talla).

Encabezado con proveedor, folio, fecha, subtotal, costo de envío, total y estado (confirmada / cancelada).

### B.3 Acceso
Botón visible dentro de Inventario para ver el **historial de compras**, con filtros por fecha y proveedor, y exportación a PDF y Excel.

> **Verificar antes de implementar:** las secciones C.5 a C.8 de la Etapa 21 ya especifican el historial de compras, las reglas de edición, la cancelación y el botón de recosteo. Confirmar qué está construido y qué no antes de duplicar trabajo. Si ya existe, esta sección solo ajusta las columnas del detalle.

---

## C. Botón "Agregar partida"
Rediseñar con el estilo de botón secundario del sistema (borde, no enlace de texto plano), respetando el tema del negocio activo y con área táctil mínima de 44×44 px.

---

## D. Reporte de Kardex

### D.1 Ubicación
**Dentro de Inventario**, como botón propio. Es la herramienta que se consulta al investigar un descuadre de existencias, no un reporte financiero periódico.

### D.2 Filtros
- **Rango de fechas** (con accesos rápidos: mes actual, mes anterior, año)
- **Productos**: selección múltiple, o todo el inventario
- **Tipo de movimiento**: compras, ventas, ajustes, cancelaciones — o todos

### D.3 Estructura del reporte
Formato estándar de kardex, en tres bloques de columnas:

| | Entradas | | | Salidas | | | Saldos | | |
|---|---|---|---|---|---|---|---|---|---|
| **Fecha · Tipo · Referencia** | Cant. | C. unit. | Total | Cant. | C. unit. | Total | Cant. | C. prom. | Valor |

**Elementos obligatorios:**
- **Fila de saldo inicial** al comienzo del periodo filtrado. Sin ella, el reporte no cuadra cuando se filtra por fechas: mostraría movimientos sin el punto de partida.
- **Fila de totales** al final: total de entradas, total de salidas y saldo final.
- **Referencia** de cada movimiento: folio de compra, número de venta, o identificador del ajuste, con enlace al documento origen cuando sea posible.
- Cuando se seleccionan varios productos, el reporte se **agrupa por producto**, cada grupo con su saldo inicial, sus movimientos y su saldo final.

### D.4 Reglas de cálculo
- Las **entradas** (compras, cancelaciones de venta, ajustes positivos) recalculan el costo promedio ponderado.
- Las **salidas** (ventas, ajustes negativos) se valúan al costo promedio vigente al momento del movimiento y **no alteran** el costo promedio de las unidades restantes.
- El saldo mostrado en cada renglón es el **resultante después** de ese movimiento, tomado de lo ya registrado en `movimientos_inventario` — **no se recalcula al vuelo**. El kardex refleja lo que ocurrió, no una reconstrucción.

### D.5 Verificación de cuadre
El saldo final del reporte debe coincidir exactamente con la existencia actual del producto en Inventario. Incluir una verificación que lo confirme y **advierta visiblemente** si no cuadra: un descuadre silencioso es peor que uno señalado.

### D.6 Exportación
PDF y Excel, respetando los filtros aplicados y conservando la estructura de tres bloques.

---

## Criterios de aceptación
- Todo importe se muestra con separador de miles y 2 decimales.
- Las cantidades muestran separador de miles pero no lo aplican mientras se teclea.
- Ningún campo envía valores con comas a la base de datos.
- El costeo promedio y el prorrateo de flete siguen calculándose con 4 decimales de precisión interna.
- El detalle de una compra no muestra existencias ni costos promedio actuales.
- El historial de compras es accesible desde Inventario, con filtros y exportación.
- El Kardex permite filtrar por fechas, varios productos y tipo de movimiento.
- El reporte incluye saldo inicial, totales y referencias a los documentos origen.
- El saldo final del Kardex coincide con la existencia actual; si no, se advierte.
- Las exportaciones reflejan exactamente lo que se ve en pantalla.
