'use client';

import { useEffect, useState } from 'react';

interface Props {
  targetDate: string; // ISO timestamp
  prefix: string; // ej: "Faltan"
  suffix: string; // ej: "para que abra la convocatoria"
}

// Renderiza un countdown en días hasta una fecha objetivo.
// Server-side renderiza un placeholder vacío para evitar mismatch de
// hidratación; el client toma el control y actualiza cada minuto.
export function CongressCountdown({ targetDate, prefix, suffix }: Props) {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const interval = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(interval);
  }, []);

  if (!now) {
    // Reserva el espacio para que no haya layout shift cuando hidrate
    return <div className="h-[44px]" aria-hidden="true" />;
  }

  const target = new Date(targetDate);
  const diffMs = target.getTime() - now.getTime();
  if (diffMs <= 0) return null;

  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

  // Si quedan menos de 2 días, mostramos horas también
  const showHours = days < 2;

  return (
    <div className="inline-flex items-baseline gap-2 text-sm leading-relaxed text-[var(--foreground)] sm:text-base">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-5 w-5 self-center text-[var(--epa-blue)]"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </svg>
      <span>
        {prefix}{' '}
        <strong className="text-[var(--epa-blue)]">
          {days} {days === 1 ? 'día' : 'días'}
          {showHours && hours > 0 ? ` y ${hours} h` : ''}
        </strong>{' '}
        {suffix}.
      </span>
    </div>
  );
}
