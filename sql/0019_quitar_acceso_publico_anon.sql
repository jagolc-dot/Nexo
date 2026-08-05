-- ============================================================
-- Revisión de seguridad pre-publicación: 4 políticas para el rol
-- `anon` existían en el proyecto sin estar en ningún archivo sql/
-- versionado (se aplicaron directo en Studio en algún momento).
-- Permitían a cualquier visitante sin sesión:
--   - crear citas (citas_alta_publica) y clientas (clientes_alta_publica)
--     en cualquier negocio,
--   - leer negocios (negocios_lectura_publica) e ítems (items_lectura_publica).
-- Esto contradice una decisión ya tomada y documentada: "Agendamiento
-- público por parte de las clientas... descartado. No hay acceso
-- externo al sistema; todas las citas las captura el personal."
--
-- Verificado antes de aplicar: 0 citas sin empleada/sin servicios (la
-- huella de un INSERT directo fuera de agendar_cita()) y 0 clientas sin
-- ninguna cita ni venta asociada — no hay evidencia de que se haya
-- explotado, pero el hueco existía.
-- ============================================================
drop policy if exists "citas_alta_publica" on citas;
drop policy if exists "clientes_alta_publica" on clientes;
drop policy if exists "negocios_lectura_publica" on negocios;
drop policy if exists "items_lectura_publica" on items;
