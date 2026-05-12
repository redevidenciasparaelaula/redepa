-- Migración 011: eliminar biografía del directorio.
-- Decisión de producto: el cargo + temas + metodologías ya da suficiente
-- contexto. La biografía abre la puerta a inconsistencia entre perfiles
-- (algunos largos, otros vacíos) sin agregar mucho valor para encontrar
-- colaboradores.

alter table researchers
  drop column if exists bio_es,
  drop column if exists bio_en;
