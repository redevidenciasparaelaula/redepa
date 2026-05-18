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

  const body = {
    sender: getSender(),
    to: recipients,
    subject: opts.subject,
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
