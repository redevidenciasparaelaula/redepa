'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export type AdminTab = 'instituciones' | 'investigadores' | 'administradores';

interface Props {
  current: AdminTab;
  counts: {
    instituciones: number;
    investigadores: number;
    administradores: number;
  };
  showAdminsTab: boolean;
}

interface TabDef {
  key: AdminTab;
  label: string;
  count: number;
}

export function AdminTabs({ current, counts, showAdminsTab }: Props) {
  const pathname = usePathname();

  const tabs: TabDef[] = [
    { key: 'instituciones', label: 'Instituciones', count: counts.instituciones },
    { key: 'investigadores', label: 'Investigadores', count: counts.investigadores },
  ];
  if (showAdminsTab) {
    tabs.push({
      key: 'administradores',
      label: 'Administradores',
      count: counts.administradores,
    });
  }

  return (
    <nav
      className="-mb-px flex flex-wrap gap-2 border-b border-[var(--border)]"
      role="tablist"
    >
      {tabs.map((t) => {
        const isActive = t.key === current;
        const href =
          t.key === 'instituciones' ? pathname : `${pathname}?tab=${t.key}`;
        return (
          <Link
            key={t.key}
            href={href}
            role="tab"
            aria-selected={isActive}
            className={
              'inline-flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm transition-colors ' +
              (isActive
                ? 'border-[var(--epa-green)] font-semibold text-[var(--foreground)]'
                : 'border-transparent text-[var(--muted)] hover:text-[var(--foreground)]')
            }
          >
            {t.label}
            <span
              className={
                'rounded-full px-2 py-0.5 text-xs ' +
                (isActive
                  ? 'bg-[var(--epa-green)] text-white'
                  : 'bg-[var(--accent)] text-[var(--muted)]')
              }
            >
              {t.count}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
