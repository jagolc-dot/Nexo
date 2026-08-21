# Módulo de Inventario (Etapa 21) — Plan de implementación

> **Para ejecución:** este repo no tiene suite de pruebas automatizada (no hay
> Jest/Vitest/pytest). La verificación de cada tarea usa las herramientas
> reales del proyecto: `npx tsc -b` (typecheck), `npx oxlint` (lint), consultas
> `execute_sql` de reconciliación contra Supabase, y — para UI — prueba manual
> de Joel en el navegador (Claude no puede escribir contraseñas, política ya
> documentada). Se ejecuta inline en esta misma sesión, no vía subagentes.

**Objetivo:** reemplazar la captura de costo/existencia de productos que hoy
vive en Catálogo (tabla `entradas_inventario`) por un módulo de Inventario
completo con compras (prorrateo de envío por valor), ajustes con motivo, y un
kardex auditable por producto, sin romper ventas, citas ni el Estado de
Resultados.

**Arquitectura:** una función Postgres compartida (`fn_registrar_movimiento`)
es el **único** punto que escribe `items.stock/costo_promedio` o
`variantes_item.existencia/costo_promedio`, y lo hace exclusivamente al
insertar una fila en `movimientos_inventario` (kardex). Todo lo demás —
confirmar una compra, cancelarla, registrar un ajuste, o el trigger que
descuenta al vender — pasa por esa función. Así "todo cambio pasa por el
kardex" (regla G.1 de la etapa) queda garantizado estructuralmente, no por
disciplina de cada llamador.

**Tech Stack:** Postgres/PL·pgSQL (Supabase), React 19 + TS + Tailwind v4
(frontend ya existente), `jspdf`/`jspdf-autotable` + `xlsx` (ya integrados vía
`TablaReporte`/`exportar.ts`, se reusan tal cual).

**Spec:** documento pegado por el usuario, "Etapa 21 — Módulo de Inventario"
(no versionado como archivo aparte en el repo; el texto completo se cita en
esta conversación).

## Global Constraints

- Solo `items.tipo = 'producto'` entra en Inventario. Servicios no cambian
  (`items.costo` sigue editable en Catálogo, sin tocar).
- 4 decimales en costos almacenados (`numeric(12,4)`); redondeo a 2 solo en
  pantalla.
- Todo movimiento de existencia/costo pasa por `movimientos_inventario` — cero
  UPDATE directo a `items.stock`/`costo_promedio` o
  `variantes_item.existencia`/`costo_promedio` fuera de `fn_registrar_movimiento`.
- Nada se edita/borra una vez confirmado — compras se cancelan (revierten
  cantidad, nunca reescriben costo histórico); ajustes son movimientos nuevos.
- `venta_detalle.costo_unitario` sigue siendo el costo congelado definitivo —
  este módulo no lo toca retroactivamente.
- Un almacén único "Matriz" por negocio, creado automáticamente, pero
  `almacen_id` en el esquema desde el día uno.
- **Producción ya tiene datos reales** (`hfatlqwdafitipqjlkhb`=beta,
  `mhxvtlccgpiaqtuspvfq`=producción): 39 filas en `entradas_inventario`, 31
  productos, 12 variantes, 15 líneas de venta de producto. La migración de
  esos datos hacia `movimientos_inventario` debe reconstruir el kardex
  histórico por orden cronológico (no un solo movimiento de "saldo inicial"),
  para que el kardex pueda auditarse igual de bien para ventas viejas que para
  nuevas.
- No se elimina `entradas_inventario` en esta etapa (nota explícita del
  documento) — se deja como tabla muerta hasta confirmar que la migración fue
  correcta.
- Aplicar a producción **antes** de fusionar `dev` → `main` (orden invertido
  respecto a etapas sin migración), con respaldo previo obligatorio.

---

## Mapa de archivos

**SQL (nuevos):**
- `sql/0024_modulo_inventario.sql` — tablas nuevas, columnas nuevas en
  `items`, `fn_registrar_movimiento`, `confirmar_compra`, `cancelar_compra`,
  `registrar_ajuste_inventario`, trigger `descontar_inventario` reescrito,
  `eliminar_item`/`eliminar_variante` actualizados, vista de reconciliación.
- `sql/0025_migrar_entradas_a_movimientos.sql` — backfill histórico
  (idempotente: no-op si `movimientos_inventario` ya tiene filas).

**Frontend (nuevos):**
- `app/src/lib/inventario.ts` — todo el acceso a datos del módulo.
- `app/src/pages/inventario/AlmacenesPage.tsx` — E.1
- `app/src/pages/inventario/AlmacenDetallePage.tsx` — E.2
- `app/src/pages/inventario/KardexProductoPage.tsx` — E.3
- `app/src/pages/inventario/ComprasPage.tsx` — E.4 (lista)
- `app/src/pages/inventario/CompraFormPage.tsx` — nueva compra (C)
- `app/src/pages/inventario/CompraDetallePage.tsx` — ver/cancelar una compra
- `app/src/pages/inventario/AjusteFormPage.tsx` — D

**Frontend (modificados):**
- `app/src/types.ts` — tipos nuevos + `Item.codigo`/`Item.unidad`.
- `app/src/lib/catalogo.ts` — quitar `registrarEntradaInventario`; agregar
  `codigo`/`unidad` a `DatosNuevoItem`/`actualizarItem`.
- `app/src/pages/ItemFormPage.tsx` — quitar captura de piezas/costo inicial en
  alta de producto; agregar campos código/unidad.
- `app/src/pages/ItemDetallePage.tsx` — quitar `FormularioEntrada` (y sus dos
  usos); existencia/costo quedan de solo lectura con link a Inventario.
