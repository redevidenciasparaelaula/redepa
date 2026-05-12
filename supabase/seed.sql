-- =====================================================================
-- Directorio Red EPA — Datos de ejemplo (opcional)
-- =====================================================================
-- Ejecutar después de schema.sql para tener datos con que probar.
-- =====================================================================

insert into institutions (id, name, name_en, country, city, website) values
  ('11111111-1111-1111-1111-111111111111', 'Universidad Nacional Autónoma de México', 'National Autonomous University of Mexico', 'México', 'Ciudad de México', 'https://www.unam.mx'),
  ('22222222-2222-2222-2222-222222222222', 'Pontificia Universidad Católica de Chile', 'Pontifical Catholic University of Chile', 'Chile', 'Santiago', 'https://www.uc.cl'),
  ('33333333-3333-3333-3333-333333333333', 'Universidad de São Paulo', 'University of São Paulo', 'Brasil', 'São Paulo', 'https://www5.usp.br'),
  ('44444444-4444-4444-4444-444444444444', 'Universidad de Buenos Aires', 'University of Buenos Aires', 'Argentina', 'Buenos Aires', 'https://www.uba.ar'),
  ('55555555-5555-5555-5555-555555555555', 'Universidad de los Andes', 'University of the Andes', 'Colombia', 'Bogotá', 'https://uniandes.edu.co')
on conflict (id) do nothing;

insert into researchers (
  full_name, email, institution_id, title_es, title_en,
  phd_year, phd_institution, master_year, master_institution,
  research_topics, methodologies,
  country, city,
  linkedin_url, google_scholar_url, researchgate_url, status
) values
  (
    'María Fernanda Rivas',
    'maria.rivas@example.unam.mx',
    '11111111-1111-1111-1111-111111111111',
    'Profesora Titular',
    'Full Professor',
    2010, 'Harvard Graduate School of Education',
    2005, 'Harvard Graduate School of Education',
    array['políticas educativas', 'equidad de género', 'educación superior'],
    array['qualitative', 'mixed'],
    'México', 'Ciudad de México',
    'https://www.linkedin.com/in/example-rivas',
    'https://scholar.google.com/citations?user=example1',
    'https://www.researchgate.net/profile/Example-Rivas',
    'approved'
  ),
  (
    'Carlos Antonio Pérez',
    'carlos.perez@example.uc.cl',
    '22222222-2222-2222-2222-222222222222',
    'Profesor Asociado',
    'Associate Professor',
    2015, 'University of Cambridge',
    2011, 'Pontificia Universidad Católica de Chile',
    array['evaluación de aprendizajes', 'medición educativa', 'psicometría'],
    array['quantitative'],
    'Chile', 'Santiago',
    'https://www.linkedin.com/in/example-perez',
    'https://scholar.google.com/citations?user=example2',
    null,
    'approved'
  ),
  (
    'Ana Beatriz Souza',
    'ana.souza@example.usp.br',
    '33333333-3333-3333-3333-333333333333',
    'Profesora Adjunta',
    'Adjunct Professor',
    2018, 'Universidade de São Paulo',
    2013, 'Universidade Federal de São Carlos',
    array['formación docente', 'inclusión', 'escuela pública'],
    array['ethnography', 'action_research'],
    'Brasil', 'São Paulo',
    'https://www.linkedin.com/in/example-souza',
    'https://scholar.google.com/citations?user=example3',
    'https://www.researchgate.net/profile/Example-Souza',
    'approved'
  ),
  (
    'Jorge Luis Castillo',
    'jorge.castillo@example.uba.ar',
    '44444444-4444-4444-4444-444444444444',
    'Investigador',
    'Researcher',
    null, null,
    2019, 'Universidad de Buenos Aires',
    array['tecnología educativa', 'inteligencia artificial', 'educación secundaria'],
    array['mixed', 'case_study'],
    'Argentina', 'Buenos Aires',
    null,
    'https://scholar.google.com/citations?user=example4',
    null,
    'approved'
  ),
  (
    'Lucía Gómez Ramírez',
    'lucia.gomez@example.uniandes.edu.co',
    '55555555-5555-5555-5555-555555555555',
    'Profesora Asistente',
    'Assistant Professor',
    2022, 'Stanford University',
    2017, 'Universidad de los Andes',
    array['desigualdad educativa', 'currículo', 'políticas educativas'],
    array['quantitative', 'mixed'],
    'Colombia', 'Bogotá',
    'https://www.linkedin.com/in/example-gomez',
    null,
    'https://www.researchgate.net/profile/Example-Gomez',
    'approved'
  )
on conflict (email) do nothing;
