-- ============================================================
-- 10. TIPOS_GASTO (conceptos recurrentes, catálogo por negocio)
-- ============================================================
create table tipos_gasto (
  id uuid primary key default gen_random_uuid(),
  negocio_id uuid not null references negocios(id) on delete cascade,
  nombre text not null,
  categoria text not null check (categoria in ('Insumos', 'Renta', 'Servicios', 'Nómina', 'Publicidad', 'Otros')),
  activo boolean not null default true
);

-- ============================================================
-- 11. GASTOS
-- ============================================================
create table gastos (
  id uuid primary key default gen_random_uuid(),
  negocio_id uuid not null references negocios(id) on delete cascade,
  tipo_gasto_id uuid references tipos_gasto(id),   -- null = gasto extraordinario
  categoria text not null check (categoria in ('Insumos', 'Renta', 'Servicios', 'Nómina', 'Publicidad', 'Otros')),
  descripcion text,
  monto numeric(10,2) not null,
  fecha_gasto date not null,           -- cuándo ocurrió realmente
  fecha_registro timestamptz not null default now(),  -- cuándo se capturó en el sistema
  estado text not null default 'activo' check (estado in ('activo', 'cancelado'))
);
