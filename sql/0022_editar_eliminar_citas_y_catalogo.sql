-- ============================================================
-- Etapa 16 — Editar/eliminar citas, eliminar ítems del catálogo.
-- Regla del proyecto ("nada se borra, todo se cancela o
-- desactiva") se mantiene para todo lo que tuvo consecuencia
-- financiera. Esta migración cubre la única excepción: el
-- registro que nunca representó un hecho real.
-- ============================================================

-- ------------------------------------------------------------
-- B. Editar cita: misma validación de traslapes que agendar_cita
-- (excluyendo la propia cita), servicios nuevos se congelan al
-- precio/duración vigentes, los que ya estaban no se tocan.
-- No es SECURITY DEFINER: corre con los privilegios de quien
-- llama, las políticas RLS de citas/cita_servicios se aplican
-- normalmente.
-- ------------------------------------------------------------
create or replace function editar_cita(
  p_cita_id uuid,
  p_cliente_id uuid,
  p_fecha_hora timestamptz,
  p_servicios jsonb,
  p_forma_una text,
  p_empleada_id uuid
)
returns void
language plpgsql
set search_path = public
as $$
declare
  v_negocio_id uuid;
  v_estado text;
  v_duracion_nueva integer;
  v_conflictos integer;
begin
  select negocio_id, estado into v_negocio_id, v_estado from citas where id = p_cita_id;
  if v_negocio_id is null then
    raise exception 'La cita no existe.';
  end if;
  if v_estado not in ('pendiente', 'confirmada') then
    raise exception 'Solo se pueden editar citas pendientes o confirmadas.';
  end if;

  select coalesce(sum((s->>'duracion_minutos')::int), 0)
  into v_duracion_nueva
  from jsonb_array_elements(p_servicios) s;

  select count(*) into v_conflictos
  from citas c
  where c.negocio_id = v_negocio_id
    and c.id <> p_cita_id
    and c.empleada_id = p_empleada_id
    and c.estado in ('pendiente', 'confirmada')
    and p_fecha_hora < c.fecha_hora + (
      coalesce((select sum(cs.duracion_minutos) from cita_servicios cs where cs.cita_id = c.id), 0) || ' minutes'
    )::interval
    and c.fecha_hora < p_fecha_hora + (v_duracion_nueva || ' minutes')::interval;

  if v_conflictos > 0 then
    raise exception 'Ya existe una cita en ese horario con esa empleada';
  end if;

  update citas
  set cliente_id = p_cliente_id,
      fecha_hora = p_fecha_hora,
      forma_una = p_forma_una,
      empleada_id = p_empleada_id
  where id = p_cita_id;

  -- Servicios retirados: se elimina su renglón.
  delete from cita_servicios
  where cita_id = p_cita_id
    and item_id not in (select (s->>'item_id')::uuid from jsonb_array_elements(p_servicios) s);

  -- Servicios agregados: precio/duración vigentes al momento de editar.
  -- Los que ya existían no se tocan (conservan su precio congelado
  -- original) porque este insert los excluye explícitamente.
  insert into cita_servicios (cita_id, item_id, precio, duracion_minutos)
  select p_cita_id, (s->>'item_id')::uuid, (s->>'precio')::numeric, (s->>'duracion_minutos')::int
  from jsonb_array_elements(p_servicios) s
  where (s->>'item_id')::uuid not in (
    select item_id from cita_servicios where cita_id = p_cita_id
  );
end;
$$;

-- ------------------------------------------------------------
-- C. Eliminar cita: solo si nunca tuvo consecuencia (pendiente o
-- confirmada, sin venta asociada). cita_servicios se va con ella
-- por el "on delete cascade" ya existente.
-- ------------------------------------------------------------
create or replace function eliminar_cita(p_cita_id uuid)
returns void
language plpgsql
set search_path = public
as $$
declare
  v_estado text;
  v_venta_id uuid;
begin
  select estado, venta_id into v_estado, v_venta_id from citas where id = p_cita_id;
  if v_estado is null then
    raise exception 'La cita no existe.';
  end if;
  if v_estado not in ('pendiente', 'confirmada') or v_venta_id is not null then
    raise exception 'Esta cita no se puede eliminar porque ya se completó o generó una venta. Si fue un error, cancélala en vez de eliminarla.';
  end if;

  delete from citas where id = p_cita_id;
end;
$$;

-- ------------------------------------------------------------
-- D.2/D.3. Eliminar ítem del catálogo: solo si no está
-- referenciado en ningún lado (ventas, citas, entradas de
-- inventario propias o de sus variantes). Mensaje distinto según
-- la razón del bloqueo, para no devolver un error técnico de
-- llave foránea sin explicación.
-- ------------------------------------------------------------
create or replace function eliminar_item(p_item_id uuid)
returns void
language plpgsql
set search_path = public
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
    select 1 from entradas_inventario
    where item_id = p_item_id or variante_id in (select id from variantes_item where item_id = p_item_id)
  ) then
    raise exception '% no se puede eliminar porque tiene inventario registrado (entradas de compra). Puedes desactivarlo para que deje de aparecer.', v_sujeto;
  end if;

  delete from items where id = p_item_id;
end;
$$;