- `app/src/App.tsx` — rutas nuevas bajo `/inventario`.
- `app/src/components/Layout.tsx` — link de navegación "Inventario".

---

## Task 1 — Esquema base: almacenes, columnas de Catálogo, compras, kardex

**Archivo:** `sql/0024_modulo_inventario.sql`

- [x] **Paso 1: Escribir la migración de esquema**

```sql
-- ============================================================
-- ALMACENES
-- ============================================================
create table almacenes (
  id uuid primary key default gen_random_uuid(),
  negocio_id uuid not null references negocios(id) on delete cascade,
  nombre text not null,
  activo boolean not null default true,
  creado_en timestamptz not null default now()
);

alter table almacenes enable row level security;
create policy almacenes_acceso on almacenes for all
  using (is_negocio_member(negocio_id)) with check (is_negocio_member(negocio_id));

insert into almacenes (negocio_id, nombre)
select id, 'Matriz' from negocios;

-- ============================================================
-- CATÁLOGO: código y unidad de medida
-- ============================================================
alter table items add column codigo text;
alter table items add column unidad text default 'Pieza'
  check (unidad in ('Pieza','Caja','Paquete','Par','Juego','Gramo','Kilogramo','Mililitro','Litro','Metro'));

create unique index items_codigo_unico on items (negocio_id, codigo) where codigo is not null;

-- ============================================================
-- COMPRAS (encabezado)
-- ============================================================
create table compras (
  id uuid primary key default gen_random_uuid(),
  negocio_id uuid not null references negocios(id) on delete cascade,
  almacen_id uuid not null references almacenes(id),
  proveedor text,
  folio text,
  fecha date not null,
  subtotal numeric(12,2) not null default 0,
  costo_envio numeric(12,2) not null default 0,
  total numeric(12,2) not null default 0,
  estado text not null default 'confirmada' check (estado in ('confirmada','cancelada')),
  creado_en timestamptz not null default now()
);

alter table compras enable row level security;
create policy compras_acceso on compras for all
  using (is_negocio_member(negocio_id)) with check (is_negocio_member(negocio_id));

-- ============================================================
-- COMPRA_DETALLE (partidas)
-- ============================================================
create table compra_detalle (
  id uuid primary key default gen_random_uuid(),
  compra_id uuid not null references compras(id) on delete cascade,
  item_id uuid references items(id),
  variante_id uuid references variantes_item(id),
  cantidad integer not null check (cantidad > 0),
  costo_partida numeric(12,2) not null,
  envio_prorrateado numeric(12,4) not null default 0,
  costo_unitario_final numeric(12,4) not null,
  constraint destino_unico check ((item_id is null) <> (variante_id is null))
);

alter table compra_detalle enable row level security;
create policy compra_detalle_acceso on compra_detalle for all
  using (exists (select 1 from compras where compras.id = compra_detalle.compra_id and is_negocio_member(compras.negocio_id)))
  with check (exists (select 1 from compras where compras.id = compra_detalle.compra_id and is_negocio_member(compras.negocio_id)));

-- ============================================================
-- MOVIMIENTOS DE INVENTARIO (kardex)
-- ============================================================
create table movimientos_inventario (
  id uuid primary key default gen_random_uuid(),
  negocio_id uuid not null references negocios(id) on delete cascade,
  almacen_id uuid not null references almacenes(id),
  item_id uuid references items(id),
  variante_id uuid references variantes_item(id),
  tipo text not null check (tipo in ('entrada','salida_venta','ajuste_positivo','ajuste_negativo','cancelacion_compra')),
  cantidad integer not null check (cantidad > 0),
  costo_unitario numeric(12,4) not null,
  saldo_cantidad integer not null,
  saldo_costo_promedio numeric(12,4) not null,
  referencia_id uuid,
  referencia_tipo text,
  motivo text,
  fecha timestamptz not null default now(),
  constraint destino_unico_mov check ((item_id is null) <> (variante_id is null))
);

alter table movimientos_inventario enable row level security;
create policy movimientos_acceso on movimientos_inventario for all
  using (is_negocio_member(negocio_id)) with check (is_negocio_member(negocio_id));

create index movimientos_por_item on movimientos_inventario (item_id, fecha);
create index movimientos_por_variante on movimientos_inventario (variante_id, fecha);
```

- [x] **Paso 2: Función compartida `fn_registrar_movimiento`**

Único lugar que escribe `stock`/`costo_promedio`/`existencia`. Recibe
exactamente uno de `p_item_id`/`p_variante_id` (el otro NULL). `entrada` y
`ajuste_positivo` recalculan costo promedio ponderado; `salida_venta`,
`ajuste_negativo` y `cancelacion_compra` solo restan cantidad (el costo
promedio nunca se reescribe hacia atrás) y fallan si dejarían la existencia
negativa.

