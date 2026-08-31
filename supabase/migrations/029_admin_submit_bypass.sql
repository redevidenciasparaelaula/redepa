-- Migración 029: super-admin puede enviar postulaciones de prueba aunque
-- el CFP no esté abierto. Complementa la 027 (crear draft en modo prueba).
--
-- La validación de longitudes/campos requeridos se mantiene: no se puede
-- enviar una postulación vacía ni siquiera en modo prueba.

create or replace function submit_submission_atomic(
  p_submission_id uuid
) returns text language plpgsql security definer
set search_path = public as $$
declare
  v_caller    uuid := auth.uid();
  v_s         record;
  v_congress  record;
  v_is_super  boolean;
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

  -- Super-admin puede saltarse el chequeo de estado del congreso (para
  -- testing). Todo el mundo más tiene que esperar a que el CFP esté abierto
  -- y no haya pasado el deadline.
  select exists (select 1 from super_admins where user_id = v_caller)
    into v_is_super;
  if not v_is_super then
    if v_congress.status <> 'cfp_open' then return 'cfp_closed'; end if;
    if v_congress.cfp_close_at is not null
       and v_congress.cfp_close_at < now() then
      return 'deadline_passed';
    end if;
  end if;

  -- Validaciones mínimas de contenido (aplican SIEMPRE, incluso a super-admin)
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
