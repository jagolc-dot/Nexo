# Etapa 23 — Formato numérico, detalle de compras y reporte de Kardex — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **Este repo no tiene suite de pruebas automatizada** (no hay Jest/Vitest/pytest, no hay `tsx`). La verificación de cada tarea usa las herramientas reales del proyecto: `npx tsc -b` (typecheck), `npx oxlint` (lint), `npx vite build`, `node -e` para funciones puras, revisión de código, y — para UI detrás del login — prueba manual de Joel en beta (Claude no puede escribir contraseñas, política documentada). Se ejecuta inline en esta sesión o vía subagentes, a elección del usuario.

**Goal:** Unificar el formato numérico de toda la app (separador de miles + 2 decimales al mostrar, precisión interna intacta), ajustar el detalle de compra a "lo que ocurrió en esa compra", dar acceso con filtros y exportación al historial de compras, y agregar un reporte de Kardex multi-producto dentro de Inventario.

**Architecture:** Un módulo de helpers puros (`app/src/lib/formato.ts`) es la única fuente de formato numérico; todo `.toFixed()` y `toLocaleString()` disperso se reemplaza por llamadas a esos helpers. `exportar.ts` gana conciencia de tipo por columna para que PDF/Excel muestren separadores sin romper la sumabilidad en Excel. El reporte de Kardex se construye 100% con consultas desde el frontend leyendo `existencia_resultante`/`costo_promedio_resultante` ya registrados en `movimientos_inventario` (nunca recalcula). **Sin migración.**

**Tech Stack:** React 19 + TS + Tailwind v4, React Router v7, `@supabase/supabase-js`, `jspdf`/`jspdf-autotable` (PDF), `xlsx` desde `cdn.sheetjs.com` (Excel), `date-fns-tz` (`app/src/lib/tiempoNegocio.ts` para fechas). `Intl.NumberFormat('es-MX')` para el formato.

**Spec:** `23_formato_detalle_compras_kardex.md` (raíz del repo). El plan argumenta desde ese documento; léanse ambos.

## Global Constraints

- **Locale de formato:** `es-MX`. Moneda: prefijo `$`, separador de miles `,`, decimal `.`, **2 decimales** al mostrar (`$1,234.56`). Cantidades: separador de miles, **0 decimales** (`1,500`), son enteras.
- **Precisión interna intacta:** los cálculos, el costeo promedio ponderado (`fn_registrar_movimiento`) y el prorrateo de flete (`confirmar_compra`) ya viven en Postgres con `numeric(12,4)` y **no se tocan en esta etapa**. El redondeo es exclusivamente de presentación en el frontend.
- **Ningún campo envía cadenas con comas a la base.** El valor que llega a `.rpc()` / `.insert()` / `Number(...)` siempre es numérico limpio.
- **Excepción de decimales (A.2):** en `CompraFormPage`, el costo unitario calculado al vuelo (`costo_total / cantidad`) se muestra con `formatearMonedaPrecisa` (hasta 4 decimales, sin ceros de relleno sobrantes) para que el usuario verifique contra su factura. Todo lo demás: 2 decimales.
- **Porcentajes y conteos de "N citas / N ventas" NO son importes ni cantidades de inventario** — se dejan como están (`45%`, `3 ventas`).
- **Regla de errores (Etapa 22, permanente):** todo `catch` hace `console.error(err)` y muestra `err instanceof Error ? err.message : '<fallback concreto>'`. Nunca un mensaje genérico fijo.
- **Aislamiento de negocio:** toda consulta nueva filtra por `negocio_id` del negocio activo; el Kardex nunca mezcla negocios.
- **Sin migración.** Si algún paso parece necesitar cambio de esquema, **parar y reportar** al usuario antes de continuar (procedimiento paso 2).
- **No desplegar a producción** hasta el gate (Task 15), que está entrelazado con el gate pendiente de Etapa 21+22 — ver Task 15.

---

## Mapa de archivos

**Nuevos:**
- `app/src/lib/formato.ts` (ya existe con `formatearDuracion`; se extiende) — helpers de formato numérico.
- `app/src/components/ui/CampoMoneda.tsx` — input controlado de dinero con separador al teclear.
- `app/src/pages/inventario/KardexReportePage.tsx` — reporte de Kardex multi-producto (D).
- `app/src/components/reportes/TablaKardex.tsx` — render de la tabla de 3 bloques + exportación.

**Modificados (formato — Tasks 4–8):**
- `app/src/lib/exportar.ts` — `exportarPDF`/`exportarExcel` con formato por columna.
- Inventario: `AlmacenesPage.tsx`, `AlmacenDetallePage.tsx`, `KardexProductoPage.tsx`, `ComprasPage.tsx`, `CompraDetallePage.tsx`, `CompraFormPage.tsx`, `components/reportes/InventarioActualView.tsx`.
- Ventas: `VentaNuevaPage.tsx`, `VentaDetallePage.tsx`, `VentasHistorialPage.tsx`.
- Gastos/Catálogo/Clientes: `GastosPage.tsx`, `CatalogoPage.tsx`, `ItemDetallePage.tsx`, `ClientesPage.tsx`, `ClienteDetallePage.tsx`.
- Dashboard/Agenda: `DashboardPage.tsx`, `InicioAgendaPanel.tsx`, `AgendaPage.tsx`, `FinalizarCitaPage.tsx`.
- Reportes: `ReportesPage.tsx` (incluye los arrays de exportación del Estado de Resultados).

**Modificados (funcionalidad — Tasks 9–13):**
- `app/src/lib/inventario.ts` — `obtenerCompraConPartidas` (columnas B.2), `listarCompras` (filtros), `reporteKardex` (nuevo).
- `app/src/pages/inventario/CompraDetallePage.tsx` — columnas B.2.
- `app/src/pages/inventario/ComprasPage.tsx` — filtros fecha/proveedor + export.
- `app/src/pages/inventario/CompraFormPage.tsx` — botón "Agregar partida" (C) + `CampoMoneda`.
- `app/src/pages/inventario/AlmacenesPage.tsx` — botón "Reporte de Kardex".
- `app/src/App.tsx` — ruta `/inventario/kardex`.
- `app/src/types.ts` — tipos nuevos para partida con código/categoría/unidad y para el reporte de Kardex.

---

## Task 1: Helpers de formato numérico (`formato.ts`)

**Files:**
- Modify: `app/src/lib/formato.ts` (append; conserva `formatearDuracion`)

**Interfaces:**
- Produces:
  - `formatearMoneda(n: number, opciones?: { decimales?: number; signo?: boolean }): string` — `$1,234.56`. `decimales` default `2`. `signo: true` antepone `−` para negativos y nunca usa paréntesis. `NaN`/`null`/`undefined` → `'$0.00'`.
  - `formatearMonedaPrecisa(n: number): string` — 2 a 4 decimales: usa 2 si `n` ya es exacto a 2, si no hasta 4 significativos. Ej. `100 → '$100.00'`, `333.3333 → '$333.3333'`, `12.5 → '$12.50'`.
  - `formatearCantidad(n: number): string` — `1,500`. 0 decimales, separador de miles. `NaN`/`null` → `'0'`.
  - `formatearNumero(n: number, decimales: number): string` — sin prefijo `$`, separador de miles, `decimales` fijos. Base compartida.
  - `parsearNumero(texto: string): number` — quita todo lo que no sea dígito, `.` o `-`; `'1,234.56' → 1234.56`, `'' → NaN`. Para inputs.

- [ ] **Step 1: Escribir los helpers**