```sql
create or replace function fn_registrar_movimiento(
  p_negocio_id uuid,
  p_almacen_id uuid,
  p_item_id uuid,
  p_variante_id uuid,
  p_tipo text,
  p_cantidad integer,
  p_costo_unitario numeric,
  p_referencia_id uuid,
  p_referencia_tipo text,
  p_motivo text default null
) returns uuid
language plpgsql
set search_path to 'public'
as $$
declare
  v_existencia integer;
  v_costo numeric(12,4);
  v_nueva_existencia integer;
  v_nuevo_costo numeric(12,4);
  v_movimiento_id uuid;
begin
  if p_cantidad <= 0 then
    raise exception 'La cantidad del movimiento debe ser mayor a cero.';
  end if;
  if (p_item_id is null) = (p_variante_id is null) then
    raise exception 'Debe especificarse exactamente un producto o una variante.';
  end if;

  if p_variante_id is not null then
    select existencia, costo_promedio into v_existencia, v_costo
    from variantes_item where id = p_variante_id for update;
  else
    select stock, costo_promedio into v_existencia, v_costo
    from items where id = p_item_id for update;
  end if;

  if v_existencia is null then
    raise exception 'El producto o variante no existe.';
  end if;

  if p_tipo in ('entrada', 'ajuste_positivo') then
    v_nueva_existencia := v_existencia + p_cantidad;
    if v_nueva_existencia = 0 then
      v_nuevo_costo := p_costo_unitario;
    else
      v_nuevo_costo := ((v_existencia * coalesce(v_costo,0)) + (p_cantidad * p_costo_unitario)) / v_nueva_existencia;
    end if;
  elsif p_tipo in ('salida_venta', 'ajuste_negativo', 'cancelacion_compra') then
    v_nueva_existencia := v_existencia - p_cantidad;
    v_nuevo_costo := v_costo;
    if v_nueva_existencia < 0 then
      raise exception 'No hay existencia suficiente (disponible: %, solicitado: %).', v_existencia, p_cantidad;
    end if;
  else
    raise exception 'Tipo de movimiento no reconocido: %', p_tipo;
  end if;

  insert into movimientos_inventario (
    negocio_id, almacen_id, item_id, variante_id, tipo, cantidad,
    costo_unitario, saldo_cantidad, saldo_costo_promedio,
    referencia_id, referencia_tipo, motivo
  ) values (
    p_negocio_id, p_almacen_id, p_item_id, p_variante_id, p_tipo, p_cantidad,
    p_costo_unitario, v_nueva_existencia, v_nuevo_costo,
    p_referencia_id, p_referencia_tipo, p_motivo
  ) returning id into v_movimiento_id;

  if p_variante_id is not null then
    update variantes_item set existencia = v_nueva_existencia, costo_promedio = v_nuevo_costo
    where id = p_variante_id;
  else
    update items set stock = v_nueva_existencia, costo_promedio = v_nuevo_costo
    where id = p_item_id;
  end if;

  return v_movimiento_id;
end;
$$;
```

- [x] **Paso 3: `confirmar_compra` (prorrateo de envío por valor + transacción)**

Primera pasada calcula el prorrateo crudo (`round(envío × partida/subtotal, 4)`)
y ubica la partida de mayor `costo_partida`; la diferencia entre el envío
capturado y la suma de los prorrateos redondeados se ajusta completa en esa
partida (regla C.4 de "cuadre exacto"). Segunda pasada inserta cada partida y
llama `fn_registrar_movimiento` con `tipo='entrada'`.

```sql
create or replace function confirmar_compra(
  p_negocio_id uuid,
  p_almacen_id uuid,
  p_proveedor text,
  p_folio text,
  p_fecha date,
  p_costo_envio numeric,
  p_partidas jsonb  -- [{item_id, variante_id, cantidad, costo_partida}]
) returns uuid
language plpgsql
set search_path to 'public'
as $$
declare
  v_compra_id uuid;
  v_subtotal numeric(12,2);
  v_partida jsonb;
  v_envio_prorrateado numeric(12,4);
  v_costo_unitario_final numeric(12,4);
  v_max_costo numeric(12,2) := -1;
  v_max_idx int;
  v_idx int := 0;
  v_suma_prorrateado numeric(12,4) := 0;
  v_diferencia numeric(12,4);
  v_prorrateos numeric(12,4)[] := array[]::numeric(12,4)[];
  v_item_id uuid;
  v_variante_id uuid;
  v_cantidad integer;
  v_costo_partida numeric(12,2);
begin
  select coalesce(sum((p->>'costo_partida')::numeric), 0) into v_subtotal
  from jsonb_array_elements(p_partidas) p;

  if v_subtotal <= 0 then
    raise exception 'La compra debe tener al menos una partida con costo mayor a cero.';
  end if;

  insert into compras (negocio_id, almacen_id, proveedor, folio, fecha, subtotal, costo_envio, total)
  values (p_negocio_id, p_almacen_id, p_proveedor, p_folio, p_fecha, v_subtotal, coalesce(p_costo_envio,0), v_subtotal + coalesce(p_costo_envio,0))
  returning id into v_compra_id;

  for v_partida in select * from jsonb_array_elements(p_partidas)
  loop
    v_idx := v_idx + 1;
    v_costo_partida := (v_partida->>'costo_partida')::numeric;
    v_envio_prorrateado := round(coalesce(p_costo_envio,0) * v_costo_partida / v_subtotal, 4);
    v_prorrateos := v_prorrateos || v_envio_prorrateado;
    v_suma_prorrateado := v_suma_prorrateado + v_envio_prorrateado;
    if v_costo_partida > v_max_costo then
      v_max_costo := v_costo_partida;
      v_max_idx := v_idx;
    end if;
  end loop;

  v_diferencia := coalesce(p_costo_envio,0) - v_suma_prorrateado;
  if v_diferencia <> 0 then
    v_prorrateos[v_max_idx] := v_prorrateos[v_max_idx] + v_diferencia;
  end if;

  v_idx := 0;
  for v_partida in select * from jsonb_array_elements(p_partidas)
  loop
    v_idx := v_idx + 1;
    v_item_id := nullif(v_partida->>'item_id','')::uuid;
    v_variante_id := nullif(v_partida->>'variante_id','')::uuid;
    v_cantidad := (v_partida->>'cantidad')::integer;
    v_costo_partida := (v_partida->>'costo_partida')::numeric;
    v_envio_prorrateado := v_prorrateos[v_idx];
    v_costo_unitario_final := (v_costo_partida + v_envio_prorrateado) / v_cantidad;

    insert into compra_detalle (compra_id, item_id, variante_id, cantidad, costo_partida, envio_prorrateado, costo_unitario_final)
    values (v_compra_id, v_item_id, v_variante_id, v_cantidad, v_costo_partida, v_envio_prorrateado, v_costo_unitario_final);

    perform fn_registrar_movimiento(
      p_negocio_id, p_almacen_id, v_item_id, v_variante_id, 'entrada', v_cantidad,
      v_costo_unitario_final, v_compra_id, 'compra', null
    );
  end loop;

  return v_compra_id;
end;
$$;
```

