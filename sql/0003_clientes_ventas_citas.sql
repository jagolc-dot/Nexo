-- ============================================================
-- 6. CLIENTES
-- ============================================================
create table clientes (
  id uuid primary key default gen_random_uuid(),
  negocio_id uuid not null references negocios(id) on delete cascade,
  nombre text not null,
  telefono text,
  contacto_red_social text,
  notas text,
  activo boolean not null default true,
  creado_en timestamptz not null default now(),
  constraint al_menos_un_contacto check (telefono is not null or contacto_red_social is not null)
);

-- ============================================================
-- 7. VENTAS
-- ============================================================
create table ventas (
  id uuid primary key default gen_random_uuid(),
  negocio_id uuid not null references negocios(id) on delete cascade,
  cliente_id uuid references clientes(id),
  nombre_ocasional text,              -- solo Don camisa, cliente no registrado
  fecha timestamptz not null default now(),
  total numeric(10,2) not null default 0,
  metodo_pago text check (metodo_pago in ('efectivo', 'tarjeta', 'transferencia')),
  estado text not null default 'confirmada' check (estado in ('confirmada', 'cancelada')),
  constraint no_duplicar_cliente check (not (cliente_id is not null and nombre_ocasional is not null))
);

-- ============================================================
-- 8. VENTA_DETALLE
-- ============================================================
create table venta_detalle (
  id uuid primary key default gen_random_uuid(),
  venta_id uuid not null references ventas(id) on delete cascade,
  item_id uuid not null references items(id),
  variante_id uuid references variantes_item(id),
  cantidad integer not null default 1,
  precio_unitario numeric(10,2) not null,
  costo_unitario numeric(10,2) not null   -- congelado al momento de la venta
);

-- ============================================================
-- 9. CITAS
-- ============================================================
create table citas (
  id uuid primary key default gen_random_uuid(),
  negocio_id uuid not null references negocios(id) on delete cascade,
  item_id uuid not null references items(id),
  cliente_id uuid references clientes(id),
  fecha_hora timestamptz not null,
  estado text not null default 'pendiente'
    check (estado in ('pendiente', 'confirmada', 'completada', 'cancelada')),
  venta_id uuid references ventas(id),   -- se llena cuando "Finalizar servicio" genera la venta
  creado_en timestamptz not null default now()
);
