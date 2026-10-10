import { test } from 'node:test';
import assert from 'node:assert/strict';
import { signedFileUrl, verifyFileLink } from '../functions/_lib/signing.ts';
import { sniffType, sameFamily } from '../functions/_lib/sniff.ts';
import { confermaEmail, escapeHtml, schedaEmail } from '../functions/_lib/email.ts';

const SECRET = 'segreto-di-test';

function parse(url: string) {
  const parsed = new URL(url);
  const [, , , id, name] = parsed.pathname.split('/');
  return { id: id as string, name: decodeURIComponent(name as string), s: parsed.searchParams.get('s'), t: parsed.searchParams.get('t') };
}

test('link firmato valido', async () => {
  const url = await signedFileUrl('https://example.com', SECRET, '20261009-ab12', 'foto.jpg');
  const { id, name, s, t } = parse(url);
  assert.equal(await verifyFileLink(SECRET, id, name, s, t), 'ok');
});

test('link manomesso o con altro segreto', async () => {
  const url = await signedFileUrl('https://example.com', SECRET, '20261009-ab12', 'foto.jpg');
  const { id, s, t } = parse(url);
  assert.equal(await verifyFileLink(SECRET, id, 'altro.jpg', s, t), 'invalid');
  assert.equal(await verifyFileLink('altro', id, 'foto.jpg', s, t), 'invalid');
  assert.equal(await verifyFileLink(SECRET, id, 'foto.jpg', String(Number(s) + 1), t), 'invalid');
  assert.equal(await verifyFileLink(SECRET, id, 'foto.jpg', s, null), 'invalid');
});

test('link scaduto dopo 90 giorni', async () => {
  const issued = Date.UTC(2026, 0, 1);
  const url = await signedFileUrl('https://example.com', SECRET, '20260101-ab12', 'foto.jpg', issued);
  const { id, name, s, t } = parse(url);
  const day = 24 * 3600 * 1000;
  assert.equal(await verifyFileLink(SECRET, id, name, s, t, issued + 89 * day), 'ok');
  assert.equal(await verifyFileLink(SECRET, id, name, s, t, issued + 91 * day), 'expired');
});

test('riconoscimento del tipo dai primi byte', () => {
  const bytes = (...values: number[]) => new Uint8Array([...values, ...new Array(16).fill(0)]);
  const text = (value: string) => new Uint8Array([...value].map((char) => char.charCodeAt(0)).concat(new Array(16).fill(0)));
  assert.equal(sniffType(bytes(0xff, 0xd8, 0xff, 0xe0)), 'image/jpeg');
  assert.equal(sniffType(bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a)), 'image/png');
  assert.equal(sniffType(text('RIFF\0\0\0\0WEBP')), 'image/webp');
  assert.equal(sniffType(text('%PDF-1.7')), 'application/pdf');
  assert.equal(sniffType(text('\0\0\0\x18ftypheic')), 'image/heic');
  assert.equal(sniffType(text('<svg xmlns=')), undefined);
  assert.equal(sameFamily('image/heif', 'image/heic'), true);
  assert.equal(sameFamily('image/png', 'image/jpeg'), false);
});

test("l'email della scheda è protetta da HTML malevolo", () => {
  const { html, text } = schedaEmail({
    id: '20261009-ab12',
    formTitle: 'Richiesta',
    receivedAt: new Date(Date.UTC(2026, 9, 9, 10)),
    sections: [{ titolo: 'Contatti', righe: [{ nome: 'nome', etichetta: 'Nome', valore: '<script>alert(1)</script>', tipo: 'testo' }] }],
    files: [{ name: 'foto.jpg', size: 2048, url: 'https://example.com/api/file/x?t="y"' }],
    isInstaller: true,
    contact: { nome: '<b>Mario</b>', telefono: '+39 333 1234567' },
    linkValidityDays: 90,
  });
  assert.ok(!html.includes('<script>'));
  assert.ok(html.includes('&lt;script&gt;'));
  assert.ok(html.includes('INSTALLATORE'));
  assert.ok(html.includes('tel:+393331234567'));
  assert.ok(text.includes('Nome: <script>alert(1)</script>'));
  assert.equal(escapeHtml(`"'&`), '&quot;&#39;&amp;');
});

test('conferma al cliente senza dati sensibili', () => {
  const email = confermaEmail({ id: '20261009-ab12', nome: 'Mario Rossi', formTitle: 'Richiesta pratica Conto Termico', locale: 'it' });
  assert.ok(email.subject.includes('20261009-ab12'));
  assert.ok(email.text.startsWith('Ciao Mario,'));
});

import { allowedScope, callbackPage, readCookie } from '../functions/_lib/oauth.ts';

test('login pannello: cookie, permessi e pagina di ritorno', () => {
  assert.equal(readCookie('a=1; decap_oauth_state=abc; b=2', 'decap_oauth_state'), 'abc');
  assert.equal(readCookie(null, 'x'), undefined);
  assert.equal(allowedScope('admin:org'), 'repo');
  assert.equal(allowedScope('public_repo'), 'public_repo');

  const ok = callbackPage('https://example.com', { token: 'tok</script><script>alert(1)' }, 'n0nce');
  assert.ok(ok.includes('authorization:github:success:'));
  assert.ok(!ok.includes('</script><script>alert(1)'), 'il token non deve poter chiudere lo script');
  assert.ok(ok.includes('nonce="n0nce"'));
  assert.ok(ok.includes('"https://example.com"'));

  const ko = callbackPage('https://example.com', { error: 'negato' }, 'n');
  assert.ok(ko.includes('authorization:github:error:'));
});
