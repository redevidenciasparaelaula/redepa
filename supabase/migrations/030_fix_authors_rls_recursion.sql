-- Migración 030: fix recursión infinita en RLS de submission_authors.
--
-- Bug: las políticas authors_read y authors_update_chair_or_self usaban
-- una subquery inline `exists (select 1 from submission_authors sa2 ...)`
-- para chequear si el caller es coautor. Postgres detecta que esa subquery
-- también aplica la misma política → recursión infinita → error
-- "infinite recursion detected in policy for relation submission_authors".
--
-- Resultado en la app: cualquier SELECT sobre submission_authors devolvía
-- error, el cliente recibía data=null y mostraba lista vacía.
--
-- Fix: reemplazar la subquery inline por la función is_submission_author()
-- que ya existe (migración 014) y es SECURITY DEFINER, así su SELECT
-- interno bypassa el RLS y evita la recursión.

drop policy if exists authors_read on submission_authors;
drop policy if exists authors_update_chair_or_self on submission_authors;

create policy authors_read on submission_authors
  for select to authenticated, anon using (
    exists (select 1 from super_admins where user_id = auth.uid())
    or user_id = auth.uid()
    or is_submission_author(auth.uid(), submission_id)
    or exists (
      select 1 from submissions
      where id = submission_authors.submission_id
        and status = 'accepted'
    )
  );

create policy authors_update_chair_or_self on submission_authors
  for all to authenticated
  using (
    exists (select 1 from super_admins where user_id = auth.uid())
    or user_id = auth.uid()
    or is_submission_author(auth.uid(), submission_id)
  )
  with check (
    exists (select 1 from super_admins where user_id = auth.uid())
    or user_id = auth.uid()
    or is_submission_author(auth.uid(), submission_id)
  );
