export function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
    },
  });
}

/** Errore leggibile per l'utente, sempre in JSON. */
export function errorResponse(message: string, status: number, extra: Record<string, unknown> = {}): Response {
  return json({ ok: false, errore: message, ...extra }, status);
}
