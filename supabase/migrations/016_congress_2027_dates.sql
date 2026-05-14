-- Migración 016: fechas oficiales del Congreso EPA 2027
--
-- Congreso:                9 y 10 de noviembre de 2027
-- Apertura convocatoria:   1 de diciembre de 2026
-- Cierre convocatoria:     24 de marzo de 2027 (HARD DEADLINE)
-- Aviso seleccionados:     1 de julio de 2027
--
-- Timezone: Chile continental. Diciembre y marzo están en horario de
-- verano (UTC-3); julio está en horario estándar (UTC-4).

update congresses set
  start_date           = '2027-11-09',
  end_date             = '2027-11-10',
  cfp_open_at          = '2026-12-01 00:00:00-03',   -- 1 dic 2026, 00:00 Chile
  cfp_close_at         = '2027-03-24 23:59:00-03',   -- 24 mar 2027, 23:59 Chile
  notification_at      = '2027-07-01 00:00:00-04'    -- 1 jul 2027, 00:00 Chile
where slug = 'epa-2027';
