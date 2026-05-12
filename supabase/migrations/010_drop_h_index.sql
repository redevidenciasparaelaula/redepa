-- Migración 010: eliminar h_index del directorio.
-- Decisión: el scraping de Google Scholar es bloqueado por Google y no
-- queremos depender de un servicio pagado (SerpApi). Se quita el campo
-- en lugar de ofrecer entrada manual (que invita a inflar la métrica).

drop index if exists researchers_h_index_idx;
alter table researchers drop column if exists h_index;
