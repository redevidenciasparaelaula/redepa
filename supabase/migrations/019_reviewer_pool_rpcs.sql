-- Migración 019: RPCs para gestionar el pool de evaluadores del congreso.
--
-- El super-admin del directorio es también admin del congreso. Los enlaces
-- entre researchers y auth.users son por email; estos RPCs hacen ese join
-- en lado servidor con SECURITY DEFINER (similar a 012_admin_management_rpcs).

-- =====================================================================
-- 1) add_reviewer_pool_entry_by_email
--    Devuelve:
--      'ok'       si se agregó (o se actualizó)
--      'no_user'  si el email no existe en auth.users (nunca ha hecho sign in)
--      'already'  si ya estaba en el pool de ese congreso y está activo
-- =====================================================================
create or replace function add_reviewer_pool_entry_by_email(
  p_email          text,
  p_congress_id    uuid,
  p_max_load       int,
  p_topics         text[],
  p_methodologies  text[]
) returns text language plpgsql security definer
set search_path = public, auth as $$
declare
  v_user_id uuid;
  v_existing record;
begin
  if not exists (select 1 from super_admins where user_id = auth.uid()) then
    raise exception 'Solo super admin';
  end if;

  select id into v_user_id from auth.users
    where lower(email::text) = lower(trim(p_email))
    limit 1;
  if v_user_id is null then
    return 'no_user';
  end if;

  -- Si existe y está activo → 'already'.
  -- Si existe pero está marcado inactivo → reactivar + sobreescribir.
  select * into v_existing from reviewer_pool
    where user_id = v_user_id and congress_id = p_congress_id;

  if found then
    if v_existing.active then
      return 'already';
    end if;
    update reviewer_pool
       set max_load      = p_max_load,
           topics        = coalesce(p_topics, '{}'::text[]),
           methodologies = coalesce(p_methodologies, '{}'::text[]),
           active        = true,
           updated_at    = now()
     where user_id = v_user_id and congress_id = p_congress_id;
    return 'ok';
  end if;

  insert into reviewer_pool (
    user_id, congress_id, max_load, topics, methodologies, active
  ) values (
    v_user_id, p_congress_id, p_max_load,
    coalesce(p_topics, '{}'::text[]),
    coalesce(p_methodologies, '{}'::text[]),
    true
  );
  return 'ok';
end;
$$;

grant execute on function add_reviewer_pool_entry_by_email(
  text, uuid, int, text[], text[]
) to authenticated;

-- =====================================================================
-- 2) update_reviewer_pool_entry
--    Edita carga / temas / metodologías / activo de un miembro del pool.
-- =====================================================================
create or replace function update_reviewer_pool_entry(
  p_user_id        uuid,
  p_congress_id    uuid,
  p_max_load       int,
  p_topics         text[],
  p_methodologies  text[],
  p_active         boolean
) returns text language plpgsql security definer
set search_path = public as $$
begin
  if not exists (select 1 from super_admins where user_id = auth.uid()) then
    raise exception 'Solo super admin';
  end if;

  update reviewer_pool
     set max_load      = p_max_load,
         topics        = coalesce(p_topics, '{}'::text[]),
         methodologies = coalesce(p_methodologies, '{}'::text[]),
         active        = p_active,
         updated_at    = now()
   where user_id = p_user_id and congress_id = p_congress_id;

  if not found then return 'not_found'; end if;
  return 'ok';
end;
$$;

grant execute on function update_reviewer_pool_entry(
  uuid, uuid, int, text[], text[], boolean
) to authenticated;

-- =====================================================================
-- 3) remove_reviewer_pool_entry
--    Quita a alguien del pool. Si tiene assignments asociados, abortamos
--    (el chair debería primero reasignar esos abstracts).
-- =====================================================================
create or replace function remove_reviewer_pool_entry(
  p_user_id     uuid,
  p_congress_id uuid
) returns text language plpgsql security definer
set search_path = public as $$
declare
  v_count int;
begin
  if not exists (select 1 from super_admins where user_id = auth.uid()) then
    raise exception 'Solo super admin';
  end if;

  select count(*) into v_count
    from review_assignments ra
    join submissions s on s.id = ra.submission_id
   where ra.reviewer_user_id = p_user_id
     and s.congress_id = p_congress_id;

  if v_count > 0 then
    return 'has_assignments';
  end if;

  delete from reviewer_pool
   where user_id = p_user_id and congress_id = p_congress_id;
  return 'ok';
end;
$$;

grant execute on function remove_reviewer_pool_entry(uuid, uuid) to authenticated;

-- =====================================================================
-- 4) list_reviewer_pool: devuelve el pool de un congreso CON email.
--    Útil para que el panel admin pueda matchear con la tabla researchers.
-- =====================================================================
create or replace function list_reviewer_pool(p_congress_id uuid)
returns table (
  user_id        uuid,
  email          text,
  max_load       int,
  topics         text[],
  methodologies  text[],
  active         boolean,
  assignments_count int
) language plpgsql security definer
set search_path = public, auth as $$
begin
  if not exists (select 1 from super_admins where user_id = auth.uid()) then
    raise exception 'Solo super admin';
  end if;

  return query
    select
      rp.user_id,
      u.email::text as email,
      rp.max_load,
      rp.topics,
      rp.methodologies,
      rp.active,
      (
        select count(*)::int
          from review_assignments ra
          join submissions s on s.id = ra.submission_id
         where ra.reviewer_user_id = rp.user_id
           and s.congress_id = p_congress_id
      ) as assignments_count
    from reviewer_pool rp
    join auth.users u on u.id = rp.user_id
   where rp.congress_id = p_congress_id;
end;
$$;

grant execute on function list_reviewer_pool(uuid) to authenticated;
