// Validazione dei moduli: stessa logica nel browser (per passo) e nella Function (tutto il modulo).
import { acceptedTypes, allFields, isVisible, MAX_TOTAL_MB, normalizeOption } from './resolve.ts';
import type { FieldConfig, FieldError, FieldValue, FileInfo, FormData, ResolvedForm } from './types.ts';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE_RE = /^\+?[\d\s().-]{6,20}$/;
const DEFAULT_MAX_TEXT = 200;
const DEFAULT_MAX_LONG_TEXT = 3000;
const DEFAULT_MAX_FILES = 10;
const DEFAULT_MAX_MB = 10;

export type FilesByField = Record<string, FileInfo[]>;

export interface ValidationResult {
  ok: boolean;
  errors: Record<string, FieldError>;
  /** Solo i campi visibili e validi, già normalizzati */
  clean: FormData;
}

function toText(raw: unknown): string {
  if (typeof raw === 'string') return raw.trim();
  if (typeof raw === 'number' && Number.isFinite(raw)) return String(raw);
  return '';
}

function toList(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw.filter((item): item is string => typeof item === 'string' && item !== '');
  if (typeof raw === 'string' && raw !== '') return [raw];
  return [];
}

export function fileLimits(field: FieldConfig) {
  return { maxFile: field.maxFile ?? DEFAULT_MAX_FILES, maxMB: field.maxMB ?? DEFAULT_MAX_MB };
}

export function isAcceptedType(field: FieldConfig, type: string): boolean {
  const types = acceptedTypes(field);
  return types.includes(type.toLowerCase());
}

/**
 * Valida un singolo campo. Restituisce il valore normalizzato oppure un errore.
 * Un valore `undefined` senza errore significa "campo vuoto e facoltativo".
 */
export function validateField(
  field: FieldConfig,
  raw: unknown,
  files: FileInfo[] = [],
): { value?: FieldValue; error?: FieldError } {
  const required = field.obbligatorio === true;
  const options = (field.opzioni ?? []).map((option) => normalizeOption(option).valore);

  switch (field.tipo) {
    case 'testo':
    case 'testoLungo':
    case 'email':
    case 'telefono': {
      const text = toText(raw);
      if (!text) return required ? { error: { code: 'required' } } : {};
      const max = field.maxLunghezza ?? (field.tipo === 'testoLungo' ? DEFAULT_MAX_LONG_TEXT : DEFAULT_MAX_TEXT);
      if (text.length > max) return { error: { code: 'tooLong', params: { max } } };
      if (field.tipo === 'email' && !EMAIL_RE.test(text)) return { error: { code: 'email' } };
      if (field.tipo === 'telefono' && !PHONE_RE.test(text)) return { error: { code: 'phone' } };
      return { value: text };
    }
    case 'numero': {
      const text = toText(raw).replace(',', '.');
      if (!text) return required ? { error: { code: 'required' } } : {};
      const number = Number(text);
      if (!Number.isFinite(number)) return { error: { code: 'number' } };
      if (field.min !== undefined && number < field.min) return { error: { code: 'min', params: { min: field.min } } };
      if (field.max !== undefined && number > field.max) return { error: { code: 'max', params: { max: field.max } } };
      return { value: number };
    }
    case 'scelta': {
      const text = toText(raw);
      if (!text) return required ? { error: { code: 'required' } } : {};
      if (!options.includes(text)) return { error: { code: 'option' } };
      return { value: text };
    }
    case 'sceltaImmagini':
    case 'sceltaMultipla': {
      const list = toList(raw);
      if (list.length === 0) return required ? { error: { code: 'required' } } : {};
      if (list.some((item) => !options.includes(item))) return { error: { code: 'option' } };
      if (field.tipo === 'sceltaImmagini' && !field.multipla) {
        if (list.length > 1) return { error: { code: 'option' } };
        return { value: list[0] as string };
      }
      return { value: [...new Set(list)] };
    }
    case 'consenso': {
      const accepted = raw === true || raw === 'true' || raw === 'on';
      if (!accepted) return required ? { error: { code: 'consent' } } : { value: false };
      return { value: true };
    }
    case 'file': {
      if (files.length === 0) return required ? { error: { code: 'required' } } : {};
      const { maxFile, maxMB } = fileLimits(field);
      if (files.length > maxFile) return { error: { code: 'maxFiles', params: { max: maxFile } } };
      for (const file of files) {
        if (!isAcceptedType(field, file.type)) return { error: { code: 'fileType', params: { name: file.name } } };
        if (file.size > maxMB * 1024 * 1024) return { error: { code: 'fileSize', params: { name: file.name, max: maxMB } } };
      }
      return { value: files.map((file) => file.name) };
    }
  }
}

/** Valida un insieme di campi tenendo conto dei campi condizionali (mostraSe). */
export function validateFields(fields: FieldConfig[], data: Record<string, unknown>, files: FilesByField = {}): ValidationResult {
  const errors: Record<string, FieldError> = {};
  const clean: FormData = {};
  // Le condizioni si valutano sui dati grezzi: i campi da cui dipendono possono stare in altri passi
  const context = data as FormData;
  for (const field of fields) {
    if (!isVisible(field, context)) continue;
    const result = validateField(field, data[field.nome], files[field.nome] ?? []);
    if (result.error) errors[field.nome] = result.error;
    else if (result.value !== undefined) clean[field.nome] = result.value;
  }
  return { ok: Object.keys(errors).length === 0, errors, clean };
}

/** Validazione completa lato server: campi, condizioni e limite complessivo dei file. */
export function validateForm(form: ResolvedForm, data: Record<string, unknown>, files: FilesByField = {}): ValidationResult {
  const fields = allFields(form);
  const result = validateFields(fields, data, files);
  // I campi condizionali si rivalutano sui dati puliti, così un valore non valido non apre campi nascosti
  for (const field of fields) {
    if (field.mostraSe && !isVisible(field, result.clean)) {
      delete result.clean[field.nome];
      delete result.errors[field.nome];
    }
  }
  const totalBytes = Object.values(files)
    .flat()
    .reduce((sum, file) => sum + file.size, 0);
  if (totalBytes > MAX_TOTAL_MB * 1024 * 1024) {
    const firstFileField = fields.find((field) => field.tipo === 'file');
    result.errors[firstFileField?.nome ?? '_file'] = { code: 'totalSize', params: { max: MAX_TOTAL_MB } };
  }
  result.ok = Object.keys(result.errors).length === 0;
  return result;
}
