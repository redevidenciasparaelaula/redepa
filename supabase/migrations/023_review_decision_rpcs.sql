-- Migración 023: flujo de revisión y decisión del chair.
--
-- RPCs SECURITY DEFINER que garantizan:
--   - El reviewer solo puede entregar review de SUS assignments.
--   - El chair solo puede emitir decisión sobre postulaciones en estados
--     válidos (under_review, accepted, rejected).
--   - Las transiciones de estado son atómicas (submitted ↔ accepted/rejected).

-- =====================================================================
-- submit_review_atomic
--   Inserta la review y cambia assignment.status='submitted' en una tx.
--   Si ya existía una review (unique en assignment_id), la actualiza.
--   Valida scores 1..5 y que la recomendación esté en el set permitido.
--   Devuelve:
--     'ok'                 entregada/actualizada
--     'forbidden'          caller no es el reviewer asignado
--     'not_found'          assignment no existe
--     'invalid_score'      algún score fuera de 1..5
--     'invalid_recommendation'
-- =====================================================================
create or replace function submit_review_atomic(
  p_assignment_id       uuid,
  p_score_originality   smallint,
  p_score_methodology   smallint,
  p_score_clarity       smallint,
  p_score_impact        smallint,
  p_comments_to_author  text,
  p_comments_to_chair   text,
  p_recommendation      text
) returns text language plpgsql security definer
set search_path = public as $$
declare
  v_caller   uuid := auth.uid();
  v_assignment record;
begin
  if v_caller is null then return 'forbidden'; end if;

  select * into v_assignment from review_assignments where id = p_assignment_id;
  if v_assignment.id is null then return 'not_found'; end if;
  if v_assignment.reviewer_user_id <> v_caller then return 'forbidden'; end if;

  if p_score_originality not between 1 and 5
     or p_score_methodology not between 1 and 5
     or p_score_clarity     not between 1 and 5
     or p_score_impact      not between 1 and 5 then
    return 'invalid_score';
  end if;

  if p_recommendation not in
     ('accept','minor_revision','major_revision','reject') then
    return 'invalid_recommendation';
  end if;

  -- UPSERT: clave única en assignment_id permite update si re-entrega
  insert into reviews (
    assignment_id,
    score_originality, score_methodology, score_clarity, score_impact,
    comments_to_author, comments_to_chair, recommendation, submitted_at
  ) values (
    p_assignment_id,
    p_score_originality, p_score_methodology, p_score_clarity, p_score_impact,
    coalesce(p_comments_to_author, ''),
    coalesce(p_comments_to_chair, ''),
    p_recommendation,
    now()
  )
  on conflict (assignment_id) do update set
    score_originality = excluded.score_originality,
    score_methodology = excluded.score_methodology,
    score_clarity     = excluded.score_clarity,
    score_impact      = excluded.score_impact,
    comments_to_author = excluded.comments_to_author,
    comments_to_chair  = excluded.comments_to_chair,
    recommendation     = excluded.recommendation,
    submitted_at       = now();

  update review_assignments
     set status = 'submitted'
   where id = p_assignment_id;

  return 'ok';
end;
$$;

grant execute on function submit_review_atomic(
  uuid, smallint, smallint, smallint, smallint, text, text, text
) to authenticated;

-- =====================================================================
-- decline_assignment
--   El reviewer rechaza una asignación. Solo si no entregó review.
-- =====================================================================
create or replace function decline_assignment(
  p_assignment_id uuid
) returns text language plpgsql security definer
set search_path = public as $$
declare
  v_caller uuid := auth.uid();
  v_a record;
begin
  if v_caller is null then return 'forbidden'; end if;
  select * into v_a from review_assignments where id = p_assignment_id;
  if v_a.id is null then return 'not_found'; end if;
  if v_a.reviewer_user_id <> v_caller then return 'forbidden'; end if;

  if exists (select 1 from reviews where assignment_id = p_assignment_id) then
    return 'has_review';
  end if;

  update review_assignments
     set status = 'declined'
   where id = p_assignment_id;
  return 'ok';
end;
$$;

grant execute on function decline_assignment(uuid) to authenticated;

-- =====================================================================
-- mark_assignment_in_progress
--   Cuando el reviewer abre la asignación por primera vez, la marcamos
--   en curso. Idempotente: si ya está en curso o submitted, no hace nada.
-- =====================================================================
create or replace function mark_assignment_in_progress(
  p_assignment_id uuid
) returns text language plpgsql security definer
set search_path = public as $$
declare
  v_caller uuid := auth.uid();
  v_a record;
begin
  if v_caller is null then return 'forbidden'; end if;
  select * into v_a from review_assignments where id = p_assignment_id;
  if v_a.id is null then return 'not_found'; end if;
  if v_a.reviewer_user_id <> v_caller then return 'forbidden'; end if;

  if v_a.status = 'pending' then
    update review_assignments set status = 'in_progress' where id = p_assignment_id;
  end if;
  return 'ok';
