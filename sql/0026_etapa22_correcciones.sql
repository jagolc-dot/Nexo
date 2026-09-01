-- Etapa 22 — Correcciones: funciones duplicadas y variantes configurables
--
-- B. Elimina las versiones viejas de funciones que quedaron sobrecargadas
-- al cambiarles la firma sin drop explícito (create or replace solo
-- sustituye cuando la firma es idéntica; con una firma distinta crea una
-- función nueva en vez de reemplazar la anterior). Encontrado en
-- confirmar_compra (introducido en la Etapa 21 v2) y, en auditoría
-- preventiva, también en agendar_cita (preexistente, sin relación con
-- Inventario — bloqueaba el agendado de citas en beta y en producción).
drop function if exists confirmar_compra(uuid,uuid,text,text,date,numeric,jsonb);
drop function if exists agendar_cita(uuid,uuid,timestamp with time zone,jsonb,text);

-- D. Variantes configurable por negocio, no por condicional en código —
-- mismo criterio que temas visuales y categorías.
alter table negocios add column usa_variantes boolean not null default false;
update negocios set usa_variantes = true where nombre = 'Don camisa';
