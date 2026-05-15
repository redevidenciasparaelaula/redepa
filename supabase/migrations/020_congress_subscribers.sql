-- Migración 020: tabla congress_subscribers para captura de email pre-CFP.
--
-- Anyone (anon o authenticated) puede insertar para dejar su email y recibir
-- aviso cuando abra la convocatoria. Solo super-admin puede leer, editar o
-- eliminar.

create table if not exists congress_subscribers (
  id uuid primary key default gen_random_uuid(),
  congress_id uuid not null references congresses(id) on delete cascade,
  email text not null,
  name text,
  created_at timestamptz default now(),
  unique (congress_id, email)
);

-- Email lowercased + formato razonable: x@y.zz mínimo.
-- Validamos en SQL para que ni siquiera llamadas directas a la API puedan
-- insertar basura.
alter table congress_subscribers
  drop constraint if exists congress_subscribers_email_format;
alter table congress_subscribers
  add constraint congress_subscribers_email_format
  check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]{2,}$');

create index if not exists congress_subscribers_congress_idx
  on congress_subscribers(congress_id);
create index if not exists congress_subscribers_created_idx
  on congress_subscribers(congress_id, created_at desc);

-- =====================================================================
-- RLS
-- =====================================================================
alter table congress_subscribers enable row level security;

drop policy if exists subscribers_public_insert on congress_subscribers;
drop policy if exists subscribers_super_admin_read on congress_subscribers;
drop policy if exists subscribers_super_admin_write on congress_subscribers;

-- Cualquiera (incluido anon) puede insertar su email.
-- La UNIQUE constraint evita duplicados; la CHECK valida formato.
create policy subscribers_public_insert on congress_subscribers
  for insert
  to anon, authenticated
  with check (true);

-- Solo super-admin lee la lista.
create policy subscribers_super_admin_read on congress_subscribers
  for select
  to authenticated
  using (exists (select 1 from super_admins where user_id = auth.uid()));

-- Solo super-admin edita o elimina.
create policy subscribers_super_admin_write on congress_subscribers
  for all
  to authenticated
  using (exists (select 1 from super_admins where user_id = auth.uid()))
  with check (exists (select 1 from super_admins where user_id = auth.uid()));

-- =====================================================================
-- RPC: subscribe_to_congress
--   Inserta normalizando email (trim + lowercase) y devuelve:
--     'ok'       si quedó suscrito
--     'already'  si ese email ya estaba suscrito a ese congreso
--     'invalid'  si el email tiene formato inválido
-- =====================================================================
create or replace function subscribe_to_congress(
  p_congress_id uuid,
  p_email text,
  p_name text default null
) returns text language plpgsql security definer
set search_path = public as $$
declare
  v_email text;
  v_name  text;
begin
  v_email := lower(trim(coalesce(p_email, '')));
  v_name  := nullif(trim(coalesce(p_name, '')), '');

  if v_email = '' or v_email !~* '^[^@\s]+@[^@\s]+\.[^@\s]{2,}$' then
    return 'invalid';
  end if;

  begin
    insert into congress_subscribers (congress_id, email, name)
    values (p_congress_id, v_email, v_name);
  exception when unique_violation then
    return 'already';
  end;
  return 'ok';
end;
$$;

grant execute on function subscribe_to_congress(uuid, text, text)
  to anon, authenticated;
