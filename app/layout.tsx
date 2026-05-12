import type { Metadata } from 'next';
import { Inter, Plus_Jakarta_Sans, Geist_Mono } from 'next/font/google';
import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getMessages, getTranslations } from 'next-intl/server';
import { Header } from '@/components/header';
import './globals.css';

const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
});

const plusJakartaSans = Plus_Jakarta_Sans({
  variable: '--font-plus-jakarta',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('site');
  const name = t('name');
  const tagline = t('tagline');

  return {
    metadataBase: new URL('https://redepa.net'),
    title: {
      default: name,
      template: `%s · ${name}`,
    },
    description: tagline,
    keywords: [
      'investigación educativa',
      'América Latina',
      'directorio de investigadores',
      'educación',
      'Evidencias para el Aula',
      'Red EPA',
      'investigación en educación',
      'colaboración académica',
      'política educativa',
    ],
    applicationName: name,
    authors: [{ name: 'Red EPA' }],
    creator: 'Red EPA',
    publisher: 'Red EPA',
    alternates: {
      canonical: '/',
    },
    openGraph: {
      type: 'website',
      locale: 'es_ES',
      url: 'https://redepa.net',
      siteName: 'Red Evidencias para el Aula',
      title: 'Red Evidencias para el Aula',
      description: tagline,
    },
    twitter: {
      card: 'summary_large_image',
      title: 'Red Evidencias para el Aula',
      description: tagline,
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
    },
  };
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html
      lang={locale}
      className={`${inter.variable} ${plusJakartaSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <NextIntlClientProvider locale={locale} messages={messages}>
          <Header />
          <main className="flex-1">{children}</main>
          <footer className="border-t border-[var(--border)] bg-white py-5">
            <div className="mx-auto flex max-w-6xl flex-col items-center gap-1 px-4 text-center sm:px-6">
              <p className="text-sm text-[var(--muted)]">
                © {new Date().getFullYear()} Red EPA · Evidencias Para el Aula
              </p>
              <p className="text-xs leading-relaxed text-[var(--muted)]">
                Red Latinoamericana de Investigación Educativa
              </p>
            </div>
          </footer>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