```ts
// --- Formato numérico (Etapa 23) -------------------------------------------
// Única fuente de formato de dinero y cantidades. La precisión interna vive
// en la base (numeric(12,4)); aquí solo se redondea para mostrar.

const nfEntero = new Intl.NumberFormat('es-MX', { minimumFractionDigits: 0, maximumFractionDigits: 0 })

function nf(decimales: number): Intl.NumberFormat {
  return new Intl.NumberFormat('es-MX', { minimumFractionDigits: decimales, maximumFractionDigits: decimales })
}

export function formatearNumero(n: number, decimales: number): string {
  if (n == null || Number.isNaN(n)) return decimales > 0 ? (0).toFixed(decimales) : '0'
  return nf(decimales).format(n)
}

export function formatearMoneda(n: number, opciones: { decimales?: number; signo?: boolean } = {}): string {
  const decimales = opciones.decimales ?? 2
  const valor = n == null || Number.isNaN(n) ? 0 : n
  if (opciones.signo && valor < 0) return `−$${formatearNumero(Math.abs(valor), decimales)}`
  return `$${formatearNumero(valor, decimales)}`
}

export function formatearMonedaPrecisa(n: number): string {
  const valor = n == null || Number.isNaN(n) ? 0 : n
  const red2 = Math.round(valor * 100) / 100
  if (red2 === valor) return formatearMoneda(valor, { decimales: 2 })
  // hasta 4 decimales, recortando ceros de relleno pero conservando mínimo 2
  const s = valor.toFixed(4).replace(/(\.\d\d)(\d*?)0+$/, '$1$2').replace(/\.$/, '')
  const [ent, dec = ''] = s.split('.')
  return `$${nfEntero.format(Number(ent))}${dec ? '.' + dec : ''}`
}

export function formatearCantidad(n: number): string {
  if (n == null || Number.isNaN(n)) return '0'
  return nfEntero.format(Math.round(n))
}

export function parsearNumero(texto: string): number {
  const limpio = texto.replace(/[^\d.-]/g, '')
  if (limpio === '' || limpio === '-' || limpio === '.') return NaN
  return Number(limpio)
}
```

- [ ] **Step 2: Verificar con `node -e` (funciones puras, sin runner)**

Compilar mentalmente no basta; ejecutar los casos frontera. Desde `app/`:

```bash
node --input-type=module -e "
const nfEntero = new Intl.NumberFormat('es-MX',{minimumFractionDigits:0,maximumFractionDigits:0});
const nf=(d)=>new Intl.NumberFormat('es-MX',{minimumFractionDigits:d,maximumFractionDigits:d});
const fMon=(n,d=2)=>'\$'+nf(d).format(Number.isNaN(n)||n==null?0:n);
const fCant=(n)=>Number.isNaN(n)||n==null?'0':nfEntero.format(Math.round(n));
console.log(fMon(1234.5),'=> \$1,234.50');
console.log(fMon(100.0000),'=> \$100.00');
console.log(fMon(-50,2),'=> \$-50.00 (signo:false)');
console.log(fCant(1500),'=> 1,500');
console.log(fCant(NaN),'=> 0');
"
```
Expected: cada línea coincide con su comentario `=>`.

- [ ] **Step 3: `npx tsc -b` limpio**

Run: `cd app && npx tsc -b`
Expected: sin errores.

- [ ] **Step 4: Commit**

```bash
git add app/src/lib/formato.ts
git commit -m "Etapa 23: helpers centrales de formato numerico (formato.ts)"
```

---

## Task 2: `exportar.ts` con formato por columna

**Files:**
- Modify: `app/src/lib/exportar.ts`
- Modify: `app/src/components/reportes/TablaReporte.tsx` (pasa `formatos` opcional)

**Interfaces:**
- Consumes: `formatearMoneda`, `formatearCantidad` de Task 1.
- Produces:
  - `type FormatoColumna = 'moneda' | 'cantidad' | 'texto'`
  - `exportarPDF(titulo: string, columnas: string[], filas: (string | number)[][], formatos?: FormatoColumna[]): void`
  - `exportarExcel(titulo: string, columnas: string[], filas: (string | number)[][], formatos?: FormatoColumna[]): void`
  - En PDF: las celdas `'moneda'`/`'cantidad'` se muestran ya formateadas como texto. En Excel: se emiten como **número** con `z` (`'#,##0.00'` moneda, `'#,##0'` cantidad) para que sigan siendo sumables. Sin `formatos`, comportamiento idéntico al actual (todo texto).
  - Las filas siguen recibiendo **números crudos** en las columnas de dinero/cantidad; `exportar.ts` decide la representación. Los llamadores dejan de pre-formatear con `.toFixed()`.

- [ ] **Step 1: Reescribir `exportar.ts`**

```ts
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import * as XLSX from 'xlsx'
import { formatearCantidad, formatearMoneda } from './formato'

export type FormatoColumna = 'moneda' | 'cantidad' | 'texto'

function textoCelda(valor: string | number, formato: FormatoColumna): string {
  if (typeof valor === 'number') {
    if (formato === 'moneda') return formatearMoneda(valor)
    if (formato === 'cantidad') return formatearCantidad(valor)
    return String(valor)
  }
  return valor
}

export function exportarPDF(
  titulo: string, columnas: string[], filas: (string | number)[][], formatos: FormatoColumna[] = [],
) {
  const doc = new jsPDF()
  doc.text(titulo, 14, 14)
  autoTable(doc, {
    head: [columnas],
    body: filas.map((f) => f.map((c, i) => textoCelda(c, formatos[i] ?? 'texto'))),
    startY: 20,
  })
  doc.save(`${titulo}.pdf`)
}

export function exportarExcel(
  titulo: string, columnas: string[], filas: (string | number)[][], formatos: FormatoColumna[] = [],
) {
  const aoa: (string | number)[][] = [columnas, ...filas]
  const hoja = XLSX.utils.aoa_to_sheet(aoa)
  // aplica número + formato a celdas de dinero/cantidad
  for (let r = 0; r < filas.length; r++) {
    for (let c = 0; c < columnas.length; c++) {
      const formato = formatos[c] ?? 'texto'
      const valor = filas[r][c]
      if (typeof valor !== 'number' || formato === 'texto') continue
      const ref = XLSX.utils.encode_cell({ r: r + 1, c })
      hoja[ref] = { t: 'n', v: valor, z: formato === 'moneda' ? '"$"#,##0.00' : '#,##0' }
    }
  }
  const libro = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(libro, hoja, 'Reporte')
  XLSX.writeFile(libro, `${titulo}.xlsx`)
}
```

- [ ] **Step 2: `TablaReporte` acepta y reenvía `formatos`**

En `app/src/components/reportes/TablaReporte.tsx`: agregar `formatos?: FormatoColumna[]` a las props, importarlo de `../../lib/exportar`, pasarlo a `exportarPDF`/`exportarExcel`. En el render de `<td>`, cuando la celda es `number` y `formatos[j]` es `'moneda'`/`'cantidad'`, mostrar `formatearMoneda`/`formatearCantidad`; si no, `String(c)`.

```tsx
import { exportarExcel, exportarPDF, type FormatoColumna } from '../../lib/exportar'
import { formatearCantidad, formatearMoneda } from '../../lib/formato'
// props: { titulo, columnas, filas, formatos = [] as FormatoColumna[] }
function celda(c: string | number, f: FormatoColumna) {
  if (typeof c === 'number') return f === 'moneda' ? formatearMoneda(c) : f === 'cantidad' ? formatearCantidad(c) : String(c)
  return c
}
// <td>{celda(c, formatos[j] ?? 'texto')}</td>
// botones: onClick={() => exportarPDF(titulo, columnas, filas, formatos)}
```

- [ ] **Step 3: `npx tsc -b` y `npx oxlint` limpios**

