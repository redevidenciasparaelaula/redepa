import type { Metadata } from 'next';
import Image from 'next/image';
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
  return {
    title: t('name'),
    description: t('tagline'),
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
          <footer className="border-t border-[var(--border)] bg-white py-12">
            <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 px-4 text-center sm:px-6">
              <Image
                src="/logos/epa.png"
                alt="Red EPA"
                width={1024}
                height={711}
                className="h-14 w-auto opacity-90"
              />
              <p className="text-sm text-[var(--muted)]">
                © {new Date().getFullYear()} Red EPA · Evidencias Para el Aula
              </p>
              <p className="max-w-md text-xs leading-relaxed text-[var(--muted)]">
                Red Latinoamericana de Investigación Educativa
              </p>
            </div>
          </footer>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
