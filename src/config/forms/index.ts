// Registro dei moduli usato dalla Function /api/richiesta.
// Ogni file JSON di questa cartella va aggiunto qui (la build lo verifica).
import type { FormConfig } from '../../lib/forms/types';
import contoTermico from './conto-termico.json';
import detrazioni from './detrazioni.json';
import ricontatto from './ricontatto.json';

export const formRegistry: Record<string, FormConfig> = {
  'conto-termico': contoTermico as FormConfig,
  detrazioni: detrazioni as FormConfig,
  ricontatto: ricontatto as FormConfig,
};
