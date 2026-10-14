// Login del pannello Decap tramite GitHub OAuth, gestito dalle Functions del sito
// (nessun servizio esterno a parte GitHub).

export const STATE_COOKIE = 'decap_oauth_state';

/** Valore casuale per il parametro "state" (protezione CSRF). */
export function randomState(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(24));
  return [...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

/** Legge un cookie dall'intestazione Cookie. */
export function readCookie(header: string | null, name: string): string | undefined {
  if (!header) return undefined;
  for (const part of header.split(';')) {
    const [key, ...rest] = part.trim().split('=');
    if (key === name) return rest.join('=');
  }
  return undefined;
}

/** Solo "repo" (repository privato) o "public_repo": niente permessi più ampi. */
export function allowedScope(requested: string | null): 'repo' | 'public_repo' {
  return requested === 'public_repo' ? 'public_repo' : 'repo';
}

export function stateCookie(value: string, maxAge: number): string {
  return `${STATE_COOKIE}=${value}; Path=/api; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`;
}

/** Testo sicuro da inserire in uno <script> inline. */
function scriptValue(value: unknown): string {
  return JSON.stringify(value).replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
}

/**
 * Pagina mostrata nel popup al ritorno da GitHub: completa il "dialogo" previsto da Decap
 * (authorizing → authorization:github:success|error) parlando solo con l'origine del sito.
 */
export function callbackPage(origin: string, result: { token: string } | { error: string }, nonce: string): string {
  const message =
    'token' in result
      ? `authorization:github:success:${JSON.stringify({ token: result.token, provider: 'github' })}`
      : `authorization:github:error:${JSON.stringify({ message: result.error })}`;
  const text = 'token' in result ? 'Accesso riuscito, puoi chiudere questa finestra.' : `Accesso non riuscito: ${result.error}`;
  return `<!doctype html>
<html lang="it">
<head><meta charset="utf-8"><meta name="robots" content="noindex"><title>Accesso al pannello</title></head>
<body style="font-family: system-ui, sans-serif; padding: 2rem">
<p id="stato"></p>
<script nonce="${nonce}">
(function () {
  var origin = ${scriptValue(origin)};
  var message = ${scriptValue(message)};
  document.getElementById('stato').textContent = ${scriptValue(text)};
  if (!window.opener) return;
  function receive(event) {
    if (event.origin !== origin) return;
    window.removeEventListener('message', receive);
    window.opener.postMessage(message, origin);
  }
  window.addEventListener('message', receive);
  window.opener.postMessage('authorizing:github', origin);
})();
</script>
</body>
</html>`;
}