- [x] **Paso 4: `cancelar_compra` (revierte cantidad, nunca el costo)**

Valida **todas** las partidas antes de revertir cualquiera (todo o nada,
igual que confirmar): si alguna ya se vendió y la existencia actual es menor
a lo que se pretende revertir, se aborta con el mensaje de la regla C.6.

```sql
create or replace function cancelar_compra(p_compra_id uuid) returns void
language plpgsql
set search_path to 'public'
as $$
declare
  v_negocio_id uuid;
  v_almacen_id uuid;
  v_estado text;
  v_detalle record;
  v_existencia integer;
begin
  select negocio_id, almacen_id, estado into v_negocio_id, v_almacen_id, v_estado
  from compras where id = p_compra_id;

  if v_negocio_id is null then
    raise exception 'La compra no existe.';
  end if;
  if v_estado <> 'confirmada' then
    raise exception 'Solo se pueden cancelar compras confirmadas.';
  end if;

  for v_detalle in select * from compra_detalle where compra_id = p_compra_id
  loop
    if v_detalle.variante_id is not null then
      select existencia into v_existencia from variantes_item where id = v_detalle.variante_id;
    else
      select stock into v_existencia from items where id = v_detalle.item_id;
    end if;

    if v_existencia < v_detalle.cantidad then
      raise exception 'No se puede cancelar: parte de esta compra ya se vendió. Usa un ajuste negativo en su lugar.';
    end if;
  end loop;

  for v_detalle in select * from compra_detalle where compra_id = p_compra_id
  loop
    perform fn_registrar_movimiento(
      v_negocio_id, v_almacen_id, v_detalle.item_id, v_detalle.variante_id,
      'cancelacion_compra', v_detalle.cantidad, v_detalle.costo_unitario_final,
      p_compra_id, 'compra', null
    );
  end loop;

  update compras set estado = 'cancelada' where id = p_compra_id;
end;
$$;
```

- [x] **Paso 5: `registrar_ajuste_inventario`**

```sql
create or replace function registrar_ajuste_inventario(
  p_negocio_id uuid,
  p_almacen_id uuid,
  p_item_id uuid,
  p_variante_id uuid,
  p_tipo text,
  p_cantidad integer,
  p_motivo text,
  p_costo_unitario numeric default null
) returns uuid
language plpgsql
set search_path to 'public'
as $$
begin
  if p_tipo not in ('ajuste_positivo','ajuste_negativo') then
    raise exception 'Tipo de ajuste inválido.';
  end if;
  if p_motivo is null or btrim(p_motivo) = '' then
    raise exception 'El motivo del ajuste es obligatorio.';
  end if;
  if p_tipo = 'ajuste_positivo' and p_costo_unitario is null then
    raise exception 'Un ajuste positivo requiere capturar el costo unitario.';
  end if;

  return fn_registrar_movimiento(
    p_negocio_id, p_almacen_id, p_item_id, p_variante_id, p_tipo, p_cantidad,
    coalesce(p_costo_unitario, 0), null, 'ajuste', p_motivo
  );
end;
$$;
```

- [x] **Paso 6: reescribir el trigger de venta para que pase por el kardex**

Hoy `descontar_inventario()` hace `update items/variantes_item` directo. Debe
en cambio insertar el movimiento (`salida_venta`) vía `fn_registrar_movimiento`,
usando el `costo_unitario` ya congelado en la línea de venta y el almacén
único del negocio. Mantiene `security definer` (como hoy) para no depender de
RLS en el contexto del trigger.

```sql
create or replace function descontar_inventario() returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_negocio_id uuid;
  v_almacen_id uuid;
  v_es_producto boolean;
begin
  select negocio_id into v_negocio_id from ventas where id = new.venta_id;
  select id into v_almacen_id from almacenes where negocio_id = v_negocio_id and activo limit 1;

  if new.variante_id is not null then
    perform fn_registrar_movimiento(
      v_negocio_id, v_almacen_id, null, new.variante_id, 'salida_venta',
      new.cantidad, new.costo_unitario, new.venta_id, 'venta', null
    );
  else
    select (tipo = 'producto') into v_es_producto from items where id = new.item_id;
    if v_es_producto then
      perform fn_registrar_movimiento(
        v_negocio_id, v_almacen_id, new.item_id, null, 'salida_venta',
        new.cantidad, new.costo_unitario, new.venta_id, 'venta', null
      );
    end if;
  end if;

  return new;
end;
$$;
```

`validar_existencia()` (bloquea la venta antes del insert si no hay stock) no
cambia — sigue leyendo `items.stock`/`variantes_item.existencia`, que ahora
mantiene `fn_registrar_movimiento` en vez del trigger viejo.

- [x] **Paso 7: `eliminar_item`/`eliminar_variante` — dejar de mirar `entradas_inventario`**

