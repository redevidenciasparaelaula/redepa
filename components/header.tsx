import Image from 'next/image';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { getCurrentUser } from '@/lib/auth';
import { NavLink } from './nav-link';
import { MobileMenu } from './mobile-menu';

export async function Header() {
  const t = await getTranslations();
  const user = await getCurrentUser();
  const showAdmin =
    !!user && (user.isSuperAdmin || user.adminOfInstitutions.length > 0);

  const linkClass =
    'rounded-md px-3 py-2 text-sm font-medium text-[var(--foreground)] transition-colors hover:bg-[var(--accent)]';
  const directoryLinkClass = user
    ? linkClass
    : linkClass + ' text-[var(--muted)]';

  const navItems = [
    { href: '/', label: 'Inicio' },
    { href: '/congreso', label: 'Congreso' },
    { href: '/premio', label: 'Premio' },
    { href: '/sumate', label: 'Súmate' },
    {
      href: '/directorio',
      label: user ? 'Directorio' : '🔒 Directorio',
      muted: !user,
    },
  ];

  const authItems = user
    ? [
        { href: '/me', label: t('nav.myProfile') },
        { href: '/me/contactos', label: t('nav.myContacts') },
        ...(showAdmin ? [{ href: '/admin', label: t('nav.admin') }] : []),
      ]
    : [];

  return (
    <header className="sticky top-0 z-40 border-b border-[var(--border)]/60 bg-white/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <Link
          href="/"
          className="flex shrink-0 items-center transition-opacity hover:opacity-80"
          aria-label="Red EPA — Inicio"
        >
          <Image
            src="/logos/epa.png"
            alt="Red EPA — Red Latinoamericana Evidencias Para el Aula"
            width={1024}
            height={711}
            priority
            className="h-10 w-auto sm:h-12"
          />
        </Link>

        {/* Desktop nav (md+) */}
        <nav className="hidden items-center gap-0.5 text-sm md:flex">
          {navItems.map((item) => (
            <NavLink
              key={item.href}
              href={item.href}
              className={item.muted ? directoryLinkClass : linkClass}
            >
              {item.label}
            </NavLink>
          ))}

          <span className="mx-2 hidden h-5 w-px bg-[var(--border)] lg:inline-block" />

          {user ? (
            <>
              {authItems.map((item) => (
                <NavLink
                  key={item.href}
                  href={item.href}
                  className={linkClass}
                >
                  {item.label}
                </NavLink>
              ))}
              <form action="/auth/sign-out" method="post">
                <button
                  type="submit"
                  className={linkClass + ' cursor-pointer'}
                >
                  {t('nav.signOut')}
                </button>
              </form>
            </>
          ) : (
            <Link
              href="/sign-in"
              className="ml-1 rounded-md bg-[var(--epa-green)] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[var(--epa-green-dark)]"
            >
              {t('nav.signIn')}
            </Link>
          )}
        </nav>

        {/* Mobile menu (< md) */}
        <MobileMenu
          navItems={navItems}
          authItems={authItems}
          signedIn={!!user}
          signOutLabel={t('nav.signOut')}
          signInLabel={t('nav.signIn')}
        />
      </div>
    </header>
  );
}
