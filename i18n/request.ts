import { getRequestConfig } from 'next-intl/server';
import { defaultLocale } from './config';

// El sitio es solo en español. Forzamos siempre 'es' independiente del
// Accept-Language del browser o de cookies. Si en el futuro se reactiva
// EN, restaurar la negociación previa.

export default getRequestConfig(async () => {
  const locale = defaultLocale; // 'es'
  const messages = (await import(`../messages/${locale}.json`)).default;
  return { locale, messages };
});
