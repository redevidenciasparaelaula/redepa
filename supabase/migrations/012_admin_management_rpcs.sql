-- Migración 012: funciones RPC para que el super admin gestione
-- instituciones y admins desde la UI sin tener que escribir SQL.
--
-- Todas son SECURITY DEFINER (corren con permisos del owner) pero
-- verifican explícitamente el rol del caller con un check al principio.

-- ---------------------------------------------------------------------
-- Listar admins de una institución (con su correo, vía join a auth.users).
-- Cualquier admin de esa institución o super admin puede ver la lista.
-- ---------------------------------------------------------------------
create or replace function list_institution_admins(p_institution_id uuid)
returns table (user_id uuid, email text, created_at timestamptz)
language plpgsql security definer set search_path = public, auth as $$
begin
  -- Qualifico nombres de tabla para evitar ambigüedad con las columnas del RETURN TABLE.
  if not (
    exists (select 1 from super_admins sa where sa.user_id = auth.uid())
    or exists (
      select 1 from institution_admins ia
      where ia.user_id = auth.uid() and ia.institution_id = p_institution_id
    )
  ) then
    raise exception 'No autorizado';
  end if;
  return query
    select ia.user_id, lower(u.email::text), ia.created_at
    from institution_admins ia
    join auth.users u on u.id = ia.user_id
    where ia.institution_id = p_institution_id
    order by lower(u.email::text);
end;
$$;

grant execute on function list_institution_admins(uuid) to authenticated;

-- ---------------------------------------------------------------------
-- Listar super admins (correo + fecha). Solo super admin.
-- ---------------------------------------------------------------------
create or replace function list_super_admins()
returns table (user_id uuid, email text, created_at timestamptz)
language plpgsql security definer set search_path = public, auth as $$
begin
  -- Qualifico el nombre de tabla para evitar ambigüedad con la columna user_id del RETURN TABLE.
  if not exists (select 1 from super_admins sa where sa.user_id = auth.uid()) then
    raise exception 'Solo super admin';
  end if;
  return query
    select sa.user_id, lower(u.email::text), sa.created_at
    from super_admins sa
    join auth.users u on u.id = sa.user_id
    order by lower(u.email::text);
end;
$$;

grant execute on function list_super_admins() to authenticated;

-- ---------------------------------------------------------------------
-- Asignar admin a una institución (busca por correo). Solo super admin.
-- Devuelve:
--   'ok' si se asignó
--   'no_user' si ese correo nunca ha hecho sign in (no existe en auth.users)
--   'already' si ya era admin de esa institución
-- ---------------------------------------------------------------------
create or replace function add_institution_admin_by_email(
  p_email text,
  p_institution_id uuid
) returns text language plpgsql security definer
set search_path = public, auth as $$
declare
  v_user_id uuid;
  v_exists boolean;
begin
  if not exists (select 1 from super_admins where user_id = auth.uid()) then
    raise exception 'Solo super admin';
  end if;
  select id into v_user_id from auth.users
    where lower(email::text) = lower(trim(p_email))
    limit 1;
  if v_user_id is null then return 'no_user'; end if;

  select exists (
    select 1 from institution_admins
    where user_id = v_user_id and institution_id = p_institution_id
  ) into v_exists;
  if v_exists then return 'already'; end if;

  insert into institution_admins (user_id, institution_id)
  values (v_user_id, p_institution_id);
  return 'ok';
end;
$$;

grant execute on function add_institution_admin_by_email(text, uuid) to authenticated;

-- ---------------------------------------------------------------------
-- Hacer super admin a un usuario (por correo). Solo super admin existente.
-- ---------------------------------------------------------------------
create or replace function add_super_admin_by_email(p_email text)
returns text language plpgsql security definer
set search_path = public, auth as $$
declare
  v_user_id uuid;
begin
  if not exists (select 1 from super_admins where user_id = auth.uid()) then
    raise exception 'Solo super admin';
  end if;
  select id into v_user_id from auth.users
    where lower(email::text) = lower(trim(p_email))
    limit 1;
  if v_user_id is null then return 'no_user'; end if;
  if exists (select 1 from super_admins where user_id = v_user_id) then
    return 'already';
  end if;
  insert into super_admins (user_id) values (v_user_id);
  return 'ok';
end;
$$;

grant execute on function add_super_admin_by_email(text) to authenticated;

-- ---------------------------------------------------------------------
-- Fusionar dos instituciones (source → target). Mueve investigadores y
-- admins de source a target, luego elimina source. Solo super admin.
-- ---------------------------------------------------------------------
create or replace function merge_institutions(
  p_source_id uuid,
  p_target_id uuid
) returns void language plpgsql security definer
set search_path = public as $$
begin
  if not exists (select 1 from super_admins where user_id = auth.uid()) then
    raise exception 'Solo super admin';
  end if;
  if p_source_id = p_target_id then
    raise exception 'Origen y destino no pueden ser la misma institución';
  end if;

  -- Mover researchers
  update researchers set institution_id = p_target_id
    where institution_id = p_source_id;

  -- Mover admins evitando duplicados (PK es user_id+institution_id)
  delete from institution_admins
    where institution_id = p_source_id
      and user_id in (
        select user_id from institution_admins where institution_id = p_target_id
      );
  update institution_admins set institution_id = p_target_id
    where institution_id = p_source_id;

  delete from institutions where id = p_source_id;
end;
$$;

grant execute on function merge_institutions(uuid, uuid) to authenticated;
