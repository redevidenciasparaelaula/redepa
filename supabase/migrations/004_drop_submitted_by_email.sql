-- Migración 004: el formulario abierto ya no pide correo del remitente
-- (el correo del propio investigador queda en la columna `email`).

alter table researchers drop column if exists submitted_by_email;