Run: `cd app && npx tsc -b && npx oxlint`
Expected: sin errores; los llamadores actuales de `TablaReporte`/`exportar` siguen compilando (los `formatos` son opcionales). Nota: `AlmacenDetallePage` e `InventarioActualView` hoy pasan strings pre-formateados; se corrigen en Tasks 4 y 8, no aquí.

- [ ] **Step 4: Commit**

```bash
git add app/src/lib/exportar.ts app/src/components/reportes/TablaReporte.tsx
git commit -m "Etapa 23: exportacion PDF/Excel con formato por columna"
```

---

## Task 3: `CampoMoneda` + formulario de compra (inputs de dinero + botón "Agregar partida")

**Files:**
- Create: `app/src/components/ui/CampoMoneda.tsx`
- Modify: `app/src/pages/inventario/CompraFormPage.tsx`

**Interfaces:**
- Consumes: `parsearNumero`, `formatearNumero`, `formatearMonedaPrecisa` de Task 1.
- Produces:
  - `CampoMoneda(props: { valor: string; onChange: (limpio: string) => void; id?: string; placeholder?: string; className?: string }): JSX.Element`
  - `valor` y `onChange` manejan **siempre la cadena numérica limpia** (`"1234.56"`, sin comas). El componente muestra `formatearNumero` con separadores mientras el campo no tiene foco o tras cada tecla válida; internamente permite escribir el punto decimal y hasta 2 decimales.
  - Prefijo `$` fijo a la izquierda. `inputMode="decimal"`. Área táctil ≥ 44px (`min-h-11`).

- [ ] **Step 1: Escribir `CampoMoneda.tsx`**

```tsx
import { useState, type ChangeEvent } from 'react'
import { formatearNumero, parsearNumero } from '../../lib/formato'

interface Props {
  valor: string
  onChange: (limpio: string) => void
  id?: string
  placeholder?: string
  className?: string
}

/** Muestra el número con separador de miles mientras se teclea; entrega
 *  a `onChange` siempre la cadena limpia sin comas. */
export function CampoMoneda({ valor, onChange, id, placeholder, className = '' }: Props) {
  const [foco, setFoco] = useState(false)

  function mostrar(): string {
    if (valor === '' || valor === '-') return valor
    if (foco && /[.]\d{0,2}$/.test(valor) && valor.endsWith('.')) {
      // usuario acaba de teclear el punto: no reformatear todavía
      const entero = valor.slice(0, -1)
      return `${formatearNumero(Number(entero), 0)}.`
    }
    const n = Number(valor)
    if (Number.isNaN(n)) return valor
    const [, dec] = valor.split('.')
    return dec !== undefined ? `${formatearNumero(Math.trunc(n), 0)}.${dec.slice(0, 2)}` : formatearNumero(n, 0)
  }

  function handle(e: ChangeEvent<HTMLInputElement>) {
    const limpio = e.target.value.replace(/[^\d.]/g, '')
    // un solo punto, máximo 2 decimales
    const partes = limpio.split('.')
    const normalizado = partes.length > 1 ? `${partes[0]}.${partes.slice(1).join('').slice(0, 2)}` : limpio
    onChange(normalizado)
  }

  return (
    <div
      className={`flex min-h-11 w-full items-center rounded-[10px] border bg-[var(--color-superficie)] px-3 text-sm text-[var(--color-texto)] focus-within:border-[var(--color-primario)] ${className}`}
      style={{ borderColor: 'var(--color-borde-campo)' }}
    >
      <span className="mr-1 text-[var(--color-texto-suave)]">$</span>
      <input
        id={id}
        inputMode="decimal"
        placeholder={placeholder}
        value={mostrar()}
        onChange={handle}
        onFocus={() => setFoco(true)}
        onBlur={() => setFoco(false)}
        className="min-w-0 flex-1 bg-transparent outline-none"
      />
    </div>
  )
}
```

- [ ] **Step 2: Usar `CampoMoneda` en `CompraFormPage`**

- Reemplazar el `<input type="number" step="0.01">` de **"Costo total"** de cada partida por `<CampoMoneda valor={p.costoPartida} onChange={(v) => actualizarPartida(i, { costoPartida: v })} />`.
- Reemplazar el bloque manual de **"Costo de envío"** (líneas ~191-201) por `<CampoMoneda valor={costoEnvio} onChange={setCostoEnvio} />`.
- El `handleSubmit` ya hace `Number(p.costoPartida)` y `Number(costoEnvio)` — con cadenas limpias sigue siendo correcto. Verificar que ningún `Number(...)` reciba comas (no las recibe: `CampoMoneda` entrega limpio).
- El display en vivo del costo unitario (línea ~175): cambiar `${costoUnitario.toFixed(4)}` por `{formatearMonedaPrecisa(costoUnitario)}` (excepción A.2 — el usuario coteja contra factura).
- **Cantidad** (`<input type="number" min="1">`): se deja como está — es entrada de cantidad, sin separador durante la captura (A.1). Solo asegurar que no acepte decimales: agregar `step="1"` y en `actualizarPartida` no hace falta más (el RPC valida entero).

- [ ] **Step 3: Botón "Agregar partida" (sección C)**

Reemplazar (línea ~185):
```tsx
<button type="button" onClick={agregarPartida} className="self-start text-xs text-[var(--color-texto-suave)] underline">
  + Agregar partida
</button>
```
por un botón secundario del sistema con área táctil ≥ 44px:
```tsx
<Button type="button" variante="secundario" onClick={agregarPartida} className="self-start">
  + Agregar partida
</Button>
```
(`Button` ya se importa en el archivo; `BASE` incluye `min-h-11`.)

- [ ] **Step 4: Verificar build + arranque local**

Run: `cd app && npx tsc -b && npx oxlint && npx vite build`
Expected: sin errores.
Luego `preview_start` → navegar a `/inventario/compras/nueva` (llega al login; Claude verifica hasta ahí). El typecheck + build cubren la integración; la prueba funcional del tecleo la hace Joel en Task 14.

- [ ] **Step 5: Commit**

```bash
git add app/src/components/ui/CampoMoneda.tsx app/src/pages/inventario/CompraFormPage.tsx
git commit -m "Etapa 23: CampoMoneda con separador al teclear + boton Agregar partida (seccion C)"
```

---

## Task 4: Barrido de formato — pantallas de Inventario

**Files:**
- Modify: `app/src/pages/inventario/AlmacenesPage.tsx`, `AlmacenDetallePage.tsx`, `KardexProductoPage.tsx`, `ComprasPage.tsx`, `CompraDetallePage.tsx`
- Modify: `app/src/components/reportes/InventarioActualView.tsx`

**Interfaces:**
- Consumes: `formatearMoneda`, `formatearCantidad` (Task 1); `FormatoColumna` (Task 2).

**Regla mecánica del barrido (aplica a Tasks 4–8):**
1. `import { formatearMoneda, formatearCantidad } from '<ruta>/lib/formato'`.
2. Importe monetario que hoy es `${x.toFixed(2)}` o `${x.toFixed(0)}` → `{formatearMoneda(x)}` (2 decimales salvo que sea etiqueta de gráfica, ver abajo).
3. Cantidad de inventario (existencias, unidades, piezas) que hoy se imprime cruda → `{formatearCantidad(x)}`.
4. Helper local `moneda()`/`fmt()` dentro de un archivo → borrarlo y usar el central.
5. Filas que se pasan a `TablaReporte`/`exportar`: dejar el **número crudo** en la celda y declarar `formatos={[...]}` con `'moneda'`/`'cantidad'`/`'texto'` por columna. Quitar el `.toFixed()` de la construcción de filas.
6. **Etiquetas de barras/ejes de gráfica** (contexto compacto): `formatearMoneda(x, { decimales: 0 })` — separador de miles, sin decimales. Solo en gráficas; tablas y detalle siempre 2.
7. Porcentajes, "N ventas", "Quedan N" de agotamiento: **no tocar**.

