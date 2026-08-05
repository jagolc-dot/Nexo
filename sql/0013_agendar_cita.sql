-- ============================================================
-- Etapa 5 (revisión v2): con citas de varios servicios, la
-- disponibilidad ya no puede validarse en un trigger BEFORE INSERT
-- sobre `citas` sola (la duración total no se conoce hasta que se
-- insertan las filas de cita_servicios). Se reemplaza el trigger
-- de la Etapa 5 original por una función que hace todo en una sola
-- transacción atómica, mismo patrón que crear_venta (Etapa 4).
-- ============================================================
drop trigger if exists trg_validar_disponibilidad_cita on citas;
drop function if exists validar_disponibilidad_cita();

create or replace function agendar_cita(
  p_negocio_id uuid,
  p_cliente_id uuid,
  p_fecha_hora timestamptz,
  p_servicios jsonb,
  p_forma_una text
)
returns uuid
language plpgsql
set search_path = public
as $$
declare
  v_cita_id uuid;
  v_duracion_nueva integer;
  v_conflictos integer;
begin
  select coalesce(sum((s->>'duracion_minutos')::int), 0)
  into v_duracion_nueva
  from jsonb_array_elements(p_servicios) s;

  select count(*) into v_conflictos
  from citas c
  where c.negocio_id = p_negocio_id
    and c.estado in ('pendiente', 'confirmada')
    and p_fecha_hora < c.fecha_hora + (
      coalesce((select sum(cs.duracion_minutos) from cita_servicios cs where cs.cita_id = c.id), 0) || ' minutes'
    )::interval
    and c.fecha_hora < p_fecha_hora + (v_duracion_nueva || ' minutes')::interval;

  if v_conflictos > 0 then
    raise exception 'Ya existe una cita en ese horario';
  end if;

  insert into citas (negocio_id, cliente_id, fecha_hora, forma_una)
  values (p_negocio_id, p_cliente_id, p_fecha_hora, p_forma_una)
  returning id into v_cita_id;

  insert into cita_servicios (cita_id, item_id, precio, duracion_minutos)
  select v_cita_id, (s->>'item_id')::uuid, (s->>'precio')::numeric, (s->>'duracion_minutos')::int
  from jsonb_array_elements(p_servicios) s;

  return v_cita_id;
end;
$$;
