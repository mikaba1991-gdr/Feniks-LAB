// Scheda cliente: i dati della richiesta ordinati come nel modulo, con etichette leggibili.
import { fieldLabel, normalizeOption } from './resolve.ts';
import type { FieldConfig, FieldValue, FormData, ResolvedForm } from './types.ts';

export interface SchedaRiga {
  nome: string;
  etichetta: string;
  valore: string;
  tipo: FieldConfig['tipo'];
}

export interface SchedaSezione {
  titolo: string;
  righe: SchedaRiga[];
}

function optionLabel(field: FieldConfig, value: string): string {
  const option = (field.opzioni ?? []).map(normalizeOption).find((item) => item.valore === value);
  return option?.etichetta ?? value;
}

export function formatValue(field: FieldConfig, value: FieldValue): string {
  if (typeof value === 'boolean') return value ? 'Sì' : 'No';
  if (typeof value === 'number') return value.toLocaleString('it-IT');
  if (Array.isArray(value)) {
    return field.tipo === 'file' ? value.join(', ') : value.map((item) => optionLabel(field, item)).join(', ');
  }
  return field.tipo === 'scelta' || field.tipo === 'sceltaImmagini' ? optionLabel(field, value) : value;
}

/** Sezioni della scheda (un passo = una sezione). I file sono esclusi: hanno una sezione a parte. */
export function buildScheda(form: ResolvedForm, data: FormData): SchedaSezione[] {
  return form.passi
    .map((passo) => ({
      titolo: passo.titolo,
      righe: passo.campi
        .filter((field) => field.tipo !== 'file' && data[field.nome] !== undefined)
        .map((field) => ({
          nome: field.nome,
          etichetta: fieldLabel(field),
          valore: formatValue(field, data[field.nome] as FieldValue),
          tipo: field.tipo,
        })),
    }))
    .filter((sezione) => sezione.righe.length > 0);
}

/** Oggetto dell'email a Giada, es. "Richiesta pratica Conto Termico · Installatore · Bologna · Mario Rossi". */
export function buildSubject(form: ResolvedForm, data: FormData): string {
  const parts = (form.campiOggetto ?? [])
    .map((name) => data[name])
    .filter((value): value is string | number => typeof value === 'string' || typeof value === 'number')
    .map(String);
  const nome = typeof data.nome === 'string' ? data.nome : '';
  return [form.titolo, ...parts, nome].filter(Boolean).join(' · ').slice(0, 200);
}
