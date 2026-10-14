// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// URL pubblico del sito: serve a sitemap, canonical e Open Graph.
// TODO(Giada): dominio definitivo. Finché non c'è, si usa l'indirizzo di Cloudflare Pages
// oppure la variabile d'ambiente SITE_URL impostata nella dashboard.
const SITE_URL = process.env.SITE_URL ?? 'https://feniks-lab.pages.dev';

export default defineConfig({
  site: SITE_URL,
  trailingSlash: 'never',
  build: {
    // URL senza slash finale: /energia/conto-termico.html servito come /energia/conto-termico
    format: 'file',
  },
  i18n: {
    defaultLocale: 'it',
    locales: ['it', 'en'],
    routing: {
      prefixDefaultLocale: false,
    },
  },
  integrations: [
    sitemap({
      i18n: {
        defaultLocale: 'it',
        locales: { it: 'it-IT', en: 'en-GB' },
      },
    }),
  ],
});
