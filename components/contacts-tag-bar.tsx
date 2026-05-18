'use client';

import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useTransition } from 'react';

interface Props {
  allTags: string[];
  selected: string[];
  withNote?: 'yes' | 'no';
}

// Barra de chips para filtrar por tag (multi-select) + chip de "con nota".
// Al hacer click en un tag se agrega al param ?tags=a,b; click otra vez lo
// quita. Esto se acumula con todos los otros filtros (search, country, etc.).
export function ContactsTagBar({ allTags, selected, withNote }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const [, startTransition] = useTransition();

  function toggleTag(tag: string) {
    const next = selected.includes(tag)
      ? selected.filter((t) => t !== tag)
      : [...selected, tag];
    const params = new URLSearchParams(searchParams.toString());
    if (next.length > 0) params.set('tags', next.join(','));
    else params.delete('tags');
    startTransition(() => {
      const qs = params.toString();
      router.push(qs ? `${pathname}?${qs}` : pathname);
    });
  }

  function toggleWithNote() {
    const params = new URLSearchParams(searchParams.toString());
    if (withNote === 'yes') {
      params.delete('withNote');
    } else {
      params.set('withNote', 'yes');
    }
    startTransition(() => {
      const qs = params.toString();
      router.push(qs ? `${pathname}?${qs}` : pathname);
    });
  }

  const selectedSet = new Set(selected);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs uppercase tracking-wide text-[var(--muted)]">
        Tags:
      </span>
      {allTags.map((tag) => {
        const active = selectedSet.has(tag);
        return (
          <button
            key={tag}
            type="button"
            onClick={() => toggleTag(tag)}
            aria-pressed={active}
            className={
              'rounded-full px-3 py-1 text-xs transition-colors ' +
              (active
                ? 'bg-[var(--epa-green)] text-white'
                : 'bg-[var(--accent)] text-[var(--foreground)] hover:bg-[var(--border)]')
            }
          >
            #{tag}
            {active && <span className="ml-1 opacity-80">×</span>}
          </button>
        );
      })}
      <span className="ml-2 text-xs uppercase tracking-wide text-[var(--muted)]">
        Filtros:
      </span>
      <button
        type="button"
        onClick={toggleWithNote}
        aria-pressed={withNote === 'yes'}
        className={
          'rounded-full px-3 py-1 text-xs transition-colors ' +
          (withNote === 'yes'
            ? 'bg-[var(--epa-blue)] text-white'
            : 'bg-[var(--accent)] text-[var(--foreground)] hover:bg-[var(--border)]')
        }
      >
        Con nota{withNote === 'yes' && <span className="ml-1 opacity-80">×</span>}
      </button>
    </div>
  );
}
