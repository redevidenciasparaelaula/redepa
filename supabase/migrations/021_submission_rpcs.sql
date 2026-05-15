-- Migración 021: RPCs y políticas finas para el flujo de postulación
-- (Ola 3). El objetivo es que el flujo "crear submission y agregarme como
-- autor" sea atómico y bajo control del servidor, no del cliente.

-- =====================================================================
-- create_submission_with_self_as_author
--   Crea un submission en estado 'draft' para el usuario actual y lo
--   agrega automáticamente como autor corresponding/presenter.
--   Valida que el CFP esté abierto.
--   Devuelve el UUID del submission creado.
-- =====================================================================
create or replace function create_submission_with_self_as_author(
  p_congress_id uuid
) returns uuid language plpgsql security definer
set search_path = public, auth as $$
declare
  v_submission_id   uuid;
  v_user_id         uuid;
  v_user_email      text;
  v_full_name       text;
  v_institution_id  uuid;
  v_status          text;
begin
  v_user_id := auth.uid();
  if v_user_id is null then raise exception 'No autenticado'; end if;

  select status into v_status from congresses where id = p_congress_id;
  if v_status is null then raise exception 'Congreso no existe'; end if;
  if v_status <> 'cfp_open' then
    raise exception 'El CFP no está abierto (estado actual: %)', v_status;
  end if;

  select email::text into v_user_email
    from auth.users where id = v_user_id;

  select full_name, institution_id
    into v_full_name, v_institution_id
    from researchers
   where lower(email) = lower(v_user_email)
   limit 1;

  insert into submissions (congress_id, title, status)
  values (p_congress_id, 'Sin título', 'draft')
  returning id into v_submission_id;

  insert into submission_authors (
    submission_id, user_id, full_name, email,
    institution_id, is_corresponding, is_presenter, display_order
  ) values (
    v_submission_id, v_user_id,
    coalesce(v_full_name, split_part(v_user_email, '@', 1)),
    v_user_email, v_institution_id,
    true, true, 0
  );

  return v_submission_id;
end;
$$;

grant execute on function create_submission_with_self_as_author(uuid)
  to authenticated;

-- =====================================================================
-- add_submission_author_by_email
--   Agrega un autor a un submission resolviendo por email del directorio.
--   - Si el email está en researchers: usa esos datos (nombre, institución).
--     Si además existe en auth.users, vincula user_id; si no, queda con
--     user_id=null (entra al directorio pero no tiene cuenta auth aún).
--   - Si no está en researchers: devuelve 'not_in_directory' — el cliente
--     debe usar add_external_submission_author con todos los datos.
--
--   Solo autores del submission o super-admin pueden agregar.
--   Devuelve:
--     'ok'              al insertar
--     'already'         si ese email ya es autor
--     'not_in_directory' si no se encontró researcher con ese email
--     'forbidden'       si el caller no es autor ni super-admin
-- =====================================================================
create or replace function add_submission_author_by_email(
  p_submission_id uuid,
  p_email         text
) returns text language plpgsql security definer
set search_path = public, auth as $$
declare
  v_caller          uuid := auth.uid();
  v_email           text;
  v_user_id         uuid;
  v_full_name       text;
  v_institution_id  uuid;
  v_max_order       int;
begin
  if v_caller is null then return 'forbidden'; end if;

  v_email := lower(trim(coalesce(p_email, '')));
  if v_email = '' then return 'invalid'; end if;

  if not (
    is_submission_author(v_caller, p_submission_id)
    or exists (select 1 from super_admins where user_id = v_caller)
  ) then
    return 'forbidden';
  end if;

  if exists (
    select 1 from submission_authors
    where submission_id = p_submission_id and lower(email) = v_email
  ) then
    return 'already';
  end if;

  select full_name, institution_id
    into v_full_name, v_institution_id
    from researchers
   where lower(email) = v_email
   limit 1;

  if v_full_name is null then
    return 'not_in_directory';
  end if;

  select id into v_user_id from auth.users
    where lower(email::text) = v_email
    limit 1;

  select coalesce(max(display_order), -1) + 1
    into v_max_order
    from submission_authors where submission_id = p_submission_id;

  insert into submission_authors (
    submission_id, user_id, full_name, email,
    institution_id, is_corresponding, is_presenter, display_order
  ) values (
    p_submission_id, v_user_id, v_full_name, v_email,
    v_institution_id, false, false, v_max_order
  );

  return 'ok';
end;
$$;

grant execute on function add_submission_author_by_email(uuid, text)
  to authenticated;

-- =====================================================================
-- add_external_submission_author
--   Agrega un co-autor externo (no en el directorio). Datos completos.
-- =====================================================================
create or replace function add_external_submission_author(
  p_submission_id uuid,
  p_full_name     text,
  p_email         text,
  p_institution_name text
) returns text language plpgsql security definer
set search_path = public, auth as $$
declare
  v_caller    uuid := auth.uid();
  v_email     text;
  v_name      text;
  v_inst      text;
  v_max_order int;