```sql
create or replace function eliminar_item(p_item_id uuid) returns void
language plpgsql
set search_path to 'public'
as $$
declare
  v_tipo text;
  v_sujeto text;
begin
  select tipo into v_tipo from items where id = p_item_id;
  if v_tipo is null then
    raise exception 'El ítem no existe.';
  end if;
  v_sujeto := case when v_tipo = 'servicio' then 'Este servicio' else 'Este producto' end;

  if exists (
    select 1 from venta_detalle
    where item_id = p_item_id or variante_id in (select id from variantes_item where item_id = p_item_id)
  ) or exists (
    select 1 from cita_servicios where item_id = p_item_id
  ) then
    raise exception '% no se puede eliminar porque tiene ventas o citas registradas. Puedes desactivarlo para que deje de aparecer.', v_sujeto;
  end if;

  if exists (
    select 1 from movimientos_inventario
    where item_id = p_item_id or variante_id in (select id from variantes_item where item_id = p_item_id)
  ) then
    raise exception '% no se puede eliminar porque tiene inventario registrado (compras o ajustes). Puedes desactivarlo para que deje de aparecer.', v_sujeto;
  end if;

  delete from items where id = p_item_id;
end;
$$;

create or replace function eliminar_variante(p_variante_id uuid) returns void
language plpgsql
set search_path to 'public'
as $$
begin
  if not exists (select 1 from variantes_item where id = p_variante_id) then
    raise exception 'La variante no existe.';
  end if;

  if exists (select 1 from venta_detalle where variante_id = p_variante_id)
    or exists (select 1 from movimientos_inventario where variante_id = p_variante_id)
  then
    raise exception 'Esta variante no se puede eliminar porque tiene ventas o inventario registrado. Puedes desactivarla para que deje de aparecer.';
  end if;

  delete from variantes_item where id = p_variante_id;
end;
$$;
```

- [x] **Paso 8: vista de reconciliación (regla G.2)**

```sql
create or replace view v_cuadre_inventario as
select 'item'::text as tipo_destino, i.id as destino_id, i.negocio_id,
       i.stock as existencia_almacenada, i.costo_promedio as costo_almacenado,
       m.saldo_cantidad as existencia_kardex, m.saldo_costo_promedio as costo_kardex
from items i
left join lateral (
  select saldo_cantidad, saldo_costo_promedio from movimientos_inventario
  where item_id = i.id order by fecha desc, id desc limit 1
) m on true
where i.tipo = 'producto' and not i.tiene_variantes
union all
select 'variante', v.id, i.negocio_id, v.existencia, v.costo_promedio,
       m.saldo_cantidad, m.saldo_costo_promedio
from variantes_item v
join items i on i.id = v.item_id
left join lateral (
  select saldo_cantidad, saldo_costo_promedio from movimientos_inventario
  where variante_id = v.id order by fecha desc, id desc limit 1
) m on true;
```

- [x] **Paso 9: aplicar en beta con `apply_migration` (project_id `hfatlqwdafitipqjlkhb`)** — aplicado.

> **Corrección aplicada tras la verificación (2026-08-21):** `fn_registrar_movimiento`
> no preservaba la fecha histórica real del evento — usaba el default `now()`
> de la columna `fecha`, así que todos los movimientos migrados quedaban con
> la fecha de la migración en vez de su fecha real. La aritmética (saldo/costo
> promedio) era correcta porque el orden de procesamiento sí usaba la fecha
> real internamente; solo la metadata persistida estaba mal. Fix: se agregó un
> parámetro `p_fecha timestamptz default now()` a `fn_registrar_movimiento`
> (usado por `confirmar_compra` con la fecha de la compra, y por el backfill
> con la fecha original de cada evento), y una columna `creado_en timestamptz
> default now()` como desempate de inserción real — necesaria porque varias
> partidas de una misma compra comparten `fecha` de negocio. `sql/0024` y
> `sql/0025` ya están corregidos en el repo con este fix incorporado.

- [x] **Paso 10: verificar en beta** — `v_cuadre_inventario` da 0 descuadres.

```sql
select * from v_cuadre_inventario where existencia_almacenada is distinct from coalesce(existencia_kardex, 0);
```
Debe devolver 0 filas (beta no tiene productos aún, así que es trivial).
Confirmar además `select * from almacenes` — debe existir un "Matriz" por
cada negocio.

---

## Task 2 — Migración histórica (producción real: 39 entradas + 15 ventas)

**Archivo:** `sql/0025_migrar_entradas_a_movimientos.sql`

- [x] **Paso 1: escribir el backfill (idempotente, ordenado cronológicamente)**

```sql
do $$
declare
  v_evento record;
  v_almacen_id uuid;
begin
  if exists (select 1 from movimientos_inventario limit 1) then
    return; -- ya migrado, no repetir
  end if;

  for v_evento in
    select negocio_id, item_id, variante_id, tipo, cantidad, costo_unitario, fecha, referencia_id
    from (
      select e.negocio_id, e.item_id, e.variante_id, 'entrada'::text as tipo,
             e.cantidad, e.costo_unitario, e.fecha, e.id as referencia_id
      from entradas_inventario e
      union all
      select i.negocio_id,
             case when vd.variante_id is null then vd.item_id else null end,
             vd.variante_id, 'salida_venta'::text,
             vd.cantidad, vd.costo_unitario, v.fecha, vd.venta_id
      from venta_detalle vd
      join ventas v on v.id = vd.venta_id
      join items i on i.id = vd.item_id
      where i.tipo = 'producto'
    ) eventos
    order by fecha, referencia_id
  loop
    select id into v_almacen_id from almacenes where negocio_id = v_evento.negocio_id and activo limit 1;

    perform fn_registrar_movimiento(
      v_evento.negocio_id, v_almacen_id, v_evento.item_id, v_evento.variante_id,
      v_evento.tipo, v_evento.cantidad, v_evento.costo_unitario,
      v_evento.referencia_id,
      case when v_evento.tipo = 'entrada' then 'entrada_migrada' else 'venta' end,
      null
    );
  end loop;
end;
$$;
```

