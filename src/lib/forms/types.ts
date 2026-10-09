// Tipi dei moduli guidati. Nessuna dipendenza: li usano sia il sito sia le Functions.

export const FIELD_TYPES = [
  'testo',
  'testoLungo',
  'numero',
  'email',
  'telefono',
  'scelta',
  'sceltaMultipla',
  'sceltaImmagini',
  'file',
  'consenso',
] as const;

export type FieldType = (typeof FIELD_TYPES)[number];

export interface OptionObject {
  valore: string;
  etichetta?: string;
  /** Percorso immagine in /public, per sceltaImmagini */
  immagine?: string;
}

export type OptionConfig = string | OptionObject;

export interface ShowIf {
  campo: string;
  valore: string | string[];
}

export interface FieldConfig {
  nome: string;
  tipo: FieldType;
  etichetta?: string;
  aiuto?: string;
  placeholder?: string;
  obbligatorio?: boolean;
  /** numero: valore minimo/massimo */
  min?: number;
  max?: number;
  /** testo/testoLungo: lunghezza massima */
  maxLunghezza?: number;
  opzioni?: OptionConfig[];
  /** sceltaImmagini: più risposte possibili */
  multipla?: boolean;
  /** file: tipi MIME accettati, es. ["image/*", "application/pdf"] */
  accetta?: string[];
  maxFile?: number;
  maxMB?: number;
  /** consenso: testo della casella */
  testo?: string;
  autocomplete?: string;
  mostraSe?: ShowIf;
}

export const CONTATTI_STANDARD = '@contatti-standard';

export interface StepConfig {
  titolo: string;
  descrizione?: string;
  campi: FieldConfig[] | typeof CONTATTI_STANDARD;
}

export interface FormConfig {
  id: string;
  titolo: string;
  descrizione?: string;
  ramo: 'energia' | 'design' | 'generale';
  destinatari?: string[];
  /** Campi i cui valori compaiono nell'oggetto dell'email a Giada (es. profilo e comune) */
  campiOggetto?: string[];
  passi: StepConfig[];
}

export interface ResolvedStep {
  titolo: string;
  descrizione?: string;
  campi: FieldConfig[];
}

export interface ResolvedForm extends Omit<FormConfig, 'passi'> {
  passi: ResolvedStep[];
}

export type FieldValue = string | number | boolean | string[];
export type FormData = Record<string, FieldValue>;

/** Informazioni minime su un file, uguali per File del browser e del server */
export interface FileInfo {
  name: string;
  type: string;
  size: number;
}

export type ErrorCode =
  | 'required'
  | 'email'
  | 'phone'
  | 'number'
  | 'min'
  | 'max'
  | 'tooLong'
  | 'option'
  | 'maxFiles'
  | 'fileSize'
  | 'fileType'
  | 'fileMissing'
  | 'totalSize'
  | 'consent';

export interface FieldError {
  code: ErrorCode;
  params?: Record<string, string | number>;
}
