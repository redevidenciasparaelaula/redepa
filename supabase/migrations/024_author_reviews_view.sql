-- Migración 024: RPC para que el autor vea sus reviews una vez emitida
-- la decisión. Anonimiza al revisor (solo posición 1, 2, 3...) y oculta
-- comments_to_chair (confidencial).
--
-- Aunque la policy reviews_read ya permite al autor leer reviews cuando
-- decision_at IS NOT NULL, en la práctica el autor NO puede ejecutar
-- el SELECT directamente porque no puede leer review_assignments
-- (policy assignments_read solo deja al reviewer y al super-admin).
-- Esta RPC SECURITY DEFINER hace el join controlado.

create or replace function list_reviews_for_author(p_submission_id uuid)
returns table (
  position           int,
  score_originality  smallint,
  score_methodology  smallint,
  score_clarity      smallint,
  score_impact       smallint,
  comments_to_author text,
  recommendation     text,
  submitted_at       timestamptz
) language plpgsql security definer
set search_path = public as $$
declare
  v_caller       uuid := auth.uid();
  v_decision_at  timestamptz;
begin
  if v_caller is null then raise exception 'No autenticado'; end if;

  if not (
    is_submission_author(v_caller, p_submission_id)
    or exists (select 1 from super_admins where user_id = v_caller)
  ) then
    raise exception 'Sin permiso';
  end if;

  select decision_at into v_decision_at
    from submissions where id = p_submission_id;
  -- Si todavía no se emitió decisión, devolver vacío (no error).
  if v_decision_at is null then return; end if;

  return query
    select
      (row_number() over (order by rv.submitted_at))::int as position,
      rv.score_originality,
      rv.score_methodology,
      rv.score_clarity,
      rv.score_impact,
      rv.comments_to_author,
      rv.recommendation,
      rv.submitted_at
    from reviews rv
    join review_assignments ra on ra.id = rv.assignment_id
   where ra.submission_id = p_submission_id;
end;
$$;

grant execute on function list_reviews_for_author(uuid) to authenticated;
