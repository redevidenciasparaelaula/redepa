-- Migración 007: búsqueda por substring sobre temas (con OR entre temas).
-- Crea una columna generada que concatena los topics, indexada con trigramas
-- para que ilike sea rápido.
--
-- Nota: array_to_string no se considera IMMUTABLE en algunos contextos,
-- por eso lo envolvemos en una función propia marcada como tal.

create or replace function arr_to_text(arr text[]) returns text
  language sql immutable parallel safe
  as $$ select array_to_string(arr, ' || ') $$;

alter table researchers
  add column if not exists research_topics_text text
  generated always as (arr_to_text(research_topics)) stored;

create index if not exists researchers_topics_text_trgm
  on researchers using gin (research_topics_text gin_trgm_ops);
