-- =====================================================================
-- Directorio Red EPA — Esquema de base de datos
-- =====================================================================
-- Ejecutar este archivo en el SQL Editor del proyecto Supabase
-- (Dashboard → SQL Editor → New query → pegar todo → Run)
-- =====================================================================

-- Extensiones
create extension if not exists "pg_trgm";   -- búsqueda fuzzy por nombre
create extension if not exists "unaccent";  -- ignorar tildes en búsqueda

-- Helpers inmutables para usar en columnas generadas e índices.
create or replace function immutable_unaccent(text) returns text
  language sql immutable parallel safe
  as $$ select unaccent($1) $$;

create or replace function arr_to_text(arr text[]) returns text
  language sql immutable parallel safe
  as $$ select lower(immutable_unaccent(array_to_string(arr, ' || '))) $$;

-- ---------------------------------------------------------------------
-- 1. Instituciones
-- ---------------------------------------------------------------------
create table if not exists institutions (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  name_en      text,
  country      text not null,
  city         text,
  website      text,
  created_at   timestamptz not null default now()
);

create index if not exists institutions_country_idx on institutions(country);
create index if not exists institutions_name_trgm   on institutions using gin (name gin_trgm_ops);

-- ---------------------------------------------------------------------
-- 2. Investigadores
-- ---------------------------------------------------------------------
create type researcher_status as enum ('pending', 'approved', 'rejected');

