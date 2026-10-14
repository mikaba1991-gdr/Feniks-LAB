// GET /api/auth – avvia il login GitHub del pannello Decap (/admin).
import type { Env } from '../_lib/env.ts';
import { allowedScope, randomState, stateCookie } from '../_lib/oauth.ts';

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  if (!env.GITHUB_OAUTH_CLIENT_ID) {
    return new Response('Login del pannello non configurato (GITHUB_OAUTH_CLIENT_ID).', { status: 503 });
  }
  const url = new URL(request.url);
  const state = randomState();
  const authorize = new URL('https://github.com/login/oauth/authorize');
  authorize.searchParams.set('client_id', env.GITHUB_OAUTH_CLIENT_ID);
  authorize.searchParams.set('redirect_uri', `${url.origin}/api/callback`);
  authorize.searchParams.set('scope', allowedScope(url.searchParams.get('scope')));
  authorize.searchParams.set('state', state);
  return new Response(null, {
    status: 302,
    headers: {
      location: authorize.toString(),
      'set-cookie': stateCookie(state, 600),
      'cache-control': 'no-store',
    },
  });
};
