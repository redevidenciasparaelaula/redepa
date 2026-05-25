-- Migración 026: agregar columna location a congresses.
-- Campo libre de texto para la ubicación del congreso (ej. "Santiago, Chile"
-- o "Universidad Católica, Santiago"). Se muestra en la página pública y
-- es editable desde el panel admin.

alter table congresses
  add column if not exists location text;