- [ ] **Step 1: `AlmacenesPage.tsx`**
  - `${valorTotal.toFixed(0)}` (tarjeta de valor total) → `{formatearMoneda(valorTotal)}` (2 decimales, A.2).
  - `{unidadesTotales}` → `{formatearCantidad(unidadesTotales)}`. `{enCero}` (conteo de productos) → `{formatearCantidad(enCero)}` por consistencia.
- [ ] **Step 2: `AlmacenDetallePage.tsx`**
  - Construcción de `filas` (líneas ~44-59): quitar `.toFixed(2)` de `costo_promedio` y del valor total; dejar números crudos.
  - Pasar a `<TablaReporte>` `formatos={['texto','texto','texto','texto','cantidad','moneda','moneda']}` (Código, Producto, Categoría, Unidad, Existencia, Costo promedio, Valor total).
  - Existencias en los chips / textos sueltos → `formatearCantidad`.
- [ ] **Step 3: `KardexProductoPage.tsx`**
  - Tabla de movimientos: `costo_unitario`, `costo_promedio_resultante` → `formatearMoneda`; `cantidad`, `existencia_resultante` → `formatearCantidad` (la cantidad puede venir con signo; `formatearCantidad` respeta el signo vía `Math.round` — verificar que `-3 → '-3'`; si no, anteponer signo manual).
  - Bloque de previsualización de recosteo (existencia/costo actual vs recalculado) → mismos helpers.
- [ ] **Step 4: `ComprasPage.tsx`**
  - `${c.total.toFixed(2)}` → `{formatearMoneda(c.total)}`.
- [ ] **Step 5: `CompraDetallePage.tsx`**
  - `$${p.costo_total_partida.toFixed(2)}` → `{formatearMoneda(p.costo_total_partida)}`.
  - `$${p.flete_asignado.toFixed(4)}` y `$${p.costo_unitario_final.toFixed(4)}` → `{formatearMoneda(...)}` (2 decimales; el detalle de compra **no** es la excepción A.2 — esa es solo el formulario en vivo).
  - `p.cantidad` → `{formatearCantidad(p.cantidad)}`.
  - Subtotal / Envío / Total → `formatearMoneda`.
  - (Las columnas nuevas de B.2 se agregan en Task 9; aquí solo el formato de lo que ya existe.)
- [ ] **Step 6: `InventarioActualView.tsx`**
  - El `.toFixed(2)` de `costo_promedio` en la construcción de filas → número crudo + `formatos` en el `<TablaReporte>` correspondiente.
- [ ] **Step 7: Verificar**

Run: `cd app && npx tsc -b && npx oxlint && npx vite build`
Expected: sin errores.

- [ ] **Step 8: Commit**

```bash
git add app/src/pages/inventario app/src/components/reportes/InventarioActualView.tsx
git commit -m "Etapa 23: formato numerico en pantallas de Inventario"
```

---

## Task 5: Barrido de formato — Ventas

**Files:**
- Modify: `app/src/pages/VentaNuevaPage.tsx`, `VentaDetallePage.tsx`, `VentasHistorialPage.tsx`

**Interfaces:** Consumes `formatearMoneda`, `formatearCantidad` (Task 1).

- [ ] **Step 1: `VentaNuevaPage.tsx`** — subtotales, precios unitarios, total del carrito: todo `.toFixed(2)` monetario → `formatearMoneda`. Inputs de cantidad de producto: dejar como están (captura sin separador). Si hay input de precio/pago manual editable, **no** se convierte a `CampoMoneda` en esta etapa (decisión del usuario: `CampoMoneda` solo en compras) — solo se formatea el display, el input queda como `type="number"`.
- [ ] **Step 2: `VentaDetallePage.tsx`** — líneas de venta (precio unit., importe), total, método de pago: `formatearMoneda`. Cantidades vendidas: `formatearCantidad`.
- [ ] **Step 3: `VentasHistorialPage.tsx`** — columna de total por venta: `formatearMoneda`.
- [ ] **Step 4: Verificar**

Run: `cd app && npx tsc -b && npx oxlint && npx vite build`
Expected: sin errores.

- [ ] **Step 5: Commit**

```bash
git add app/src/pages/VentaNuevaPage.tsx app/src/pages/VentaDetallePage.tsx app/src/pages/VentasHistorialPage.tsx
git commit -m "Etapa 23: formato numerico en Ventas"
```

---

## Task 6: Barrido de formato — Gastos, Catálogo, Clientes

**Files:**
- Modify: `app/src/pages/GastosPage.tsx`, `CatalogoPage.tsx`, `ItemDetallePage.tsx`, `ClientesPage.tsx`, `ClienteDetallePage.tsx`

**Interfaces:** Consumes `formatearMoneda`, `formatearCantidad` (Task 1).

- [ ] **Step 1: `GastosPage.tsx`** — montos de gasto (2 `.toFixed`) → `formatearMoneda`. Input de monto al crear gasto: display formateado si aplica, input queda `type="number"` (no `CampoMoneda`).
- [ ] **Step 2: `CatalogoPage.tsx`** — precio de servicio/producto (`.toFixed`) → `formatearMoneda`.
- [ ] **Step 3: `ItemDetallePage.tsx`** — precio, costo estándar, existencia/costo promedio de solo lectura (3 `.toFixed`) → `formatearMoneda` / `formatearCantidad`.
- [ ] **Step 4: `ClientesPage.tsx`** — consumo acumulado (`.toFixed`) → `formatearMoneda`.
- [ ] **Step 5: `ClienteDetallePage.tsx`** — gasto acumulado, importes del historial (3 `.toFixed`) → `formatearMoneda`.
- [ ] **Step 6: Verificar**

Run: `cd app && npx tsc -b && npx oxlint && npx vite build`
Expected: sin errores.

- [ ] **Step 7: Commit**

```bash
git add app/src/pages/GastosPage.tsx app/src/pages/CatalogoPage.tsx app/src/pages/ItemDetallePage.tsx app/src/pages/ClientesPage.tsx app/src/pages/ClienteDetallePage.tsx
git commit -m "Etapa 23: formato numerico en Gastos, Catalogo y Clientes"
```

---

## Task 7: Barrido de formato — Dashboard y Agenda

**Files:**
- Modify: `app/src/pages/DashboardPage.tsx`, `InicioAgendaPanel.tsx`, `AgendaPage.tsx`, `FinalizarCitaPage.tsx`

**Interfaces:** Consumes `formatearMoneda`, `formatearCantidad` (Task 1).

- [ ] **Step 1: `DashboardPage.tsx`**
  - Borrar el helper local `moneda()` (líneas ~29-30) y reemplazar sus usos por `formatearMoneda(x, { decimales: 0, signo: true })` (el dashboard usa cifras redondas con signo `−`).
  - `cambioUtilidad.toFixed(0)%`, `cambioIngresos.toFixed(0)%`, `tasaCancelacion`: **no tocar** (porcentajes).
  - `Quedan ${p.existencia}` → `Quedan {formatearCantidad(p.existencia)}`.
- [ ] **Step 2: `InicioAgendaPanel.tsx`** — importes (4 `.toFixed`) → `formatearMoneda`.
- [ ] **Step 3: `AgendaPage.tsx`** — importes del panel de historial de clienta (3 `.toFixed`) → `formatearMoneda`.
- [ ] **Step 4: `FinalizarCitaPage.tsx`** — precios de servicios al confirmar (6 `.toFixed`) → `formatearMoneda`.
- [ ] **Step 5: Verificar**

