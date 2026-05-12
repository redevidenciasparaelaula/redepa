// Generador de contraseñas temporales para uso del admin.
// Formato: AbCd-3456 (legible al teléfono, sin caracteres ambiguos como 0/O, 1/l/I).

import { randomBytes } from 'crypto';

const ALPHA = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ';
const DIGITS = '23456789';

function pick(charset: string, count: number): string {
  const buf = randomBytes(count);
  let out = '';
  for (let i = 0; i < count; i++) {
    out += charset[buf[i]! % charset.length];
  }
  return out;
}

export function generateTempPassword(): string {
  return `${pick(ALPHA, 4)}-${pick(DIGITS, 4)}`;
}
