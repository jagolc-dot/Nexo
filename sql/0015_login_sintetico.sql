-- ============================================================
-- Etapa 2 v2 — login por usuario con correo sintético
-- determinístico (usuario@nexo.local), sin consultar la base de
-- datos antes de loguearse (email_para_usuario exponía un oráculo
-- de existencia de usuarios a un cliente sin sesión).
-- ============================================================

-- 'joel.guzman' tiene un punto, que el nuevo formato no permite
-- (solo minúsculas, números y guión bajo). Se renombra antes de
-- agregar la restricción para no romper la cuenta existente.
update perfiles set usuario = 'joel_guzman' where usuario = 'joel.guzman';

alter table perfiles add constraint usuario_formato
  check (usuario ~ '^[a-z0-9_]{3,20}$');

drop function if exists email_para_usuario(text);

-- ============================================================
-- Paso que faltó en la primera pasada: renombrar perfiles.usuario
-- no cambia el correo real de auth.users, y el nuevo login siempre
-- construye usuario@nexo.local. Sin este paso, la cuenta existente
-- (creada con correo real jagolc@gmail.com) queda inaccesible
-- porque el correo sintético calculado no coincide con ninguna
-- cuenta real. Hay que sincronizar auth.users y auth.identities
-- para cada cuenta que ya existía antes de este cambio de esquema.
-- ============================================================
update auth.users
set email = 'joel_guzman@nexo.local'
where email = 'jagolc@gmail.com';

update auth.identities
set identity_data = jsonb_set(identity_data, '{email}', '"joel_guzman@nexo.local"')
where user_id = (select id from auth.users where email = 'joel_guzman@nexo.local');