Run: `cd app && npx tsc -b && npx oxlint && npx vite build`
Expected: sin errores.

- [ ] **Step 6: Commit**

```bash
git add app/src/pages/DashboardPage.tsx app/src/pages/InicioAgendaPanel.tsx app/src/pages/AgendaPage.tsx app/src/pages/FinalizarCitaPage.tsx
git commit -m "Etapa 23: formato numerico en Dashboard y Agenda"
```

---

## Task 8: Barrido de formato — Reportes y Estado de Resultados

**Files:**
- Modify: `app/src/pages/ReportesPage.tsx`

**Interfaces:** Consumes `formatearMoneda` (Task 1); `FormatoColumna` (Task 2).

- [ ] **Step 1: Etiquetas de gráfica** (líneas ~144, 158, 179, 210, 253, 302-303, 333, 680, 687, 695)
  - `${b.valor.toFixed(0)}` → `{formatearMoneda(b.valor, { decimales: 0 })}`.
  - `−${Math.abs(b.valor).toFixed(0)}` → `{formatearMoneda(b.valor, { decimales: 0, signo: true })}`.
  - `margen ${l.margen.toFixed(0)}` → `margen {formatearMoneda(l.margen, { decimales: 0 })}`.
  - `margenPct.toFixed(0)%` y demás `%`: **no tocar**.
- [ ] **Step 2: Arrays de exportación del Estado de Resultados** (líneas ~449-458)
  - Quitar `.toFixed(2)` de cada valor; dejar el número crudo.
  - En la llamada a `exportarPDF`/`exportarExcel` (o `TablaReporte`), pasar `formatos` = `['texto', 'moneda']` (concepto, importe).
- [ ] **Step 3: Arrays de exportación de reportes operativos** (líneas ~469-490)
  - Filas de ventas/costos/márgenes/gastos: números crudos + `formatos` por columna (`'texto'` fecha/concepto/categoría, `'moneda'` importes).
- [ ] **Step 4: Fila de inventario exportada** (línea ~713)
  - `f.costo_promedio.toFixed(2)` → número crudo; `f.existencia` ya es número; `formatos={['texto','texto','texto','cantidad','moneda']}`.
- [ ] **Step 5: Verificar — los números del Estado de Resultados NO cambian de valor**

Run: `cd app && npx tsc -b && npx oxlint && npx vite build`
Expected: sin errores.
Revisión de código: confirmar que solo cambió la representación (formato), nunca el cálculo — `datos.*` viene de `reportes.ts`, intocado. El Estado de Resultados (Etapa 19) debe dar los mismos importes, solo con `,` y 2 decimales.

- [ ] **Step 6: Commit**

```bash
git add app/src/pages/ReportesPage.tsx
git commit -m "Etapa 23: formato numerico en Reportes y Estado de Resultados"
```

---

## Task 9: Detalle de compra — columnas B.2

**Files:**
- Modify: `app/src/lib/inventario.ts` (`obtenerCompraConPartidas`)
- Modify: `app/src/types.ts` (`PartidaCompraConNombre` gana campos)
- Modify: `app/src/pages/inventario/CompraDetallePage.tsx`

**Interfaces:**
- Consumes: `formatearMoneda`, `formatearCantidad` (Task 1).
- Produces:
  - `PartidaCompraConNombre` = `CompraPartida & { nombre: string; codigo: string | null; categoria: string | null; unidad: string | null }`.
  - `obtenerCompraConPartidas` devuelve esos campos por partida, resolviendo desde `items` (producto sin variante) o `variantes_item → items` (variante): `codigo` de la variante o del item; `categoria` del item vía `categorias_item(nombre)`; `unidad` del item.

- [ ] **Step 1: Ampliar el `select` y el mapeo en `obtenerCompraConPartidas`**

```ts
// select:
'*, items(nombre, codigo, unidad, categorias_item(nombre)), variantes_item(codigo, color, talla, items(nombre, unidad, categorias_item(nombre)))'

// tipo Fila:
type Fila = CompraPartida & {
  items: { nombre: string; codigo: string | null; unidad: string | null; categorias_item: { nombre: string } | null } | null
  variantes_item: {
    codigo: string | null; color: string | null; talla: string | null
    items: { nombre: string; unidad: string | null; categorias_item: { nombre: string } | null }
  } | null
}

// mapeo por partida:
const it = p.items ?? p.variantes_item?.items ?? null
return {
  ...p,
  nombre: p.items
    ? p.items.nombre
    : `${p.variantes_item?.items.nombre} (${[p.variantes_item?.color, p.variantes_item?.talla].filter(Boolean).join(' / ')})`,
  codigo: p.items ? p.items.codigo : p.variantes_item?.codigo ?? null,
  categoria: it?.categorias_item?.nombre ?? null,
  unidad: it?.unidad ?? null,
}
```

- [ ] **Step 2: `types.ts`** — mover `PartidaCompraConNombre` a `types.ts` (o ampliarlo donde vive en `inventario.ts`) con los 3 campos nuevos.

- [ ] **Step 3: Tabla de `CompraDetallePage` con las columnas B.2**

Cabeceras: `['Código', 'Producto', 'Categoría', 'Unidad', 'Cantidad', 'Costo total partida', 'Flete asignado', 'Costo unitario final']`.
Por fila: `p.codigo ?? '—'`, `p.nombre`, `p.categoria ?? '—'`, `p.unidad ?? '—'`, `formatearCantidad(p.cantidad)`, `formatearMoneda(p.costo_total_partida)`, `formatearMoneda(p.flete_asignado)`, `formatearMoneda(p.costo_unitario_final)`.
El encabezado (proveedor, folio, fecha, subtotal, envío, total, estado) ya existe — verificar que estén los 7 y con `formatearMoneda` (hecho en Task 4 Step 5).

- [ ] **Step 4: Confirmar B.1 (no mostrar estado actual)**

Revisión de código: `CompraDetallePage` **no** consulta ni muestra `items.stock`, `costo_promedio` vigente ni valor de inventario. Hoy no lo hace; dejar constancia en el commit de que se verificó.

- [ ] **Step 5: Verificar**

Run: `cd app && npx tsc -b && npx oxlint && npx vite build`
Expected: sin errores. Prueba funcional (abrir una compra real, ver las 8 columnas) → Joel en Task 14.

- [ ] **Step 6: Commit**

```bash
git add app/src/lib/inventario.ts app/src/types.ts app/src/pages/inventario/CompraDetallePage.tsx
git commit -m "Etapa 23: detalle de compra con columnas codigo/categoria/unidad (B.2)"
```

---

## Task 10: Historial de compras — filtros y exportación (B.3)

**Files:**
- Modify: `app/src/pages/inventario/ComprasPage.tsx`
- Modify: `app/src/lib/inventario.ts` (`listarCompras` acepta rango; o filtrar en cliente)

**Interfaces:**
- Consumes: `formatearMoneda` (Task 1); `TablaReporte` con `formatos` (Task 2); `formatearFechaSolo` (`tiempoNegocio`).
- Produces: `listarCompras(negocioId: string, filtros?: { desde?: string; hasta?: string }): Promise<Compra[]>` — `desde`/`hasta` son `YYYY-MM-DD`; filtra por `compras.fecha`. El filtro por proveedor se hace en cliente (texto libre, `includes` case-insensitive).

- [ ] **Step 1: `listarCompras` con rango de fechas**

