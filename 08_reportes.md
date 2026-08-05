# Etapa 8 — Reportes

## Objetivo
Convertir los datos ya capturados (ventas con costo congelado, gastos categorizados) en información financiera y operativa útil. Es la última etapa: depende de que Ventas y Gastos ya estén generando datos reales.

## Regla central: nunca consolidado entre negocios
Todos los reportes se ven **siempre por separado**, uno a la vez, según el negocio activo. No existe (ni debe existir) una vista que combine cifras de Uñas y Don camisa en un solo número.

## Periodicidad
Accesos rápidos a periodos fijos: **hoy, esta semana, este mes, este año**, más un **selector de rango de fechas libre** para consultas específicas (ej. cierre de un periodo particular).

## Reporte principal: Estado de Resultados
Estructura basada en NIF B-3:
- Ingresos (suma de `ventas.total` con `estado = 'confirmada'` en el periodo)
- (−) Costo de ventas (suma de `venta_detalle.costo_unitario × cantidad` de esas mismas ventas)
- = Utilidad bruta
- (−) Gastos de operación (suma de `gastos.monto` con `estado = 'activo'` en el periodo, por `fecha_gasto`)
- = Utilidad neta (o pérdida, si el resultado es negativo)

Debe poder verse en dos niveles:
1. **Resumen del periodo:** los totales de cada línea de arriba.
2. **Detalle transacción por transacción:** cada venta individual con su margen (precio − costo) y cada gasto individual, para poder auditar el resumen si algo no cuadra.

## Reportes operativos adicionales
- Ventas por forma de pago (efectivo / tarjeta / transferencia) en el periodo.
- Inventario actual por modelo/color/talla, con su costo promedio vigente (Don camisa).
- Servicios más vendidos y clientas más frecuentes (Uñas).
- Gastos agrupados por categoría.
- Tasa de citas completadas vs. canceladas (Uñas).

## Exportación
Todo reporte visible en pantalla debe poder exportarse también a **PDF** y **Excel**, con el mismo nivel de detalle (resumen o transacción, según lo que se esté viendo al momento de exportar).

## Criterios de aceptación
- Ningún reporte mezcla cifras de ambos negocios en un mismo total.
- El Estado de Resultados cuadra exactamente: Ingresos − Costo de ventas − Gastos = Utilidad neta mostrada.
- Cambiar el rango de fechas actualiza todos los reportes de la vista sin necesidad de recargar la página.
- La exportación a PDF/Excel refleja exactamente lo que se está viendo en pantalla al momento de exportar.

## Estado
Implementado en `app/`: `/reportes`, con selector de periodo (hoy/semana/mes/año/rango libre) compartido por todas las pestañas, y pestañas: Estado de Resultados (resumen y detalle transacción por transacción, con toggle), Ventas por forma de pago, Gastos por categoría, Inventario actual (solo negocios de productos), Servicios más vendidos + clientas frecuentes (solo negocios de servicios), Citas completadas vs. canceladas (solo si el negocio tiene agenda). Cada tabla tiene botones "PDF" y "Excel" que exportan exactamente lo que está en pantalla (resumen o detalle, según el toggle).

Todas las consultas filtran siempre por `negocio_id` del negocio activo — nunca se combinan cifras de Uñas y Don camisa.

Se usó `xlsx` (SheetJS) instalado desde `cdn.sheetjs.com` en vez de la versión de npm, porque esa tiene 2 vulnerabilidades altas sin parche disponible ahí (npm audit). `jspdf` + `jspdf-autotable` para PDF.

**Esta es la etapa con más superficie sin probar** (muchas consultas y agregaciones nuevas) y no pude iniciar sesión yo mismo para verificarla end-to-end. Pendiente de que Joel confirme con datos reales: que el Estado de Resultados cuadre (Ingresos − Costo − Gastos = Utilidad neta) y que cada reporte operativo muestre números que coincidan con lo esperado.
