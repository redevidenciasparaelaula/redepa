-- Migración 006:
--  1) Agrega columna `representative_dois` (hasta 3 DOIs de papers
--     representativos del investigador).
--  2) Permite a usuarios anónimos crear instituciones desde el
--     formulario público cuando la suya no está en la lista.
--     (Admin puede limpiar/fusionar después.)

-- 1) DOIs representativos
alter table researchers
  add column if not exists representative_dois text[] not null default '{}';

-- 2) Anon puede crear instituciones
grant insert on institutions to anon;

drop policy if exists "institutions: envío público crea" on institutions;
create policy "institutions: envío público crea"
  on institutions for insert with check (true);
