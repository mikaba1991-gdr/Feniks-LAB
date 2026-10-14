// Utilità sui nomi dei file, condivise tra browser e Function.

/** Nome file sicuro e leggibile: minuscole, senza accenti né spazi, max ~60 caratteri. */
export function safeFileName(fullName: string): string {
  // Solo il nome, senza eventuali percorsi
  const name = fullName.split(/[\\/]/).pop() ?? '';
  const dot = name.lastIndexOf('.');
  const ext = dot > 0 ? name.slice(dot + 1).toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 5) : '';
  const base = (dot > 0 ? name.slice(0, dot) : name)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
  return `${base || 'file'}${ext ? `.${ext}` : ''}`;
}

/** Rende il nome unico rispetto a quelli già usati aggiungendo -2, -3… */
export function uniqueFileName(name: string, used: Set<string>): string {
  const safe = safeFileName(name);
  if (!used.has(safe)) return safe;
  const dot = safe.lastIndexOf('.');
  const base = dot > 0 ? safe.slice(0, dot) : safe;
  const ext = dot > 0 ? safe.slice(dot) : '';
  let counter = 2;
  while (used.has(`${base}-${counter}${ext}`)) counter += 1;
  return `${base}-${counter}${ext}`;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1).replace('.', ',')} MB`;
}
