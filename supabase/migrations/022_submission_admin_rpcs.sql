-- Migración 022: RPCs para el panel admin de postulaciones (chair view)
-- y la asignación de revisores con conflict-of-interest check.

-- =====================================================================
-- list_submissions_for_admin
--   Devuelve todas las postulaciones de un congreso con datos enriquecidos:
--   nombres de autores, track, #assignments, #reviews completadas.
--   Solo super-admin puede ejecutarla.
-- =====================================================================
create or replace function list_submissions_for_admin(p_congress_id uuid)
returns table (
  id                  uuid,
  title               text,
  status              text,
  type                text,
  track_id            uuid,
  track_name          text,
  authors_count       int,
  authors_names       text,
  assignments_count   int,
  reviews_completed   int,
  updated_at          timestamptz,
  submitted_at        timestamptz
) language plpgsql security definer
set search_path = public as $$
begin
  if not exists (select 1 from super_admins where user_id = auth.uid()) then
    raise exception 'Solo super admin';
  end if;

  return query
    select
      s.id,
      s.title,
      s.status,
      s.type,
      s.track_id,
      ct.name as track_name,
      (select count(*)::int
         from submission_authors sa where sa.submission_id = s.id) as authors_count,
      (select string_agg(sa.full_name, ', ' order by sa.display_order)
         from submission_authors sa where sa.submission_id = s.id) as authors_names,
      (select count(*)::int
         from review_assignments ra where ra.submission_id = s.id) as assignments_count,
      (select count(*)::int
         from review_assignments ra
         join reviews r on r.assignment_id = ra.id
        where ra.submission_id = s.id) as reviews_completed,
      s.updated_at,
      s.submitted_at
    from submissions s
    left join congress_tracks ct on ct.id = s.track_id
   where s.congress_id = p_congress_id
   order by
     case s.status
       when 'submitted' then 1
       when 'under_review' then 2
       when 'draft' then 3
       when 'accepted' then 4
       when 'rejected' then 5
       when 'withdrawn' then 6
     end,
     s.updated_at desc;
end;
$$;

grant execute on function list_submissions_for_admin(uuid) to authenticated;

-- =====================================================================
-- assign_reviewer_to_submission
--   Crea un review_assignment validando:
--     - super-admin
--     - submission existe
--     - reviewer está en reviewer_pool del mismo congreso y activo
--     - reviewer NO es autor del submission (COI)
--     - no exista assignment previo (UNIQUE constraint lo refuerza)
--   Si p_deadline_at es null, asigna deadline default:
--     notification_at - 14 días (o now()+4 semanas si no hay notification_at).
--
--   Devuelve:
--     'ok'                  asignación creada
--     'forbidden'           caller no es super-admin
--     'not_found'           submission no existe
--     'not_in_pool'         reviewer no está activo en el pool
--     'conflict_of_interest' reviewer es autor del submission
--     'already'             ya estaba asignado
-- =====================================================================
create or replace function assign_reviewer_to_submission(
  p_submission_id    uuid,
  p_reviewer_user_id uuid,
  p_deadline_at      timestamptz default null
) returns text language plpgsql security definer
set search_path = public as $$
declare
  v_congress_id     uuid;
  v_default_deadline timestamptz;
begin
  if not exists (select 1 from super_admins where user_id = auth.uid()) then
    return 'forbidden';
  end if;

  select congress_id into v_congress_id from submissions where id = p_submission_id;
  if v_congress_id is null then return 'not_found'; end if;

  if not exists (
    select 1 from reviewer_pool
    where user_id = p_reviewer_user_id
      and congress_id = v_congress_id
      and active
  ) then
    return 'not_in_pool';
  end if;

  if exists (
    select 1 from submission_authors
    where submission_id = p_submission_id and user_id = p_reviewer_user_id
  ) then
    return 'conflict_of_interest';
  end if;

  if exists (
    select 1 from review_assignments
    where submission_id = p_submission_id and reviewer_user_id = p_reviewer_user_id
  ) then
    return 'already';
  end if;

  if p_deadline_at is null then
    select notification_at - interval '14 days'
      into v_default_deadline
      from congresses where id = v_congress_id;
    if v_default_deadline is null or v_default_deadline < now() then
      v_default_deadline := now() + interval '4 weeks';
    end if;
  else
    v_default_deadline := p_deadline_at;
  end if;

  insert into review_assignments (submission_id, reviewer_user_id, deadline_at)
  values (p_submission_id, p_reviewer_user_id, v_default_deadline);

  -- Mueve el submission a 'under_review' si era 'submitted'
  update submissions
     set status = 'under_review', updated_at = now()
   where id = p_submission_id and status = 'submitted';

  return 'ok';
end;
$$;

grant execute on function assign_reviewer_to_submission(uuid, uuid, timestamptz)
  to authenticated;

-- =====================================================================
-- unassign_reviewer_from_submission
--   Borra el assignment si todavía no tiene una review escrita.
-- =====================================================================
create or replace function unassign_reviewer_from_submission(
  p_assignment_id uuid
) returns text language plpgsql security definer
set search_path = public as $$
declare
  v_submission_id uuid;
begin
  if not exists (select 1 from super_admins where user_id = auth.uid()) then
    return 'forbidden';
  end if;

  if exists (
    select 1 from reviews where assignment_id = p_assignment_id
  ) then
    return 'has_review';
  end if;

  select submission_id into v_submission_id
    from review_assignments where id = p_assignment_id;
  if v_submission_id is null then return 'not_found'; end if;

  delete from review_assignments where id = p_assignment_id;

  -- Si fue el último assignment y el status era under_review, vuelve a submitted
  if not exists (
    select 1 from review_assignments where submission_id = v_submission_id
  ) then
    update submissions
       set status = 'submitted', updated_at = now()
     where id = v_submission_id and status = 'under_review';
  end if;

  return 'ok';
end;
$$;

grant execute on function unassign_reviewer_from_submission(uuid) to authenticated;

-- =====================================================================
-- list_assignments_for_submission
--   Lista las asignaciones de una postulación incluyendo email + nombre
--   del reviewer y si ya entregó la review.
-- =====================================================================
create or replace function list_assignments_for_submission(p_submission_id uuid)
returns table (
  assignment_id    uuid,
  reviewer_user_id uuid,
  reviewer_email   text,
  reviewer_name    text,
  status           text,
  assigned_at      timestamptz,
  deadline_at      timestamptz,
  review_submitted boolean
) language plpgsql security definer
set search_path = public, auth as $$
begin
  if not exists (select 1 from super_admins where user_id = auth.uid()) then
    raise exception 'Solo super admin';
  end if;

  return query
    select
      ra.id                                              as assignment_id,
      ra.reviewer_user_id,
      u.email::text                                      as reviewer_email,
      coalesce(r.full_name, split_part(u.email::text, '@', 1)) as reviewer_name,
      ra.status,
      ra.assigned_at,
      ra.deadline_at,
      exists (select 1 from reviews rv where rv.assignment_id = ra.id) as review_submitted
    from review_assignments ra
    join auth.users u on u.id = ra.reviewer_user_id
    left join researchers r on lower(r.email) = lower(u.email::text)
   where ra.submission_id = p_submission_id
   order by ra.assigned_at asc;
end;
$$;

grant execute on function list_assignments_for_submission(uuid) to authenticated;
