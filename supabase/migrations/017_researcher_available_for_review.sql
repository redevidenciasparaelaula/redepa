-- Migración 017: flag de disponibilidad para evaluar Congresos EPA
--
-- Agrega columna available_for_review a la tabla researchers.
-- Es una bandera general (no por congreso específico): "estoy dispuesta/o
-- a ser evaluador/a cuando haya un congreso". Cuando se abre la revisión
-- de un congreso concreto, el chair filtra researchers por esta columna
-- y crea las filas en reviewer_pool con los detalles específicos
-- (carga, temas, etc.).

alter table researchers
  add column if not exists available_for_review boolean not null default false;

create index if not exists researchers_available_for_review_idx
  on researchers (available_for_review)
  where available_for_review = true;
