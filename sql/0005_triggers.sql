-- ============================================================
-- TRIGGERS: costeo promedio ponderado
-- ============================================================
create or replace function recalcular_costo_promedio()
returns trigger as $$
declare
  existencia_actual integer;
  costo_actual numeric(10,2);
  nueva_existencia integer;
  nuevo_costo numeric(10,2);
begin
  select existencia, costo_promedio into existencia_actual, costo_actual
  from variantes_item where id = new.variante_id;

  nueva_existencia := existencia_actual + new.cantidad;

  if nueva_existencia = 0 then
    nuevo_costo := new.costo_unitario;
  else
    nuevo_costo := ((existencia_actual * coalesce(costo_actual, 0)) + (new.cantidad * new.costo_unitario)) / nueva_existencia;
  end if;

  update variantes_item
  set existencia = nueva_existencia, costo_promedio = nuevo_costo
  where id = new.variante_id;

  return new;
end;
$$ language plpgsql security definer;

create trigger trg_entrada_inventario
after insert on entradas_inventario
for each row execute function recalcular_costo_promedio();

-- ============================================================
-- TRIGGERS: descuento de inventario al vender + validación de existencia
-- ============================================================
create or replace function validar_existencia()
returns trigger as $$
declare
  existencia_disponible integer;
begin
  if new.variante_id is not null then
    select existencia into existencia_disponible from variantes_item where id = new.variante_id;
    if existencia_disponible < new.cantidad then
      raise exception 'No hay existencia suficiente para esta variante';
    end if;
  end if;
  return new;
end;
$$ language plpgsql;

create trigger trg_validar_existencia
before insert on venta_detalle
for each row execute function validar_existencia();

create or replace function descontar_inventario()
returns trigger as $$
begin
  if new.variante_id is not null then
    update variantes_item set existencia = existencia - new.cantidad where id = new.variante_id;
  end if;
  return new;
end;
$$ language plpgsql security definer;

create trigger trg_venta_detalle_descuento
after insert on venta_detalle
for each row execute function descontar_inventario();
