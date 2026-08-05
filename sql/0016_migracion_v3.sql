-- ============================================================
-- Etapa 1c — Migración de esquema v3 (empleadas)
-- Prepara la agenda para varias personas atendiendo. Hoy solo
-- trabaja Chio; el traslape deja de validarse global y pasa a
-- validarse por empleada.
-- ============================================================

-- ============================================================
-- Empleadas / personal que atiende
-- ============================================================
create table empleadas (
  id uuid primary key default gen_random_uuid(),
  negocio_id uuid not null references negocios(id) on delete cascade,
  nombre text not null,
  usuario_id uuid references auth.users(id),  -- null = aún no tiene acceso al sistema
  activo boolean not null default true,
  creado_en timestamptz not null default now()
);

alter table empleadas enable row level security;
create policy empleadas_acceso on empleadas for all
  using (is_negocio_member(negocio_id)) with check (is_negocio_member(negocio_id));

-- Asignación de la cita a quien la atiende
alter table citas add column empleada_id uuid references empleadas(id);

-- Registro inicial: Chio
insert into empleadas (negocio_id, nombre)
select id, 'Chio' from negocios where nombre = 'Glam Nails by Chio';

-- Asignar las citas existentes a Chio
update citas set empleada_id = (select id from empleadas where nombre = 'Chio')
where empleada_id is null
  and negocio_id = (select id from negocios where nombre = 'Glam Nails by Chio');

-- ============================================================
-- agendar_cita: el traslape ahora se valida por empleada, no
-- globalmente. Si no se especifica empleada y el negocio tiene
-- exactamente una activa, se preselecciona sola (comportamiento
-- idéntico al actual mientras solo exista Chio). Si hay más de
-- una activa y no se especifica, se exige elegir explícitamente.
-- ============================================================
create or replace function agendar_cita(
  p_negocio_id uuid,
  p_cliente_id uuid,
  p_fecha_hora timestamptz,
  p_servicios jsonb,
  p_forma_una text,
  p_empleada_id uuid default null
)
returns uuid
language plpgsql
set search_path = public
as $$
declare
  v_cita_id uuid;
  v_empleada_id uuid := p_empleada_id;
  v_empleadas_activas integer;
  v_duracion_nueva integer;
  v_conflictos integer;
begin
  if v_empleada_id is null then
    select count(*), min(id) into v_empleadas_activas, v_empleada_id
    from empleadas
    where negocio_id = p_negocio_id and activo = true;

    if v_empleadas_activas = 0 then
      raise exception 'El negocio no tiene empleadas activas';
    elsif v_empleadas_activas > 1 then
      raise exception 'Debes especificar qué empleada atiende la cita';
    end if;
  end if;

  select coalesce(sum((s->>'duracion_minutos')::int), 0)
  into v_duracion_nueva
  from jsonb_array_elements(p_servicios) s;

  select count(*) into v_conflictos
  from citas c
  where c.negocio_id = p_negocio_id
    and c.empleada_id = v_empleada_id
    and c.estado in ('pendiente', 'confirmada')
    and p_fecha_hora < c.fecha_hora + (
      coalesce((select sum(cs.duracion_minutos) from cita_servicios cs where cs.cita_id = c.id), 0) || ' minutes'
    )::interval
    and c.fecha_hora < p_fecha_hora + (v_duracion_nueva || ' minutes')::interval;

  if v_conflictos > 0 then
    raise exception 'Ya existe una cita en ese horario con esa empleada';
  end if;

  insert into citas (negocio_id, cliente_id, fecha_hora, forma_una, empleada_id)
  values (p_negocio_id, p_cliente_id, p_fecha_hora, p_forma_una, v_empleada_id)
  returning id into v_cita_id;

  insert into cita_servicios (cita_id, item_id, precio, duracion_minutos)
  select v_cita_id, (s->>'item_id')::uuid, (s->>'precio')::numeric, (s->>'duracion_minutos')::int
  from jsonb_array_elements(p_servicios) s;

  return v_cita_id;
end;
$$;
