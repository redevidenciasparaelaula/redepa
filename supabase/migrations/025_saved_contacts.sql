-- Migración 025: tabla saved_contacts para que los usuarios guarden
-- investigadoras/es del directorio con tags (proyecto, contexto) y una nota
-- libre. Cada usuario solo ve y modifica sus propios contactos guardados.

create table if not exists saved_contacts (
  user_id       uuid not null references auth.users(id) on delete cascade,
  researcher_id uuid not null references researchers(id) on delete cascade,
  tags          text[] not null default '{}',
  note          text,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now(),
  primary key (user_id, researcher_id)
);

create index if not exists saved_contacts_user_idx
  on saved_contacts(user_id, created_at desc);

-- Para filtrar contactos por tag (Postgres GIN sobre text[])
create index if not exists saved_contacts_tags_idx
  on saved_contacts using gin (tags);

-- =====================================================================
-- RLS — privacidad total: cada usuario solo accede a los suyos
-- =====================================================================
alter table saved_contacts enable row level security;

drop policy if exists saved_contacts_select_own on saved_contacts;
drop policy if exists saved_contacts_insert_own on saved_contacts;
drop policy if exists saved_contacts_update_own on saved_contacts;
drop policy if exists saved_contacts_delete_own on saved_contacts;

create policy saved_contacts_select_own on saved_contacts
  for select to authenticated
  using (user_id = auth.uid());

create policy saved_contacts_insert_own on saved_contacts
  for insert to authenticated
  with check (user_id = auth.uid());

create policy saved_contacts_update_own on saved_contacts
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy saved_contacts_delete_own on saved_contacts
  for delete to authenticated
  using (user_id = auth.uid());

-- Trigger para mantener updated_at sincronizado en cada UPDATE
create or replace function saved_contacts_set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists saved_contacts_updated_at on saved_contacts;
create trigger saved_contacts_updated_at
  before update on saved_contacts
  for each row execute function saved_contacts_set_updated_at();
