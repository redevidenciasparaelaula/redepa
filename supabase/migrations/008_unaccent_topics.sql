-- Migración 008: búsqueda de temas ignorando tildes y mayúsculas.
--
-- 1) Wrapper IMMUTABLE de unaccent (necesario porque unaccent es STABLE
--    y no se puede usar directamente en columnas generadas/índices).
-- 2) Redefinir arr_to_text para aplicar lower + unaccent.
-- 3) Recrear la columna generada para que use la nueva función.

create or replace function immutable_unaccent(text) returns text
  language sql immutable parallel safe
  as $$ select unaccent($1) $$;

create or replace function arr_to_text(arr text[]) returns text
  language sql immutable parallel safe
  as $$ select lower(immutable_unaccent(array_to_string(arr, ' || '))) $$;

-- Drop y recreate de la columna para forzar la regeneración con la nueva fn.
drop index if exists researchers_topics_text_trgm;
alter table researchers drop column if exists research_topics_text;
alter table researchers
  add column research_topics_text text
  generated always as (arr_to_text(research_topics)) stored;
create index researchers_topics_text_trgm
  on researchers using gin (research_topics_text gin_trgm_ops);