begin
  if v_caller is null then return 'forbidden'; end if;

  v_email := lower(trim(coalesce(p_email, '')));
  v_name  := trim(coalesce(p_full_name, ''));
  v_inst  := nullif(trim(coalesce(p_institution_name, '')), '');

  if v_email = '' or v_email !~* '^[^@\s]+@[^@\s]+\.[^@\s]{2,}$' then
    return 'invalid_email';
  end if;
  if v_name = '' then return 'invalid_name'; end if;

  if not (
    is_submission_author(v_caller, p_submission_id)
    or exists (select 1 from super_admins where user_id = v_caller)
  ) then
    return 'forbidden';
  end if;

  if exists (
    select 1 from submission_authors
    where submission_id = p_submission_id and lower(email) = v_email
  ) then
    return 'already';
  end if;

  select coalesce(max(display_order), -1) + 1
    into v_max_order
    from submission_authors where submission_id = p_submission_id;

  insert into submission_authors (
    submission_id, user_id, full_name, email,
    institution_id, external_institution_name,
    is_corresponding, is_presenter, display_order
  ) values (
    p_submission_id, null, v_name, v_email,
    null, v_inst,
    false, false, v_max_order
  );

  return 'ok';
end;
$$;

grant execute on function add_external_submission_author(uuid, text, text, text)
  to authenticated;

-- =====================================================================
-- submit_submission_atomic
--   Cambia de 'draft' a 'submitted' validando que el CFP esté abierto
--   y que el submission tenga al menos los campos requeridos.
-- =====================================================================
create or replace function submit_submission_atomic(
  p_submission_id uuid
) returns text language plpgsql security definer
set search_path = public as $$
declare
  v_caller    uuid := auth.uid();
  v_s         record;
  v_congress  record;
begin
  if v_caller is null then return 'forbidden'; end if;

  if not (
    is_submission_author(v_caller, p_submission_id)
    or exists (select 1 from super_admins where user_id = v_caller)
  ) then
    return 'forbidden';
  end if;

  select * into v_s from submissions where id = p_submission_id;
  if v_s.id is null then return 'not_found'; end if;
  if v_s.status not in ('draft', 'withdrawn') then
    return 'wrong_status';
  end if;

  select * into v_congress from congresses where id = v_s.congress_id;
  if v_congress.status <> 'cfp_open' then return 'cfp_closed'; end if;
  if v_congress.cfp_close_at is not null
     and v_congress.cfp_close_at < now() then
    return 'deadline_passed';
  end if;

  -- Validaciones mínimas de contenido
  if v_s.track_id is null then return 'missing_track'; end if;
  if coalesce(length(trim(v_s.title)), 0) < 5 then return 'short_title'; end if;
  if length(trim(coalesce(v_s.abs_context, '')))    < 50 then return 'short_abs_context'; end if;
  if length(trim(coalesce(v_s.abs_framework, '')))  < 50 then return 'short_abs_framework'; end if;
  if length(trim(coalesce(v_s.abs_methods, '')))    < 50 then return 'short_abs_methods'; end if;
  if length(trim(coalesce(v_s.abs_results, '')))    < 50 then return 'short_abs_results'; end if;
  if length(trim(coalesce(v_s.abs_discussion, ''))) < 50 then return 'short_abs_discussion'; end if;
  if array_length(coalesce(v_s.keywords, '{}'), 1) is null
     or array_length(v_s.keywords, 1) < 2 then return 'few_keywords'; end if;
  if array_length(coalesce(v_s.methodologies, '{}'), 1) is null
     or array_length(v_s.methodologies, 1) < 1 then return 'few_methodologies'; end if;

  update submissions
     set status = 'submitted',
         submitted_at = now(),
         updated_at = now()
   where id = p_submission_id;

  return 'ok';
end;
$$;

grant execute on function submit_submission_atomic(uuid) to authenticated;

-- =====================================================================
-- withdraw_submission_atomic — submitted → withdrawn por el autor
-- =====================================================================
create or replace function withdraw_submission_atomic(
  p_submission_id uuid
) returns text language plpgsql security definer
set search_path = public as $$
declare
  v_caller uuid := auth.uid();
  v_s      record;
begin
  if v_caller is null then return 'forbidden'; end if;
  if not (
    is_submission_author(v_caller, p_submission_id)
    or exists (select 1 from super_admins where user_id = v_caller)
  ) then return 'forbidden'; end if;

  select * into v_s from submissions where id = p_submission_id;
  if v_s.id is null then return 'not_found'; end if;
  if v_s.status not in ('submitted', 'under_review') then
    return 'wrong_status';
  end if;

  update submissions set status = 'withdrawn', updated_at = now()
   where id = p_submission_id;
  return 'ok';
end;
$$;

grant execute on function withdraw_submission_atomic(uuid) to authenticated;

-- =====================================================================
-- Ajusta la política submissions_insert para que NUNCA pueda insertarse
-- una submission desde el cliente directamente sin pasar por la RPC.
-- Esto fuerza el flujo controlado (CFP abierto + autor inicial vinculado).
-- =====================================================================
drop policy if exists submissions_insert_authenticated on submissions;
-- Política vacía: nadie inserta directo. Solo el SECURITY DEFINER RPC.
create policy submissions_no_direct_insert on submissions
  for insert to authenticated with check (false);

-- Igual para submission_authors: no insertar directo. Solo vía RPCs.
drop policy if exists authors_insert on submission_authors;
create policy authors_no_direct_insert on submission_authors
  for insert to authenticated with check (false);
