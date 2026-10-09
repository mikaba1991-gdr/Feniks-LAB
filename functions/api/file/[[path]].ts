// GET /api/file/{id}/{nome}?s={scadenza}&t={firma} – scarica un file di una richiesta con link firmato.
import type { Env } from '../../_lib/env';
import { verifyFileLink } from '../../_lib/signing';

const ID_RE = /^\d{8}-[a-z0-9]{4}$/;
const NAME_RE = /^[a-z0-9][a-z0-9.-]{0,80}$/;

function text(message: string, status: number): Response {
  return new Response(message, {
    status,
    headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store', 'x-robots-tag': 'noindex' },
  });
}

export const onRequestGet: PagesFunction<Env, 'path'> = async ({ request, env, params }) => {
  if (!env.FILE_LINK_SECRET || !env.RICHIESTE) return text('Servizio non configurato.', 503);

  const segments = Array.isArray(params.path) ? params.path : [params.path];
  const [id, name] = segments.map((segment) => decodeURIComponent(segment ?? ''));
  if (segments.length !== 2 || !id || !name || !ID_RE.test(id) || !NAME_RE.test(name)) return text('File non trovato.', 404);

  const url = new URL(request.url);
  const check = await verifyFileLink(env.FILE_LINK_SECRET, id, name, url.searchParams.get('s'), url.searchParams.get('t'));
  if (check === 'invalid') return text('Link non valido.', 403);
  if (check === 'expired') return text('Link scaduto: i file restano disponibili per 90 giorni dalla richiesta.', 410);

  const object = await env.RICHIESTE.get(`richieste/${id.slice(0, 4)}/${id}/${name}`);
  if (!object) return text('File non trovato (potrebbe essere stato cancellato dopo il periodo di conservazione).', 404);

  const contentType = object.httpMetadata?.contentType ?? 'application/octet-stream';
  // Le immagini si aprono nel browser; i PDF si scaricano (il visore PDF non funziona con CSP sandbox)
  const disposition = contentType.startsWith('image/') ? 'inline' : 'attachment';
  return new Response(object.body, {
    headers: {
      'content-type': contentType,
      'content-length': String(object.size),
      'content-disposition': `${disposition}; filename="${name}"`,
      'cache-control': 'private, no-store',
      'x-content-type-options': 'nosniff',
      'content-security-policy': "default-src 'none'; img-src 'self'; style-src 'unsafe-inline'; sandbox",
      'referrer-policy': 'no-referrer',
      'x-robots-tag': 'noindex',
    },
  });
};
