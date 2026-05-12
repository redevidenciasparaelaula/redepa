import { cookies, headers } from 'next/headers';
import { getRequestConfig } from 'next-intl/server';
import { LOCALE_COOKIE, defaultLocale, locales, type Locale } from './config';

function negotiate(value: string | undefined | null): Locale {
  if (!value) return defaultLocale;
  const lower = value.toLowerCase();
  for (const part of lower.split(',')) {
    const tag = part.split(';')[0]!.trim();
    const base = tag.split('-')[0] as Locale;
    if (locales.includes(base)) return base;
  }
  return defaultLocale;
}

export default getRequestConfig(async () => {
  const cookieLocale = (await cookies()).get(LOCALE_COOKIE)?.value as
    | Locale
    | undefined;
  const acceptLang = (await headers()).get('accept-language');

  const locale: Locale =
    cookieLocale && locales.includes(cookieLocale)
      ? cookieLocale
      : negotiate(acceptLang);

  const messages = (await import(`../messages/${locale}.json`)).default;
  return { locale, messages };
});
