import {
  CONTATTI_STANDARD,
  type FieldConfig,
  type FormConfig,
  type FormData,
  type OptionConfig,
  type OptionObject,
  type ResolvedForm,
} from './types.ts';

/** Limite complessivo dei file di una richiesta (memoria delle Functions e tempi di upload da mobile). */
export const MAX_TOTAL_MB = 40;

/** Tipi immagine accettati quando la config dice "image/*": solo formati raster, niente SVG. */
export const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];

/** Campi di contatto comuni a tutti i moduli ("@contatti-standard"). */
export const contattiStandard: FieldConfig[] = [
  { nome: 'nome', tipo: 'testo', etichetta: 'Nome e cognome', obbligatorio: true, autocomplete: 'name', maxLunghezza: 120 },
  { nome: 'email', tipo: 'email', etichetta: 'Email', obbligatorio: true, autocomplete: 'email' },
  { nome: 'telefono', tipo: 'telefono', etichetta: 'Telefono', obbligatorio: true, autocomplete: 'tel' },
  {
    nome: 'preferenza_contatto',
    tipo: 'scelta',
    etichetta: 'Come preferisci essere ricontattato?',
    opzioni: ['Telefono', 'WhatsApp', 'Email'],
  },
  { nome: 'note', tipo: 'testoLungo', etichetta: 'Note o domande', maxLunghezza: 3000 },
  {
    nome: 'privacy',
    tipo: 'consenso',
    etichetta: 'Privacy',
    obbligatorio: true,
    testo:
      "Ho letto l'informativa privacy e acconsento al trattamento dei dati inviati, incluse foto, documenti e indirizzo dell'immobile, per essere ricontattato e ricevere un preventivo.",
  },
];

export function resolveForm(config: FormConfig): ResolvedForm {
  return {
    ...config,
    passi: config.passi.map((passo) => ({
      ...passo,
      campi: passo.campi === CONTATTI_STANDARD ? contattiStandard : passo.campi,
    })),
  };
}

export function allFields(form: ResolvedForm): FieldConfig[] {
  return form.passi.flatMap((passo) => passo.campi);
}

export function normalizeOption(option: OptionConfig): Required<Pick<OptionObject, 'valore' | 'etichetta'>> & OptionObject {
  return typeof option === 'string' ? { valore: option, etichetta: option } : { ...option, etichetta: option.etichetta ?? option.valore };
}

/** Etichetta leggibile: quella della config o il nome del campo "umanizzato". */
export function fieldLabel(field: FieldConfig): string {
  if (field.etichetta) return field.etichetta;
  const text = field.nome.replace(/_/g, ' ');
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** Vero se il campo va mostrato in base alle risposte già date. */
export function isVisible(field: FieldConfig, data: FormData): boolean {
  if (!field.mostraSe) return true;
  const current = data[field.mostraSe.campo];
  const expected = Array.isArray(field.mostraSe.valore) ? field.mostraSe.valore : [field.mostraSe.valore];
  if (Array.isArray(current)) return current.some((value) => expected.includes(value));
  return current !== undefined && expected.includes(String(current));
}

/** Espande "image/*" nei tipi raster consentiti. */
export function acceptedTypes(field: FieldConfig): string[] {
  const accetta = field.accetta ?? ['image/*', 'application/pdf'];
  return accetta.flatMap((type) => (type === 'image/*' ? IMAGE_TYPES : [type]));
}

export function isMultiValue(field: FieldConfig): boolean {
  return field.tipo === 'sceltaMultipla' || field.tipo === 'file' || (field.tipo === 'sceltaImmagini' && field.multipla === true);
}
