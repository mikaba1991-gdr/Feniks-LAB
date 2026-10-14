import { contatti, isTodo, site } from '../config/site';

export interface Crumb {
  name: string;
  href: string;
}

/** Dati strutturati dello studio (ProfessionalService). */
export function studioJsonLd(siteUrl: URL) {
  const data: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'ProfessionalService',
    '@id': new URL('/#studio', siteUrl).href,
    name: site.name,
    description: site.description,
    url: siteUrl.href,
    areaServed: { '@type': 'Country', name: 'Italia' },
    founder: { '@type': 'Person', name: 'Giada Molari', jobTitle: 'Ingegnere' },
    knowsAbout: ['Conto Termico', 'Detrazioni fiscali', 'Progettazione impianti termici', 'Legge 10', 'Interior design', 'Garden design'],
  };
  if (!isTodo(contatti.telefono)) data.telephone = contatti.telefono;
  if (!isTodo(contatti.email)) data.email = contatti.email;
  if (!isTodo(contatti.instagram)) data.sameAs = [contatti.instagram];
  return data;
}

export function serviceJsonLd(opts: { name: string; description: string; url: URL; siteUrl: URL }) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: opts.name,
    description: opts.description,
    url: opts.url.href,
    areaServed: { '@type': 'Country', name: 'Italia' },
    provider: { '@id': new URL('/#studio', opts.siteUrl).href },
  };
}

export function faqJsonLd(faq: { domanda: string; risposta: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faq.map((item) => ({
      '@type': 'Question',
      name: item.domanda,
      acceptedAnswer: { '@type': 'Answer', text: item.risposta },
    })),
  };
}

export function articleJsonLd(opts: {
  title: string;
  description: string;
  url: URL;
  date: Date;
  image?: string;
  siteUrl: URL;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: opts.title,
    description: opts.description,
    datePublished: opts.date.toISOString(),
    mainEntityOfPage: opts.url.href,
    image: opts.image ? [opts.image] : undefined,
    author: { '@type': 'Person', name: 'Giada Molari' },
    publisher: { '@id': new URL('/#studio', opts.siteUrl).href },
  };
}

export function breadcrumbJsonLd(crumbs: Crumb[], siteUrl: URL) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: crumbs.map((crumb, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: crumb.name,
      item: new URL(crumb.href, siteUrl).href,
    })),
  };
}

/** Serializza il JSON-LD evitando la chiusura prematura del tag <script>. */
export function serializeJsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, '\\u003c');
}
