// Composizione e invio delle email (Resend, API HTTP).
import { formatBytes } from '../../src/lib/forms/files.ts';
import type { SchedaSezione } from '../../src/lib/forms/scheda.ts';
import type { Env } from './env.ts';

export interface Email {
  to: string;
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
}

export interface LinkedFile {
  name: string;
  size: number;
  url: string;
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const COLORS = { ink: '#2E2828', muted: '#6E6260', line: '#DCC7C2', red: '#9E1B22', bg: '#FBF5F3' };

function layout(title: string, content: string): string {
  return `<!doctype html><html lang="it"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${escapeHtml(title)}</title></head>
<body style="margin:0;padding:24px 12px;background:${COLORS.bg};font-family:Arial,Helvetica,sans-serif;color:${COLORS.ink};line-height:1.5">
<div style="max-width:640px;margin:0 auto;background:#fff;border:1px solid ${COLORS.line};border-radius:12px;overflow:hidden">
<div style="height:6px;background:linear-gradient(90deg,#3D6E8C,#E9C3BE,#D9542B,#9E1B22)"></div>
<div style="padding:24px">${content}</div></div></body></html>`;
}

export interface SchedaEmailInput {
  id: string;
  formTitle: string;
  receivedAt: Date;
  sections: SchedaSezione[];
  files: LinkedFile[];
  isInstaller: boolean;
  contact: { nome?: string; telefono?: string; email?: string };
  linkValidityDays: number;
}

function digits(value: string): string {
  return value.replace(/[^\d+]/g, '');
}

/** Email a Giada con la scheda cliente completa. */
export function schedaEmail(input: SchedaEmailInput): { html: string; text: string } {
  const date = input.receivedAt.toLocaleString('it-IT', { timeZone: 'Europe/Rome', dateStyle: 'full', timeStyle: 'short' });
  const badge = input.isInstaller
    ? `<span style="display:inline-block;background:${COLORS.red};color:#fff;font-weight:bold;font-size:12px;padding:2px 10px;border-radius:99px;letter-spacing:.05em">INSTALLATORE</span> `
    : '';

  const actions: string[] = [];
  if (input.contact.telefono) {
    actions.push(`<a href="tel:${escapeHtml(digits(input.contact.telefono))}" style="color:${COLORS.red}">Chiama ${escapeHtml(input.contact.telefono)}</a>`);
    actions.push(`<a href="https://wa.me/${escapeHtml(digits(input.contact.telefono).replace('+', ''))}" style="color:${COLORS.red}">WhatsApp</a>`);
  }
  if (input.contact.email) actions.push(`<a href="mailto:${escapeHtml(input.contact.email)}" style="color:${COLORS.red}">Rispondi via email</a>`);

  const sections = input.sections
    .map(
      (section) => `<h2 style="font-size:16px;margin:24px 0 8px;color:${COLORS.red}">${escapeHtml(section.titolo)}</h2>
<table role="presentation" style="width:100%;border-collapse:collapse;font-size:14px">${section.righe
        .map(
          (row) => `<tr><th scope="row" style="text-align:left;vertical-align:top;padding:6px 12px 6px 0;width:40%;color:${COLORS.muted};font-weight:normal;border-bottom:1px solid ${COLORS.line}">${escapeHtml(row.etichetta)}</th>
<td style="padding:6px 0;border-bottom:1px solid ${COLORS.line};white-space:pre-wrap">${escapeHtml(row.valore)}</td></tr>`,
        )
        .join('')}</table>`,
    )
    .join('');

  const files =
    input.files.length > 0
      ? `<h2 style="font-size:16px;margin:24px 0 8px;color:${COLORS.red}">Foto e documenti (${input.files.length})</h2>
<ul style="padding-left:20px;font-size:14px">${input.files
          .map((file) => `<li><a href="${escapeHtml(file.url)}" style="color:${COLORS.red}">${escapeHtml(file.name)}</a> <span style="color:${COLORS.muted}">(${formatBytes(file.size)})</span></li>`)
          .join('')}</ul>
<p style="font-size:12px;color:${COLORS.muted}">I link scadono dopo ${input.linkValidityDays} giorni. Scarica i file che ti servono per la pratica.</p>`
      : `<p style="font-size:14px;color:${COLORS.muted}">Nessun file allegato.</p>`;

  const html = layout(
    `Richiesta ${input.id}`,
    `<p style="margin:0 0 4px;font-size:13px;color:${COLORS.muted}">${escapeHtml(date)} · codice <strong>${escapeHtml(input.id)}</strong></p>
<h1 style="font-size:22px;margin:0 0 12px">${badge}${escapeHtml(input.formTitle)}</h1>
${input.contact.nome ? `<p style="font-size:18px;margin:0 0 8px"><strong>${escapeHtml(input.contact.nome)}</strong></p>` : ''}
${actions.length ? `<p style="font-size:14px;margin:0 0 8px">${actions.join(' · ')}</p>` : ''}
${sections}${files}`,
  );

  const text = [
    `${input.formTitle} – codice ${input.id}`,
    `Ricevuta: ${date}`,
    input.isInstaller ? 'Profilo: INSTALLATORE' : '',
    '',
    ...input.sections.flatMap((section) => [`== ${section.titolo} ==`, ...section.righe.map((row) => `${row.etichetta}: ${row.valore}`), '']),
    input.files.length ? `== Foto e documenti (link validi ${input.linkValidityDays} giorni) ==` : 'Nessun file allegato.',
    ...input.files.map((file) => `${file.name} (${formatBytes(file.size)}): ${file.url}`),
  ]
    .filter((line, index, lines) => line !== '' || lines[index - 1] !== '')
    .join('\n');

  return { html, text };
}

/** Email di conferma al cliente: nessun dato sensibile ripetuto, nessun allegato. */
export function confermaEmail(input: { id: string; nome?: string; formTitle: string; locale: 'it' | 'en' }): { subject: string; html: string; text: string } {
  const en = input.locale === 'en';
  const nome = input.nome?.split(' ')[0];
  const subject = en ? `We received your request (${input.id})` : `Abbiamo ricevuto la tua richiesta (${input.id})`;
  const lines = en
    ? [
        `Hello${nome ? ` ${nome}` : ''},`,
        `thank you for contacting Feniks LAB. We received your request “${input.formTitle}” with code ${input.id}.`,
        'We will review it and get back to you soon. If you need to add something, just reply to this email.',
        'Feniks LAB – Ing. Giada Molari',
      ]
    : [
        `Ciao${nome ? ` ${nome}` : ''},`,
        `grazie per aver contattato Feniks LAB. Abbiamo ricevuto la tua richiesta “${input.formTitle}” con codice ${input.id}.`,
        'La valutiamo e ti ricontattiamo al più presto. Se vuoi aggiungere qualcosa, rispondi pure a questa email.',
        'Feniks LAB – Ing. Giada Molari',
      ];
  const html = layout(subject, lines.map((line) => `<p style="margin:0 0 12px">${escapeHtml(line)}</p>`).join(''));
  return { subject, html, text: lines.join('\n\n') };
}

export async function sendEmail(env: Env, email: Email): Promise<void> {
  if (env.MAIL_DRY_RUN === '1') {
    console.log(`[email di prova] A: ${email.to}\nOggetto: ${email.subject}\n\n${email.text}`);
    return;
  }
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${env.RESEND_API_KEY}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      from: env.MAIL_FROM,
      to: [email.to],
      subject: email.subject,
      html: email.html,
      text: email.text,
      reply_to: email.replyTo,
    }),
  });
  if (!response.ok) {
    throw new Error(`Resend ha risposto ${response.status}: ${await response.text()}`);
  }
}
