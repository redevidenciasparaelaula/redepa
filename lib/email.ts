// Helper de envío de email vía Brevo HTTP API (transactional emails).
//
// Configuración:
//   - Env var BREVO_API_KEY (Brevo → SMTP & API → API Keys)
//   - Env var BREVO_SENDER_EMAIL  (default: hola@redepa.net)
//   - Env var BREVO_SENDER_NAME   (default: Red EPA)
//
// Diseño:
//   - sendEmail() devuelve { ok, error? } y JAMÁS lanza. Si Brevo falla,
//     se loguea y la acción que disparó el email sigue su curso.
//   - sendBulkEmail() envía 1 email por destinatario en paralelo con
//     Promise.allSettled (para que un destinatario inválido no tire el resto).
//
// Endpoint usado:
//   POST https://api.brevo.com/v3/smtp/email
//   headers: { 'api-key': <key>, 'content-type': 'application/json' }
//   body:    { sender, to, subject, htmlContent, textContent }

export interface EmailRecipient {
  email: string;
  name?: string;
}

export interface SendEmailOptions {
  to: EmailRecipient | EmailRecipient[];
  subject: string;
  html: string;
  text?: string;
  replyTo?: EmailRecipient;
}

export type EmailResult = { ok: true } | { ok: false; error: string };

const DEFAULT_FROM_EMAIL = 'hola@redepa.net';
const DEFAULT_FROM_NAME = 'Red EPA';
const BREVO_ENDPOINT = 'https://api.brevo.com/v3/smtp/email';

function getApiKey(): string | null {
  return process.env.BREVO_API_KEY?.trim() || null;
}

function getSender(): EmailRecipient {
  return {
    email: process.env.BREVO_SENDER_EMAIL?.trim() || DEFAULT_FROM_EMAIL,
    name: process.env.BREVO_SENDER_NAME?.trim() || DEFAULT_FROM_NAME,
  };
}

export async function sendEmail(opts: SendEmailOptions): Promise<EmailResult> {
  const apiKey = getApiKey();
  if (!apiKey) {
    console.warn('[email] BREVO_API_KEY no configurada; skip envío.');
    return { ok: false, error: 'BREVO_API_KEY no configurada.' };
  }

  const recipients = Array.isArray(opts.to) ? opts.to : [opts.to];
  if (recipients.length === 0) {
    return { ok: false, error: 'Sin destinatarios.' };
  }

  // Modo test: si BREVO_TEST_ONLY_EMAIL está seteada, TODOS los emails se
  // redirigen a esa dirección, sin importar quién era el destinatario real.
  // Útil para verificar el flujo en producción sin tocar usuarios reales.
  // El subject lleva el detalle de a quién hubiera ido en modo real.
  const testOnlyEmail = process.env.BREVO_TEST_ONLY_EMAIL?.trim();
  const finalRecipients = testOnlyEmail
    ? [{ email: testOnlyEmail }]
    : recipients;
  const finalSubject = testOnlyEmail
    ? `[TEST → ${recipients.map((r) => r.email).join(', ')}] ${opts.subject}`
    : opts.subject;

  const body = {
    sender: getSender(),
    to: finalRecipients,
    subject: finalSubject,
    htmlContent: opts.html,
    textContent: opts.text ?? stripHtml(opts.html),
    replyTo: opts.replyTo,
  };

  try {
    const res = await fetch(BREVO_ENDPOINT, {
      method: 'POST',
      headers: {
        'api-key': apiKey,
        'content-type': 'application/json',
        accept: 'application/json',
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const text = await res.text();
      console.error('[email] Brevo respondió error', res.status, text);
      return { ok: false, error: `Brevo ${res.status}: ${text}` };
    }
    return { ok: true };
  } catch (err) {
    console.error('[email] Error de red al llamar a Brevo', err);
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'unknown',
    };
  }
}

// Envía individualmente a una lista grande. Devuelve métricas de exito.
export async function sendBulkEmail(
  recipients: EmailRecipient[],
  build: (r: EmailRecipient) => Omit<SendEmailOptions, 'to'>
): Promise<{ sent: number; failed: number }> {
  const apiKey = getApiKey();
  if (!apiKey) {
    console.warn('[email] BREVO_API_KEY no configurada; skip bulk envío.');
    return { sent: 0, failed: recipients.length };
  }

  // Modo test: enviar UN solo email representativo (con el primer destinatario
  // como muestra). El subject indica cuántos destinatarios reales había.
  // sendEmail() además redirige todo a BREVO_TEST_ONLY_EMAIL, así que nadie
  // del listado real recibe nada.
  const testOnlyEmail = process.env.BREVO_TEST_ONLY_EMAIL?.trim();
  if (testOnlyEmail && recipients.length > 0) {
    const sample = recipients[0];
    const opts = build(sample);
    const res = await sendEmail({
      ...opts,
      to: sample,
      subject: `[TEST · bulk a ${recipients.length} destinatarios] ${opts.subject}`,
    });
    console.info(
      `[email] TEST MODE: 1 email enviado a ${testOnlyEmail} en vez de ${recipients.length} reales`
    );
    return res.ok
      ? { sent: 1, failed: 0 }
      : { sent: 0, failed: 1 };
  }

  const results = await Promise.allSettled(
    recipients.map((r) => sendEmail({ ...build(r), to: r }))
  );

  let sent = 0;
  let failed = 0;
  for (const result of results) {
    if (result.status === 'fulfilled' && result.value.ok) sent += 1;
    else failed += 1;
  }
  return { sent, failed };
}

// Fallback simple para textContent cuando solo se pasa htmlContent.
function stripHtml(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
