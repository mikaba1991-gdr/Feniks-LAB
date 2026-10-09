// Verifica del token Cloudflare Turnstile lato server.
const VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

/** Chiave segreta di test ufficiale Cloudflare: fa sempre passare la verifica (solo sviluppo). */
const ALWAYS_PASS_TEST_SECRET = '1x0000000000000000000000000000000AA';

export async function verifyTurnstile(secret: string, token: string, ip: string | null): Promise<boolean> {
  if (!token || token.length > 2048) return false;
  // Stesso esito che darebbe Cloudflare, senza chiamata di rete (utile in locale/offline)
  if (secret === ALWAYS_PASS_TEST_SECRET) return true;
  const body = new FormData();
  body.append('secret', secret);
  body.append('response', token);
  if (ip) body.append('remoteip', ip);
  try {
    const response = await fetch(VERIFY_URL, { method: 'POST', body });
    const result = (await response.json()) as { success?: boolean };
    return result.success === true;
  } catch {
    return false;
  }
}
