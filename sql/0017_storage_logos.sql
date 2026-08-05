-- ============================================================
-- Etapa 13 — Ajustes: bucket público para logos de negocio.
-- Ruta esperada: logos/{negocio_id}/{archivo}. La carpeta raíz
-- codifica el negocio, así se reutiliza is_negocio_member() (misma
-- función que ya protege el resto de las tablas) en vez de inventar
-- una regla de autorización nueva.
-- ============================================================
insert into storage.buckets (id, name, public)
values ('logos', 'logos', true);

create policy "logos_insert" on storage.objects for insert
  with check (bucket_id = 'logos' and is_negocio_member((storage.foldername(name))[1]::uuid));

create policy "logos_update" on storage.objects for update
  using (bucket_id = 'logos' and is_negocio_member((storage.foldername(name))[1]::uuid));

create policy "logos_delete" on storage.objects for delete
  using (bucket_id = 'logos' and is_negocio_member((storage.foldername(name))[1]::uuid));

create policy "logos_select" on storage.objects for select
  using (bucket_id = 'logos');
