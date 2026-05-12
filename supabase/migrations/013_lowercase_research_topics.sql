-- Migración 013: normalizar research_topics a lowercase y deduplicar.
--
-- Motivación: a partir de ahora los forms guardan los temas siempre en
-- minúsculas (.toLowerCase() + dedupe via Set). Pero los datos existentes
-- pueden tener mezcla de casing ("Políticas Educativas" vs "políticas
-- educativas"). Esta migración los normaliza retroactivamente.
--
-- Estrategia: por cada researcher, recorrer su array research_topics,
-- bajar a minúsculas, deduplicar preservando el orden de primera aparición
-- (importante para que las tarjetas y la tabla muestren los topics como el
-- usuario los ingresó, no en orden alfabético).

with normalized as (
  select
    id,
    coalesce(
      (
        select array_agg(t order by min_ord)
        from (
          select
            lower(t)             as t,
            min(ord)             as min_ord
          from unnest(research_topics) with ordinality as u(t, ord)
          where t is not null and trim(t) <> ''
          group by lower(t)
        ) g
      ),
      '{}'::text[]
    ) as topics
  from researchers
)
update researchers r
set research_topics = n.topics
from normalized n
where r.id = n.id
  and r.research_topics is distinct from n.topics;

-- Notas:
-- - `research_topics_text` (columna generada, definida en migración 008) ya
--   aplicaba lower() para el índice de búsqueda, así que el cambio no afecta
--   la indexación. Solo cambia cómo se almacenan/muestran los valores raw.
-- - Si alguien tenía ["Equidad", "equidad"], queda como ["equidad"].
