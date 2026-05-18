'use client';

import { useRouter, usePathname } from 'next/navigation';
import { useTransition } from 'react';
import Link from 'next/link';

interface Props {
  allTags: string[];
  initial: { tag?: string; q?: string };
}

export function ContactsFilters({ allTags, initial }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [, startTransition] = useTransition();

  function setTag(tag: string | null) {
    const params = new URLSearchParams();
    if (initial.q) params.set('q', initial.q);
    if (tag) params.set('tag', tag);
    startTransition(() => {
      router.push(params.toString() ? `${pathname}?${params}` : pathname);
    });
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const q = String(fd.get('q') ?? '').trim();
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    if (initial.tag) params.set('tag', initial.tag);
    startTransition(() => {
      router.push(params.toString() ? `${pathname}?${params}` : pathname);
    });
  }

  return (
    <div className="space-y-3">
      <form onSubmit={onSubmit} className="flex flex-wrap items-center gap-2">
        <input
          type="text"
          name="q"
          defaultValue={initial.q ?? ''}
          placeholder="Buscar por nombre…"
          className="flex-1 rounded-md border border-[var(--border)] bg-white px-3 py-2 text-sm focus:border-[var(--epa-blue)] focus:outline-none focus:ring-1 focus:ring-[var(--epa-blue)]"
        />
        <button
          type="submit"
          className="rounded-md bg-[var(--epa-blue)] px-4 py-2 text-sm font-medium text-white hover:opacity-90"
        >
          Buscar
        </button>
        {(initial.q || initial.tag) && (
          <Link
            href={pathname}
            className="text-xs text-[var(--muted)] hover:underline"
          >
            Limpiar
          </Link>
        )}
      </form>

      {allTags.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs uppercase tracking-wide text-[var(--muted)]">
            Filtrar por tag:
          </span>
          <button
            type="button"
            onClick={() => setTag(null)}
            className={
              'rounded-full px-3 py-1 text-xs ' +
              (!initial.tag
                ? 'bg-[var(--epa-blue)] text-white'
                : 'bg-[var(--accent)] text-[var(--foreground)] hover:bg-[var(--border)]')
            }
          >
            Todos
          </button>
          {allTags.map((tag) => {
            const active = initial.tag === tag;
            return (
              <button
                key={tag}
                type="button"
                onClick={() => setTag(active ? null : tag)}
                className={
                  'rounded-full px-3 py-1 text-xs ' +
                  (active
                    ? 'bg-[var(--epa-blue)] text-white'
                    : 'bg-[var(--accent)] text-[var(--foreground)] hover:bg-[var(--border)]')
                }
              >
                #{tag}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
