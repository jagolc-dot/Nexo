-- Etapa 21 — backfill histórico: reconstruye movimientos_inventario a partir de
-- entradas_inventario + venta_detalle existentes, en orden cronológico, usando
-- la misma aritmética de costo promedio ponderado que fn_registrar_movimiento.
-- Idempotente: no hace nada si movimientos_inventario ya tiene filas.
-- No borra entradas_inventario (se conserva hasta confirmar que esta migración
-- fue correcta, según nota explícita del documento de la Etapa 21).

do $$
declare
  v_evento record;
  v_almacen_id uuid;
begin
  if exists (select 1 from movimientos_inventario limit 1) then
    return;
  end if;

  for v_evento in
    select negocio_id, item_id, variante_id, tipo, cantidad, costo_unitario, fecha, referencia_id
    from (
      select e.negocio_id, e.item_id, e.variante_id, 'compra'::text as tipo,
             e.cantidad, e.costo_unitario, e.fecha, e.id as referencia_id
      from entradas_inventario e
      union all
      select i.negocio_id,
             case when vd.variante_id is null then vd.item_id else null end,
             vd.variante_id, 'venta'::text,
             -vd.cantidad, vd.costo_unitario, v.fecha, vd.venta_id
      from venta_detalle vd
      join ventas v on v.id = vd.venta_id
      join items i on i.id = vd.item_id
      where i.tipo = 'producto'
    ) eventos
    order by fecha, referencia_id
  loop
    select id into v_almacen_id from almacenes where negocio_id = v_evento.negocio_id and activo limit 1;

    perform fn_registrar_movimiento(
      v_evento.negocio_id, v_almacen_id, v_evento.item_id, v_evento.variante_id,
      v_evento.tipo, v_evento.cantidad, v_evento.costo_unitario,
      v_evento.referencia_id, v_evento.fecha
    );
  end loop;
end;
$$;
