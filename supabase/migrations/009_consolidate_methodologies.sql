-- Migración 009: consolidación de claves de metodologías.
-- La taxonomía nueva tiene 3 categorías y 22 items (antes: 6 cats, 39 items).
-- Algunas metodologías se fusionaron en una clave canónica; este script
-- mapea las claves antiguas a las nuevas en cualquier perfil ya creado.

update researchers set methodologies = array_replace(methodologies, 'quasi_experimental', 'experimental');
update researchers set methodologies = array_replace(methodologies, 'single_case', 'experimental');

update researchers set methodologies = array_replace(methodologies, 'longitudinal', 'survey');
update researchers set methodologies = array_replace(methodologies, 'cross_sectional', 'survey');
-- 'multilevel' se mantiene como clave propia: ahora vive en "Aplicaciones y análisis"
-- como "Modelos de regresión y multinivel".

update researchers set methodologies = array_replace(methodologies, 'hermeneutic', 'phenomenology');

update researchers set methodologies = array_replace(methodologies, 'content_analysis', 'discourse_analysis');

update researchers set methodologies = array_replace(methodologies, 'participatory', 'action_research');
update researchers set methodologies = array_replace(methodologies, 'critical', 'action_research');

update researchers set methodologies = array_replace(methodologies, 'lesson_study', 'design_based');

update researchers set methodologies = array_replace(methodologies, 'curriculum_analysis', 'policy_analysis');

update researchers set methodologies = array_replace(methodologies, 'implementation', 'program_evaluation');
update researchers set methodologies = array_replace(methodologies, 'improvement_science', 'program_evaluation');

update researchers set methodologies = array_replace(methodologies, 'scoping_review', 'systematic_review');
update researchers set methodologies = array_replace(methodologies, 'bibliometric', 'systematic_review');

update researchers set methodologies = array_replace(methodologies, 'edm', 'learning_analytics');

update researchers set methodologies = array_replace(methodologies, 'text_analysis', 'computational');
update researchers set methodologies = array_replace(methodologies, 'bayesian', 'computational');

-- Si la consolidación dejó duplicados (ej. ['survey','survey']), deduplica.
update researchers set methodologies = (
  select coalesce(array_agg(distinct m), '{}') from unnest(methodologies) m
)
where cardinality(methodologies) > 0;
