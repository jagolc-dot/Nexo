-- ============================================================
-- Etapa 17 — Don camisa: precio único por modelo.
-- El precio vive solo en items.precio_base; variantes_item.precio
-- se elimina. El costo (costo_promedio) sigue siendo por variante,
-- alimentado únicamente por entradas de inventario.
--
-- Verificación previa (ver conversación): "Camisa tipo maja" ya
-- tiene precio_base = 700.00 en beta, sin ventas registradas, así
-- que no hace falta ningún UPDATE de corrección de datos antes de
-- eliminar la columna. Ningún producto tiene precio_base nulo.
-- "Collar tipo U" (Glam Nails, no Don camisa) también tiene un
-- precio de variante distinto al del modelo, pero queda fuera del
-- alcance de esta etapa por decisión explícita del usuario — su
-- precio_base no se toca.
-- ============================================================
alter table variantes_item drop column precio;

-- El precio de venta es obligatorio para productos (ya lo era en el
-- formulario; esto lo garantiza también a nivel de base de datos).
alter table items add constraint precio_obligatorio_producto
  check (tipo <> 'producto' or precio_base is not null);

-- ------------------------------------------------------------
-- E.2 Eliminar variante: mismo criterio que eliminar_item — solo si
-- nunca tuvo consecuencia (sin ventas ni entradas de inventario).
-- ------------------------------------------------------------
create or replace function eliminar_variante(p_variante_id uuid)
returns void
language plpgsql
set search_path = public
as $$
begin
  if not exists (select 1 from variantes_item where id = p_variante_id) then
    raise exception 'La variante no existe.';
  end if;

  if exists (select 1 from venta_detalle where variante_id = p_variante_id)
    or exists (select 1 from entradas_inventario where variante_id = p_variante_id)
  then
    raise exception 'Esta variante no se puede eliminar porque tiene ventas o entradas de inventario registradas. Puedes desactivarla para que deje de aparecer.';
  end if;

  delete from variantes_item where id = p_variante_id;
end;
$$;
