'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ComponentProps } from 'react';

type NavLinkProps = ComponentProps<typeof Link> & {
  className?: string;
};

export function NavLink({ href, className = '', children, ...rest }: NavLinkProps) {
  const pathname = usePathname();
  const hrefStr = typeof href === 'string' ? href : href.pathname || '';
  const isActive =
    hrefStr === '/'
      ? pathname === '/'
      : pathname === hrefStr || pathname.startsWith(hrefStr + '/');

  const activeClass = isActive
    ? 'relative after:absolute after:bottom-0 after:left-3 after:right-3 after:h-0.5 after:bg-[var(--epa-blue)] after:content-[""]'
    : '';

  return (
    <Link href={href} className={`${className} ${activeClass}`.trim()} {...rest}>
      {children}
    </Link>
  );
}
