-- Migración 032: postulaciones públicas sin cuenta.
--
-- Permite que cualquier persona envíe una postulación al congreso sin
-- necesidad de inscribirse en el directorio ni crear cuenta en auth.users.
-- La persona completa un único formulario (nombre, apellido, email,
-- institución + datos del abstract) y envía. Sin "guardar borrador",
-- sin edición posterior.
--
-- Nueva RPC: submit_public_submission(payload jsonb) → uuid
--   SECURITY DEFINER + ejecutable por el rol 'anon'. Hace sus propias
--   validaciones de contenido y de ciclo del congreso.
--
-- El payload tiene esta forma:
-- {
--   "title":          "...",
--   "type":           "oral" | "poster",
--   "track_id":       "<uuid>",
--   "abs_context":    "...",
--   "abs_framework":  "...",
--   "abs_methods":    "...",
--   "abs_results":    "...",
--   "abs_discussion": "...",
--   "keywords":       ["..."],
--   "methodologies":  ["..."],
--   "authors": [
--     { "first_name": "...", "last_name": "...", "email": "...",
--       "institution_name": "...", "is_corresponding": true, "is_presenter": true }
--   ]
-- }

create or replace function submit_public_submission(payload jsonb)
returns uuid language plpgsql security definer
set search_path = public as $$
declare
  v_congress_id       uuid;
  v_congress_status   text;
  v_cfp_close_at      timestamptz;
  v_submission_id     uuid;
  v_track_id          uuid;
  v_type              text;
  v_title             text;
  v_abs_context       text;
  v_abs_framework     text;
  v_abs_methods       text;
  v_abs_results       text;
  v_abs_discussion    text;
  v_keywords          text[];
  v_methodologies     text[];
  v_authors           jsonb;
  v_author            jsonb;
  v_idx               int := 0;
  v_full_name         text;
  v_email             text;
  v_inst_name         text;
  v_inst_id           uuid;
begin
  -- Siempre el congreso epa-2027 por ahora. En el futuro, el payload podría
  -- traer el slug. Lo cableamos acá para no exponer ids al cliente.
  select id, status, cfp_close_at into v_congress_id, v_congress_status, v_cfp_close_at
    from congresses where slug = 'epa-2027';
  if v_congress_id is null then
    raise exception 'Congreso no encontrado';
  end if;
  if v_congress_status <> 'cfp_open' then
    raise exception 'El CFP no está abierto';
  end if;
  if v_cfp_close_at is not null and v_cfp_close_at < now() then
    raise exception 'El plazo de postulación ya pasó';
  end if;

  -- Extraer campos del payload con validaciones mínimas.
  v_title          := coalesce(trim(payload->>'title'), '');
  v_type           := coalesce(payload->>'type', '');
  v_track_id       := nullif(payload->>'track_id', '')::uuid;
  v_abs_context    := coalesce(payload->>'abs_context', '');
  v_abs_framework  := coalesce(payload->>'abs_framework', '');
  v_abs_methods    := coalesce(payload->>'abs_methods', '');
  v_abs_results    := coalesce(payload->>'abs_results', '');
  v_abs_discussion := coalesce(payload->>'abs_discussion', '');

  -- Arrays
  select array_agg(trim(x)) into v_keywords
    from jsonb_array_elements_text(coalesce(payload->'keywords', '[]'::jsonb)) as t(x)
    where trim(x) <> '';
  select array_agg(trim(x)) into v_methodologies
    from jsonb_array_elements_text(coalesce(payload->'methodologies', '[]'::jsonb)) as t(x)
    where trim(x) <> '';

  if length(v_title) < 5 then
    raise exception 'El título es demasiado corto';
  end if;
  if v_type not in ('oral', 'poster') then
    raise exception 'Tipo de presentación inválido';
  end if;
  if v_track_id is null then
    raise exception 'Elige una línea temática';
  end if;
  if not exists (
    select 1 from congress_tracks where id = v_track_id and congress_id = v_congress_id
  ) then
    raise exception 'Línea temática inválida';
  end if;
  if length(v_abs_context)    < 50 then raise exception 'El campo "Contexto y problema" es demasiado corto (mín. 50 caracteres)'; end if;
  if length(v_abs_framework)  < 50 then raise exception 'El campo "Marco teórico" es demasiado corto (mín. 50 caracteres)'; end if;
  if length(v_abs_methods)    < 50 then raise exception 'El campo "Metodología" es demasiado corto (mín. 50 caracteres)'; end if;
  if length(v_abs_results)    < 50 then raise exception 'El campo "Resultados" es demasiado corto (mín. 50 caracteres)'; end if;
  if length(v_abs_discussion) < 50 then raise exception 'El campo "Discusión / aporte" es demasiado corto (mín. 50 caracteres)'; end if;
  if coalesce(array_length(v_keywords, 1), 0) < 2 then
    raise exception 'Agrega al menos 2 palabras clave';
  end if;
  if coalesce(array_length(v_methodologies, 1), 0) < 1 then
    raise exception 'Elige al menos 1 metodología';
  end if;
  if array_length(v_methodologies, 1) > 3 then
    raise exception 'Máximo 3 metodologías';
  end if;

  v_authors := coalesce(payload->'authors', '[]'::jsonb);
  if jsonb_array_length(v_authors) < 1 then
    raise exception 'Se requiere al menos un autor';
  end if;

  -- Crear la submission ya como 'submitted' (sin paso por draft).
  insert into submissions (
    congress_id, track_id, title, type,
    abs_context, abs_framework, abs_methods, abs_results, abs_discussion,
    keywords, methodologies,
    status, submitted_at
  ) values (
    v_congress_id, v_track_id, v_title, v_type,
    v_abs_context, v_abs_framework, v_abs_methods, v_abs_results, v_abs_discussion,
    v_keywords, v_methodologies,
    'submitted', now()
  )
  returning id into v_submission_id;

  -- Autores en orden del array del payload.
  for v_author in select * from jsonb_array_elements(v_authors) loop
    v_full_name := trim(
      coalesce(v_author->>'first_name', '') || ' ' ||
      coalesce(v_author->>'last_name', '')
    );
    v_email := lower(trim(coalesce(v_author->>'email', '')));
    v_inst_name := trim(coalesce(v_author->>'institution_name', ''));

    if v_full_name = '' then
      raise exception 'Autor sin nombre';
    end if;
    if v_email = '' or v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
      raise exception 'Email de autor inválido';
    end if;
    if v_inst_name = '' then
      raise exception 'Institución de autor requerida';
    end if;

    -- Intentar matchear la institución por nombre exacto (case-insensitive).
    -- Si no matchea, se guarda en external_institution_name.
    v_inst_id := null;
    select id into v_inst_id from institutions
      where lower(name) = lower(v_inst_name) limit 1;

    insert into submission_authors (
      submission_id, user_id, full_name, email,
      institution_id, external_institution_name,
      is_corresponding, is_presenter, display_order
    ) values (
      v_submission_id, null, v_full_name, v_email,
      v_inst_id,
      case when v_inst_id is null then v_inst_name else null end,
      coalesce((v_author->>'is_corresponding')::boolean, v_idx = 0),
      coalesce((v_author->>'is_presenter')::boolean, v_idx = 0),
      v_idx
    );

    v_idx := v_idx + 1;
  end loop;

  return v_submission_id;
end;
$$;

-- Permitir que anon llame esta RPC (está protegida por el SECURITY DEFINER
-- + sus propias validaciones internas; no abre acceso directo a las tablas).
grant execute on function submit_public_submission(jsonb) to anon, authenticated;
