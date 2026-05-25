-- Migración 028: permitir que el chair edite el formulario de postulación
-- por congreso (texto introductorio, límite de chars, tipos permitidos,
-- etiquetas de los 5 campos del abstract).

alter table congresses
  add column if not exists submission_intro text,
  add column if not exists submission_max_chars int default 500,
  add column if not exists submission_types_allowed text[]
    not null default array['oral','poster','symposium']::text[],
  add column if not exists abstract_field_labels jsonb;

-- Validar que solo se incluyan los tipos del enum
alter table congresses drop constraint if exists congresses_types_allowed_valid;
alter table congresses
  add constraint congresses_types_allowed_valid
  check (submission_types_allowed <@ array['oral','poster','symposium']::text[]);

-- Rango razonable para max_chars
alter table congresses drop constraint if exists congresses_max_chars_range;
alter table congresses
  add constraint congresses_max_chars_range
  check (submission_max_chars is null
         or (submission_max_chars between 100 and 2000));
