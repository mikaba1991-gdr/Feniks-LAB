// Schema Zod della configurazione dei moduli: controlla i file JSON in fase di build.
import { z } from 'astro/zod';
import { CONTATTI_STANDARD, FIELD_TYPES } from './types.ts';

const optionSchema = z.union([
  z.string().min(1),
  z.object({ valore: z.string().min(1), etichetta: z.string().optional(), immagine: z.string().optional() }),
]);

const fieldSchema = z.object({
  nome: z.string().regex(/^[a-z][a-z0-9_]*$/, 'il nome del campo deve essere minuscolo, senza spazi (es. superficie_mq)'),
  tipo: z.enum(FIELD_TYPES, { error: `tipo non valido: usa uno tra ${FIELD_TYPES.join(', ')}` }),
  etichetta: z.string().optional(),
  aiuto: z.string().optional(),
  placeholder: z.string().optional(),
  obbligatorio: z.boolean().optional(),
  min: z.number().optional(),
  max: z.number().optional(),
  maxLunghezza: z.number().int().positive().optional(),
  opzioni: z.array(optionSchema).optional(),
  multipla: z.boolean().optional(),
  accetta: z.array(z.string()).optional(),
  maxFile: z.number().int().positive().max(20).optional(),
  maxMB: z.number().positive().max(25).optional(),
  testo: z.string().optional(),
  autocomplete: z.string().optional(),
  mostraSe: z.object({ campo: z.string(), valore: z.union([z.string(), z.array(z.string())]) }).optional(),
});

const stepSchema = z.object({
  titolo: z.string().min(1),
  descrizione: z.string().optional(),
  campi: z.union([z.literal(CONTATTI_STANDARD), z.array(fieldSchema).min(1)]),
});

export const formConfigSchema = z
  .object({
    id: z.string().regex(/^[a-z0-9-]+$/),
    titolo: z.string().min(1),
    descrizione: z.string().optional(),
    ramo: z.enum(['energia', 'design', 'generale']),
    destinatari: z.array(z.string()).optional(),
    campiOggetto: z.array(z.string()).optional(),
    passi: z.array(stepSchema).min(1),
  })
  .superRefine((form, ctx) => {
    const fields = form.passi.flatMap((passo) => (Array.isArray(passo.campi) ? passo.campi : []));
    const names = new Set<string>();
    const hasStandard = form.passi.some((passo) => passo.campi === CONTATTI_STANDARD);
    for (const field of fields) {
      if (names.has(field.nome)) ctx.addIssue({ code: 'custom', message: `campo "${field.nome}" duplicato` });
      names.add(field.nome);
      const needsOptions = ['scelta', 'sceltaMultipla', 'sceltaImmagini'].includes(field.tipo);
      if (needsOptions && !field.opzioni?.length) {
        ctx.addIssue({ code: 'custom', message: `il campo "${field.nome}" (${field.tipo}) non ha opzioni` });
      }
      if (field.tipo === 'consenso' && !field.testo) {
        ctx.addIssue({ code: 'custom', message: `il campo consenso "${field.nome}" non ha il testo` });
      }
    }
    const known = new Set([...names, ...(hasStandard ? ['nome', 'email', 'telefono', 'preferenza_contatto', 'note', 'privacy'] : [])]);
    for (const field of fields) {
      if (field.mostraSe && !known.has(field.mostraSe.campo)) {
        ctx.addIssue({ code: 'custom', message: `mostraSe del campo "${field.nome}" punta a "${field.mostraSe.campo}", che non esiste` });
      }
    }
    for (const name of form.campiOggetto ?? []) {
      if (!known.has(name)) ctx.addIssue({ code: 'custom', message: `campiOggetto contiene "${name}", che non esiste` });
    }
  });
