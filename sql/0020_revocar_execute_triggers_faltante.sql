-- ============================================================
-- Deuda oculta encontrada al reconstruir producción desde sql/
-- (Etapa 12, Fase 1): recalcular_costo_promedio() y
-- descontar_inventario() tenían EXECUTE revocado de anon/authenticated
-- en el proyecto actual, pero ningún archivo versionado lo hacía.
-- La migración 0008 revoca de PUBLIC, pero 0018 vuelve a crear ambas
-- funciones con CREATE OR REPLACE; en algún punto alguien repitió el
-- revoke manualmente en Studio sin dejar registro. Se documenta aquí
-- para que el esquema reconstruido desde cero quede idéntico al real.
-- ============================================================
revoke execute on function recalcular_costo_promedio() from public, anon, authenticated;
revoke execute on function descontar_inventario() from public, anon, authenticated;
