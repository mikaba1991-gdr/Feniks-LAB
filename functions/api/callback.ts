// GET /api/callback – ritorno da GitHub: scambia il codice con il token e lo passa al pannello.
import type { Env } from '../_lib/env.ts';
import { callbackPage, randomState, readCookie, STATE_COOKIE, stateCookie } from '../_lib/oauth.ts';

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const url = new URL(request.url);
  const nonce = randomState();
  const respond = (result: { token: string } | { error: string }, status = 200) =>
    new Response(callbackPage(url.origin, result, nonce), {
      status,
      headers: {
        'content-type': 'text/html; charset=utf-8',
        'cache-control': 'no-store',
        'content-security-policy': `default-src 'none'; script-src 'nonce-${nonce}'; style-src 'unsafe-inline'`,
        'referrer-policy': 'no-referrer',
        'x-robots-tag': 'noindex',
        // Lo "state" vale una volta sola
        'set-cookie': stateCookie('', 0),
      },
    });

  if (!env.GITHUB_OAUTH_CLIENT_ID || !env.GITHUB_OAUTH_CLIENT_SECRET) {
    return respond({ error: 'login del pannello non configurato' }, 503);
  }
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const expected = readCookie(request.headers.get('cookie'), STATE_COOKIE);
  if (!code || !state || !expected || state !== expected) {
    return respond({ error: 'richiesta non valida o scaduta, riprova' }, 400);
  }

  try {
    const response = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: { accept: 'application/json', 'content-type': 'application/json', 'user-agent': 'feniks-lab-pannello' },
      body: JSON.stringify({
        client_id: env.GITHUB_OAUTH_CLIENT_ID,
        client_secret: env.GITHUB_OAUTH_CLIENT_SECRET,
        code,
        redirect_uri: `${url.origin}/api/callback`,
      }),
    });
    const data = (await response.json()) as { access_token?: string; error_description?: string };
    if (!data.access_token) return respond({ error: data.error_description ?? 'GitHub non ha concesso l’accesso' }, 401);
    return respond({ token: data.access_token });
  } catch {
    return respond({ error: 'GitHub non raggiungibile, riprova tra poco' }, 502);
  }
};
