import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { resolveForm, isVisible, MAX_TOTAL_MB } from '../src/lib/forms/resolve.ts';
import { validateFields, validateForm } from '../src/lib/forms/validate.ts';
import { buildScheda, buildSubject } from '../src/lib/forms/scheda.ts';
import { safeFileName, uniqueFileName } from '../src/lib/forms/files.ts';
import { errorMessage } from '../src/lib/forms/messages.ts';
import { formConfigSchema } from '../src/lib/forms/schema.ts';
import type { FieldConfig, FormConfig } from '../src/lib/forms/types.ts';

const config: FormConfig = {
  id: 'prova',
  titolo: 'Modulo di prova',
  ramo: 'energia',
  campiOggetto: ['profilo', 'comune'],
  passi: [
    {
      titolo: 'Chi sei',
      campi: [
        { nome: 'profilo', tipo: 'scelta', opzioni: ['Privato', 'Installatore'], obbligatorio: true },
        { nome: 'azienda', tipo: 'testo', obbligatorio: true, mostraSe: { campo: 'profilo', valore: 'Installatore' } },
      ],
    },
    {
      titolo: 'Immobile',
      campi: [
        { nome: 'comune', tipo: 'testo', obbligatorio: true },
        { nome: 'superficie_mq', tipo: 'numero', min: 10, max: 5000 },
        { nome: 'foto', tipo: 'file', accetta: ['image/*', 'application/pdf'], maxFile: 2, maxMB: 1 },
      ],
    },
    { titolo: 'Contatti', campi: '@contatti-standard' },
  ],
};

const form = resolveForm(config);
const valid = {
  profilo: 'Privato',
  comune: 'Bologna',
  superficie_mq: '120,5',
  nome: 'Mario Rossi',
  email: 'mario@example.com',
  telefono: '+39 333 1234567',
  privacy: true,
};

test('espande @contatti-standard', () => {
  const names = form.passi[2]?.campi.map((field) => field.nome);
  assert.deepEqual(names, ['nome', 'email', 'telefono', 'preferenza_contatto', 'note', 'privacy']);
});

test('accetta dati validi e li normalizza', () => {
  const result = validateForm(form, valid);
  assert.equal(result.ok, true, JSON.stringify(result.errors));
  assert.equal(result.clean.superficie_mq, 120.5);
  assert.equal(result.clean.privacy, true);
  assert.equal('azienda' in result.clean, false);
});

test('campi obbligatori, email, telefono e consenso', () => {
  const result = validateForm(form, { ...valid, comune: ' ', email: 'non-email', telefono: 'abc', privacy: false });
  assert.equal(result.ok, false);
  assert.equal(result.errors.comune?.code, 'required');
  assert.equal(result.errors.email?.code, 'email');
  assert.equal(result.errors.telefono?.code, 'phone');
  assert.equal(result.errors.privacy?.code, 'consent');
});

test('numero fuori intervallo', () => {
  const result = validateForm(form, { ...valid, superficie_mq: 5 });
  assert.deepEqual(result.errors.superficie_mq, { code: 'min', params: { min: 10 } });
});

test('scelta fuori dalle opzioni', () => {
  const result = validateForm(form, { ...valid, profilo: 'Hacker' });
  assert.equal(result.errors.profilo?.code, 'option');
});

test('campo condizionale: obbligatorio solo se visibile', () => {
  const installer = validateForm(form, { ...valid, profilo: 'Installatore' });
  assert.equal(installer.errors.azienda?.code, 'required');
  const privato = validateForm(form, { ...valid, profilo: 'Privato', azienda: 'Ignorata srl' });
  assert.equal(privato.ok, true);
  assert.equal('azienda' in privato.clean, false);
});

test('mostraSe su scelta multipla', () => {
  const field: FieldConfig = { nome: 'x', tipo: 'testo', mostraSe: { campo: 'stanze', valore: ['Cucina', 'Bagno'] } };
  assert.equal(isVisible(field, { stanze: ['Salotto', 'Bagno'] }), true);
  assert.equal(isVisible(field, { stanze: ['Salotto'] }), false);
  assert.equal(isVisible(field, {}), false);
});

