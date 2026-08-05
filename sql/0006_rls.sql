-- ============================================================
-- SEGURIDAD: Row Level Security
-- ============================================================
create or replace function is_negocio_member(check_negocio_id uuid)
returns boolean
language sql security definer stable
as $$
  select exists (
    select 1 from usuarios_negocio
    where negocio_id = check_negocio_id and usuario_id = auth.uid()
  );
$$;

alter table negocios enable row level security;
create policy negocios_acceso on negocios for all
  using (is_negocio_member(id)) with check (is_negocio_member(id));

alter table usuarios_negocio enable row level security;
create policy usuarios_negocio_acceso on usuarios_negocio for all
  using (usuario_id = auth.uid()) with check (usuario_id = auth.uid());

alter table items enable row level security;
create policy items_acceso on items for all
  using (is_negocio_member(negocio_id)) with check (is_negocio_member(negocio_id));

alter table clientes enable row level security;
create policy clientes_acceso on clientes for all
  using (is_negocio_member(negocio_id)) with check (is_negocio_member(negocio_id));

alter table citas enable row level security;
create policy citas_acceso on citas for all
  using (is_negocio_member(negocio_id)) with check (is_negocio_member(negocio_id));

alter table ventas enable row level security;
create policy ventas_acceso on ventas for all
  using (is_negocio_member(negocio_id)) with check (is_negocio_member(negocio_id));

alter table gastos enable row level security;
create policy gastos_acceso on gastos for all
  using (is_negocio_member(negocio_id)) with check (is_negocio_member(negocio_id));

alter table tipos_gasto enable row level security;
create policy tipos_gasto_acceso on tipos_gasto for all
  using (is_negocio_member(negocio_id)) with check (is_negocio_member(negocio_id));

alter table entradas_inventario enable row level security;
create policy entradas_inventario_acceso on entradas_inventario for all
  using (is_negocio_member(negocio_id)) with check (is_negocio_member(negocio_id));

alter table variantes_item enable row level security;
create policy variantes_item_acceso on variantes_item for all
  using (exists (select 1 from items where items.id = variantes_item.item_id and is_negocio_member(items.negocio_id)))
  with check (exists (select 1 from items where items.id = variantes_item.item_id and is_negocio_member(items.negocio_id)));

alter table venta_detalle enable row level security;
create policy venta_detalle_acceso on venta_detalle for all
  using (exists (select 1 from ventas where ventas.id = venta_detalle.venta_id and is_negocio_member(ventas.negocio_id)))
  with check (exists (select 1 from ventas where ventas.id = venta_detalle.venta_id and is_negocio_member(ventas.negocio_id)));