- [x] **Paso 2: aplicar en beta** — beta sí tenía datos de prueba (5 entradas,
      15 ventas de producto: la estimación de filas de `list_tables` era
      obsoleta/no confiable). El backfill los procesó correctamente; ver la
      corrección de fecha en Task 1.

- [x] **Paso 3: dry-run contra producción ANTES de aplicar de verdad**

Ejecutar (vía `execute_sql` en `mhxvtlccgpiaqtuspvfq`) el contenido del
Paso 1 envuelto en `begin; ... rollback;` en una sola llamada, seguido — dentro
de la misma transacción — de la consulta de `v_cuadre_inventario`, para ver
si el backfill reconstruye exactamente los `stock`/`costo_promedio` que ya
están guardados, sin persistir nada:

```sql
begin;
-- (pegar aquí el bloque do $$ ... $$ completo del Paso 1)
select * from v_cuadre_inventario
where existencia_almacenada is distinct from coalesce(existencia_kardex, 0)
   or abs(coalesce(costo_almacenado,0) - coalesce(costo_kardex,0)) > 0.01;
rollback;
```

Si esa consulta final devuelve **0 filas**, el backfill es fiel a la historia
real y es seguro aplicarlo. Si devuelve filas, reportarlas a Joel antes de
continuar — no forzar coincidencia.

- [x] **Paso 4: (gate de producción, ver Task 8) aplicar `0024` + `0025` de
      verdad en producción, con respaldo previo**

---

## Task 3 — Tipos compartidos e `inventario.ts`

**Archivos:** `app/src/types.ts` (modificar), `app/src/lib/inventario.ts` (nuevo)

- [x] **Paso 1: extender `types.ts`**

```ts
export interface Item {
  // ...campos existentes...
  codigo: string | null
  unidad: Unidad
}

export type Unidad = 'Pieza' | 'Caja' | 'Paquete' | 'Par' | 'Juego' | 'Gramo' | 'Kilogramo' | 'Mililitro' | 'Litro' | 'Metro'

export interface Almacen {
  id: string
  negocio_id: string
  nombre: string
  activo: boolean
}

export type TipoMovimiento = 'entrada' | 'salida_venta' | 'ajuste_positivo' | 'ajuste_negativo' | 'cancelacion_compra'

export interface MovimientoInventario {
  id: string
  almacen_id: string
  item_id: string | null
  variante_id: string | null
  tipo: TipoMovimiento
  cantidad: number
  costo_unitario: number
  saldo_cantidad: number
  saldo_costo_promedio: number
  referencia_id: string | null
  referencia_tipo: string | null
  motivo: string | null
  fecha: string
}

export interface Compra {
  id: string
  negocio_id: string
  almacen_id: string
  proveedor: string | null
  folio: string | null
  fecha: string
  subtotal: number
  costo_envio: number
  total: number
  estado: 'confirmada' | 'cancelada'
}

export interface CompraDetalle {
  id: string
  item_id: string | null
  variante_id: string | null
  cantidad: number
  costo_partida: number
  envio_prorrateado: number
  costo_unitario_final: number
}
```

- [x] **Paso 2: `app/src/lib/inventario.ts`**

