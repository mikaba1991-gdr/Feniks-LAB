// Link firmati per scaricare i file delle richieste: HMAC-SHA256 su id, nome e scadenza.

export const LINK_VALIDITY_DAYS = 90;

const encoder = new TextEncoder();

function base64url(bytes: ArrayBuffer): string {
  let binary = '';
  for (const byte of new Uint8Array(bytes)) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function hmac(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return base64url(await crypto.subtle.sign('HMAC', key, encoder.encode(message)));
}

function payload(id: string, name: string, expires: number): string {
  return `${id}/${name}:${expires}`;
}

/** Confronto a tempo costante per non rivelare informazioni sulla firma. */
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let index = 0; index < a.length; index += 1) diff |= a.charCodeAt(index) ^ b.charCodeAt(index);
  return diff === 0;
}

export async function signedFileUrl(origin: string, secret: string, id: string, name: string, now = Date.now()): Promise<string> {
  const expires = Math.floor(now / 1000) + LINK_VALIDITY_DAYS * 24 * 3600;
  const token = await hmac(secret, payload(id, name, expires));
  return `${origin}/api/file/${id}/${encodeURIComponent(name)}?s=${expires}&t=${token}`;
}

export type LinkCheck = 'ok' | 'expired' | 'invalid';

export async function verifyFileLink(
  secret: string,
  id: string,
  name: string,
  expiresParam: string | null,
  token: string | null,
  now = Date.now(),
): Promise<LinkCheck> {
  const expires = Number(expiresParam);
  if (!token || !Number.isInteger(expires)) return 'invalid';
  const expected = await hmac(secret, payload(id, name, expires));
  if (!safeEqual(expected, token)) return 'invalid';
  if (expires < Math.floor(now / 1000)) return 'expired';
  return 'ok';
}
