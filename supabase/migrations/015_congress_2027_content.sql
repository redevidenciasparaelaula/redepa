-- Migración 015: tema y 8 líneas temáticas del Congreso EPA 2027
--
-- Agrega columna `theme` a congresses, setea el tema del 2027 y crea
-- los 8 tracks con sus descripciones.
--
-- Idempotente: usa unique constraint (congress_id, display_order) +
-- ON CONFLICT DO UPDATE para que re-correr la migración actualice los
-- nombres/descripciones si cambian, sin destruir filas.

-- ========================================================================
-- 1) Agregar columna `theme` a congresses (subtítulo temático del año)
-- ========================================================================
alter table congresses add column if not exists theme text;

-- ========================================================================
-- 2) Unique constraint para permitir upsert de tracks
-- ========================================================================
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.congress_tracks'::regclass
      and conname  = 'congress_tracks_congress_order_uniq'
  ) then
    alter table congress_tracks
      add constraint congress_tracks_congress_order_uniq
      unique (congress_id, display_order);
  end if;
end $$;

-- ========================================================================
-- 3) Setear tema del Congreso EPA 2027
-- ========================================================================
update congresses
set theme = 'Construyendo sobre evidencia para la mejora educativa: implementación e impacto en contextos latinoamericanos'
where slug = 'epa-2027';

-- ========================================================================
-- 4) Upsert de las 8 líneas temáticas
-- ========================================================================
insert into congress_tracks (congress_id, display_order, name, description)
select c.id, t.display_order, t.name, t.description
from congresses c, (values
  (
    1,
    'Línea 1. Liderazgo educativo',
    'Evidencia sobre liderazgo directivo y pedagógico, liderazgo distribuido y mejora escolar liderada desde la conducción. Acoge estudios sobre implementación de prácticas de liderazgo en escuelas y su impacto en aprendizajes, clima escolar y permanencia docente. Bienvenidos también trabajos sobre formación de directivos en la región.'
  ),
  (
    2,
    'Línea 2. Enseñanza y aprendizaje en didácticas específicas',
    'Investigación sobre cómo se enseñan y aprenden las disciplinas escolares: matemáticas, lengua y literatura, inglés y otras lenguas extranjeras, ciencias naturales, ciencias sociales, artes y educación física. Estudios sobre implementación de secuencias didácticas, evaluación disciplinar, dificultades de aprendizaje y conocimiento didáctico del contenido (PCK).'
  ),
  (
    3,
    'Línea 3. Bienestar, salud mental y autocuidado docente',
    'Investigaciones sobre bienestar profesional, burnout, salud mental, sentido del oficio y estrategias de autocuidado. Espacio para evidencia sobre programas e intervenciones de apoyo psicosocial al profesorado y su impacto en permanencia, satisfacción y desempeño, especialmente en contextos latinoamericanos donde la presión sobre la profesión es particularmente alta.'
  ),
  (
    4,
    'Línea 4. Tecnologías digitales e inteligencia artificial',
    'Implementación de tecnologías y IA generativa en escuelas y aulas latinoamericanas, evaluación de impacto de programas tecnológicos, alfabetización digital y en IA, brechas de acceso, y sostenibilidad de la innovación tecnológica. Acoge tanto estudios pedagógicos como análisis de adopción institucional.'
  ),
  (
    5,
    'Línea 5. Formación inicial y continua docente',
    'Evidencia sobre programas de formación inicial, prácticas profesionales, desarrollo profesional continuo y mentoría. Estudios sobre implementación curricular en programas de pedagogía y sobre el impacto de la formación en la práctica docente y los aprendizajes de los estudiantes. Bienvenidos los estudios longitudinales y de trayectoria.'
  ),
  (
    6,
    'Línea 6. Educación superior',
    'Investigación sobre docencia universitaria, aprendizaje de estudiantes en pregrado y posgrado, retención y graduación, equidad en acceso, calidad, aseguramiento y vinculación con el medio. Espacio para estudios sobre implementación de innovaciones pedagógicas en universidades y CFTs/IPs, así como sobre el impacto de IA en la educación superior latinoamericana.'
  ),
  (
    7,
    'Línea 7. Inclusión, interculturalidad y diversidad',
    'Evidencia sobre prácticas inclusivas, educación intercultural bilingüe, lenguas originarias, ruralidad, género y sexualidades, NEE y migración. Estudios sobre implementación de políticas y programas de inclusión y su impacto en trayectorias y experiencias educativas en contextos diversos.'
  ),
  (
    8,
    'Línea 8. Política pública educacional',
    'Diseño, implementación y evaluación de políticas educativas latinoamericanas. Reformas curriculares, sistemas de evaluación nacional, financiamiento, articulación entre niveles educativos y análisis comparados regionales. Bienvenidos los trabajos sobre traducción de evidencia a política.'
  )
) as t(display_order, name, description)
where c.slug = 'epa-2027'
on conflict (congress_id, display_order) do update
set name        = excluded.name,
    description = excluded.description;
