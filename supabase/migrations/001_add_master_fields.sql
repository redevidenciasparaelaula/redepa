-- Migración: agregar año e institución de magíster a researchers.
-- Ejecutar en Supabase SQL Editor sobre una base ya existente.

alter table researchers add column if not exists master_year int;
alter table researchers add column if not exists master_institution text;

create index if not exists researchers_master_year_idx on researchers(master_year);
