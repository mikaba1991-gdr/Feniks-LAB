import it from './it.json';
import en from './en.json';

export const locales = ['it', 'en'] as const;
export type Locale = (typeof locales)[number];
export type UiKey = keyof typeof it;

const dictionaries: Record<Locale, Record<UiKey, string>> = { it, en };

/** Stringa di interfaccia con eventuali segnaposto {nome}. */
export function t(locale: Locale, key: UiKey, params: Record<string, string | number> = {}): string {
  const template = dictionaries[locale][key] ?? dictionaries.it[key];
  return template.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in params ? String(params[name]) : match,
  );
}

/** Tutte le stringhe con un certo prefisso (es. "wizard."), per passarle agli script client. */
export function pick(locale: Locale, prefix: string): Record<string, string> {
  const dict = dictionaries[locale];
  return Object.fromEntries(Object.entries(dict).filter(([key]) => key.startsWith(prefix)));
}

export function localeFromUrl(url: URL): Locale {
  return url.pathname.startsWith('/en/') || url.pathname === '/en' ? 'en' : 'it';
}