create table if not exists researchers (
  id                  uuid primary key default gen_random_uuid(),
  full_name           text not null,
  email               text not null unique,
  institution_id      uuid references institutions(id) on delete set null,
  title_es            text,
  title_en            text,
  phd_year            int,
  phd_institution     text,
  master_year         int,
  master_institution  text,
  research_topics     text[]  not null default '{}',
  research_topics_text text generated always as (arr_to_text(research_topics)) stored,
  methodologies       text[]  not null default '{}',
  representative_dois text[]  not null default '{}',
  country             text,
  city                text,
  linkedin_url        text,
  google_scholar_url  text,
  researchgate_url    text,
  orcid               text,
  website             text,
  photo_url           text,
  status              researcher_status not null default 'pending',
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index if not exists researchers_status_idx          on researchers(status);
create index if not exists researchers_institution_idx     on researchers(institution_id);
create index if not exists researchers_country_idx         on researchers(country);
create index if not exists researchers_phd_year_idx        on researchers(phd_year);
create index if not exists researchers_master_year_idx     on researchers(master_year);
create index if not exists researchers_topics_gin          on researchers using gin (research_topics);
create index if not exists researchers_topics_text_trgm    on researchers using gin (research_topics_text gin_trgm_ops);
create index if not exists researchers_methods_gin         on researchers using gin (methodologies);
create index if not exists researchers_name_trgm           on researchers using gin (full_name gin_trgm_ops);

-- Trigger: updated_at se mantiene al día
create or replace function set_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists researchers_updated_at on researchers;
create trigger researchers_updated_at
before update on researchers
for each row execute function set_updated_at();

-- ---------------------------------------------------------------------
-- 3. Administradores de institución
-- ---------------------------------------------------------------------
create table if not exists institution_admins (
  user_id        uuid not null references auth.users(id) on delete cascade,
  institution_id uuid not null references institutions(id) on delete cascade,
  created_at     timestamptz not null default now(),
  primary key (user_id, institution_id)
);

create index if not exists institution_admins_inst_idx on institution_admins(institution_id);

-- ---------------------------------------------------------------------
-- 4. Super administradores
-- ---------------------------------------------------------------------
create table if not exists super_admins (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Helpers de RLS
-- ---------------------------------------------------------------------
create or replace function is_super_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from super_admins where user_id = auth.uid());
$$;

create or replace function is_admin_of(p_institution uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from institution_admins
    where user_id = auth.uid() and institution_id = p_institution
  );
$$;

create or replace function current_email() returns text
language sql stable as $$
  select lower(coalesce(auth.jwt() ->> 'email', ''));
$$;

-- ---------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------
alter table institutions       enable row level security;
alter table researchers        enable row level security;
alter table institution_admins enable row level security;
alter table super_admins       enable row level security;

-- INSTITUTIONS ---------------------------------------------------------
drop policy if exists "institutions: lectura pública" on institutions;
create policy "institutions: lectura pública"
  on institutions for select using (true);

drop policy if exists "institutions: super admin escribe" on institutions;
create policy "institutions: super admin escribe"
  on institutions for all using (is_super_admin()) with check (is_super_admin());

-- Cualquiera (anon) puede crear una institución desde el formulario público
-- cuando la suya no está en la lista. Admin puede limpiar/fusionar después.
drop policy if exists "institutions: envío público crea" on institutions;
create policy "institutions: envío público crea"
  on institutions for insert with check (true);

-- RESEARCHERS ----------------------------------------------------------
drop policy if exists "researchers: público ve approved" on researchers;
create policy "researchers: público ve approved"
  on researchers for select using (status = 'approved');

drop policy if exists "researchers: dueño se ve a sí mismo" on researchers;
create policy "researchers: dueño se ve a sí mismo"
  on researchers for select using (lower(email) = current_email());

drop policy if exists "researchers: admin de institución ve los suyos" on researchers;
create policy "researchers: admin de institución ve los suyos"
  on researchers for select using (
    institution_id is not null and is_admin_of(institution_id)
  );

drop policy if exists "researchers: super admin ve todo" on researchers;
create policy "researchers: super admin ve todo"
  on researchers for select using (is_super_admin());

-- INSERT: cualquiera (incluido anónimo) puede crear un perfil; queda
-- inmediatamente publicado. Admin puede editar o borrar después.
drop policy if exists "researchers: envío público crea pending" on researchers;
drop policy if exists "researchers: envío público crea approved" on researchers;
create policy "researchers: envío público crea approved"
  on researchers for insert with check (status = 'approved');

drop policy if exists "researchers: admin/super crea cualquiera" on researchers;
create policy "researchers: admin/super crea cualquiera"
  on researchers for insert with check (
    is_super_admin()
    or (institution_id is not null and is_admin_of(institution_id))
  );

-- UPDATE: dueño edita su perfil (no puede cambiar status ni institución)
drop policy if exists "researchers: dueño edita lo suyo" on researchers;
create policy "researchers: dueño edita lo suyo"
  on researchers for update
  using (lower(email) = current_email() and status = 'approved')
  with check (lower(email) = current_email() and status = 'approved');

drop policy if exists "researchers: admin de institución edita los suyos" on researchers;
create policy "researchers: admin de institución edita los suyos"
  on researchers for update
  using (institution_id is not null and is_admin_of(institution_id))
  with check (institution_id is not null and is_admin_of(institution_id));

drop policy if exists "researchers: super admin edita todo" on researchers;
create policy "researchers: super admin edita todo"
  on researchers for update using (is_super_admin()) with check (is_super_admin());

-- DELETE: solo admin de institución o super
drop policy if exists "researchers: admin/super borra" on researchers;
create policy "researchers: admin/super borra"
  on researchers for delete using (
    is_super_admin()
    or (institution_id is not null and is_admin_of(institution_id))
  );

-- INSTITUTION_ADMINS ---------------------------------------------------
drop policy if exists "institution_admins: usuario ve sus filas" on institution_admins;
create policy "institution_admins: usuario ve sus filas"
  on institution_admins for select using (user_id = auth.uid() or is_super_admin());

drop policy if exists "institution_admins: super admin gestiona" on institution_admins;
create policy "institution_admins: super admin gestiona"
  on institution_admins for all using (is_super_admin()) with check (is_super_admin());

-- SUPER_ADMINS ---------------------------------------------------------
drop policy if exists "super_admins: usuario ve sus filas" on super_admins;
create policy "super_admins: usuario ve sus filas"
  on super_admins for select using (user_id = auth.uid() or is_super_admin());

drop policy if exists "super_admins: super admin gestiona" on super_admins;
create policy "super_admins: super admin gestiona"
  on super_admins for all using (is_super_admin()) with check (is_super_admin());

-- ---------------------------------------------------------------------
-- Permisos de roles (RLS controla qué fila, GRANT controla acceso a la tabla)
-- ---------------------------------------------------------------------
grant usage on schema public to anon, authenticated;

grant select on institutions to anon, authenticated;
grant insert on institutions to anon;
grant insert, update, delete on institutions to authenticated;

grant select, insert on researchers to anon;
grant select, insert, update, delete on researchers to authenticated;

grant select, insert, update, delete on institution_admins to authenticated;
grant select, insert, update, delete on super_admins to authenticated;
