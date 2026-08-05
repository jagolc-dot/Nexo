-- ============================================================
-- HARDENING: fijar search_path en todas las funciones
-- ============================================================
alter function recalcular_costo_promedio() set search_path = public;
alter function validar_existencia() set search_path = public;
alter function descontar_inventario() set search_path = public;
alter function is_negocio_member(uuid) set search_path = public;

-- ============================================================
-- HARDENING: revocar EXECUTE público sobre funciones trigger
-- (no afecta el disparo de triggers, que no requiere permiso EXECUTE;
--  is_negocio_member se deja intacta porque las políticas RLS
--  la invocan directamente y sí requieren EXECUTE para anon/authenticated.
--  Debe revocarse de PUBLIC, no solo de anon/authenticated: Postgres
--  otorga EXECUTE a PUBLIC por defecto al crear una función, y esos
--  roles heredan el acceso vía PUBLIC aunque se les revoque individualmente.)
-- ============================================================
revoke execute on function recalcular_costo_promedio() from public;
revoke execute on function descontar_inventario() from public;
