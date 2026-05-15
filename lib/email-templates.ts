// Templates de email del módulo congreso.
//
// Devuelven { subject, html, text } listos para pasar a sendEmail().
// HTML simple, sin estilos externos, ancho ~600px. Texto plano lo
// genera sendEmail() automáticamente si no se pasa.

const BASE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.trim() || 'https://redepa.net';

function shell(title: string, bodyHtml: string): string {
  return `<!doctype html>
<html lang="es">
<body style="margin:0;padding:0;background:#f5f5f4;font-family:-apple-system,Segoe UI,Roboto,sans-serif;color:#1c1917">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f4">
    <tr>
      <td align="center" style="padding:32px 16px">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:12px;border:1px solid #e7e5e4">
          <tr>
            <td style="padding:32px">
              <p style="margin:0 0 24px 0;font-size:14px;color:#0e7c66;font-weight:600;letter-spacing:.06em;text-transform:uppercase">Red EPA</p>
              <h1 style="margin:0 0 16px 0;font-size:22px;line-height:1.3;color:#1c1917">${escapeHtml(title)}</h1>
              ${bodyHtml}
            </td>
          </tr>
          <tr>
            <td style="padding:24px 32px;border-top:1px solid #e7e5e4;background:#fafaf9;border-bottom-left-radius:12px;border-bottom-right-radius:12px">
              <p style="margin:0;font-size:12px;color:#78716c;line-height:1.5">
                Red Latinoamericana Evidencias Para el Aula —
                <a href="${BASE_URL}" style="color:#0e7c66">redepa.net</a><br>
                Si tienes preguntas, respondé a este correo y te respondemos.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function ctaButton(label: string, href: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0">
    <tr><td style="background:#0e7c66;border-radius:8px">
      <a href="${href}" style="display:inline-block;padding:12px 24px;color:#ffffff;font-weight:600;text-decoration:none;font-size:14px">${escapeHtml(label)} →</a>
    </td></tr>
  </table>`;
}