```ts
export async function listarCompras(negocioId: string, filtros: { desde?: string; hasta?: string } = {}): Promise<Compra[]> {
  let q = supabase.from('compras').select('*').eq('negocio_id', negocioId).order('fecha', { ascending: false })
  if (filtros.desde) q = q.gte('fecha', filtros.desde)
  if (filtros.hasta) q = q.lte('fecha', filtros.hasta)
  const { data, error } = await q
  if (error) throw error
  return data as Compra[]
}
```
Actualizar la llamada en `AlmacenDetallePage`/`AlmacenesPage` si existiera (no la hay; solo `ComprasPage` la usa).

- [ ] **Step 2: UI de filtros en `ComprasPage`**

- Dos `<input type="date">` (desde / hasta) — patrón de `ReportesPage`/`GastoFormPage`.
- Un `<input type="text">` "Proveedor" que filtra la lista en cliente.
- Estado `error` con mensaje real en el `catch` (regla Etapa 22): `setError(e instanceof Error ? e.message : 'No se pudo cargar el historial de compras.')`.
- Recargar `listarCompras` cuando cambian las fechas; el filtro de proveedor es puramente de render.

- [ ] **Step 3: Exportación PDF/Excel**

Envolver la lista (o agregar debajo) un `<TablaReporte>`:
Columnas `['Fecha', 'Proveedor', 'Folio', 'Estado', 'Total']`, `formatos={['texto','texto','texto','texto','moneda']}`.
Filas desde las compras **ya filtradas** (fecha + proveedor): `[formatearFechaSolo(c.fecha), c.proveedor ?? '—', c.folio ?? '—', c.estado, c.total]` (total como número crudo).

- [ ] **Step 4: Verificar**

Run: `cd app && npx tsc -b && npx oxlint && npx vite build`
Expected: sin errores.

- [ ] **Step 5: Commit**

```bash
git add app/src/pages/inventario/ComprasPage.tsx app/src/lib/inventario.ts
git commit -m "Etapa 23: historial de compras con filtros fecha/proveedor y exportacion (B.3)"
```

---

## Task 11: Reporte de Kardex — capa de datos (`reporteKardex`)

**Files:**
- Modify: `app/src/lib/inventario.ts`
- Modify: `app/src/types.ts`

**Interfaces:**
- Consumes: `MovimientoInventario`, `TipoMovimiento` (types).
- Produces (en `types.ts` + `inventario.ts`):

```ts
export type FiltroTipoKardex = 'compra' | 'venta' | 'ajuste' | 'cancelacion'

export interface RenglonKardex {
  movimiento_id: string
  fecha: string                 // ISO
  tipo: TipoMovimiento
  referencia_texto: string      // "Folio F-123" | "Venta 3 sep 2026" | "Ajuste: merma"
  referencia_link: string | null // "/inventario/compras/:id" | "/ventas/:id" | null
  entrada_cant: number | null
  entrada_cunit: number | null
  entrada_total: number | null
  salida_cant: number | null
  salida_cunit: number | null
  salida_total: number | null
  saldo_cant: number            // existencia_resultante (ya registrado)
  saldo_cprom: number           // costo_promedio_resultante (ya registrado)
  saldo_valor: number           // saldo_cant * saldo_cprom
}

export interface GrupoKardex {
  destino_id: string            // item_id o variante_id
  es_variante: boolean
  nombre: string                // "Anillo" | "Camisa Oxford (Azul / M)"
  codigo: string | null
  unidad: string | null
  saldo_inicial_cant: number
  saldo_inicial_cprom: number
  saldo_inicial_valor: number
  renglones: RenglonKardex[]
  total_entradas_cant: number
  total_salidas_cant: number
  saldo_final_cant: number
  saldo_final_valor: number
  existencia_actual: number     // de items.stock / variantes_item.existencia
  cuadra: boolean               // saldo_final_cant === existencia_actual
}

export interface ReporteKardex {
  desde: string
  hasta: string
  grupos: GrupoKardex[]
  algun_descuadre: boolean
}

export async function reporteKardex(
  negocioId: string,
  filtros: { desde: string; hasta: string; destinos: Array<{ itemId: string } | { varianteId: string }> | 'todos'; tipos: FiltroTipoKardex[] | 'todos' },
): Promise<ReporteKardex>
```

**Lógica (sin recálculo — D.4):**
1. Resolver la lista de destinos: si `'todos'`, usar `listarProductosInventario` → un destino por producto sin variante y uno por variante activa.
2. Para cada destino:
   a. **Saldo inicial** = `existencia_resultante` / `costo_promedio_resultante` del **último** movimiento con `fecha < desde` (orden `fecha desc, creado_en desc`, `limit 1`). Si no hay, `0` y `0`.
   b. **Renglones** = movimientos con `fecha >= desde` y `fecha <= hasta` (rango inclusivo; `hasta` se compara contra fin del día — usar `hasta + 'T23:59:59.999'` o `lt` del día siguiente), orden `fecha asc, creado_en asc`, filtrados por `tipos` (mapa: `compra`→`['compra']`, `venta`→`['venta']`, `ajuste`→`['ajuste','recosteo']`, `cancelacion`→`['cancelacion_venta','cancelacion_compra']`).
   c. Clasificar cada movimiento en entrada (`cantidad > 0`) o salida (`cantidad < 0`); `cunit` = `costo_unitario`, `total` = `abs(cantidad) * costo_unitario`.
   d. `saldo_*` del renglón = `existencia_resultante` / `costo_promedio_resultante` del propio movimiento (**tal cual, no recalculado**).
   e. Totales del grupo: suma de `abs(cantidad)` de entradas y de salidas; `saldo_final_cant` = `saldo_cant` del último renglón (o `saldo_inicial` si no hay renglones).
   f. `existencia_actual` de `items.stock` / `variantes_item.existencia`; `cuadra = saldo_final_cant === existencia_actual` **cuando el filtro de tipos es `'todos'` y `hasta >= hoy`** (si el usuario filtró por tipo o por fecha pasada, el "saldo final del reporte" legítimamente no es la existencia de hoy — en ese caso `cuadra` se marca `true` y se omite la advertencia, pero se muestra una nota "comparación de cuadre solo con filtros = todos y hasta hoy"). Ver D.5.
3. `referencia_texto` / `referencia_link` por tipo:
   - `compra` / `cancelacion_compra`: consultar `compras` por `referencia_id` → `Folio ${folio}` o `Compra ${formatearFechaSolo(fecha)}`; link `/inventario/compras/${referencia_id}`.
   - `venta` / `cancelacion_venta`: consultar `ventas` por `referencia_id` → `Venta ${formatearFechaSolo(fecha)}`; link `/ventas/${referencia_id}`.
   - `ajuste`: consultar `ajustes_inventario` por `referencia_id` → `Ajuste: ${tipo}` (+ `motivo` en tooltip); link `null`.
   - `recosteo`: `referencia_texto = 'Recosteo'`, link `null`.
   - Batchear: una consulta `in('id', [...])` por tabla, no una por renglón.

- [ ] **Step 1: Escribir `reporteKardex` y los tipos**

Implementar según la lógica de arriba. Un `catch` que re-lanza con mensaje real. Consultas por lote para referencias.

- [ ] **Step 2: `node -e` de humo sobre el mapeo de tipos**

Verificar la función pura de clasificación tipo→FiltroTipoKardex y entrada/salida con casos: `cantidad: 5, tipo: 'compra'` → entrada; `cantidad: -2, tipo: 'venta'` → salida; `tipo: 'recosteo'` incluido en filtro `'ajuste'`.

- [ ] **Step 3: `npx tsc -b` limpio**

Run: `cd app && npx tsc -b`

- [ ] **Step 4: Commit**

```bash
git add app/src/lib/inventario.ts app/src/types.ts
git commit -m "Etapa 23: capa de datos del reporte de Kardex (reporteKardex, sin recalculo)"
```

