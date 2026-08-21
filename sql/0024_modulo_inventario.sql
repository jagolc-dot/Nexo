-- Etapa 21 — Módulo de Inventario
-- Almacenes, compras (con prorrateo de flete por valor), ajustes con motivo
-- y kardex auditable. fn_registrar_movimiento es el único punto que escribe
-- items.stock/costo_promedio o variantes_item.existencia/costo_promedio, y
-- solo vía un insert en movimientos_inventario.

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
select id, 'Principal' from negocios;

-- ============================================================
-- CATÁLOGO: código y unidad de medida
-- ============================================================
-- unidad es obligatoria para productos, nula para servicios (se valida en
-- la aplicación; a nivel de columna se deja nullable a propósito).
alter table items add column codigo text;
alter table items add column unidad text
  check (unidad is null or unidad in ('Pieza','Caja','Paquete','Par','Juego','Gramo','Kilogramo','Mililitro','Litro','Metro'));

-- El código identifica lo que se vende: en un producto sin variantes vive
-- en items; en un producto con variantes (Don camisa) vive en cada
-- variante — el modelo no lleva código porque no se vende ni se cuenta.
create unique index items_codigo_unico on items (negocio_id, codigo) where codigo is not null;
alter table items add constraint items_codigo_solo_sin_variantes
  check (not (tiene_variantes and codigo is not null));

-- ============================================================
-- VARIANTES: código propio (único global, no por negocio)
-- ============================================================
alter table variantes_item add column codigo text;
create unique index variantes_codigo_unico on variantes_item (codigo) where codigo is not null;

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
  notas text,
  subtotal numeric(12,2) not null default 0,
  costo_envio numeric(12,2) not null default 0,
  total numeric(12,2) not null default 0,
  estado text not null default 'confirmada' check (estado in ('confirmada','cancelada')),
  creado_en timestamptz not null default now(),
  creado_por uuid references auth.users(id)
);

alter table compras enable row level security;
create policy compras_acceso on compras for all
  using (is_negocio_member(negocio_id)) with check (is_negocio_member(negocio_id));

-- ============================================================
-- COMPRA_PARTIDAS
-- ============================================================
create table compra_partidas (
  id uuid primary key default gen_random_uuid(),
  compra_id uuid not null references compras(id) on delete cascade,
  item_id uuid references items(id),
  variante_id uuid references variantes_item(id),
  cantidad integer not null check (cantidad > 0),
  costo_total_partida numeric(12,2) not null check (costo_total_partida >= 0),
  costo_unitario numeric(12,4) not null,        -- sin flete: costo_total_partida / cantidad
  flete_asignado numeric(12,4) not null default 0,
  costo_unitario_final numeric(12,4) not null,  -- con flete (NIF C-4)
  constraint partida_destino_unico check ((item_id is null) <> (variante_id is null))
);

alter table compra_partidas enable row level security;
create policy compra_partidas_acceso on compra_partidas for all
  using (exists (select 1 from compras where compras.id = compra_partidas.compra_id and is_negocio_member(compras.negocio_id)))
  with check (exists (select 1 from compras where compras.id = compra_partidas.compra_id and is_negocio_member(compras.negocio_id)));

-- ============================================================
-- AJUSTES_INVENTARIO (separado del kardex: motivo y tipo de ajuste)
-- ============================================================
create table ajustes_inventario (
  id uuid primary key default gen_random_uuid(),
  negocio_id uuid not null references negocios(id) on delete cascade,
  almacen_id uuid not null references almacenes(id),
  item_id uuid references items(id),
  variante_id uuid references variantes_item(id),
  tipo text not null check (tipo in ('merma', 'caducidad', 'perdida', 'obsequio', 'uso_interno', 'ajuste_conteo')),
  cantidad integer not null check (cantidad <> 0), -- con signo: negativo en salidas, positivo en conteo
  motivo text not null,
  fecha date not null,
  creado_en timestamptz not null default now(),
  creado_por uuid references auth.users(id),
  constraint ajuste_destino_unico check ((item_id is null) <> (variante_id is null))
);