```ts
import { supabase } from './supabaseClient'
import type { Almacen, Compra, CompraDetalle, MovimientoInventario } from '../types'

export async function obtenerAlmacen(negocioId: string): Promise<Almacen> {
  const { data, error } = await supabase.from('almacenes').select('*').eq('negocio_id', negocioId).eq('activo', true).single()
  if (error) throw error
  return data as Almacen
}

export interface ProductoInventario {
  id: string
  codigo: string | null
  nombre: string
  categoria: string | null
  unidad: string
  tiene_variantes: boolean
  stock: number
  costo_promedio: number
  variantes: Array<{ id: string; color: string | null; talla: string | null; existencia: number; costo_promedio: number }>
}

export async function listarProductosInventario(negocioId: string): Promise<ProductoInventario[]> {
  const { data, error } = await supabase
    .from('items')
    .select('id, codigo, nombre, unidad, tiene_variantes, stock, costo_promedio, categorias_item(nombre), variantes_item(id, color, talla, existencia, costo_promedio, activo)')
    .eq('negocio_id', negocioId)
    .eq('tipo', 'producto')
    .eq('activo', true)
    .order('nombre')
  if (error) throw error
  return (data as unknown as Array<{
    id: string; codigo: string | null; nombre: string; unidad: string; tiene_variantes: boolean
    stock: number; costo_promedio: number
    categorias_item: { nombre: string } | null
    variantes_item: Array<{ id: string; color: string | null; talla: string | null; existencia: number; costo_promedio: number; activo: boolean }>
  }>).map((i) => ({
    id: i.id, codigo: i.codigo, nombre: i.nombre, categoria: i.categorias_item?.nombre ?? null,
    unidad: i.unidad, tiene_variantes: i.tiene_variantes, stock: i.stock, costo_promedio: i.costo_promedio,
    variantes: i.variantes_item.filter((v) => v.activo),
  }))
}

export async function listarKardex(itemId?: string, varianteId?: string): Promise<MovimientoInventario[]> {
  let query = supabase.from('movimientos_inventario').select('*').order('fecha', { ascending: false })
  query = varianteId ? query.eq('variante_id', varianteId) : query.eq('item_id', itemId)
  const { data, error } = await query
  if (error) throw error
  return data as MovimientoInventario[]
}

export async function listarCompras(negocioId: string): Promise<Compra[]> {
  const { data, error } = await supabase.from('compras').select('*').eq('negocio_id', negocioId).order('fecha', { ascending: false })
  if (error) throw error
  return data as Compra[]
}

export async function obtenerCompraConPartidas(compraId: string): Promise<{ compra: Compra; partidas: Array<CompraDetalle & { nombre: string }> }> {
  const [{ data: compra, error: e1 }, { data: partidas, error: e2 }] = await Promise.all([
    supabase.from('compras').select('*').eq('id', compraId).single(),
    supabase.from('compra_detalle').select('*, items(nombre), variantes_item(color, talla, items(nombre))').eq('compra_id', compraId),
  ])
  if (e1) throw e1
  if (e2) throw e2
  type Fila = CompraDetalle & { items: { nombre: string } | null; variantes_item: { color: string | null; talla: string | null; items: { nombre: string } } | null }
  const filas = partidas as unknown as Fila[]
  return {
    compra: compra as Compra,
    partidas: filas.map((p) => ({
      ...p,
      nombre: p.items?.nombre ?? `${p.variantes_item?.items.nombre} (${[p.variantes_item?.color, p.variantes_item?.talla].filter(Boolean).join(' / ')})`,
    })),
  }
}

export interface PartidaCompra {
  item_id: string | null
  variante_id: string | null
  cantidad: number
  costo_partida: number
}

export async function confirmarCompra(
  negocioId: string, almacenId: string, proveedor: string | null, folio: string | null,
  fecha: string, costoEnvio: number, partidas: PartidaCompra[],
): Promise<string> {
  const { data, error } = await supabase.rpc('confirmar_compra', {
    p_negocio_id: negocioId, p_almacen_id: almacenId, p_proveedor: proveedor, p_folio: folio,
    p_fecha: fecha, p_costo_envio: costoEnvio, p_partidas: partidas,
  })
  if (error) throw error
  return data as string
}

export async function cancelarCompra(compraId: string): Promise<void> {
  const { error } = await supabase.rpc('cancelar_compra', { p_compra_id: compraId })
  if (error) throw error
}

export async function registrarAjuste(
  negocioId: string, almacenId: string, itemId: string | null, varianteId: string | null,
  tipo: 'ajuste_positivo' | 'ajuste_negativo', cantidad: number, motivo: string, costoUnitario?: number,
): Promise<string> {
  const { data, error } = await supabase.rpc('registrar_ajuste_inventario', {
    p_negocio_id: negocioId, p_almacen_id: almacenId, p_item_id: itemId, p_variante_id: varianteId,
    p_tipo: tipo, p_cantidad: cantidad, p_motivo: motivo, p_costo_unitario: costoUnitario ?? null,
  })
  if (error) throw error
  return data as string
}
```

- [x] **Paso 3: `npx tsc -b` limpio** (ver nota sobre `xlsx`/red en Global
      Constraints de la sesión — quitar temporalmente esa dependencia de
      `package.json` para poder instalar node_modules si hace falta, y
      restaurar el archivo original antes de commitear).

---

## Task 4 — Catálogo: quitar captura de costo/existencia de productos

**Archivos:** `app/src/lib/catalogo.ts`, `app/src/pages/ItemFormPage.tsx`,
`app/src/pages/ItemDetallePage.tsx`

- [x] **Paso 1:** en `catalogo.ts`, eliminar por completo la función
      `registrarEntradaInventario` y su export. Agregar `codigo: string | null`
      y `unidad: Unidad` a `DatosNuevoItem` y a los campos permitidos en
      `actualizarItem`.
- [x] **Paso 2:** en `ItemFormPage.tsx`, quitar los campos "Piezas iniciales" /
      "Costo total de la compra" y la llamada a `registrarEntradaInventario`
      al crear un producto sin variantes. Agregar campos **Código** (texto
      libre, opcional) y **Unidad** (`<select>` con las 10 opciones del check
      constraint) para productos.
