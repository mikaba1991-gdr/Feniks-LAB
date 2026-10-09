import { z } from 'astro/zod';
import contattiJson from '../content/settings/contatti.json';

// Contatti modificabili da Giada (src/content/settings/contatti.json).
// Lo schema fa fallire la build con un messaggio che indica file e campo.
const contattiSchema = z.object({
  telefono: z.string().min(1, 'inserisci il numero di telefono'),
  whatsapp: z.string().min(1, 'inserisci il numero WhatsApp'),
  email: z.string().min(1, "inserisci l'email"),
  orari: z.string().default(''),
  citta: z.string().default(''),
  partitaIva: z.string().default(''),
  instagram: z.string().default(''),
});

function parseContatti() {
  const result = contattiSchema.safeParse(contattiJson);
  if (!result.success) {
    const dettagli = result.error.issues
      .map((issue) => `  - campo "${issue.path.join('.')}": ${issue.message}`)
      .join('\n');
    throw new Error(`Errore in src/content/settings/contatti.json:\n${dettagli}`);
  }
  return result.data;
}

export const contatti = parseContatti();

export const site = {
  name: 'Feniks LAB',
  owner: 'Ing. Giada Molari',
  tagline: "Uno studio che rinnova la casa, dall'impianto all'arredo",
  description:
    "Feniks LAB, studio di ingegneria dell'Ing. Giada Molari: pratiche Conto Termico, detrazioni fiscali e progettazione impianti in tutta Italia, interior e garden design.",
  locale: 'it_IT',
} as const;

/** Vero se il valore è ancora un segnaposto da completare. */
export function isTodo(value: string | undefined | null): boolean {
  return !value || value.trim().startsWith('TODO');
}

/** Link telefonico: tiene solo cifre e "+". */
export function telHref(numero: string): string {
  return `tel:${numero.replace(/[^\d+]/g, '')}`;
}

/** Link WhatsApp (wa.me vuole il numero senza "+" né spazi). */
export function whatsappHref(numero: string, testo?: string): string {
  const digits = numero.replace(/\D/g, '');
  const query = testo ? `?text=${encodeURIComponent(testo)}` : '';
  return `https://wa.me/${digits}${query}`;
}
