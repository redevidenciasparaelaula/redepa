'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

interface NavItem {
  href: string;
  label: string;
  muted?: boolean;
  exact?: boolean;
}

interface Props {
  navItems: NavItem[];
  authItems: NavItem[];
  signedIn: boolean;
  signOutLabel: string;
  signInLabel: string;
}

export function MobileMenu({
  navItems,
  authItems,
  signedIn,
  signOutLabel,
  signInLabel,
}: Props) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Cerrar al cambiar de ruta (después del primer render).
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  function isActive(item: NavItem): boolean {
    if (item.href === '/' || item.exact) return pathname === item.href;
    return pathname === item.href || pathname.startsWith(item.href + '/');
  }

  const itemBase =
    'block w-full rounded-md px-4 py-3 text-base font-medium transition-colors';
  const itemDefault = `${itemBase} text-[var(--foreground)] hover:bg-[var(--accent)]`;
  const itemActive = `${itemBase} bg-[var(--accent)] text-[var(--epa-blue)]`;
  const itemMuted = `${itemBase} text-[var(--muted)] hover:bg-[var(--accent)]`;

  function classFor(item: NavItem): string {
    if (isActive(item)) return itemActive;
    if (item.muted) return itemMuted;
    return itemDefault;
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Abrir menú"
        aria-expanded={open}
        className="inline-flex h-10 w-10 items-center justify-center rounded-md text-[var(--foreground)] transition-colors hover:bg-[var(--accent)] md:hidden"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-6 w-6"
          aria-hidden="true"
        >
          <line x1="3" y1="6" x2="21" y2="6" />
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="3" y1="18" x2="21" y2="18" />
        </svg>
      </button>

      {/* Backdrop */}
      <div
        onClick={() => setOpen(false)}
        aria-hidden="true"
        className={`fixed inset-0 z-40 bg-black/40 backdrop-blur-sm transition-opacity md:hidden ${
          open ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
      />

      {/* Drawer */}
      <aside
        aria-label="Menú principal"
        aria-hidden={!open}
        className={`fixed right-0 top-0 z-50 h-[100dvh] w-80 max-w-[85vw] transform overflow-y-auto bg-white shadow-2xl transition-transform duration-200 md:hidden ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-4">
          <span className="text-sm font-semibold uppercase tracking-wider text-[var(--epa-blue)]">
            Menú
          </span>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Cerrar menú"
            className="inline-flex h-10 w-10 items-center justify-center rounded-md text-[var(--foreground)] transition-colors hover:bg-[var(--accent)]"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-5 w-5"
              aria-hidden="true"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <nav className="p-3">
          <ul className="space-y-1">
            {navItems.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className={classFor(item)}>
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>

          <div className="my-3 border-t border-[var(--border)]" />

          <ul className="space-y-1">
            {authItems.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className={classFor(item)}>
                  {item.label}
                </Link>
              </li>
            ))}
            {signedIn ? (
              <li>
                <form action="/auth/sign-out" method="post">
                  <button type="submit" className={`${itemDefault} text-left`}>
                    {signOutLabel}
                  </button>
                </form>
              </li>
            ) : (
              <li className="pt-2">
                <Link
                  href="/sign-in"
                  className="block w-full rounded-md bg-[var(--epa-green)] px-4 py-3 text-center text-base font-semibold text-white transition-colors hover:bg-[var(--epa-green-dark)]"
                >
                  {signInLabel}
                </Link>
              </li>
            )}
          </ul>
        </nav>
      </aside>
    </>
  );
}
