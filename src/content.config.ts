import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';
import type { ImageFunction } from 'astro/content/config';
import { formConfigSchema } from './lib/forms/schema';

// Schemi dei contenuti gestiti da Giada. Se un campo è sbagliato la build si ferma
// indicando file e campo: i messaggi sono in italiano dove serve chiarezza.

/** Il pannello può salvare campi lasciati vuoti come "": per gli schemi equivalgono a "non compilato". */
const emptyToUndefined = (value: unknown) => (value === '' || value === null ? undefined : value);
const optionalText = (schema: z.ZodString = z.string()) => z.preprocess(emptyToUndefined, schema.optional());

export const SERVIZI = ['conto-termico', 'detrazioni', 'progettazione', 'interior', 'garden'] as const;

const fotoSchema = (image: ImageFunction) =>
  z.object({
    src: image(),
    alt: z.string({ error: 'manca la descrizione della foto (alt), serve per accessibilità' }).min(3),
  });

const lavori = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/lavori' }),
  schema: ({ image }) =>
    z.object({
      titolo: z.string({ error: 'manca il titolo' }).min(3),
      data: z.coerce.date({ error: 'data non valida: usa il formato AAAA-MM-GG' }),
      citta: z.string({ error: 'manca la città' }).min(2),
      lat: z.number({ error: 'latitudine mancante o non numerica' }).min(35, 'latitudine fuori dall’Italia').max(48, 'latitudine fuori dall’Italia'),
      lng: z.number({ error: 'longitudine mancante o non numerica' }).min(6, 'longitudine fuori dall’Italia').max(19, 'longitudine fuori dall’Italia'),
      servizio: z.enum(SERVIZI, { error: `servizio non valido: usa uno tra ${SERVIZI.join(', ')}` }),
      foto: z.array(fotoSchema(image)).default([]),
      descrizione: z.string({ error: 'manca la descrizione breve' }).min(10).max(400, 'descrizione troppo lunga (max 400 caratteri)'),
      bozza: z.boolean().default(false),
    }),
});

const youtubeUrl = z
  .string()
  .regex(
    /^https:\/\/(www\.)?(youtube\.com\/(watch\?v=|shorts\/|embed\/)|youtu\.be\/)[\w-]{11}/,
    'link YouTube non valido (es. https://www.youtube.com/watch?v=XXXXXXXXXXX)',
  );

const notizie = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/notizie' }),
  schema: ({ image }) =>
    z.object({
      titolo: z.string({ error: 'manca il titolo' }).min(3),
      data: z.coerce.date({ error: 'data non valida: usa il formato AAAA-MM-GG' }),
      sommario: z.string({ error: 'manca il sommario' }).min(20).max(300, 'sommario troppo lungo (max 300 caratteri)'),
      video: optionalText(youtubeUrl),
      // Immagine facoltativa: se il pannello salva un oggetto vuoto, vale come "nessuna immagine"
      immagine: z.preprocess(
        (value) => (value && typeof value === 'object' && !(value as { src?: unknown }).src ? undefined : value),
        fotoSchema(image).optional(),
      ),
      tag: z.preprocess(emptyToUndefined, z.array(z.string()).default([])),
      bozza: z.boolean().default(false),
    }),
});

const faqSchema = z.object({ domanda: z.string().min(5), risposta: z.string().min(5) });

// Testi delle pagine servizio. Il nome del file è l'indirizzo: conto-termico.md → /energia/conto-termico
const pagine = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/pagine' }),
  schema: z.object({
    titolo: z.string({ error: 'manca il titolo' }),
    metaTitolo: optionalText(z.string().max(60, 'metaTitolo troppo lungo per Google (max 60 caratteri)')),
    metaDescrizione: z
      .string({ error: 'manca la metaDescrizione (testo che appare su Google)' })
      .max(160, 'metaDescrizione troppo lunga (max 160 caratteri)'),
    intro: z.string({ error: "manca l'intro" }),
    punti: z.array(z.object({ titolo: z.string(), testo: z.string() })).default([]),
    fasi: z.array(z.object({ titolo: z.string(), testo: z.string() })).default([]),
    faq: z.array(faqSchema).default([]),
  }),
});

// Configurazione dei moduli guidati (gestita dallo sviluppatore, non dal CMS)
const forms = defineCollection({
  loader: glob({ pattern: '*.json', base: './src/config/forms' }),
  schema: formConfigSchema,
});

export const collections = { lavori, notizie, pagine, forms };
