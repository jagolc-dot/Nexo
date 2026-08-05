-- ============================================================
-- Etapa 2 (revisión v2): login por nombre de usuario en vez de
-- correo. Supabase Auth solo sabe autenticar por correo, así que
-- antes de loguearse hace falta traducir usuario -> correo. Esto
-- debe poder llamarse SIN sesión (anon), por eso es security
-- definer (auth.users no es legible por anon/authenticated
-- directamente) y solo expone el correo, nada más.
-- ============================================================
create or replace function email_para_usuario(p_usuario text)
returns text
language sql
security definer
set search_path = public
stable
as $$
  select u.email
  from auth.users u
  join perfiles p on p.usuario_id = u.id
  where p.usuario = p_usuario;
$$;

revoke execute on function email_para_usuario(text) from public;
grant execute on function email_para_usuario(text) to anon, authenticated;
