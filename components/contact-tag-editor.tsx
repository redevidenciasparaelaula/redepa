'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { updateContactTagsAction } from '@/app/me/contactos/actions';

interface Props {
  researcherId: string;
  initialTags: string[];
  suggestions: string[];
}

// Editor inline de tags. Cada tag se ve como un chip; se agregan tags al
// presionar Enter o coma. Se quitan con la X. Hay autocompletado simple
// con datalist a partir de los tags que el usuario ya usó en otros contactos.
export function ContactTagEditor({
  researcherId,
  initialTags,
  suggestions,
}: Props) {
  const [tags, setTags] = useState<string[]>(initialTags);
  const [input, setInput] = useState('');
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  function persist(newTags: string[]) {
    setError(null);
    startTransition(async () => {
      const res = await updateContactTagsAction(
        researcherId,
        newTags.join(',')
      );
      if (!res.ok) {
        setError(res.error);
        setTags(initialTags); // rollback
      } else {
        router.refresh();
      }
    });
  }

  function addTag(raw: string) {
    const tag = raw
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9áéíóúñü\-]/g, '')
      .slice(0, 40);
    if (!tag) return;
    if (tags.includes(tag)) return;
    if (tags.length >= 20) return;
    const next = [...tags, tag];
    setTags(next);
    setInput('');
    persist(next);
  }

  function removeTag(t: string) {
    const next = tags.filter((x) => x !== t);
    setTags(next);
    persist(next);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag(input);
    } else if (e.key === 'Backspace' && input === '' && tags.length > 0) {
      // Tecla backspace en input vacío → quita el último tag
      removeTag(tags[tags.length - 1]);
    }
  }

  const datalistId = `tag-suggestions-${researcherId}`;
  const availableSuggestions = suggestions.filter((s) => !tags.includes(s));

  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
        Tags
      </p>
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        {tags.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 rounded-full bg-[var(--epa-green)] px-2.5 py-0.5 text-xs font-medium text-white"
          >
            #{tag}
            <button
              type="button"
              onClick={() => removeTag(tag)}
              disabled={isPending}
              aria-label={`Quitar tag ${tag}`}
              className="ml-0.5 inline-flex h-3.5 w-3.5 items-center justify-center rounded-full bg-white/20 text-xs hover:bg-white/40 disabled:opacity-50"
            >
              ×
            </button>
          </span>
        ))}
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKeyDown}
          onBlur={() => input.trim() && addTag(input)}
          placeholder={tags.length === 0 ? 'agrega un tag…' : ''}
          list={datalistId}
          maxLength={40}
          disabled={isPending || tags.length >= 20}
          className="min-w-[120px] flex-1 rounded-md border border-[var(--border)] bg-white px-2 py-1 text-xs focus:border-[var(--epa-blue)] focus:outline-none focus:ring-1 focus:ring-[var(--epa-blue)] disabled:opacity-50"
        />
        <datalist id={datalistId}>
          {availableSuggestions.map((s) => (
            <option key={s} value={s} />
          ))}
        </datalist>
      </div>
      <p className="mt-1 text-xs text-[var(--muted)]">
        Enter o coma para agregar. Backspace quita el último.
      </p>
      {error && (
        <p className="mt-1 text-xs text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