alter table ajustes_inventario enable row level security;
create policy ajustes_inventario_acceso on ajustes_inventario for all
  using (is_negocio_member(negocio_id)) with check (is_negocio_member(negocio_id));

-- ============================================================
-- MOVIMIENTOS DE INVENTARIO (kardex)
-- ============================================================
create table movimientos_inventario (
  id uuid primary key default gen_random_uuid(),
  negocio_id uuid not null references negocios(id) on delete cascade,
  almacen_id uuid not null references almacenes(id),
  item_id uuid references items(id),
  variante_id uuid references variantes_item(id),
  tipo text not null check (tipo in ('compra','venta','ajuste','cancelacion_venta','cancelacion_compra','recosteo')),
  cantidad integer not null,                        -- con signo: + entra, - sale
  costo_unitario numeric(12,4) not null,
  existencia_resultante integer not null,
  costo_promedio_resultante numeric(12,4) not null,
  referencia_id uuid,                               -- según tipo: compras/ventas/ajustes_inventario.id (o null en recosteo)
  fecha timestamptz not null default now(),          -- fecha de negocio (puede backdatearse, ej. fecha de la compra)
  creado_en timestamptz not null default clock_timestamp(), -- momento real de inserción — desempate cuando
                                                       -- varias partidas de una compra comparten la misma
                                                       -- fecha de negocio. clock_timestamp() y no now(): now()
                                                       -- devuelve la hora de inicio de la transacción completa,
                                                       -- igual para todas las filas insertadas en el mismo loop.
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
  p_cantidad integer,       -- con signo: + entra, - sale
  p_costo_unitario numeric, -- significado según p_tipo (ver ramas abajo)
  p_referencia_id uuid,
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
  v_costo_a_guardar numeric(12,4);
  v_movimiento_id uuid;
begin
  if (p_item_id is null) = (p_variante_id is null) then
    raise exception 'Debe especificarse exactamente un producto o una variante.';
  end if;
  if p_tipo not in ('compra','venta','ajuste','cancelacion_venta','cancelacion_compra','recosteo') then
    raise exception 'Tipo de movimiento no reconocido: %', p_tipo;
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

  v_nueva_existencia := v_existencia + p_cantidad;
  if v_nueva_existencia < 0 then
    raise exception 'No hay existencia suficiente (disponible: %, solicitado: %).', v_existencia, -p_cantidad;
  end if;

  -- Solo 'compra' (suma ponderada) y 'cancelacion_compra' (resta ponderada,
  -- reversión) recalculan el costo promedio. Venta/ajuste/cancelacion_venta
  -- mueven cantidad sin tocar el costo — regla explícita del proyecto.
  if p_tipo = 'compra' then
    if v_nueva_existencia = 0 then
      v_nuevo_costo := p_costo_unitario;
    else
      v_nuevo_costo := ((v_existencia * coalesce(v_costo,0)) + (p_cantidad * p_costo_unitario)) / v_nueva_existencia;
    end if;
    v_costo_a_guardar := p_costo_unitario;
  elsif p_tipo = 'cancelacion_compra' then
    if v_nueva_existencia = 0 then
      v_nuevo_costo := 0;
    else
      v_nuevo_costo := ((v_existencia * coalesce(v_costo,0)) - (abs(p_cantidad) * p_costo_unitario)) / v_nueva_existencia;
      if v_nuevo_costo < 0 then
        v_nuevo_costo := 0; -- salvaguarda: el costo promedio nunca es negativo
      end if;
    end if;
    v_costo_a_guardar := p_costo_unitario;
  elsif p_tipo = 'recosteo' then
    -- p_costo_unitario ya viene recalculado (recorrido del kardex); se
    -- guarda el costo ANTERIOR en costo_unitario para dejar constancia de
    -- "antes/después" en la misma fila.
    v_nuevo_costo := p_costo_unitario;
    v_costo_a_guardar := coalesce(v_costo, 0);
  else
    v_nuevo_costo := v_costo;
    v_costo_a_guardar := p_costo_unitario;
  end if;

  insert into movimientos_inventario (
    negocio_id, almacen_id, item_id, variante_id, tipo, cantidad,
    costo_unitario, existencia_resultante, costo_promedio_resultante,
    referencia_id, fecha
  ) values (
    p_negocio_id, p_almacen_id, p_item_id, p_variante_id, p_tipo, p_cantidad,
    v_costo_a_guardar, v_nueva_existencia, v_nuevo_costo,
    p_referencia_id, p_fecha
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
-- confirmar_compra: prorrateo de flete por valor + transacción
-- ============================================================
create or replace function confirmar_compra(
  p_negocio_id uuid,
  p_almacen_id uuid,
  p_proveedor text,
  p_folio text,
  p_fecha date,
  p_notas text,
  p_costo_envio numeric,
  p_partidas jsonb  -- [{item_id, variante_id, cantidad, costo_total_partida}]
) returns uuid
language plpgsql
set search_path to 'public'
as $$
declare
  v_compra_id uuid;
  v_subtotal numeric(12,2);
  v_partida jsonb;
  v_flete_asignado numeric(12,4);
  v_costo_unitario numeric(12,4);
  v_costo_unitario_final numeric(12,4);
  v_max_costo numeric(12,2) := -1;
  v_max_idx int;
  v_idx int := 0;
  v_suma_flete numeric(12,4) := 0;
  v_diferencia numeric(12,4);
  v_fletes numeric(12,4)[] := array[]::numeric(12,4)[];
  v_item_id uuid;
  v_variante_id uuid;
  v_cantidad integer;
  v_costo_total_partida numeric(12,2);
begin
  select coalesce(sum((p->>'costo_total_partida')::numeric), 0) into v_subtotal
  from jsonb_array_elements(p_partidas) p;

  if v_subtotal <= 0 then
    raise exception 'La compra debe tener al menos una partida con costo mayor a cero.';
  end if;

  insert into compras (negocio_id, almacen_id, proveedor, folio, fecha, notas, subtotal, costo_envio, total, creado_por)
  values (p_negocio_id, p_almacen_id, p_proveedor, p_folio, p_fecha, p_notas, v_subtotal, coalesce(p_costo_envio,0), v_subtotal + coalesce(p_costo_envio,0), auth.uid())
  returning id into v_compra_id;

  -- primera pasada: prorrateo crudo por valor, y ubicar la partida de mayor costo
  for v_partida in select * from jsonb_array_elements(p_partidas)
  loop
    v_idx := v_idx + 1;
    v_costo_total_partida := (v_partida->>'costo_total_partida')::numeric;
    v_flete_asignado := round(coalesce(p_costo_envio,0) * v_costo_total_partida / v_subtotal, 4);
    v_fletes := v_fletes || v_flete_asignado;
    v_suma_flete := v_suma_flete + v_flete_asignado;
    if v_costo_total_partida > v_max_costo then
      v_max_costo := v_costo_total_partida;
      v_max_idx := v_idx;
    end if;
  end loop;

  -- ajustar el residual de redondeo completo en la partida de mayor valor,
  -- para que la suma de los fletes cuadre exacto con el envío capturado
  v_diferencia := coalesce(p_costo_envio,0) - v_suma_flete;
  if v_diferencia <> 0 then
    v_fletes[v_max_idx] := v_fletes[v_max_idx] + v_diferencia;
  end if;

  -- segunda pasada: insertar partidas y aplicar movimientos de entrada
  v_idx := 0;
  for v_partida in select * from jsonb_array_elements(p_partidas)
  loop
    v_idx := v_idx + 1;
    v_item_id := nullif(v_partida->>'item_id','')::uuid;
    v_variante_id := nullif(v_partida->>'variante_id','')::uuid;
    v_cantidad := (v_partida->>'cantidad')::integer;
    v_costo_total_partida := (v_partida->>'costo_total_partida')::numeric;
    v_flete_asignado := v_fletes[v_idx];
    v_costo_unitario := v_costo_total_partida / v_cantidad;
    v_costo_unitario_final := (v_costo_total_partida + v_flete_asignado) / v_cantidad;

    insert into compra_partidas (compra_id, item_id, variante_id, cantidad, costo_total_partida, costo_unitario, flete_asignado, costo_unitario_final)
    values (v_compra_id, v_item_id, v_variante_id, v_cantidad, v_costo_total_partida, v_costo_unitario, v_flete_asignado, v_costo_unitario_final);

    perform fn_registrar_movimiento(
      p_negocio_id, p_almacen_id, v_item_id, v_variante_id, 'compra', v_cantidad,
      v_costo_unitario_final, v_compra_id, p_fecha::timestamptz
    );
  end loop;

  return v_compra_id;
end;
$$;

-- ============================================================
-- cancelar_compra: revierte cantidad y costo promedio (resta ponderada);
-- nunca reescribe el histórico ya vendido (regla C.6/C.7)
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
  for v_detalle in select * from compra_partidas where compra_id = p_compra_id
  loop
    if v_detalle.variante_id is not null then
      select existencia into v_existencia from variantes_item where id = v_detalle.variante_id;
    else
      select stock into v_existencia from items where id = v_detalle.item_id;
    end if;

    if v_existencia < v_detalle.cantidad then
      raise exception 'No se puede cancelar: parte de esta compra ya se vendió. Usa un ajuste de inventario en su lugar.';
    end if;
  end loop;

  for v_detalle in select * from compra_partidas where compra_id = p_compra_id
  loop
    perform fn_registrar_movimiento(
      v_negocio_id, v_almacen_id, v_detalle.item_id, v_detalle.variante_id,
      'cancelacion_compra', -v_detalle.cantidad, v_detalle.costo_unitario_final,
      p_compra_id
    );
  end loop;

  update compras set estado = 'cancelada' where id = p_compra_id;
end;
$$;

-- ============================================================
-- registrar_ajuste_inventario (regla D): motivo obligatorio, nunca
-- recalcula el costo promedio (ni siquiera un ajuste positivo por conteo)
-- ============================================================
create or replace function registrar_ajuste_inventario(
  p_negocio_id uuid,
  p_almacen_id uuid,
  p_item_id uuid,
  p_variante_id uuid,
  p_tipo text,        -- merma | caducidad | perdida | obsequio | uso_interno | ajuste_conteo
  p_cantidad integer, -- con signo: negativo para salidas, positivo para conteo
  p_motivo text,
  p_fecha date default current_date
) returns uuid
language plpgsql
set search_path to 'public'
as $$
declare
  v_ajuste_id uuid;
  v_costo_actual numeric(12,4);
begin
  if p_tipo not in ('merma','caducidad','perdida','obsequio','uso_interno','ajuste_conteo') then
    raise exception 'Tipo de ajuste inválido.';
  end if;
  if p_motivo is null or btrim(p_motivo) = '' then
    raise exception 'El motivo del ajuste es obligatorio.';
  end if;
  if p_cantidad = 0 then
    raise exception 'La cantidad del ajuste no puede ser cero.';
  end if;

  insert into ajustes_inventario (negocio_id, almacen_id, item_id, variante_id, tipo, cantidad, motivo, fecha, creado_por)
  values (p_negocio_id, p_almacen_id, p_item_id, p_variante_id, p_tipo, p_cantidad, p_motivo, p_fecha, auth.uid())
  returning id into v_ajuste_id;

  if p_variante_id is not null then
    select costo_promedio into v_costo_actual from variantes_item where id = p_variante_id;
  else
    select costo_promedio into v_costo_actual from items where id = p_item_id;
  end if;

  perform fn_registrar_movimiento(
    p_negocio_id, p_almacen_id, p_item_id, p_variante_id, 'ajuste', p_cantidad,
    coalesce(v_costo_actual, 0), v_ajuste_id, p_fecha::timestamptz
  );

  return v_ajuste_id;
end;
$$;

-- ============================================================
-- cancelar_venta: devuelve al inventario las líneas de producto de una
-- venta cancelada (regla E.6) — el costo congelado en venta_detalle y el
-- costo promedio del producto no se tocan.
-- ============================================================
create or replace function cancelar_venta(p_venta_id uuid) returns void
language plpgsql
set search_path to 'public'
as $$
declare
  v_negocio_id uuid;
  v_almacen_id uuid;
  v_estado text;
  v_linea record;
  v_es_producto boolean;
begin
  select negocio_id, estado into v_negocio_id, v_estado from ventas where id = p_venta_id;
  if v_negocio_id is null then
    raise exception 'La venta no existe.';
  end if;
  if v_estado = 'cancelada' then
    raise exception 'Esta venta ya está cancelada.';
  end if;

  select id into v_almacen_id from almacenes where negocio_id = v_negocio_id and activo limit 1;

  for v_linea in select * from venta_detalle where venta_id = p_venta_id
  loop
    if v_linea.variante_id is not null then
      perform fn_registrar_movimiento(
        v_negocio_id, v_almacen_id, null, v_linea.variante_id, 'cancelacion_venta',
        v_linea.cantidad, v_linea.costo_unitario, p_venta_id
      );
    else
      select (tipo = 'producto') into v_es_producto from items where id = v_linea.item_id;
      if v_es_producto then
        perform fn_registrar_movimiento(
          v_negocio_id, v_almacen_id, v_linea.item_id, null, 'cancelacion_venta',
          v_linea.cantidad, v_linea.costo_unitario, p_venta_id
        );
      end if;
    end if;
  end loop;

  update ventas set estado = 'cancelada' where id = p_venta_id;
end;
$$;

-- ============================================================
-- Recosteo (C.8): recorre el kardex reproduciendo la misma aritmética de
-- fn_registrar_movimiento para reconstruir existencia/costo vigentes. Un
-- 'recosteo' previo se adopta como punto de control (no se recalcula).
-- ============================================================
create or replace function calcular_recosteo(p_item_id uuid, p_variante_id uuid)
returns table(existencia_calculada integer, costo_calculado numeric)
language plpgsql
set search_path to 'public'
as $$
declare
  v_mov record;
  v_existencia integer := 0;
  v_costo numeric(12,4) := 0;
begin
  for v_mov in
    select tipo, cantidad, costo_unitario, existencia_resultante, costo_promedio_resultante
    from movimientos_inventario
    where (p_variante_id is not null and variante_id = p_variante_id)
       or (p_variante_id is null and item_id = p_item_id and variante_id is null)
    order by fecha, creado_en
  loop
    if v_mov.tipo = 'recosteo' then
      v_existencia := v_mov.existencia_resultante;
      v_costo := v_mov.costo_promedio_resultante;
    elsif v_mov.tipo = 'compra' then
      v_existencia := v_existencia + v_mov.cantidad;
      if v_existencia = 0 then
        v_costo := v_mov.costo_unitario;
      else
        v_costo := (((v_existencia - v_mov.cantidad) * v_costo) + (v_mov.cantidad * v_mov.costo_unitario)) / v_existencia;
      end if;
    elsif v_mov.tipo = 'cancelacion_compra' then
      v_existencia := v_existencia + v_mov.cantidad;
      if v_existencia = 0 then
        v_costo := 0;
      else
        v_costo := (((v_existencia - v_mov.cantidad) * v_costo) - (abs(v_mov.cantidad) * v_mov.costo_unitario)) / v_existencia;
        if v_costo < 0 then
          v_costo := 0;
        end if;
      end if;
    else
      v_existencia := v_existencia + v_mov.cantidad;
    end if;
  end loop;

  return query select v_existencia, v_costo;
end;
$$;

create or replace function previsualizar_recosteo(p_item_id uuid, p_variante_id uuid)
returns table(
  existencia_actual integer, costo_actual numeric,
  existencia_recalculada integer, costo_recalculado numeric
)
language plpgsql
set search_path to 'public'
as $$
declare
  v_existencia_actual integer;
  v_costo_actual numeric(12,4);
  v_calc record;
begin
  if p_variante_id is not null then
    select existencia, costo_promedio into v_existencia_actual, v_costo_actual from variantes_item where id = p_variante_id;
  else
    select stock, costo_promedio into v_existencia_actual, v_costo_actual from items where id = p_item_id;
  end if;

  select * into v_calc from calcular_recosteo(p_item_id, p_variante_id);

  return query select v_existencia_actual, v_costo_actual, v_calc.existencia_calculada, v_calc.costo_calculado;
end;
$$;

create or replace function aplicar_recosteo(
  p_negocio_id uuid, p_almacen_id uuid, p_item_id uuid, p_variante_id uuid
) returns uuid
language plpgsql
set search_path to 'public'
as $$
declare
  v_existencia_actual integer;
  v_costo_actual numeric(12,4);
  v_calc record;
  v_delta integer;
begin
  if p_variante_id is not null then
    select existencia, costo_promedio into v_existencia_actual, v_costo_actual from variantes_item where id = p_variante_id for update;
  else
    select stock, costo_promedio into v_existencia_actual, v_costo_actual from items where id = p_item_id for update;
  end if;

  select * into v_calc from calcular_recosteo(p_item_id, p_variante_id);

  if v_calc.existencia_calculada = v_existencia_actual and abs(v_calc.costo_calculado - coalesce(v_costo_actual,0)) < 0.0001 then
    return null; -- sin diferencia, no se escribe nada
  end if;

  v_delta := v_calc.existencia_calculada - v_existencia_actual;

  return fn_registrar_movimiento(
    p_negocio_id, p_almacen_id, p_item_id, p_variante_id, 'recosteo', v_delta,
    v_calc.costo_calculado, null
  );
end;
$$;

-- ============================================================
-- Venta: el descuento de stock pasa por el kardex (cantidad negativa)
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
      v_negocio_id, v_almacen_id, null, new.variante_id, 'venta',
      -new.cantidad, new.costo_unitario, new.venta_id
    );
  else
    select (tipo = 'producto') into v_es_producto from items where id = new.item_id;
    if v_es_producto then
      perform fn_registrar_movimiento(
        v_negocio_id, v_almacen_id, new.item_id, null, 'venta',
        -new.cantidad, new.costo_unitario, new.venta_id
      );
    end if;
  end if;

  return new;
end;
$$;

-- ============================================================
-- eliminar_item/eliminar_variante: referencian movimientos_inventario en
-- vez de la vieja entradas_inventario (tabla en vías de retiro)
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
-- v_cuadre_inventario: verificación de que el kardex cuadra con lo
-- almacenado (regla G.2 / E.3)
-- ============================================================
create or replace view v_cuadre_inventario as
select 'item'::text as tipo_destino, i.id as destino_id, i.negocio_id,
       i.stock as existencia_almacenada, i.costo_promedio as costo_almacenado,
       m.existencia_resultante as existencia_kardex, m.costo_promedio_resultante as costo_kardex
from items i
left join lateral (
  select existencia_resultante, costo_promedio_resultante from movimientos_inventario
  where item_id = i.id order by fecha desc, creado_en desc limit 1
) m on true
where i.tipo = 'producto' and not i.tiene_variantes
union all
select 'variante', v.id, i.negocio_id, v.existencia, v.costo_promedio,
       m.existencia_resultante, m.costo_promedio_resultante
from variantes_item v
join items i on i.id = v.item_id
left join lateral (
  select existencia_resultante, costo_promedio_resultante from movimientos_inventario
  where variante_id = v.id order by fecha desc, creado_en desc limit 1
) m on true;
