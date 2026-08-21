-- Etapa 21 — Módulo de Inventario
-- Almacenes, compras (con prorrateo de envío por valor), ajustes y kardex.
-- fn_registrar_movimiento es el único punto que escribe items.stock/costo_promedio
-- o variantes_item.existencia/costo_promedio, y solo vía un insert en movimientos_inventario.

-- ============================================================
-- ALMACENES (uno por negocio hoy; preparado para varios)
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
alter table items add column unidad text not null default 'Pieza'
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
  creado_en timestamptz not null default now(),
  constraint destino_unico_mov check ((item_id is null) <> (variante_id is null))
);

alter table movimientos_inventario enable row level security;
create policy movimientos_acceso on movimientos_inventario for all
  using (is_negocio_member(negocio_id)) with check (is_negocio_member(negocio_id));

create index movimientos_por_item on movimientos_inventario (item_id, fecha);
create index movimientos_por_variante on movimientos_inventario (variante_id, fecha);

-- ============================================================
-- fn_registrar_movimiento: único escritor de stock/costo_promedio/existencia
-- ============================================================
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
  p_motivo text default null,
  p_fecha timestamptz default now()
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
    referencia_id, referencia_tipo, motivo, fecha
  ) values (
    p_negocio_id, p_almacen_id, p_item_id, p_variante_id, p_tipo, p_cantidad,
    p_costo_unitario, v_nueva_existencia, v_nuevo_costo,
    p_referencia_id, p_referencia_tipo, p_motivo, p_fecha
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

-- ============================================================
-- confirmar_compra: prorrateo de envío por valor (regla C.3/C.4) + transacción
-- ============================================================
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

  -- primera pasada: prorrateo crudo por valor, y ubicar la partida de mayor costo
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

  -- ajustar el residual de redondeo completo en la partida de mayor valor,
  -- para que la suma de los prorrateos cuadre exacto con el envío capturado
  v_diferencia := coalesce(p_costo_envio,0) - v_suma_prorrateado;
  if v_diferencia <> 0 then
    v_prorrateos[v_max_idx] := v_prorrateos[v_max_idx] + v_diferencia;
  end if;

  -- segunda pasada: insertar partidas y aplicar movimientos de entrada
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
      v_costo_unitario_final, v_compra_id, 'compra', null, p_fecha::timestamptz
    );
  end loop;

  return v_compra_id;
end;
$$;

-- ============================================================
-- cancelar_compra: revierte cantidad, nunca reescribe el costo histórico (regla C.6)
-- ============================================================
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

  -- validar todas las partidas antes de revertir cualquiera (todo o nada)
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

-- ============================================================
-- registrar_ajuste_inventario (regla D)
-- ============================================================
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

-- ============================================================
-- Venta: el descuento de stock ahora pasa por el kardex (antes escribía directo)
-- ============================================================
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

-- ============================================================
-- eliminar_item/eliminar_variante: ya no miran entradas_inventario (tabla en vías de retiro)
-- ============================================================
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

-- ============================================================
-- v_cuadre_inventario: verificación de que el kardex cuadra con lo almacenado (regla G.2)
-- ============================================================
create or replace view v_cuadre_inventario as
select 'item'::text as tipo_destino, i.id as destino_id, i.negocio_id,
       i.stock as existencia_almacenada, i.costo_promedio as costo_almacenado,
       m.saldo_cantidad as existencia_kardex, m.saldo_costo_promedio as costo_kardex
from items i
left join lateral (
  select saldo_cantidad, saldo_costo_promedio from movimientos_inventario
  where item_id = i.id order by fecha desc, creado_en desc limit 1
) m on true
where i.tipo = 'producto' and not i.tiene_variantes
union all
select 'variante', v.id, i.negocio_id, v.existencia, v.costo_promedio,
       m.saldo_cantidad, m.saldo_costo_promedio
from variantes_item v
join items i on i.id = v.item_id
left join lateral (
  select saldo_cantidad, saldo_costo_promedio from movimientos_inventario
  where variante_id = v.id order by fecha desc, creado_en desc limit 1
) m on true;
