-- Migración 002: agregar grupos etarios estudiados y URL de ResearchGate.

alter table researchers
  add column if not exists subject_groups text[] not null default '{}',
  add column if not exists researchgate_url text;

create index if not exists researchers_subject_groups_gin
  on researchers using gin (subject_groups);

-- Backfill grupos etarios y RG en los investigadores de ejemplo (idempotente)
update researchers set subject_groups = array['higher_ed','professionals'],
                       researchgate_url = 'https://www.researchgate.net/profile/Example-Rivas'
  where email = 'maria.rivas@example.unam.mx';

update researchers set subject_groups = array['secondary','higher_ed']
  where email = 'carlos.perez@example.uc.cl';

update researchers set subject_groups = array['primary','professionals'],
                       researchgate_url = 'https://www.researchgate.net/profile/Example-Souza'
  where email = 'ana.souza@example.usp.br';

update researchers set subject_groups = array['secondary']
  where email = 'jorge.castillo@example.uba.ar';

update researchers set subject_groups = array['primary','secondary'],
                       researchgate_url = 'https://www.researchgate.net/profile/Example-Gomez'
  where email = 'lucia.gomez@example.uniandes.edu.co';

-- Normalizar métodologías a las claves canónicas en inglés (las que usa el filtro).
update researchers set methodologies = array_replace(methodologies, 'cualitativa', 'qualitative');
update researchers set methodologies = array_replace(methodologies, 'cuantitativa', 'quantitative');
update researchers set methodologies = array_replace(methodologies, 'mixta', 'mixed');
update researchers set methodologies = array_replace(methodologies, 'etnografía', 'ethnography');
update researchers set methodologies = array_replace(methodologies, 'investigación-acción', 'action_research');
update researchers set methodologies = array_replace(methodologies, 'estudios de caso', 'case_study');
