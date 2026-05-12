-- Migración 005: el formulario público publica directamente sin revisión.
-- El admin puede editar/eliminar después.

drop policy if exists "researchers: envío público crea pending" on researchers;

create policy "researchers: envío público crea approved"
  on researchers for insert
  with check (status = 'approved');
