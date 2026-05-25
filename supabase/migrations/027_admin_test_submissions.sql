-- Migración 027: super-admin puede crear postulaciones de prueba aunque
-- el CFP no esté abierto. La idea es permitir ver el formulario y poblar
-- data de prueba antes de la apertura real, sin tocar el estado público.
--
-- Solo afecta a create_submission_with_self_as_author. submit_submission_atomic
-- sigue exigiendo cfp_open (el chair no debería enviar postulaciones como
-- "submitted" en estado de prueba; sí puede dejarlas como draft).

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
  v_is_super        boolean;
begin
  v_user_id := auth.uid();
  if v_user_id is null then raise exception 'No autenticado'; end if;

  select status into v_status from congresses where id = p_congress_id;
  if v_status is null then raise exception 'Congreso no existe'; end if;

  -- Super-admin puede crear postulaciones de prueba en cualquier estado.
  -- El resto solo cuando el CFP está abierto.
  select exists (select 1 from super_admins where user_id = v_user_id)
    into v_is_super;
  if not v_is_super and v_status <> 'cfp_open' then
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
