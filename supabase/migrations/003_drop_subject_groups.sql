-- Migración 003: eliminar columna subject_groups (decisión de producto: ya no se usa).

drop index if exists researchers_subject_groups_gin;
alter table researchers drop column if exists subject_groups;