---

## Task 12: Reporte de Kardex — pantalla y navegación

**Files:**
- Create: `app/src/pages/inventario/KardexReportePage.tsx`
- Modify: `app/src/App.tsx` (ruta `/inventario/kardex`)
- Modify: `app/src/pages/inventario/AlmacenesPage.tsx` (botón)

**Interfaces:**
- Consumes: `reporteKardex`, tipos de Task 11; `formatearMoneda`, `formatearCantidad`. Para accesos rápidos de fecha: `calcularRango('mes')` y `calcularRango('año')` de `app/src/lib/periodos.ts` + `formatoFechaISO`; "mes anterior" se construye restando un mes al primer día del mes actual (patrón de `periodos.ts` case `'mes'`). Los `<input type="date">` ya se usan en `KardexProductoPage.tsx` y `GastoFormPage.tsx` — mismo patrón.
- Produces: `KardexReportePage` (default-exportada como named `export function KardexReportePage`).

- [ ] **Step 1: Ruta**

En `App.tsx`, dentro del `<Route element={<Layout />}>`, junto a las demás de `/inventario`:
```tsx
<Route path="/inventario/kardex" element={<KardexReportePage />} />
```
Import arriba con los otros de `./pages/inventario/`.

- [ ] **Step 2: Botón de acceso**

En `AlmacenesPage.tsx`, en la fila de acciones del encabezado (junto a "Historial de compras" / "Nueva compra"):
```tsx
<Link to="/inventario/kardex" className={claseBoton('secundario', '!min-h-10 px-3.5 text-[13px]')}>
  Reporte de Kardex
</Link>
```

- [ ] **Step 3: `KardexReportePage` — filtros (D.2)**

- Rango de fechas: dos `<input type="date">` + botones rápidos "Mes actual" / "Mes anterior" / "Año" que fijan `desde`/`hasta`.
- Productos: selección múltiple. Un `<select multiple>` o lista de checkboxes desde `listarProductosInventario` (mostrar producto y, para Don camisa, cada variante). Opción "Todo el inventario" (default).
- Tipo de movimiento: checkboxes `compra` / `venta` / `ajuste` / `cancelacion`, default todos.
- Botón "Generar reporte" → `reporteKardex(...)`. Estado `cargando`/`error`/`reporte`. `catch` con mensaje real.

- [ ] **Step 4: Render de resultados**

- Por cada `GrupoKardex`: encabezado con `nombre`, `codigo`, `unidad`; luego `<TablaKardex grupo={g} />` (Task 13).
- Si `reporte.algun_descuadre`: banner rojo arriba, visible, "El saldo final de N producto(s) no coincide con la existencia actual. Revisa: …" (D.5). Nunca silencioso.
- Botones "Exportar PDF" / "Exportar Excel" que llaman a los exportadores de Task 13 con el reporte completo.

- [ ] **Step 5: Verificar**

Run: `cd app && npx tsc -b && npx oxlint && npx vite build`
Expected: sin errores. Navegación a `/inventario/kardex` llega al login; el flujo real lo prueba Joel en Task 14.

- [ ] **Step 6: Commit**

```bash
git add app/src/pages/inventario/KardexReportePage.tsx app/src/App.tsx app/src/pages/inventario/AlmacenesPage.tsx
git commit -m "Etapa 23: pantalla del reporte de Kardex + acceso desde Inventario (D.1, D.2, D.5)"
```

---

## Task 13: Reporte de Kardex — tabla de 3 bloques y exportación

**Files:**
- Create: `app/src/components/reportes/TablaKardex.tsx`
- Modify: `app/src/lib/exportar.ts` (agregar `exportarKardexPDF` / `exportarKardexExcel` o un modo multi-sección)

**Interfaces:**
- Consumes: `GrupoKardex`, `ReporteKardex` (Task 11); `formatearMoneda`, `formatearCantidad`.
- Produces:
  - `TablaKardex(props: { grupo: GrupoKardex }): JSX.Element`
  - `exportarKardexPDF(reporte: ReporteKardex): void` y `exportarKardexExcel(reporte: ReporteKardex): void` — conservan los 3 bloques (D.6). Excel: una hoja, columnas numéricas con `z`; PDF: `autoTable` con cabecera de 2 filas (grupos Entradas/Salidas/Saldos + subcolumnas).

- [ ] **Step 1: `TablaKardex.tsx`**

Tabla con cabecera de dos niveles:
- Fila 1: `Movimiento` (rowspan 2), `Entradas` (colspan 3), `Salidas` (colspan 3), `Saldos` (colspan 3).
- Fila 2: `Cant. · C. unit. · Total` ×3.
Cuerpo:
- **Fila de saldo inicial**: `Saldo inicial al {desde}` en la col Movimiento, bloques Entradas/Salidas vacíos, Saldos = `saldo_inicial_cant` / `saldo_inicial_cprom` / `saldo_inicial_valor`.
- Un `<tr>` por `RenglonKardex`: fecha + tipo + `referencia_texto` (link si `referencia_link`); celdas de entrada o salida según corresponda (las del otro lado vacías); saldos del renglón.
- **Fila de totales**: `Totales` + `total_entradas_cant` / — / — + `total_salidas_cant` / — / — + `saldo_final_cant` / `saldo_final_cprom` (último) / `saldo_final_valor`.
- Debajo: línea de cuadre — si `grupo.cuadra` verde "Cuadra con la existencia actual ({existencia_actual})"; si no, roja "No cuadra: reporte {saldo_final_cant} vs existencia actual {existencia_actual}".
Montos con `formatearMoneda`, cantidades con `formatearCantidad`. Contenedor `overflow-x-auto`.

- [ ] **Step 2: Exportadores de Kardex**

`exportarKardexExcel(reporte)`: construir un AOA con, por grupo: fila de título del grupo, cabecera de 3 bloques, fila de saldo inicial, renglones, fila de totales, fila en blanco. Celdas numéricas con `{ t:'n', v, z }`. `exportarKardexPDF(reporte)`: por grupo un `autoTable` con `head` de dos filas y `body`; `doc.text` con el nombre del grupo antes de cada tabla; `didDrawPage` para el título general.

- [ ] **Step 3: Verificar**

Run: `cd app && npx tsc -b && npx oxlint && npx vite build`
Expected: sin errores.

- [ ] **Step 4: Commit**

```bash
git add app/src/components/reportes/TablaKardex.tsx app/src/lib/exportar.ts
git commit -m "Etapa 23: tabla de Kardex de 3 bloques con saldo inicial/totales y exportacion (D.3, D.6)"
```

---

## Task 14: Verificación integral en beta (Joel)

**Files:** ninguno (verificación).

- [ ] **Step 1: Build y lint finales**

Run: `cd app && npx tsc -b && npx oxlint && npx vite build`
Expected: sin errores; sin warnings nuevos de oxlint respecto a la línea base (`react-hooks/exhaustive-deps` y `only-export-components` preexistentes están permitidos).

- [ ] **Step 2: Push a `dev` y esperar deploy de Netlify beta**

```bash
git push origin dev
```

- [ ] **Step 3: Joel prueba en `shimmering-faloodeh-187309.netlify.app` (Don camisa activo)**

