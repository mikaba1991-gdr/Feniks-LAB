// POST /api/richiesta – riceve i moduli guidati, salva i file su R2 e invia la scheda cliente a Giada.
import { formRegistry } from '../../src/config/forms';
import { safeFileName } from '../../src/lib/forms/files';
import { allFields, MAX_TOTAL_MB, resolveForm } from '../../src/lib/forms/resolve';
import { buildScheda, buildSubject } from '../../src/lib/forms/scheda';
import type { FileInfo, FieldError } from '../../src/lib/forms/types';
import { validateForm, type FilesByField } from '../../src/lib/forms/validate';
import { confermaEmail, schedaEmail, sendEmail, type LinkedFile } from '../_lib/email';
import { missingConfig, type Env } from '../_lib/env';
import { errorResponse, json } from '../_lib/http';
import { LINK_VALIDITY_DAYS, signedFileUrl } from '../_lib/signing';
import { EXTENSIONS, sameFamily, sniffType } from '../_lib/sniff';
import { verifyTurnstile } from '../_lib/turnstile';

/** Margine per i campi testuali oltre al limite dei file */
const MAX_BODY_BYTES = (MAX_TOTAL_MB + 2) * 1024 * 1024;

const MESSAGES = {
  it: {
    config: 'Il servizio di invio non è ancora configurato. Contattaci per telefono o email.',
    tooLarge: `La richiesta è troppo grande: i file non devono superare ${MAX_TOTAL_MB} MB in totale.`,
    badRequest: 'Richiesta non valida. Ricarica la pagina e riprova.',
    turnstile: 'Verifica anti-spam non riuscita. Riprova.',
    invalid: 'Alcuni dati non sono validi: controlla i campi evidenziati.',
    unexpectedFile: 'È arrivato un file non previsto. Ricarica la pagina e riprova.',
    storage: 'Non siamo riusciti a salvare i file. Riprova tra poco.',
    mail: 'La richiesta non è stata completata a causa di un problema tecnico. Riprova tra poco o contattaci per telefono.',
  },
  en: {
    config: 'The form service is not configured yet. Please contact us by phone or email.',
    tooLarge: `The request is too large: files must not exceed ${MAX_TOTAL_MB} MB in total.`,
    badRequest: 'Invalid request. Please reload the page and try again.',
    turnstile: 'Anti-spam check failed. Please try again.',
    invalid: 'Some data is not valid: please check the highlighted fields.',
    unexpectedFile: 'An unexpected file was received. Please reload the page and try again.',
    storage: 'We could not save the files. Please try again shortly.',
    mail: 'The request could not be completed due to a technical problem. Please try again shortly or call us.',
  },
} as const;

/** Codice richiesta AAAAMMGG-xxxx (data italiana + 4 caratteri casuali). */
function newRequestId(now: Date): string {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Rome', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
  const alphabet = 'abcdefghijkmnpqrstuvwxyz23456789';
  const random = [...crypto.getRandomValues(new Uint8Array(4))].map((byte) => alphabet[byte % alphabet.length]).join('');
  return `${parts.replace(/-/g, '')}-${random}`;
}

function prefixFor(id: string): string {
  return `richieste/${id.slice(0, 4)}/${id}`;
}