// =====================================================================
// 1) CFP abierto — para suscriptores que dejaron su email
// =====================================================================
export function cfpOpenedTemplate(args: {
  congressName: string;
  year: number;
  theme: string | null;
  cfpCloseAt: string | null;
  subscriberName: string | null;
}): { subject: string; html: string } {
  const url = `${BASE_URL}/congreso/${args.year}`;
  const greeting = args.subscriberName ? `Hola ${args.subscriberName}` : 'Hola';
  const deadline = args.cfpCloseAt
    ? new Date(args.cfpCloseAt).toLocaleDateString('es', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : null;

  const body = `
    <p style="margin:0 0 12px 0;font-size:15px;line-height:1.6">${escapeHtml(greeting)},</p>
    <p style="margin:0 0 12px 0;font-size:15px;line-height:1.6">
      Acaba de abrir la convocatoria del <strong>${escapeHtml(args.congressName)}</strong>.
      ${args.theme ? `Tema central: <em>${escapeHtml(args.theme)}</em>.` : ''}
    </p>
    ${deadline ? `<p style="margin:0 0 12px 0;font-size:15px;line-height:1.6">El plazo de postulación cierra el <strong>${escapeHtml(deadline)}</strong>. El plazo es estricto: después de esa fecha no se aceptan postulaciones nuevas ni modificaciones.</p>` : ''}
    <p style="margin:0 0 12px 0;font-size:15px;line-height:1.6">
      Para postular necesitas tener cuenta en redepa.net (es gratis) y completar el formulario con tu abstract estructurado.
    </p>
    ${ctaButton('Ver convocatoria', url)}
    <p style="margin:0;font-size:13px;color:#78716c;line-height:1.5">
      Recibes este correo porque dejaste tu email en redepa.net para recibir aviso de apertura de esta convocatoria.
    </p>`;

  return {
    subject: `Abrió la convocatoria del ${args.congressName}`,
    html: shell(`Abrió la convocatoria del ${args.congressName}`, body),
  };
}

// =====================================================================
// 2) Reviewer asignado — para el revisor del pool
// =====================================================================
export function reviewerAssignedTemplate(args: {
  congressName: string;
  year: number;
  reviewerName: string | null;
  submissionTitle: string;
  trackName: string | null;
  deadlineAt: string | null;
}): { subject: string; html: string } {
  const url = `${BASE_URL}/me/revisiones`;
  const greeting = args.reviewerName ? `Hola ${args.reviewerName}` : 'Hola';
  const deadline = args.deadlineAt
    ? new Date(args.deadlineAt).toLocaleDateString('es', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : null;

  const body = `
    <p style="margin:0 0 12px 0;font-size:15px;line-height:1.6">${escapeHtml(greeting)},</p>
    <p style="margin:0 0 12px 0;font-size:15px;line-height:1.6">
      Te asignamos una nueva postulación para revisar en el <strong>${escapeHtml(args.congressName)}</strong>.
    </p>
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:16px 0;background:#fafaf9;border:1px solid #e7e5e4;border-radius:8px;width:100%">
      <tr><td style="padding:16px">
        <p style="margin:0 0 6px 0;font-size:13px;color:#78716c">Título de la postulación</p>
        <p style="margin:0 0 12px 0;font-size:15px;font-weight:600">${escapeHtml(args.submissionTitle)}</p>
        ${args.trackName ? `<p style="margin:0 0 6px 0;font-size:13px;color:#78716c">Línea temática</p><p style="margin:0;font-size:14px">${escapeHtml(args.trackName)}</p>` : ''}
      </td></tr>
    </table>
    ${deadline ? `<p style="margin:0 0 12px 0;font-size:15px;line-height:1.6">Tu deadline para entregar la review es el <strong>${escapeHtml(deadline)}</strong>.</p>` : ''}
    <p style="margin:0 0 12px 0;font-size:15px;line-height:1.6">
      La revisión es <strong>doble ciega</strong>: no verás los nombres ni las instituciones de quienes escribieron el abstract. Si reconoces el trabajo o tienes conflicto de interés, podés declinar la asignación desde la plataforma.
    </p>
    ${ctaButton('Ir a la revisión', url)}`;

  return {
    subject: `Nueva asignación de revisión — ${args.congressName}`,
    html: shell(`Te asignamos una postulación`, body),
  };
}

// =====================================================================
// 3) Decisión emitida — para los autores
// =====================================================================
export function decisionEmittedTemplate(args: {
  congressName: string;
  year: number;
  authorName: string | null;
  submissionId: string;
  submissionTitle: string;
  decision: 'accepted' | 'rejected';
  decisionNote: string | null;
}): { subject: string; html: string } {
  const url = `${BASE_URL}/congreso/${args.year}/postular/${args.submissionId}`;
  const greeting = args.authorName ? `Hola ${args.authorName}` : 'Hola';
  const accepted = args.decision === 'accepted';
  const verdict = accepted ? 'Aceptada' : 'No aceptada para esta edición';
  const verdictColor = accepted ? '#0e7c66' : '#b91c1c';

  const body = `
    <p style="margin:0 0 12px 0;font-size:15px;line-height:1.6">${escapeHtml(greeting)},</p>
    <p style="margin:0 0 12px 0;font-size:15px;line-height:1.6">
      El comité del <strong>${escapeHtml(args.congressName)}</strong> ya emitió decisión sobre tu postulación:
    </p>
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:16px 0;background:#fafaf9;border:1px solid #e7e5e4;border-radius:8px;width:100%">
      <tr><td style="padding:16px">
        <p style="margin:0 0 6px 0;font-size:13px;color:#78716c">Postulación</p>
        <p style="margin:0 0 12px 0;font-size:15px;font-weight:600">${escapeHtml(args.submissionTitle)}</p>
        <p style="margin:0 0 6px 0;font-size:13px;color:#78716c">Decisión</p>
        <p style="margin:0;font-size:16px;font-weight:700;color:${verdictColor}">${verdict}</p>
      </td></tr>
    </table>
    ${
      args.decisionNote
        ? `<p style="margin:0 0 6px 0;font-size:13px;color:#78716c">Nota del comité</p>
           <p style="margin:0 0 16px 0;font-size:14px;line-height:1.6;white-space:pre-wrap">${escapeHtml(args.decisionNote)}</p>`
        : ''
    }
    <p style="margin:0 0 12px 0;font-size:15px;line-height:1.6">
      Los comentarios de las personas que evaluaron tu trabajo están disponibles en tu cuenta. Son anónimos por el carácter doble ciega del proceso.
    </p>
    ${ctaButton('Ver detalles y comentarios', url)}
    ${
      accepted
        ? `<p style="margin:0;font-size:14px;color:#0e7c66;line-height:1.6">¡Felicitaciones! Pronto te enviaremos información sobre el programa y la inscripción.</p>`
        : `<p style="margin:0;font-size:14px;color:#78716c;line-height:1.6">Sabemos que estos procesos son exigentes. Esperamos verte en próximas ediciones de los Congresos EPA.</p>`
    }`;

  return {
    subject: `${verdict} — ${args.congressName}`,
    html: shell(`Decisión sobre tu postulación`, body),
  };
}