Checklist (marcar cada uno):
- [ ] **Formato:** dashboard, reportes, ventas, gastos, catálogo muestran `$1,234.56` y cantidades `1,500`. El Estado de Resultados da los mismos importes que antes, solo con separador.
- [ ] **Compra nueva:** el campo de costo de partida y el de envío agregan la coma sola al teclear (`1500` → `1,500`); el costo unitario en vivo muestra 4 decimales cuando hay resto (`333.3333`). Al guardar no hay error de conversión.
- [ ] **"Agregar partida"** se ve como botón con borde, no como enlace subrayado; se puede tocar cómodo en móvil.
- [ ] **Detalle de compra:** 8 columnas (Código, Producto, Categoría, Unidad, Cantidad, Costo total partida, Flete asignado, Costo unitario final). No aparece existencia ni costo promedio actual.
- [ ] **Historial de compras:** filtro por fecha y por proveedor funcionan; exportar PDF y Excel produce archivos con los mismos datos filtrados.
- [ ] **Reporte de Kardex:** botón visible en Inventario. Filtrar por mes actual + varios productos + todos los tipos. Cada producto tiene saldo inicial, movimientos, totales. El saldo final coincide con la existencia actual (línea verde). Forzar un descuadre no aplica hoy, pero si algún producto no cuadra debe salir el banner rojo.
- [ ] **Exportar Kardex** PDF y Excel conservan los 3 bloques.
- [ ] **No-regresión:** agendar/finalizar una cita, registrar una venta, cancelar una compra — todo sigue funcionando.

- [ ] **Step 4: Registrar el resultado**

Si Joel reporta un fallo, abrir sub-tarea de corrección antes de continuar al gate. Si aprueba, anotar "probado y aprobado en beta por Joel (fecha)" en este archivo.

---

## Task 15: Gate de producción

**Files:** ninguno (despliegue).

> **Clasificación:** Etapa 23 **no tiene migración** — solo frontend (presentación + consultas). No requiere `apply_migration` ni respaldo por cambio de esquema.
>
> **⚠️ Entrelazado con el gate pendiente de Etapa 21 + 22.** `main` no ha recibido nada desde la Etapa 20. Fusionar `dev` → `main` ahora arrastra: nav fix + Etapa 21 (Inventario, migraciones `0024`/`0025`) + Etapa 22 (`0026`) + Etapa 23. El deploy de `main` serviría UI de Inventario contra una base de producción que **todavía no tiene las tablas de Inventario**. Por eso Etapa 23 **no puede ir a producción sola**: primero hay que completar el gate de Etapa 21/22 (respaldo de producción → dry-run `0024`–`0026` → `apply_migration` a `mhxvtlccgpiaqtuspvfq` → verificar `v_cuadre_inventario`), y recién entonces fusionar todo el bloque acumulado a `main`.

- [ ] **Step 1:** Confirmación explícita de Joel de que probó Task 14 en beta y aprueba.
- [ ] **Step 2:** Ejecutar el **gate de Etapa 21/22** primero (su propio plan, Task 8 de `2026-08-21-modulo-inventario.md`): respaldo de producción, dry-run de `0024`/`0025`/`0026` contra `mhxvtlccgpiaqtuspvfq` envuelto en `begin; … rollback;` + `v_cuadre_inventario`, y si cuadra, `apply_migration` de las tres a producción.
- [ ] **Step 3:** `git fetch && git log origin/main..origin/dev --oneline` — revisar **toda** la lista, confirmar que cada commit está aprobado para producción (lección de la sección 4 de `ESTADO_PROYECTO.md`).
- [ ] **Step 4:** Fusionar `dev` → `main`, push.
- [ ] **Step 5:** Verificar que `nimble-liger-f94dc5.netlify.app` carga sin errores de consola; abrir Inventario, correr un reporte de Kardex, revisar el Estado de Resultados. (Nota: el usuario pidió acumular y desplegar a Netlify a partir del **4 de septiembre de 2026** — no forzar el deploy de producción antes salvo que lo indique.)
- [ ] **Step 6:** Actualizar `RESUMEN_MAESTRO.md` y `ESTADO_PROYECTO.md` al cierre.

---

## Autorrevisión contra la spec (Etapa 23)

| Requisito de la spec | Task |
|---|---|
| A.1 separador de miles en importes y cantidades (display) | 1, 4–8 |
| A.1 separador automático al teclear en campos monetarios (solo compras) | 3 (`CampoMoneda`) |
| A.1 cantidades sin reformateo durante la captura | 3 (Step 2, campo Cantidad sin cambios) |
| A.1 ningún valor con comas llega a la base | 1 (`parsearNumero`), 3 (`CampoMoneda` entrega limpio), 14 (Step 3) |
| A.2 todo importe a 2 decimales al mostrar | 1, 4–8 |
| A.2 precisión interna 4 decimales intacta | Global Constraints (SQL no se toca), 8 (Step 5) |
| A.2 excepción del costo unitario en el formulario de compra | 1 (`formatearMonedaPrecisa`), 3 (Step 2) |
| A.3 alcance: Inventario, compras, kardex, ventas, gastos, catálogo, dashboard, ER, exportaciones | 2 (exportaciones), 4 (Inv), 5 (Ventas), 6 (Gastos/Catálogo/Clientes), 7 (Dashboard/Agenda), 8 (Reportes/ER) |
| B.1 el detalle de compra no muestra estado actual del producto | 9 (Step 4) |
| B.2 columnas Código·Producto·Categoría·Unidad·Cantidad·Costo total·Flete·Costo unit. final | 9 |
| B.2 en Don camisa la partida identifica la variante | 9 (Step 1, mapeo variante) |
| B.2 encabezado con proveedor/folio/fecha/subtotal/envío/total/estado | 4 (Step 5) + 9 (Step 3 verifica) |
| B.3 botón a historial de compras dentro de Inventario | ya existe (commit `1ed2f4b`); 10 agrega filtros/export |
| B.3 filtros por fecha y proveedor + exportación PDF/Excel | 10 |
| C botón "Agregar partida" secundario, temático, ≥44px | 3 (Step 3) |
| D.1 Kardex dentro de Inventario, botón propio | 12 (Step 2) |
| D.2 filtros: rango de fechas con accesos rápidos, multi-producto, tipo de movimiento | 12 (Step 3) |
| D.3 estructura de 3 bloques | 13 (Step 1) |
| D.3 fila de saldo inicial | 11 (Step lógica a), 13 (Step 1) |
| D.3 fila de totales | 11 (e), 13 (Step 1) |
| D.3 referencia con enlace al documento origen | 11 (Step 3) |
| D.3 agrupación por producto en multi-selección | 11 (`grupos`), 12 (Step 4) |
| D.4 entradas recalculan promedio, salidas no; saldo tomado de lo registrado, sin recálculo | 11 (Step lógica c/d) |
| D.5 verificación de cuadre con advertencia visible | 11 (f), 12 (Step 4 banner), 13 (Step 1 línea de cuadre) |
| D.6 exportación PDF/Excel conservando los 3 bloques | 13 (Step 2) |
| Criterio: exportaciones reflejan lo que se ve | 2 (formato en export), 10, 13 |
| Procedimiento: clasificar migración / gate de producción | 15 |

**Placeholder scan:** sin "TBD"/"TODO"/"añadir manejo de errores" — cada `catch` referenciado especifica el patrón Etapa 22. Los barridos (Tasks 4–8) listan archivo + línea aproximada + regla mecánica + ejemplos representativos en vez de repetir 80 ediciones idénticas; cada uno se gatea por área.

**Type consistency:** `formatearMoneda(n, { decimales?, signo? })`, `formatearCantidad(n)`, `formatearMonedaPrecisa(n)`, `parsearNumero(s)`, `FormatoColumna`, `PartidaCompraConNombre` (+`codigo`/`categoria`/`unidad`), `reporteKardex(...)` → `ReporteKardex { grupos: GrupoKardex[] }` con `RenglonKardex` — nombres usados consistentes entre Tasks 1↔2↔9↔11↔12↔13.
