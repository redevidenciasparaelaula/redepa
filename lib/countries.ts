// Catálogo mundial de países usando Intl.DisplayNames para los nombres.
// La lista de códigos ISO 3166-1 alpha-2 va hardcodeada porque
// `Intl.supportedValuesOf('region')` no es estándar (no existe).
//
// Almacenamos en DB el nombre traducido (ej. "México"), no el código,
// para mantener compatibilidad con los datos existentes y con el filtro
// del directorio (que hace match exacto sobre researchers.country).

import type { Locale } from '@/i18n/config';

// Latinoamérica primero como atajo para el público objetivo del directorio.
const LATAM_CODES = [
  'AR', 'BO', 'BR', 'CL', 'CO', 'CR', 'CU', 'DO', 'EC', 'SV',
  'GT', 'HN', 'MX', 'NI', 'PA', 'PY', 'PE', 'PR', 'UY', 'VE',
];

// ISO 3166-1 alpha-2 (asignados oficialmente).
const ALL_CODES = [
  'AD','AE','AF','AG','AI','AL','AM','AO','AQ','AR','AS','AT','AU','AW','AX','AZ',
  'BA','BB','BD','BE','BF','BG','BH','BI','BJ','BL','BM','BN','BO','BQ','BR','BS','BT','BV','BW','BY','BZ',
  'CA','CC','CD','CF','CG','CH','CI','CK','CL','CM','CN','CO','CR','CU','CV','CW','CX','CY','CZ',
  'DE','DJ','DK','DM','DO','DZ',
  'EC','EE','EG','EH','ER','ES','ET',
  'FI','FJ','FK','FM','FO','FR',
  'GA','GB','GD','GE','GF','GG','GH','GI','GL','GM','GN','GP','GQ','GR','GS','GT','GU','GW','GY',
  'HK','HM','HN','HR','HT','HU',
  'ID','IE','IL','IM','IN','IO','IQ','IR','IS','IT',
  'JE','JM','JO','JP',
  'KE','KG','KH','KI','KM','KN','KP','KR','KW','KY','KZ',
  'LA','LB','LC','LI','LK','LR','LS','LT','LU','LV','LY',
  'MA','MC','MD','ME','MF','MG','MH','MK','ML','MM','MN','MO','MP','MQ','MR','MS','MT','MU','MV','MW','MX','MY','MZ',
  'NA','NC','NE','NF','NG','NI','NL','NO','NP','NR','NU','NZ',
  'OM',
  'PA','PE','PF','PG','PH','PK','PL','PM','PN','PR','PS','PT','PW','PY',
  'QA',
  'RE','RO','RS','RU','RW',
  'SA','SB','SC','SD','SE','SG','SH','SI','SJ','SK','SL','SM','SN','SO','SR','SS','ST','SV','SX','SY','SZ',
  'TC','TD','TF','TG','TH','TJ','TK','TL','TM','TN','TO','TR','TT','TV','TW','TZ',
  'UA','UG','UM','US','UY','UZ',
  'VA','VC','VE','VG','VI','VN','VU',
  'WF','WS',
  'YE','YT',
  'ZA','ZM','ZW',
];

export interface Country {
  code: string;
  name: string;
}

export interface CountryGroups {
  latam: Country[];
  others: Country[];
}

function nameOf(code: string, locale: Locale): string {
  try {
    return new Intl.DisplayNames([locale], { type: 'region' }).of(code) ?? code;
  } catch {
    return code;
  }
}

export function countryName(code: string, locale: Locale = 'es'): string {
  return nameOf(code, locale);
}

export function countriesByGroup(locale: Locale = 'es'): CountryGroups {
  const latamSet = new Set(LATAM_CODES);
  const latam: Country[] = LATAM_CODES.map((code) => ({
    code,
    name: nameOf(code, locale),
  })).sort((a, b) => a.name.localeCompare(b.name, locale));

  const others: Country[] = ALL_CODES.filter((c) => !latamSet.has(c))
    .map((code) => ({ code, name: nameOf(code, locale) }))
    .sort((a, b) => a.name.localeCompare(b.name, locale));

  return { latam, others };
}
