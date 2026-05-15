-- Migración 018: normalizar full_name / city / institutions a Title Case
--
-- Función smart_title_case() que imita el helper de JS:
--   - Capitaliza la primera letra de cada palabra
--   - Conserva acrónimos cortos en MAYÚSCULAS (UDD, MIT, PUC...)
--   - Pone en minúsculas los conectores españoles (de, del, la, etc.)
--     excepto cuando son la primera palabra
--
-- Aplica la normalización a 4 columnas de la tabla researchers, solo
-- en filas donde el valor cambiaría.

create or replace function smart_title_case(input text)
returns text
language plpgsql
immutable
as $$
declare
  result text := '';
  words text[];
  word text;
  lower_word text;
  is_first boolean := true;
  connectors text[] := array[
    'de','del','la','las','los','el',
    'y','e','o','u',
    'a','en','con','para','por',
    'da','do','das','dos','van','von','der','di','le'
  ];
begin
  if input is null then
    return null;
  end if;
  if trim(input) = '' then
    return input;
  end if;

  -- Normalizar espacios y split
  words := regexp_split_to_array(
    trim(regexp_replace(input, '\s+', ' ', 'g')),
    ' '
  );

  foreach word in array words loop
    -- Acrónimo 2-5 chars en mayúsculas → preservar
    if word ~ '^[A-ZÁÉÍÓÚÑ]{2,5}$' then
      result := result || (case when is_first then '' else ' ' end) || word;
    else
      lower_word := lower(word);
      if not is_first and lower_word = any(connectors) then
        result := result || ' ' || lower_word;
      else
        -- initcap maneja correctamente palabras compuestas con guión
        -- o apóstrofe ("o'higgins" → "O'Higgins", "perez-garcia" → "Perez-Garcia")
        result := result
                  || (case when is_first then '' else ' ' end)
                  || initcap(lower_word);
      end if;
    end if;
    is_first := false;
  end loop;

  return result;
end;
$$;

-- Aplicar a researchers
update researchers
set
  full_name          = smart_title_case(full_name),
  city               = smart_title_case(city),
  phd_institution    = smart_title_case(phd_institution),
  master_institution = smart_title_case(master_institution)
where
  full_name          is distinct from smart_title_case(full_name)
  or city               is distinct from smart_title_case(city)
  or phd_institution    is distinct from smart_title_case(phd_institution)
  or master_institution is distinct from smart_title_case(master_institution);

-- (Opcional) Aplicar también a institutions creadas por la vía "otra institución"
-- Comenta este bloque si no quieres tocar las instituciones oficiales.
-- update institutions
-- set name = smart_title_case(name)
-- where name is distinct from smart_title_case(name);
