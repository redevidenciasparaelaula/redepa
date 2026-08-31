import { findInstitutionMatch } from './institution-match';

// Algoritmo puro de auto-asignación de revisores a postulaciones.
//
// Recibe los datos ya cargados (pool + submissions + asignaciones actuales
// + autores) y propone una lista de (submission_id, reviewer_user_id).
// No hace side-effects: es una función pura, fácil de testear y iterar.
//
// Criterios:
//   - Solo postulaciones en estado 'submitted' o 'under_review'.
//   - Un revisor no puede ser asignado a una postulación de la que es autor
//     (conflicto de interés).
//   - Un revisor no puede exceder su max_load (contando asignaciones
//     existentes + las que le vamos sumando en esta corrida).
//   - Solo se considera pool active=true.
//   - Se respetan las asignaciones EXISTENTES: solo se propone rellenar
//     los cupos faltantes hasta llegar al target (default 2 revisores).
//   - Match: prioriza revisores cuyo campo `topics` incluye el nombre de
//     la línea temática (track_name) de la postulación. Como fallback,
//     también suma puntos si `topics` overlappea con las keywords.
//   - Balance: dentro del mismo tier de match, se prefiere al revisor
//     con menor load actual (para distribuir carga).

export interface AutoAssignPoolMember {
  user_id: string;
  email: string;
  full_name: string;
  active: boolean;
  max_load: number;
  current_load: number; // asignaciones vigentes ANTES de esta corrida
  topics: string[];     // nombres de líneas temáticas del congreso
  institution_name: string | null; // para chequeo de conflicto institucional (fuzzy)
}

export interface AutoAssignSubmission {
  id: string;
  title: string;
  status:
    | 'draft'
    | 'submitted'
    | 'under_review'
    | 'accepted'
    | 'rejected'
    | 'withdrawn';
  track_id: string | null;
  track_name: string | null;
  keywords: string[];
  existing_reviewer_ids: string[];
  author_user_ids: string[]; // user_ids de autores (para conflicto)
  author_institutions: (string | null)[]; // nombres de instituciones de los autores (fuzzy)
}

export interface AutoAssignConfig {
  reviewersPerSubmission: number; // default 2
}

export interface ProposedAssignment {
  submission_id: string;
  submission_title: string;
  reviewer_user_id: string;
  reviewer_email: string;
  reviewer_name: string;
  match_score: number;         // 0..∞ (más alto = mejor match)
  match_reason: string;        // texto breve para mostrar en el preview
  institution_conflict: boolean;         // ⚠ misma institución (fuzzy) que algún autor
  institution_conflict_note: string | null; // ej. "misma institución que Universidad del Desarrollo"
}

export interface AutoAssignSummary {
  assignments: ProposedAssignment[];
  // Diagnóstico por postulación: cuántos cupos quedaron sin llenar y por qué.
  gaps: Array<{
    submission_id: string;
    submission_title: string;
    filled: number;
    target: number;
    reason: string;
  }>;
  // Por revisor: cuántas nuevas asignaciones se le proponen.
  reviewerLoad: Array<{
    user_id: string;
    full_name: string;
    email: string;
    added: number;
    total_after: number;
    max_load: number;
  }>;
}

