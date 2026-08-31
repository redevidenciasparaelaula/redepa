-- Migración 031: fix "column reference user_id is ambiguous" en
-- list_reviewer_pool.
--
-- Bug: la RPC declara `user_id` como columna de retorno vía
-- RETURNS TABLE. Postgres considera ese nombre como una variable
-- dentro del scope de la función. La guardia del inicio hace:
--   select 1 from super_admins where user_id = auth.uid()
-- Como `user_id` puede referir tanto a la columna de super_admins
-- como a la variable de la RETURNS TABLE, Postgres tira
-- "column reference user_id is ambiguous" (SQLSTATE 42702).
-- Antes esto pasaba silenciosamente; versiones recientes de Postgres
-- son más estrictas.
--
-- Fix: calificar todas las referencias como super_admins.user_id.

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
  if not exists (
    select 1 from super_admins
    where super_admins.user_id = auth.uid()
  ) then
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