- [x] **Paso 3:** en `ItemDetallePage.tsx`, eliminar el componente
      `FormularioEntrada` y sus dos usos (producto sin variante y cada
      variante). Las líneas que hoy muestran `Existencia: … · Costo promedio: …`
      se quedan como texto de solo lectura (sin el toggle/botón "Registrar
      entrada"), con un link `to="/inventario/almacenes"` o al detalle del
      almacén, texto "Ver movimientos en Inventario".
- [x] **Paso 4:** `npx tsc -b` y `npx oxlint` limpios.

---

## Task 5 — Rutas y navegación

**Archivos:** `app/src/App.tsx`, `app/src/components/Layout.tsx`

- [x] **Paso 1:** agregar, dentro del mismo `<Route element={<Layout />}>` que
      ya envuelve Catálogo:

```tsx
<Route path="/inventario" element={<AlmacenesPage />} />
<Route path="/inventario/almacenes/:id" element={<AlmacenDetallePage />} />
<Route path="/inventario/productos/:itemId" element={<KardexProductoPage />} />
<Route path="/inventario/productos/:itemId/variantes/:varianteId" element={<KardexProductoPage />} />
<Route path="/inventario/compras" element={<ComprasPage />} />
<Route path="/inventario/compras/nueva" element={<CompraFormPage />} />
<Route path="/inventario/compras/:id" element={<CompraDetallePage />} />
<Route path="/inventario/ajuste" element={<AjusteFormPage />} />
```

- [x] **Paso 2:** en `Layout.tsx`, agregar un link "Inventario" junto al de
      "Catálogo" en la navegación lateral, mismo patrón de ícono/estilo activo
      que los demás.

---

## Task 6 — Pantallas de Inventario (E.1–E.4)

**Archivos:** los 6 listados en el mapa de archivos, dentro de
`app/src/pages/inventario/`.

Cada pantalla sigue el patrón ya establecido en `ClientesPage.tsx`/
`GastosPage.tsx`: estado `cargando`/`error`/datos con `useEffect` +
`useNegocio()`, componentes `Card`/`Button`/`EstadoBadge` de
`components/ui/`, tema vía variables CSS (nunca condicional por negocio).

- [x] **AlmacenesPage.tsx (E.1):** lista de almacenes del negocio activo (hoy
      uno) con nombre y valor total (`Σ stock×costo_promedio` de productos sin
      variante + `Σ existencia×costo_promedio` de variantes). Panel lateral:
      número de productos, unidades totales, valor total, productos en cero.
      Link a `AlmacenDetallePage`.
- [x] **AlmacenDetallePage.tsx (E.2):** tabla vía `listarProductosInventario`
      con código, nombre, categoría, unidad, existencia, costo promedio, valor
      total; para Don camisa (`tiene_variantes`), fila expandible por
      variante. Filtro por categoría y por "existencia baja/cero". Botones
      Exportar PDF/Excel (envolver en `<TablaReporte>` como ya hace
      `InventarioActualView.tsx` en Reportes — mismo patrón, no reinventar),
      "Agregar compra" → `/inventario/compras/nueva`, "Ajuste de inventario" →
      `/inventario/ajuste`.
- [x] **KardexProductoPage.tsx (E.3):** `listarKardex(itemId, varianteId)`,
      tabla fecha/tipo/referencia/cantidad/costo_unitario/saldo_cantidad/
      saldo_costo_promedio. Filtro por rango de fechas (dos `<input
      type="date">`, patrón ya usado en `ReportesPage.tsx`/`GastoFormPage.tsx`).
- [x] **ComprasPage.tsx (E.4):** `listarCompras`, tabla proveedor/folio/fecha/
      total/estado (`EstadoBadge`), link a `CompraDetallePage`.
- [x] **CompraFormPage.tsx (C):** encabezado (proveedor, folio, fecha, almacén
      preseleccionado), tabla dinámica de partidas (producto + variante si
      aplica + cantidad + costo total de la partida), muestra costo unitario
      calculado en vivo (`costo_partida / cantidad`, sin envío) para que el
      usuario lo verifique contra su factura antes de guardar, campo opcional
      "Costo de envío", botón Confirmar → `confirmarCompra(...)`.
- [x] **CompraDetallePage.tsx:** `obtenerCompraConPartidas`, muestra partidas
      con `envio_prorrateado`/`costo_unitario_final` ya aplicado, botón
      "Cancelar compra" (con confirmación) si `estado==='confirmada'` →
      `cancelarCompra`.
- [x] **AjusteFormPage.tsx (D):** selector producto (+ variante si aplica),
      tipo (positivo/negativo), cantidad, motivo (lista fija: Merma, Rotura,
      Caducidad, Pérdida, Obsequio, Corrección de conteo — u "Otro" con texto
      libre), costo unitario (solo si positivo) → `registrarAjuste`.

- [x] **Verificación de todo Task 6:** `npx tsc -b` + `npx oxlint` limpios;
      Joel prueba en beta (crear una compra con 2+ partidas y envío, verificar
      que el kardex del producto cuadra, cancelar una compra, hacer un ajuste
      negativo y uno positivo).

---

## Task 7 — Confirmar que nada más se rompió

- [x] Releer `app/src/lib/reportes.ts::obtenerInventarioActual` — hoy no
      incluye productos sin variante (usa solo `variantes_item`); decidir con
      Joel si se corrige en esta etapa o se deja para otra (es un
      comportamiento preexistente, no introducido por este módulo — no
      tocarlo sin decisión explícita).
- [x] Vender un producto sin variante y uno con variante en beta, confirmar
      que el kardex generó su `salida_venta` y que `venta_detalle.costo_unitario`
      sigue congelándose igual que antes.
- [x] Confirmar que Estado de Resultados (Etapa 19) no cambia para ventas
      existentes (usa `venta_detalle.costo_unitario`, intocado).

---

## Task 8 — Gate de producción

- [ ] Confirmación explícita de Joel de que probó Task 6/7 en beta y funciona.
- [ ] Respaldo de producción (backup vía Supabase antes de aplicar).
- [ ] Ejecutar el dry-run del Task 2/Paso 3 contra producción; si hay
      discrepancias, reportarlas y parar.
- [ ] Aplicar `sql/0024` y `sql/0025` a producción (`mhxvtlccgpiaqtuspvfq`) vía
      `apply_migration`.
- [ ] Revisar `git log origin/main..origin/dev --oneline` completo antes de
      fusionar (lección de la sección 4 del estado del proyecto — puede haber
      más que esta sola etapa acumulado).
- [ ] Fusionar `dev` → `main`, push, confirmar carga sin errores en
      `nimble-liger-f94dc5.netlify.app`.

---

## Autorrevisión contra el documento de la Etapa 21

- A.1/A.2/A.3 → Task 1 (columnas/tabla `almacenes`) + constraint `tipo` ya
  existente en `items` (sin cambio).
- B (esquema) → Task 1, SQL copiado/extendido tal cual del documento.
- C.1–C.6 → Task 1 Paso 3/4 (`confirmar_compra`/`cancelar_compra`) + Task 6
  (`CompraFormPage`/`CompraDetallePage`).
- D → Task 1 Paso 5 (`registrar_ajuste_inventario`) + Task 6 (`AjusteFormPage`).
- E.1–E.4 → Task 6.
- F (Catálogo) → Task 4.
- G.1–G.5 → arquitectura de `fn_registrar_movimiento` (Task 1) + Task 7.
- Nota de migración de `entradas_inventario` → Task 2.
- Criterios de aceptación → cubiertos por Task 1/2 (SQL) + Task 6/7
  (verificación manual en beta, dado que no hay suite automatizada).
