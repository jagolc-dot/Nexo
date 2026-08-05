create extension if not exists pgcrypto;

-- ============================================================
-- 1. NEGOCIOS
-- ============================================================
create table negocios (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  tipo text,
  creado_en timestamptz not null default now()
);

-- ============================================================
-- 2. USUARIOS_NEGOCIO
-- ============================================================
create table usuarios_negocio (
  usuario_id uuid not null references auth.users(id) on delete cascade,
  negocio_id uuid not null references negocios(id) on delete cascade,
  rol text not null default 'dueño',
  primary key (usuario_id, negocio_id)
);
