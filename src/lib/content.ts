import { getCollection, getEntry, type CollectionEntry } from 'astro:content';

/** In sviluppo si vedono anche le bozze (es. i contenuti di esempio). */
const showDrafts = import.meta.env.DEV;

export const SERVIZIO_LABEL: Record<CollectionEntry<'lavori'>['data']['servizio'], string> = {
  'conto-termico': 'Conto Termico',
  detrazioni: 'Detrazioni fiscali',
  progettazione: 'Progettazione impianti',
  interior: 'Interior design',
  garden: 'Garden design',
};

export async function getLavori() {
  const items = await getCollection('lavori', ({ data }) => showDrafts || !data.bozza);
  return items.sort((a, b) => b.data.data.getTime() - a.data.data.getTime());
}

export async function getNotizie() {
  const items = await getCollection('notizie', ({ data }) => showDrafts || !data.bozza);
  return items.sort((a, b) => b.data.data.getTime() - a.data.data.getTime());
}

export async function getPagina(id: string) {
  const entry = await getEntry('pagine', id);
  if (!entry) throw new Error(`Manca il file src/content/pagine/${id}.md`);
  return entry;
}

export function formatDate(date: Date, locale = 'it-IT'): string {
  return date.toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Rome' });
}

/** Vero se un testo contiene ancora segnaposto: in quel caso non va nei dati strutturati. */
export function hasTodo(value: unknown): boolean {
  return JSON.stringify(value).includes('TODO(');
}
