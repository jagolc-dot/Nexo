-- ============================================================
-- Etapa 1b — Migración de esquema v2
-- Migración incremental sobre el esquema v1 ya aplicado.
-- ============================================================

-- ============================================================
-- 1. Temas y logo por negocio
-- ============================================================
alter table negocios add column tema text not null default 'neutro';
alter table negocios add column logo_url text;

update negocios set nombre = 'Glam Nails by Chio', tema = 'boutique' where nombre = 'Uñas';
update negocios set tema = 'sastreria' where nombre = 'Don camisa';

-- ============================================================
-- 2. Perfiles: acceso por nombre de usuario
-- ============================================================
create table perfiles (
  usuario_id uuid primary key references auth.users(id) on delete cascade,
  usuario text not null unique,
  nombre_completo text,
  creado_en timestamptz not null default now()
);

alter table perfiles enable row level security;
create policy perfiles_propio on perfiles for all
  using (usuario_id = auth.uid()) with check (usuario_id = auth.uid());

-- Backfill: Joel ya tenía cuenta antes de esta migración; necesita un
-- perfil para poder loguearse por usuario en vez de correo.
insert into perfiles (usuario_id, usuario, nombre_completo)
select id, 'joel.guzman', 'Joel Guzmán' from auth.users where email = 'jagolc@gmail.com';

-- ============================================================
-- 3. Categorías de catálogo (lista cerrada por negocio)
-- ============================================================
create table categorias_item (
  id uuid primary key default gen_random_uuid(),
  negocio_id uuid not null references negocios(id) on delete cascade,
  nombre text not null,
  orden integer not null default 0,
  activo boolean not null default true,
  unique (negocio_id, nombre)
);

alter table categorias_item enable row level security;
create policy categorias_item_acceso on categorias_item for all
  using (is_negocio_member(negocio_id)) with check (is_negocio_member(negocio_id));

insert into categorias_item (negocio_id, nombre, orden)
select id, 'Escultura', 1 from negocios where nombre = 'Glam Nails by Chio';
insert into categorias_item (negocio_id, nombre, orden)
select id, 'Retiro y mantenimiento', 2 from negocios where nombre = 'Glam Nails by Chio';
-- Categorías adicionales para no perder la clasificación de los ítems
-- que ya existían con categoria de texto libre.
insert into categorias_item (negocio_id, nombre, orden)
select id, 'Joyeria', 3 from negocios where nombre = 'Glam Nails by Chio';
insert into categorias_item (negocio_id, nombre, orden)
select id, 'Cuidado', 4 from negocios where nombre = 'Glam Nails by Chio';

alter table items add column categoria_id uuid references categorias_item(id);

-- Reasignar ítems existentes de su categoria de texto libre a la
-- categoría cerrada equivalente, antes de borrar la columna vieja.
update items set categoria_id = categorias_item.id
from categorias_item
where categorias_item.negocio_id = items.negocio_id
  and categorias_item.nombre = items.categoria;

alter table items drop column categoria;

-- ============================================================
-- 4. Citas: varios servicios + forma de uña
-- ============================================================
create table cita_servicios (
  id uuid primary key default gen_random_uuid(),
  cita_id uuid not null references citas(id) on delete cascade,
  item_id uuid not null references items(id),
  precio numeric(10,2) not null,        -- copia al momento de agendar
  duracion_minutos integer not null     -- copia al momento de agendar
);

alter table cita_servicios enable row level security;
create policy cita_servicios_acceso on cita_servicios for all
  using (exists (select 1 from citas where citas.id = cita_servicios.cita_id and is_negocio_member(citas.negocio_id)))
  with check (exists (select 1 from citas where citas.id = cita_servicios.cita_id and is_negocio_member(citas.negocio_id)));

alter table citas add column forma_una text
  check (forma_una is null or forma_una in ('Almendrada', 'Cuadrada', 'Coffin', 'Stiletto'));

alter table citas alter column item_id drop not null;

-- Backfill: citas existentes migran su servicio único a cita_servicios,
-- para que ninguna cita se quede sin servicio visible.
insert into cita_servicios (cita_id, item_id, precio, duracion_minutos)
select c.id, c.item_id, coalesce(i.precio_base, 0), coalesce(i.duracion_minutos, 0)
from citas c join items i on i.id = c.item_id
where c.item_id is not null;
