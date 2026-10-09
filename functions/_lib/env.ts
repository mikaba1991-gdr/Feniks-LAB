/** Variabili d'ambiente e binding configurati su Cloudflare Pages. */
export interface Env {
  RICHIESTE: R2Bucket;
  RESEND_API_KEY?: string;
  TURNSTILE_SECRET?: string;
  FILE_LINK_SECRET?: string;
  MAIL_TO?: string;
  MAIL_FROM?: string;
  /** "1" in sviluppo: le email vengono stampate nel log invece di essere inviate */
  MAIL_DRY_RUN?: string;
}

/** Controlla che la configurazione minima ci sia; restituisce l'elenco di ciò che manca. */
export function missingConfig(env: Env): string[] {
  const missing: string[] = [];
  if (!env.RICHIESTE) missing.push('R2 RICHIESTE');
  if (!env.TURNSTILE_SECRET) missing.push('TURNSTILE_SECRET');
  if (!env.FILE_LINK_SECRET) missing.push('FILE_LINK_SECRET');
  if (!env.MAIL_TO) missing.push('MAIL_TO');
  if (!env.MAIL_FROM) missing.push('MAIL_FROM');
  if (!env.RESEND_API_KEY && env.MAIL_DRY_RUN !== '1') missing.push('RESEND_API_KEY');
  return missing;
}