test('file: numero, dimensione, tipo e SVG rifiutato', () => {
  const mb = 1024 * 1024;
  const ok = validateForm(form, valid, { foto: [{ name: 'a.jpg', type: 'image/jpeg', size: mb / 2 }] });
  assert.equal(ok.ok, true);
  assert.deepEqual(ok.clean.foto, ['a.jpg']);

  const many = validateForm(form, valid, {
    foto: [1, 2, 3].map((n) => ({ name: `${n}.jpg`, type: 'image/jpeg', size: 10 })),
  });
  assert.equal(many.errors.foto?.code, 'maxFiles');

  const big = validateForm(form, valid, { foto: [{ name: 'a.jpg', type: 'image/jpeg', size: 2 * mb }] });
  assert.equal(big.errors.foto?.code, 'fileSize');

  const svg = validateForm(form, valid, { foto: [{ name: 'a.svg', type: 'image/svg+xml', size: 10 }] });
  assert.equal(svg.errors.foto?.code, 'fileType');
});

test('limite complessivo dei file', () => {
  const huge: FieldConfig[] = [{ nome: 'doc', tipo: 'file', maxFile: 10, maxMB: 25 }];
  const bigForm = resolveForm({ id: 'x', titolo: 'x', ramo: 'generale', passi: [{ titolo: 'x', campi: huge }] });
  const file = { name: 'a.pdf', type: 'application/pdf', size: 20 * 1024 * 1024 };
  const result = validateForm(bigForm, {}, { doc: [file, { ...file, name: 'b.pdf' }, { ...file, name: 'c.pdf' }] });
  assert.equal(result.errors.doc?.code, 'totalSize');
  assert.equal(result.errors.doc?.params?.max, MAX_TOTAL_MB);
});

test('validazione per passo ignora gli altri passi', () => {
  const step = form.passi[0];
  assert.ok(step);
  assert.equal(validateFields(step.campi, { profilo: 'Privato' }).ok, true);
});

test('scheda cliente e oggetto email', () => {
  const { clean } = validateForm(form, valid);
  const scheda = buildScheda(form, clean);
  assert.deepEqual(
    scheda.map((sezione) => sezione.titolo),
    ['Chi sei', 'Immobile', 'Contatti'],
  );
  const immobile = scheda[1]?.righe.find((riga) => riga.nome === 'superficie_mq');
  assert.equal(immobile?.valore, '120,5');
  assert.equal(immobile?.etichetta, 'Superficie mq');
  assert.equal(buildSubject(form, clean), 'Modulo di prova · Privato · Bologna · Mario Rossi');
});

test('nomi file sicuri e unici', () => {
  assert.equal(safeFileName('Foto Caldaia (1).JPG'), 'foto-caldaia-1.jpg');
  assert.equal(safeFileName('../../etc/passwd'), 'passwd');
  assert.equal(safeFileName('C:\\foto\\caldaia.png'), 'caldaia.png');
  assert.equal(safeFileName('Perché è così.pdf'), 'perche-e-cosi.pdf');
  assert.equal(safeFileName('.jpg'), 'jpg');
  assert.equal(uniqueFileName('a.jpg', new Set(['a.jpg', 'a-2.jpg'])), 'a-3.jpg');
});

test('messaggi di errore con parametri', () => {
  const dict = { 'wizard.err.min': 'Il valore minimo è {min}.' };
  assert.equal(errorMessage({ code: 'min', params: { min: 10 } }, dict), 'Il valore minimo è 10.');
});

test('tutte le configurazioni in src/config/forms sono valide', () => {
  const dir = new URL('../src/config/forms/', import.meta.url);
  const files = readdirSync(dir).filter((name) => name.endsWith('.json'));
  assert.ok(files.length >= 3);
  for (const file of files) {
    const data = JSON.parse(readFileSync(new URL(file, dir), 'utf8'));
    const result = formConfigSchema.safeParse(data);
    assert.equal(result.success, true, `${file}: ${JSON.stringify(result.error?.issues)}`);
    assert.equal(data.id, file.replace('.json', ''), `${file}: l'id deve coincidere con il nome del file`);
  }
});

test('lo schema segnala riferimenti mostraSe sbagliati', () => {
  const broken = {
    ...config,
    passi: [{ titolo: 'x', campi: [{ nome: 'a', tipo: 'testo', mostraSe: { campo: 'inesistente', valore: 'x' } }] }],
  };
  const result = formConfigSchema.safeParse(broken);
  assert.equal(result.success, false);
});