/** Forza l'estensione coerente con il tipo reale del file. */
function normalizedName(name: string, type: string): string {
  const safe = safeFileName(name);
  const ext = EXTENSIONS[type];
  if (!ext) return safe;
  const dot = safe.lastIndexOf('.');
  const base = dot > 0 ? safe.slice(0, dot) : safe;
  return `${base}.${ext}`;
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  let locale: 'it' | 'en' = 'it';
  const msg = () => MESSAGES[locale];

  const missing = missingConfig(env);
  if (missing.length > 0) {
    console.error(`Configurazione mancante: ${missing.join(', ')}`);
    return errorResponse(msg().config, 503);
  }

  const length = Number(request.headers.get('content-length') ?? '0');
  if (length > MAX_BODY_BYTES) return errorResponse(msg().tooLarge, 413);
  if (!request.headers.get('content-type')?.startsWith('multipart/form-data')) return errorResponse(msg().badRequest, 400);

  let body: FormData;
  try {
    body = await request.formData();
  } catch {
    return errorResponse(msg().badRequest, 400);
  }

  if (body.get('locale') === 'en') locale = 'en';

  // 1. Anti-spam
  const token = body.get('turnstile_token');
  const ip = request.headers.get('cf-connecting-ip');
  if (typeof token !== 'string' || !(await verifyTurnstile(env.TURNSTILE_SECRET as string, token, ip))) {
    return errorResponse(msg().turnstile, 400);
  }

  // 2. Modulo e dati
  const formId = body.get('form_id');
  const config = typeof formId === 'string' ? formRegistry[formId] : undefined;
  if (!config) return errorResponse(msg().badRequest, 400);
  const form = resolveForm(config);

  let data: Record<string, unknown>;
  try {
    const raw = body.get('dati');
    data = JSON.parse(typeof raw === 'string' ? raw : '') as Record<string, unknown>;
    if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('dati');
  } catch {
    return errorResponse(msg().badRequest, 400);
  }

  // 3. File: ogni file caricato deve corrispondere a un campo file del modulo
  const uploaded = body.getAll('file[]').filter((item): item is File => item instanceof File);
  const byName = new Map<string, File>();
  for (const file of uploaded) {
    const name = safeFileName(file.name);
    if (byName.has(name)) return errorResponse(msg().badRequest, 400);
    byName.set(name, file);
  }

  const filesByField: FilesByField = {};
  const fileErrors: Record<string, FieldError> = {};
  const claimed = new Set<string>();
  for (const field of allFields(form).filter((item) => item.tipo === 'file')) {
    const names = Array.isArray(data[field.nome]) ? (data[field.nome] as unknown[]).filter((name): name is string => typeof name === 'string') : [];
    const infos: FileInfo[] = [];
    for (const original of names) {
      const name = safeFileName(original);
      const file = byName.get(name);
      if (!file) {
        fileErrors[field.nome] = { code: 'fileMissing' };
        continue;
      }
      claimed.add(name);
      infos.push({ name, type: file.type.toLowerCase(), size: file.size });
    }
    filesByField[field.nome] = infos;
  }
  if (claimed.size !== byName.size) return errorResponse(msg().unexpectedFile, 400);

  const result = validateForm(form, data, filesByField);
  const errors = { ...fileErrors, ...result.errors };

  // Tipo reale dai primi byte
  const contents = new Map<string, { bytes: ArrayBuffer; type: string; field: string }>();
  for (const [fieldName, infos] of Object.entries(filesByField)) {
    if (!(fieldName in result.clean)) continue;
    for (const info of infos) {
      const bytes = await (byName.get(info.name) as File).arrayBuffer();
      const detected = sniffType(new Uint8Array(bytes.slice(0, 16)));
      if (!detected || !sameFamily(info.type, detected)) {
        errors[fieldName] = { code: 'fileType', params: { name: info.name } };
        continue;
      }
      contents.set(info.name, { bytes, type: detected, field: fieldName });
    }
  }

  if (Object.keys(errors).length > 0) return errorResponse(msg().invalid, 422, { errori: errors });

  // 4. Salvataggio su R2
  const now = new Date();
  let id = newRequestId(now);
  for (let attempt = 0; attempt < 5 && (await env.RICHIESTE.head(`${prefixFor(id)}/_richiesta.json`)); attempt += 1) {
    id = newRequestId(now);
  }
  const prefix = prefixFor(id);
  const origin = new URL(request.url).origin;
  const linked: LinkedFile[] = [];
  const storedNames = new Map<string, string>();

  try {
    const used = new Set<string>();
    for (const [name, content] of contents) {
      let stored = normalizedName(name, content.type);
      if (used.has(stored)) stored = `${used.size + 1}-${stored}`;
      used.add(stored);
      storedNames.set(name, stored);
      await env.RICHIESTE.put(`${prefix}/${stored}`, content.bytes, {
        httpMetadata: { contentType: content.type },
        customMetadata: { campo: content.field, richiesta: id },
      });
      linked.push({ name: stored, size: content.bytes.byteLength, url: await signedFileUrl(origin, env.FILE_LINK_SECRET as string, id, stored) });
    }

    // I nomi dei file nei dati diventano quelli effettivamente salvati
    for (const [fieldName, value] of Object.entries(result.clean)) {
      if (filesByField[fieldName] && Array.isArray(value)) {
        result.clean[fieldName] = value.map((name) => storedNames.get(name) ?? name);
      }
    }

    // Copia dei dati: se l'email fallisse, la richiesta non va persa
    const consent = allFields(form).find((field) => field.tipo === 'consenso');
    await env.RICHIESTE.put(
      `${prefix}/_richiesta.json`,
      JSON.stringify(
        {
          id,
          modulo: form.id,
          ricevuta: now.toISOString(),
          locale,
          dati: result.clean,
          consenso: consent ? { testo: consent.testo, dato: result.clean[consent.nome] === true, data: now.toISOString() } : undefined,
          file: linked.map((file) => ({ nome: file.name, byte: file.size })),
        },
        null,
        2,
      ),
      { httpMetadata: { contentType: 'application/json' } },
    );
  } catch (error) {
    console.error('Errore R2', error);
    return errorResponse(msg().storage, 500);
  }

  // 5. Email a Giada con la scheda cliente
  const text = (name: string) => (typeof result.clean[name] === 'string' ? (result.clean[name] as string) : undefined);
  const scheda = schedaEmail({
    id,
    formTitle: form.titolo,
    receivedAt: now,
    sections: buildScheda(form, result.clean),
    files: linked,
    isInstaller: text('profilo') === 'Installatore',
    contact: { nome: text('nome'), telefono: text('telefono'), email: text('email') },
    linkValidityDays: LINK_VALIDITY_DAYS,
  });
  try {
    await sendEmail(env, {
      to: env.MAIL_TO as string,
      subject: buildSubject(form, result.clean),
      html: scheda.html,
      text: scheda.text,
      replyTo: text('email'),
    });
  } catch (error) {
    console.error(`Email a Giada non inviata per la richiesta ${id}`, error);
    return errorResponse(msg().mail, 502);
  }

  // 6. Conferma al cliente (un errore qui non blocca la richiesta)
  const clientEmail = text('email');
  if (clientEmail) {
    const conferma = confermaEmail({ id, nome: text('nome'), formTitle: form.titolo, locale });
    try {
      await sendEmail(env, { to: clientEmail, subject: conferma.subject, html: conferma.html, text: conferma.text, replyTo: env.MAIL_TO });
    } catch (error) {
      console.error(`Conferma al cliente non inviata per la richiesta ${id}`, error);
    }
  }

  return json({ ok: true, id });
};
