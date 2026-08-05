-- ============================================================
-- Etapa 11 — Servicios y Productos: separación estructural por
-- items.tipo / categorias_item.tipo. Extiende el inventario
-- (antes solo variantes_item) para que productos sin variante
-- (Glam Nails) también tengan costo promedio y existencia.
-- ============================================================

-- ------------------------------------------------------------
-- 0. Corrección de datos: "Arete u" en Joyeria estaba cargado
--    como servicio por error (inactivo, "duración" de 1 min).
--    Confirmado con el usuario: pasa a producto.
-- ------------------------------------------------------------
update items
set tipo = 'producto', requiere_agenda = false, duracion_minutos = null
where nombre = 'Arete u'
  and tipo = 'servicio'
  and categoria_id = (
    select id from categorias_item
    where nombre = 'Joyeria'
      and negocio_id = (select id from negocios where nombre = 'Glam Nails by Chio')
  );

-- ------------------------------------------------------------
-- A.1 Las categorías pertenecen a un tipo
-- ------------------------------------------------------------
alter table categorias_item add column tipo text not null default 'servicio'
  check (tipo in ('servicio', 'producto'));

update categorias_item set tipo = 'producto'
where negocio_id = (select id from negocios where nombre = 'Glam Nails by Chio')
  and nombre in ('Productos', 'Joyeria');

-- ------------------------------------------------------------
-- A.2 Inventario y costo a nivel de ítem (productos sin variante)
-- ------------------------------------------------------------
alter table items add column costo_promedio numeric(12,4) not null default 0;
alter table items add column stock integer not null default 0;

alter table entradas_inventario add column item_id uuid references items(id);
alter table entradas_inventario alter column variante_id drop not null;
alter table entradas_inventario add constraint entrada_destino_unico
  check ((item_id is null) <> (variante_id is null));

-- A.3 Costo total de la compra + piezas; el unitario se deriva con 4 decimales
alter table entradas_inventario add column costo_total numeric(12,2);
alter table entradas_inventario alter column costo_unitario type numeric(12,4);
alter table variantes_item alter column costo_promedio type numeric(12,4);

-- ------------------------------------------------------------
-- Triggers extendidos (misma lógica, ahora también sobre items)
-- ------------------------------------------------------------
create or replace function recalcular_costo_promedio()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  existencia_actual integer;
  costo_actual numeric(12,4);
  nueva_existencia integer;
  nuevo_costo numeric(12,4);
begin
  if new.variante_id is not null then
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

  elsif new.item_id is not null then
    select stock, costo_promedio into existencia_actual, costo_actual
    from items where id = new.item_id;

    nueva_existencia := existencia_actual + new.cantidad;

    if nueva_existencia = 0 then
      nuevo_costo := new.costo_unitario;
    else
      nuevo_costo := ((existencia_actual * coalesce(costo_actual, 0)) + (new.cantidad * new.costo_unitario)) / nueva_existencia;
    end if;

    update items
    set stock = nueva_existencia, costo_promedio = nuevo_costo
    where id = new.item_id;
  end if;

  return new;
end;
$function$;

create or replace function validar_existencia()
returns trigger
language plpgsql
set search_path to 'public'
as $function$
declare
  existencia_disponible integer;
begin
  if new.variante_id is not null then
    select existencia into existencia_disponible from variantes_item where id = new.variante_id;
    if existencia_disponible < new.cantidad then
      raise exception 'No hay existencia suficiente para esta variante';
    end if;
  else
    -- Solo valida si el ítem es un producto; los servicios no tienen existencia.
    select stock into existencia_disponible
    from items where id = new.item_id and tipo = 'producto';

    if existencia_disponible is not null and existencia_disponible < new.cantidad then
      raise exception 'No hay existencia suficiente para este producto';
    end if;
  end if;
  return new;
end;
$function$;

create or replace function descontar_inventario()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  if new.variante_id is not null then
    update variantes_item set existencia = existencia - new.cantidad where id = new.variante_id;
  elsif new.item_id is not null then
    update items set stock = stock - new.cantidad where id = new.item_id and tipo = 'producto';
  end if;
  return new;
end;
$function$;
