'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

interface NavItem {
  href: string;
  label: string;
  muted?: boolean;
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

  // Cerrar al cambiar de ruta
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Bloquear scroll del body cuando abierto
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  function isActive(href: string): boolean {
    if (href === '/') return pathname === '/';
    return pathname === href || pathname.startsWith(href + '/');
  }

  const itemClass =
    'block rounded-md px-4 py-3 text-base font-medium text-[var(--foreground)] transition-colors hover:bg-[var(--accent)]';
  const activeItemClass =
    'bg-[var(--accent)] text-[var(--epa-blue)]';

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
        >
          <line x1="3" y1="6" x2="21" y2="6" />
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="3" y1="18" x2="21" y2="18" />
        </svg>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 md:hidden"
          aria-modal="true"
          role="dialog"
        >
          {/* Backdrop */}
          <button
            type="button"
            aria-label="Cerrar menú"
            onClick={() => setOpen(false)}
            className="absolute inset-0 h-full w-full bg-black/40 backdrop-blur-sm"
          />

          {/* Drawer */}
          <div className="absolute right-0 top-0 flex h-full w-80 max-w-[85vw] flex-col bg-white shadow-2xl">
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
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <nav className="flex-1 overflow-y-auto p-3">
              <ul className="space-y-1">
                {navItems.map((item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={`${itemClass} ${
                        isActive(item.href) ? activeItemClass : ''
                      } ${item.muted ? 'text-[var(--muted)]' : ''}`}
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>

              {(authItems.length > 0 || signedIn) && (
                <div className="my-3 border-t border-[var(--border)]" />
              )}

              <ul className="space-y-1">
                {authItems.map((item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={`${itemClass} ${
                        isActive(item.href) ? activeItemClass : ''
                      }`}
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
                {signedIn ? (
                  <li>
                    <form action="/auth/sign-out" method="post">
                      <button
                        type="submit"
                        className={`${itemClass} w-full text-left`}
                      >
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
          </div>
        </div>
      )}
    </>
  );
}
