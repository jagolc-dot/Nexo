-- ============================================================
-- Etapa 4: registrar una venta (cabecera + líneas) debe ser
-- atómico -- si una línea falla (ej. existencia insuficiente,
-- validada por el trigger de la Etapa 1), toda la venta se revierte.
-- No es SECURITY DEFINER a propósito: corre con los privilegios de
-- quien llama, así que las políticas RLS de ventas/venta_detalle
-- se siguen aplicando normalmente.
-- ============================================================
create or replace function crear_venta(
  p_negocio_id uuid,
  p_cliente_id uuid,
  p_nombre_ocasional text,
  p_metodo_pago text,
  p_lineas jsonb
)
returns uuid
language plpgsql
set search_path = public
as $$
declare
  v_venta_id uuid;
  v_total numeric(10,2);
begin
  select coalesce(sum((l->>'cantidad')::int * (l->>'precio_unitario')::numeric), 0)
  into v_total
  from jsonb_array_elements(p_lineas) l;

  insert into ventas (negocio_id, cliente_id, nombre_ocasional, total, metodo_pago)
  values (p_negocio_id, p_cliente_id, p_nombre_ocasional, v_total, p_metodo_pago)
  returning id into v_venta_id;

  insert into venta_detalle (venta_id, item_id, variante_id, cantidad, precio_unitario, costo_unitario)
  select
    v_venta_id,
    (l->>'item_id')::uuid,
    nullif(l->>'variante_id', '')::uuid,
    (l->>'cantidad')::int,
    (l->>'precio_unitario')::numeric,
    (l->>'costo_unitario')::numeric
  from jsonb_array_elements(p_lineas) l;

  return v_venta_id;
end;
$$;
