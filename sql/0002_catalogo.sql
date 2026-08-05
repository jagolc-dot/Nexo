-- ============================================================
-- 3. ITEMS (servicios o modelos de producto)
-- ============================================================
create table items (
  id uuid primary key default gen_random_uuid(),
  negocio_id uuid not null references negocios(id) on delete cascade,
  nombre text not null,
  tipo text not null check (tipo in ('servicio', 'producto')),
  categoria text,
  requiere_agenda boolean not null default false,
  tiene_variantes boolean not null default false,
  precio_base numeric(10,2),
  duracion_minutos integer,          -- solo aplica a servicios
  activo boolean not null default true,
  creado_en timestamptz not null default now()
);

-- ============================================================
-- 4. VARIANTES_ITEM (color / talla / existencia / costo promedio)
-- ============================================================
create table variantes_item (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references items(id) on delete cascade,
  color text,
  talla text,
  precio numeric(10,2),              -- si es null, se usa items.precio_base
  costo_promedio numeric(10,2) not null default 0,
  existencia integer not null default 0
);

-- ============================================================
-- 5. ENTRADAS_INVENTARIO (cada compra/producción recalcula el promedio)
-- ============================================================
create table entradas_inventario (
  id uuid primary key default gen_random_uuid(),
  negocio_id uuid not null references negocios(id) on delete cascade,
  variante_id uuid not null references variantes_item(id) on delete cascade,
  cantidad integer not null check (cantidad > 0),
  costo_unitario numeric(10,2) not null,
  fecha timestamptz not null default now()
);