export function computeAutoAssignments(input: {
  pool: AutoAssignPoolMember[];
  submissions: AutoAssignSubmission[];
  config?: Partial<AutoAssignConfig>;
}): AutoAssignSummary {
  const target = Math.max(1, input.config?.reviewersPerSubmission ?? 2);

  // Load counter mutable: current_load + lo que le vamos agregando
  const load = new Map<string, number>();
  for (const p of input.pool) load.set(p.user_id, p.current_load);

  const assignments: ProposedAssignment[] = [];
  const gaps: AutoAssignSummary['gaps'] = [];

  // Solo trabajamos con postulaciones abiertas a revisión
  const toReview = input.submissions.filter(
    (s) => s.status === 'submitted' || s.status === 'under_review'
  );

  // Orden estable: postulaciones con MENOS revisores asignados primero
  // (para que si el pool es chico, distribuyamos parejo antes de saturar).
  const ordered = [...toReview].sort((a, b) => {
    const na = a.existing_reviewer_ids.length;
    const nb = b.existing_reviewer_ids.length;
    if (na !== nb) return na - nb;
    return a.title.localeCompare(b.title, 'es');
  });

  for (const sub of ordered) {
    const already = new Set(sub.existing_reviewer_ids);
    const authorSet = new Set(sub.author_user_ids);
    const slotsToFill = target - already.size;

    if (slotsToFill <= 0) {
      // ya cumple el target
      continue;
    }

    // Candidatos válidos para esta postulación
    const trackNameLc = (sub.track_name ?? '').toLowerCase().trim();
    const keywordSet = new Set(sub.keywords.map((k) => k.toLowerCase()));

    const candidates = input.pool
      .filter((p) => p.active)
      .filter((p) => !authorSet.has(p.user_id)) // sin conflicto de interés (autor)
      .filter((p) => !already.has(p.user_id))    // sin duplicar
      .filter((p) => (load.get(p.user_id) ?? 0) < p.max_load) // capacidad
      .map((p) => {
        const topicsLc = p.topics.map((t) => t.toLowerCase().trim());
        const trackMatch = trackNameLc && topicsLc.includes(trackNameLc);
        const kwMatches = topicsLc.filter((t) => keywordSet.has(t));

        // Chequeo fuzzy de institución vs autores.
        const instMatchedAuthorInst = findInstitutionMatch(
          p.institution_name,
          sub.author_institutions
        );
        const institutionConflict = instMatchedAuthorInst !== null;

        // Track match pesa mucho más que match por keyword.
        // Institución compartida penaliza fuerte (pero no excluye:
        // si es el único match posible, sigue siendo elegible).
        const score =
          (trackMatch ? 10 : 0) +
          kwMatches.length +
          (institutionConflict ? -5 : 0);

        const reasons: string[] = [];
        if (trackMatch) reasons.push(`revisa "${sub.track_name}"`);
        if (kwMatches.length > 0)
          reasons.push(`keywords: ${kwMatches.slice(0, 2).join(', ')}`);
        if (reasons.length === 0) reasons.push('sin match temático');
        if (institutionConflict)
          reasons.push(`⚠ misma institución que autor (${instMatchedAuthorInst})`);

        return {
          member: p,
          score,
          reason: reasons.join(' · '),
          institution_conflict: institutionConflict,
          institution_conflict_note: institutionConflict
            ? `misma institución que autor (${instMatchedAuthorInst})`
            : null,
        };
      })
      // Orden:
      //  1) score DESC
      //  2) load ASC (menos cargados primero)
      //  3) capacidad restante DESC (más margen primero)
      //  4) email ASC (estable)
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        const la = load.get(a.member.user_id) ?? 0;
        const lb = load.get(b.member.user_id) ?? 0;
        if (la !== lb) return la - lb;
        const ca = a.member.max_load - la;
        const cb = b.member.max_load - lb;
        if (cb !== ca) return cb - ca;
        return a.member.email.localeCompare(b.member.email);
      });

    let filled = already.size;
    let usedFromCandidates = 0;

    for (const c of candidates) {
      if (filled >= target) break;
      assignments.push({
        submission_id: sub.id,
        submission_title: sub.title,
        reviewer_user_id: c.member.user_id,
        reviewer_email: c.member.email,
        reviewer_name: c.member.full_name,
        match_score: c.score,
        match_reason: c.reason,
        institution_conflict: c.institution_conflict,
        institution_conflict_note: c.institution_conflict_note,
      });
      load.set(c.member.user_id, (load.get(c.member.user_id) ?? 0) + 1);
      filled++;
      usedFromCandidates++;
    }

    if (filled < target) {
      const reason =
        candidates.length === 0
          ? 'no hay revisores disponibles compatibles (revisá conflictos, pool activo y capacidad)'
          : `solo se encontraron ${usedFromCandidates} de ${slotsToFill} cupos (pool con match limitado o saturado)`;
      gaps.push({
        submission_id: sub.id,
        submission_title: sub.title,
        filled,
        target,
        reason,
      });
    }
  }

  // Resumen por revisor: cuántas nuevas se le agregan
  const reviewerLoadMap = new Map<
    string,
    {
      user_id: string;
      full_name: string;
      email: string;
      added: number;
      total_after: number;
      max_load: number;
    }
  >();
  for (const p of input.pool) {
    const totalAfter = load.get(p.user_id) ?? p.current_load;
    const added = totalAfter - p.current_load;
    if (added > 0) {
      reviewerLoadMap.set(p.user_id, {
        user_id: p.user_id,
        full_name: p.full_name,
        email: p.email,
        added,
        total_after: totalAfter,
        max_load: p.max_load,
      });
    }
  }

  const reviewerLoad = Array.from(reviewerLoadMap.values()).sort(
    (a, b) => b.added - a.added
  );

  return { assignments, gaps, reviewerLoad };
}
