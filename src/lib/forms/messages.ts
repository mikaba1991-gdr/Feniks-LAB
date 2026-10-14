import type { ErrorCode, FieldError } from './types.ts';

const KEYS: Record<ErrorCode, string> = {
  required: 'wizard.err.required',
  email: 'wizard.err.email',
  phone: 'wizard.err.phone',
  number: 'wizard.err.number',
  min: 'wizard.err.min',
  max: 'wizard.err.max',
  tooLong: 'wizard.err.tooLong',
  option: 'wizard.err.option',
  maxFiles: 'wizard.err.maxFiles',
  fileSize: 'wizard.err.fileSize',
  fileType: 'wizard.err.fileType',
  fileMissing: 'wizard.err.fileMissing',
  totalSize: 'wizard.err.totalSize',
  consent: 'wizard.err.consent',
};

/** Traduce un errore di validazione usando il dizionario di interfaccia passato. */
export function errorMessage(error: FieldError, dict: Record<string, string>): string {
  const template = dict[KEYS[error.code]] ?? error.code;
  return template.replace(/\{(\w+)\}/g, (match, name: string) =>
    error.params && name in error.params ? String(error.params[name]) : match,
  );
}