end;
$$;

grant execute on function mark_assignment_in_progress(uuid) to authenticated;

-- =====================================================================
-- decide_submission
--   El chair (super-admin) emite decisión final: 'accepted' o 'rejected'.
--   Acepta también revertir (accepted/rejected → under_review) si todavía
--   no notificó a autores. Mientras el congreso no esté en 'program',
--   permitimos cambiar la decisión.
-- =====================================================================
create or replace function decide_submission(
  p_submission_id uuid,
  p_decision      text,
  p_note          text default null
) returns text language plpgsql security definer
set search_path = public as $$
declare
  v_s record;
  v_c record;
begin
  if not exists (select 1 from super_admins where user_id = auth.uid()) then
    return 'forbidden';
  end if;

  if p_decision not in ('accepted','rejected','revert') then
    return 'invalid_decision';
  end if;

  select * into v_s from submissions where id = p_submission_id;
  if v_s.id is null then return 'not_found'; end if;

  select * into v_c from congresses where id = v_s.congress_id;
  if v_c.status not in ('review','program') then
    return 'wrong_congress_status';
  end if;

  if p_decision = 'revert' then
    if v_s.status not in ('accepted','rejected') then
      return 'wrong_submission_status';
    end if;
    update submissions
       set status = 'under_review',
           decision_note = null,
           decision_at = null,
           updated_at = now()
     where id = p_submission_id;
    return 'ok';
  end if;

  if v_s.status not in ('under_review','accepted','rejected') then
    return 'wrong_submission_status';
  end if;

  update submissions
     set status = p_decision,
         decision_note = nullif(trim(coalesce(p_note, '')), ''),
         decision_at = now(),
         updated_at = now()
   where id = p_submission_id;

  return 'ok';
end;
$$;

grant execute on function decide_submission(uuid, text, text) to authenticated;

-- =====================================================================
-- list_my_review_assignments
--   Lista las asignaciones del usuario actual (cualquier congreso) con
--   datos del submission (sin info de autoría: doble ciega).
-- =====================================================================
create or replace function list_my_review_assignments()
returns table (
  assignment_id    uuid,
  submission_id    uuid,
  submission_title text,
  submission_type  text,
  track_name       text,
  congress_id      uuid,
  congress_name    text,
  congress_slug    text,
  congress_year    int,
  assignment_status text,
  deadline_at      timestamptz,
  review_submitted boolean,
  recommendation   text
) language plpgsql security definer
set search_path = public as $$
declare
  v_caller uuid := auth.uid();
begin
  if v_caller is null then raise exception 'No autenticado'; end if;

  return query
    select
      ra.id                     as assignment_id,
      s.id                      as submission_id,
      s.title                   as submission_title,
      s.type                    as submission_type,
      ct.name                   as track_name,
      c.id                      as congress_id,
      c.name                    as congress_name,
      c.slug                    as congress_slug,
      c.year                    as congress_year,
      ra.status                 as assignment_status,
      ra.deadline_at,
      exists (select 1 from reviews rv where rv.assignment_id = ra.id) as review_submitted,
      (select rv.recommendation from reviews rv where rv.assignment_id = ra.id) as recommendation
    from review_assignments ra
    join submissions s on s.id = ra.submission_id
    join congresses c on c.id = s.congress_id
    left join congress_tracks ct on ct.id = s.track_id
   where ra.reviewer_user_id = v_caller
   order by
     case
       when exists (select 1 from reviews rv where rv.assignment_id = ra.id) then 1
       else 0
     end,
     ra.deadline_at asc nulls last;
end;
$$;

grant execute on function list_my_review_assignments() to authenticated;

-- =====================================================================
-- get_review_for_reviewer
--   Lee la review previa del reviewer para un assignment (si existe).
--   Usado por el form para precargar valores cuando re-edita.
-- =====================================================================
create or replace function get_review_for_reviewer(p_assignment_id uuid)
returns table (
  score_originality   smallint,
  score_methodology   smallint,
  score_clarity       smallint,
  score_impact        smallint,
  comments_to_author  text,
  comments_to_chair   text,
  recommendation      text,
  submitted_at        timestamptz
) language plpgsql security definer
set search_path = public as $$
declare
  v_caller uuid := auth.uid();
  v_a record;
begin
  if v_caller is null then raise exception 'No autenticado'; end if;
  select * into v_a from review_assignments where id = p_assignment_id;
  if v_a.id is null then raise exception 'No existe'; end if;
  if v_a.reviewer_user_id <> v_caller
     and not exists (select 1 from super_admins where user_id = v_caller) then
    raise exception 'Sin permiso';
  end if;

  return query
    select rv.score_originality, rv.score_methodology, rv.score_clarity, rv.score_impact,
           rv.comments_to_author, rv.comments_to_chair, rv.recommendation, rv.submitted_at
      from reviews rv
     where rv.assignment_id = p_assignment_id;
end;
$$;

grant execute on function get_review_for_reviewer(uuid) to authenticated;
