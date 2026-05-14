-- Migración 014: esquema de congresos (Ola 1)
--
-- Crea las tablas base para gestionar congresos EPA (CFP, postulaciones,
-- revisión doble ciega, programa, asistentes). Se integra con el
-- directorio existente: reusa researchers, institutions, super_admins.
--
-- Doble ciego estricto:
--   - El contenido del trabajo (submissions) está en una tabla
--   - Los autores (submission_authors) están en OTRA tabla
--   - RLS impide que los evaluadores lean submission_authors
--   - Solo cuando un trabajo es 'accepted' los autores se vuelven públicos
--
-- Idempotente: usa IF NOT EXISTS / DROP+CREATE para poder re-correrse.

create extension if not exists pgcrypto;

-- ========================================================================
-- 1. congresses: master row por evento (EPA 2025, 2027, 2029...)
-- ========================================================================
create table if not exists congresses (
  id uuid primary key default gen_random_uuid(),
  year int not null,
  name text not null,
  slug text not null unique,                      -- ej: 'epa-2027'
  start_date date not null,
  end_date date not null,
  cfp_open_at  timestamptz,                       -- abre el CFP
  cfp_close_at timestamptz,                       -- HARD DEADLINE de postulación
  notification_at timestamptz,                    -- fecha referencial de notificación
  registration_open_at timestamptz,               -- abre inscripción asistentes
  status text not null default 'draft'
    check (status in ('draft','cfp_open','review','program','live','closed')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ========================================================================
-- 2. congress_tracks: líneas temáticas
-- ========================================================================
create table if not exists congress_tracks (
  id uuid primary key default gen_random_uuid(),
  congress_id uuid not null references congresses(id) on delete cascade,
  name text not null,
  description text,
  chair_user_id uuid references auth.users(id) on delete set null,
  display_order int default 0,
  created_at timestamptz default now()
);
create index if not exists congress_tracks_congress_idx on congress_tracks(congress_id);

-- ========================================================================
-- 3. submissions: el trabajo postulado. Contenido SIN identificadores.
-- ========================================================================
create table if not exists submissions (
  id uuid primary key default gen_random_uuid(),
  congress_id uuid not null references congresses(id) on delete cascade,
  track_id uuid references congress_tracks(id) on delete set null,
  title text not null,
  -- 5 campos estructurados del abstract:
  abs_context    text not null default '',
  abs_framework  text not null default '',
  abs_methods    text not null default '',
  abs_results    text not null default '',
  abs_discussion text not null default '',
  keywords text[] not null default '{}',
  methodologies text[] not null default '{}',
  type text not null default 'oral'
    check (type in ('oral','poster','symposium')),
  status text not null default 'draft'
    check (status in ('draft','submitted','under_review','accepted','rejected','withdrawn')),
  decision_note text,
  created_at  timestamptz default now(),
  submitted_at timestamptz,
  decision_at timestamptz,
  updated_at timestamptz default now()
);
create index if not exists submissions_congress_idx on submissions(congress_id);
create index if not exists submissions_track_idx    on submissions(track_id);
create index if not exists submissions_status_idx   on submissions(status);

-- ========================================================================
-- 4. submission_authors: SEPARADO para enforce doble ciego via RLS
--    Evaluadores NUNCA pueden leer esta tabla.
-- ========================================================================
create table if not exists submission_authors (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references submissions(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,  -- null = externo
  full_name text not null,
  email text not null,
  institution_id uuid references institutions(id) on delete set null,
  external_institution_name text,                  -- si no está en directorio
  is_corresponding boolean default false,
  is_presenter boolean default false,
  display_order int default 0,
  created_at timestamptz default now()
);
create index if not exists submission_authors_submission_idx on submission_authors(submission_id);
create index if not exists submission_authors_user_idx       on submission_authors(user_id);

-- ========================================================================
-- 5. reviewer_pool: investigadores que se ofrecieron como evaluadores
-- ========================================================================
create table if not exists reviewer_pool (
  user_id uuid not null references auth.users(id) on delete cascade,
  congress_id uuid not null references congresses(id) on delete cascade,
  max_load int not null default 5,
  topics text[] not null default '{}',
  methodologies text[] not null default '{}',
  active boolean not null default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  primary key (user_id, congress_id)
);

-- ========================================================================
-- 6. review_assignments
-- ========================================================================
create table if not exists review_assignments (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references submissions(id) on delete cascade,
  reviewer_user_id uuid not null references auth.users(id) on delete cascade,
  assigned_at timestamptz default now(),
  deadline_at timestamptz,
  status text not null default 'pending'
    check (status in ('pending','in_progress','submitted','declined')),
  unique (submission_id, reviewer_user_id)
);
create index if not exists review_assignments_submission_idx on review_assignments(submission_id);
create index if not exists review_assignments_reviewer_idx   on review_assignments(reviewer_user_id);
create index if not exists review_assignments_status_idx     on review_assignments(status);

-- ========================================================================
-- 7. reviews: la evaluación propiamente tal (1 por assignment)
-- ========================================================================
create table if not exists reviews (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null unique references review_assignments(id) on delete cascade,
  score_originality smallint not null check (score_originality between 1 and 5),
  score_methodology smallint not null check (score_methodology between 1 and 5),
  score_clarity     smallint not null check (score_clarity     between 1 and 5),
  score_impact      smallint not null check (score_impact      between 1 and 5),
  comments_to_author text not null default '',
  comments_to_chair  text not null default '',
  recommendation text not null
    check (recommendation in ('accept','minor_revision','major_revision','reject')),
  submitted_at timestamptz default now()
);

-- ========================================================================
-- 8. congress_sessions: bloques del programa (parallel/keynote/panel/workshop)
-- ========================================================================
create table if not exists congress_sessions (
  id uuid primary key default gen_random_uuid(),
  congress_id uuid not null references congresses(id) on delete cascade,
  track_id uuid references congress_tracks(id) on delete set null,
  kind text not null default 'regular'
    check (kind in ('regular','keynote','panel','workshop')),
  title text,                                      -- para keynotes/paneles
  room text,
  start_at timestamptz not null,
  end_at   timestamptz not null,
  chair_user_id uuid references auth.users(id) on delete set null,
  display_order int default 0,
  created_at timestamptz default now(),
  check (end_at > start_at)
);
create index if not exists congress_sessions_congress_idx on congress_sessions(congress_id);

-- ========================================================================
-- 9. session_submissions: qué trabajos en qué sesión
-- ========================================================================
create table if not exists session_submissions (
  session_id    uuid not null references congress_sessions(id) on delete cascade,
  submission_id uuid not null references submissions(id) on delete cascade,
  display_order int default 0,
  start_offset_minutes int default 0,
  primary key (session_id, submission_id)
);

-- ========================================================================
-- 10. attendees: inscritos al congreso
-- ========================================================================
create table if not exists attendees (
  id uuid primary key default gen_random_uuid(),
  congress_id uuid not null references congresses(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  full_name text not null,
  email text not null,
  institution text,
  category text,                                   -- free-form por ahora
  paid boolean default false,
  payment_provider text,
  payment_id text,
  paid_at timestamptz,
  registered_at timestamptz default now(),
  unique (congress_id, email)
);

-- ========================================================================
-- 11. attendee_program: agenda personal del asistente
-- ========================================================================
create table if not exists attendee_program (
  attendee_id   uuid not null references attendees(id) on delete cascade,
  submission_id uuid not null references submissions(id) on delete cascade,
  primary key (attendee_id, submission_id)
);

-- ========================================================================
-- Helper functions (security definer → bypassean RLS al consultar)
-- ========================================================================
create or replace function is_congress_chair(p_user_id uuid, p_congress_id uuid)
returns boolean language sql stable security definer as $$
  select exists (select 1 from super_admins where user_id = p_user_id)
    or exists (
      select 1 from congress_tracks
      where congress_id = p_congress_id and chair_user_id = p_user_id
    );
$$;

create or replace function is_submission_author(p_user_id uuid, p_submission_id uuid)
returns boolean language sql stable security definer as $$
  select exists (
    select 1 from submission_authors
    where submission_id = p_submission_id and user_id = p_user_id
  );
$$;

create or replace function is_assigned_reviewer(p_user_id uuid, p_submission_id uuid)
returns boolean language sql stable security definer as $$
  select exists (
    select 1 from review_assignments
    where submission_id = p_submission_id and reviewer_user_id = p_user_id
  );
$$;

-- ========================================================================
-- RLS — activación + políticas
-- (drop-then-create para que sea idempotente)
-- ========================================================================

-- ----- congresses ------------------------------------------------------
alter table congresses enable row level security;
drop policy if exists congresses_read_all on congresses;
drop policy if exists congresses_super_admin_write on congresses;
create policy congresses_read_all on congresses
  for select to authenticated, anon using (true);
create policy congresses_super_admin_write on congresses
  for all to authenticated
  using (exists (select 1 from super_admins where user_id = auth.uid()))
  with check (exists (select 1 from super_admins where user_id = auth.uid()));

-- ----- congress_tracks -------------------------------------------------
alter table congress_tracks enable row level security;
drop policy if exists tracks_read_all on congress_tracks;
drop policy if exists tracks_super_admin_write on congress_tracks;
create policy tracks_read_all on congress_tracks
  for select to authenticated, anon using (true);
create policy tracks_super_admin_write on congress_tracks
  for all to authenticated
  using (exists (select 1 from super_admins where user_id = auth.uid()))
  with check (exists (select 1 from super_admins where user_id = auth.uid()));

-- ----- submissions -----------------------------------------------------
alter table submissions enable row level security;
drop policy if exists submissions_read on submissions;
drop policy if exists submissions_insert_authenticated on submissions;
drop policy if exists submissions_update_chair_or_author on submissions;
drop policy if exists submissions_delete_super_admin on submissions;

create policy submissions_read on submissions
  for select to authenticated, anon using (
    status = 'accepted'
    or is_congress_chair(auth.uid(), congress_id)
    or is_submission_author(auth.uid(), id)
    or is_assigned_reviewer(auth.uid(), id)
  );

create policy submissions_insert_authenticated on submissions
  for insert to authenticated with check (true);

create policy submissions_update_chair_or_author on submissions
  for update to authenticated
  using (
    is_congress_chair(auth.uid(), congress_id)
    or is_submission_author(auth.uid(), id)
  )
  with check (
    is_congress_chair(auth.uid(), congress_id)
    or is_submission_author(auth.uid(), id)
  );

create policy submissions_delete_super_admin on submissions
  for delete to authenticated
  using (exists (select 1 from super_admins where user_id = auth.uid()));

-- ----- submission_authors (KEY para doble ciego) ----------------------
alter table submission_authors enable row level security;
drop policy if exists authors_read on submission_authors;
drop policy if exists authors_insert on submission_authors;
drop policy if exists authors_update_chair_or_self on submission_authors;

-- Lectura: super admin, el propio autor, otro autor del mismo submission,
-- o cualquiera si el submission fue aceptado.
create policy authors_read on submission_authors
  for select to authenticated, anon using (
    exists (select 1 from super_admins where user_id = auth.uid())
    or user_id = auth.uid()
    or exists (
      select 1 from submission_authors sa2
      where sa2.submission_id = submission_authors.submission_id
        and sa2.user_id = auth.uid()
    )
    or exists (
      select 1 from submissions
      where id = submission_authors.submission_id
        and status = 'accepted'
    )
  );

-- Insert: el propio researcher se puede agregar como autor a un submission
-- que él mismo creó (típico) o existe y es autor de él.
create policy authors_insert on submission_authors
  for insert to authenticated with check (true);
  -- Nota: políticas más estrictas las afinaremos en Ola 3 cuando
  -- construyamos el flujo de postulación.

create policy authors_update_chair_or_self on submission_authors
  for all to authenticated
  using (
    exists (select 1 from super_admins where user_id = auth.uid())
    or user_id = auth.uid()
    or exists (
      select 1 from submission_authors sa2
      where sa2.submission_id = submission_authors.submission_id
        and sa2.user_id = auth.uid()
    )
  )
  with check (
    exists (select 1 from super_admins where user_id = auth.uid())
    or user_id = auth.uid()
    or exists (
      select 1 from submission_authors sa2
      where sa2.submission_id = submission_authors.submission_id
        and sa2.user_id = auth.uid()
    )
  );

-- ----- reviewer_pool ---------------------------------------------------
alter table reviewer_pool enable row level security;
drop policy if exists reviewer_pool_read on reviewer_pool;
drop policy if exists reviewer_pool_self_write on reviewer_pool;
drop policy if exists reviewer_pool_super_admin_write on reviewer_pool;

create policy reviewer_pool_read on reviewer_pool
  for select to authenticated using (
    user_id = auth.uid()
    or exists (select 1 from super_admins where user_id = auth.uid())
  );
create policy reviewer_pool_self_write on reviewer_pool
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
create policy reviewer_pool_super_admin_write on reviewer_pool
  for all to authenticated
  using (exists (select 1 from super_admins where user_id = auth.uid()))
  with check (exists (select 1 from super_admins where user_id = auth.uid()));

-- ----- review_assignments ---------------------------------------------
alter table review_assignments enable row level security;
drop policy if exists assignments_read on review_assignments;
drop policy if exists assignments_chair_write on review_assignments;
drop policy if exists assignments_reviewer_update_status on review_assignments;

create policy assignments_read on review_assignments
  for select to authenticated using (
    reviewer_user_id = auth.uid()
    or exists (select 1 from super_admins where user_id = auth.uid())
  );
create policy assignments_chair_write on review_assignments
  for all to authenticated
  using (exists (select 1 from super_admins where user_id = auth.uid()))
  with check (exists (select 1 from super_admins where user_id = auth.uid()));
create policy assignments_reviewer_update_status on review_assignments
  for update to authenticated
  using (reviewer_user_id = auth.uid())
  with check (reviewer_user_id = auth.uid());

-- ----- reviews ---------------------------------------------------------
alter table reviews enable row level security;
drop policy if exists reviews_read on reviews;
drop policy if exists reviews_reviewer_write on reviews;
drop policy if exists reviews_reviewer_update on reviews;

create policy reviews_read on reviews
  for select to authenticated using (
    exists (select 1 from super_admins where user_id = auth.uid())
    or exists (
      select 1 from review_assignments
      where id = reviews.assignment_id
        and reviewer_user_id = auth.uid()
    )
    -- Autor ve sus reviews una vez que su submission fue decidido.
    -- (Filtrar comments_to_chair se hace en la app, no por RLS.)
    or exists (
      select 1 from review_assignments ra
      join submissions s on s.id = ra.submission_id
      where ra.id = reviews.assignment_id
        and s.decision_at is not null
        and is_submission_author(auth.uid(), s.id)
    )
  );
create policy reviews_reviewer_write on reviews
  for insert to authenticated with check (
    exists (
      select 1 from review_assignments
      where id = assignment_id and reviewer_user_id = auth.uid()
    )
  );
create policy reviews_reviewer_update on reviews
  for update to authenticated
  using (
    exists (
      select 1 from review_assignments
      where id = reviews.assignment_id and reviewer_user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from review_assignments
      where id = reviews.assignment_id and reviewer_user_id = auth.uid()
    )
  );

-- ----- congress_sessions ----------------------------------------------
alter table congress_sessions enable row level security;
drop policy if exists sessions_read_all on congress_sessions;
drop policy if exists sessions_chair_write on congress_sessions;

create policy sessions_read_all on congress_sessions
  for select to authenticated, anon using (true);
create policy sessions_chair_write on congress_sessions
  for all to authenticated
  using (exists (select 1 from super_admins where user_id = auth.uid()))
  with check (exists (select 1 from super_admins where user_id = auth.uid()));

-- ----- session_submissions --------------------------------------------
alter table session_submissions enable row level security;
drop policy if exists session_submissions_read_all on session_submissions;
drop policy if exists session_submissions_chair_write on session_submissions;

create policy session_submissions_read_all on session_submissions
  for select to authenticated, anon using (true);
create policy session_submissions_chair_write on session_submissions
  for all to authenticated
  using (exists (select 1 from super_admins where user_id = auth.uid()))
  with check (exists (select 1 from super_admins where user_id = auth.uid()));

-- ----- attendees -------------------------------------------------------
alter table attendees enable row level security;
drop policy if exists attendees_read_self_or_chair on attendees;
drop policy if exists attendees_insert_authenticated on attendees;
drop policy if exists attendees_update_chair on attendees;

create policy attendees_read_self_or_chair on attendees
  for select to authenticated using (
    user_id = auth.uid()
    or exists (select 1 from super_admins where user_id = auth.uid())
  );
create policy attendees_insert_authenticated on attendees
  for insert to authenticated with check (
    user_id = auth.uid()
    or exists (select 1 from super_admins where user_id = auth.uid())
  );
create policy attendees_update_chair on attendees
  for update to authenticated
  using (exists (select 1 from super_admins where user_id = auth.uid()))
  with check (exists (select 1 from super_admins where user_id = auth.uid()));

-- ----- attendee_program -----------------------------------------------
alter table attendee_program enable row level security;
drop policy if exists attendee_program_self on attendee_program;

create policy attendee_program_self on attendee_program
  for all to authenticated
  using (
    exists (
      select 1 from attendees
      where id = attendee_program.attendee_id
        and (user_id = auth.uid() or exists (select 1 from super_admins where user_id = auth.uid()))
    )
  )
  with check (
    exists (
      select 1 from attendees
      where id = attendee_program.attendee_id
        and (user_id = auth.uid() or exists (select 1 from super_admins where user_id = auth.uid()))
    )
  );

-- ========================================================================
-- Trigger: actualizar updated_at en cada UPDATE
-- ========================================================================
create or replace function tg_set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists congresses_updated_at on congresses;
create trigger congresses_updated_at before update on congresses
  for each row execute function tg_set_updated_at();

drop trigger if exists submissions_updated_at on submissions;
create trigger submissions_updated_at before update on submissions
  for each row execute function tg_set_updated_at();

drop trigger if exists reviewer_pool_updated_at on reviewer_pool;
create trigger reviewer_pool_updated_at before update on reviewer_pool
  for each row execute function tg_set_updated_at();

-- ========================================================================
-- Seed: crear el row de Congreso EPA 2027 en estado draft
-- Las fechas y deadline son placeholders; los editas después por SQL o UI.
-- ========================================================================
insert into congresses (year, name, slug, start_date, end_date, status)
values (
  2027,
  'Congreso EPA 2027',
  'epa-2027',
  '2027-11-16',
  '2027-11-17',
  'draft'
)
on conflict (slug) do nothing;
