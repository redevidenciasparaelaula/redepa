'use client';

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { stripAccents } from '@/lib/text';
import type { Institution } from '@/lib/supabase/types';

interface Props {
  institutions: Institution[];
  value: string;
  onChange: (id: string) => void;
  required?: boolean;
  placeholder?: string;
  locale?: 'es' | 'en';
}

const MAX_VISIBLE = 50;

// Usamos el helper compartido de lib/text.ts.
const normalize = stripAccents;

export function InstitutionCombobox({
  institutions,
  value,
  onChange,
  required,
  placeholder = 'Busca tu universidad…',
  locale = 'es',
}: Props) {
  const listId = useId();
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const selected = institutions.find((i) => i.id === value);

  const displayName = (i: Institution) =>
    locale === 'en' && i.name_en ? i.name_en : i.name;

  const filtered = useMemo(() => {
    const needle = normalize(search.trim());
    if (!needle) return institutions.slice(0, MAX_VISIBLE);
    return institutions
      .filter((i) => normalize(displayName(i)).includes(needle))
      .slice(0, MAX_VISIBLE);
  }, [institutions, search, locale]);

  // Close dropdown on outside click
  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  function pick(inst: Institution) {
    onChange(inst.id);
    setSearch('');
    setOpen(false);
  }

  function clear() {
    onChange('');
    setSearch('');
    setOpen(true);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setOpen(true);
      setActiveIndex((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && open && filtered[activeIndex]) {
      e.preventDefault();
      pick(filtered[activeIndex]);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  }

  const inputClass =
    'w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm';

  return (
    <div ref={containerRef} className="relative">
      {selected ? (
        <div className="flex items-center gap-2 rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm">
          <div className="min-w-0 flex-1">
            <div className="truncate font-medium">{displayName(selected)}</div>
            <div className="truncate text-xs text-[var(--muted)]">
              {[selected.city, selected.country].filter(Boolean).join(', ')}
            </div>
          </div>
          <button
            type="button"
            onClick={clear}
            className="shrink-0 rounded-md border border-[var(--border)] px-2 py-1 text-xs hover:bg-[var(--accent)]"
          >
            Cambiar
          </button>
        </div>
      ) : (
        <input
          type="text"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setOpen(true);
            setActiveIndex(0);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          aria-controls={listId}
          aria-expanded={open}
          autoComplete="off"
          className={inputClass}
        />
      )}

      {/* Hidden input para validación HTML5 nativa */}
      <input
        type="text"
        tabIndex={-1}
        aria-hidden="true"
        required={required}
        value={value}
        onChange={() => {}}
        className="pointer-events-none absolute inset-x-0 top-0 h-0 w-full opacity-0"
      />

      {!selected && open && (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-20 mt-1 max-h-72 w-full overflow-auto rounded-md border border-[var(--border)] bg-[var(--card)] shadow-lg"
        >
          {filtered.length === 0 ? (
            <li className="px-3 py-2 text-sm text-[var(--muted)]">
              Sin resultados. Si tu institución no aparece, pídele a un admin
              que la agregue.
            </li>
          ) : (
            filtered.map((inst, idx) => (
              <li
                key={inst.id}
                role="option"
                aria-selected={idx === activeIndex}
                onMouseDown={(e) => {
                  e.preventDefault();
                  pick(inst);
                }}
                onMouseEnter={() => setActiveIndex(idx)}
                className={
                  'cursor-pointer border-b border-[var(--border)] px-3 py-2 text-sm last:border-b-0 ' +
                  (idx === activeIndex ? 'bg-[var(--accent)]' : '')
                }
              >
                <div className="truncate font-medium">{displayName(inst)}</div>
                <div className="truncate text-xs text-[var(--muted)]">
                  {[inst.city, inst.country].filter(Boolean).join(', ')}
                </div>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
