-- ============================================================
-- Etapa 5: no permitir dos citas encimadas en el mismo negocio,
-- considerando la duración del servicio. Resuelto en la base de
-- datos para no depender de que el frontend lo calcule bien.
-- ============================================================
create or replace function validar_disponibilidad_cita()
returns trigger as $$
declare
  duracion_nueva integer;
  conflictos integer;
begin
  select duracion_minutos into duracion_nueva from items where id = new.item_id;
  duracion_nueva := coalesce(duracion_nueva, 0);

  select count(*) into conflictos
  from citas c
  join items i on i.id = c.item_id
  where c.negocio_id = new.negocio_id
    and c.id <> new.id
    and c.estado in ('pendiente', 'confirmada')
    and new.fecha_hora < c.fecha_hora + (coalesce(i.duracion_minutos, 0) || ' minutes')::interval
    and c.fecha_hora < new.fecha_hora + (duracion_nueva || ' minutes')::interval;

  if conflictos > 0 then
    raise exception 'Ya existe una cita en ese horario';
  end if;

  return new;
end;
$$ language plpgsql set search_path = public;

create trigger trg_validar_disponibilidad_cita
before insert on citas
for each row execute function validar_disponibilidad_cita();
