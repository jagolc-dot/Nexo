-- ============================================================
-- Etapa 3: variantes_item necesita poder "eliminarse" sin borrar
-- físicamente (regla transversal de 00_resumen_ejecutivo.md),
-- igual que items.activo. Faltaba en el esquema original de la
-- Etapa 1.
-- ============================================================
alter table variantes_item add column activo boolean not null default true;
