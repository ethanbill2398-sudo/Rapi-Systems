import type { Settings } from './site';

const abs = (site: URL, path: string) => new URL(path, site).href;

export function organization(s: Settings, site: URL) {
  return {
    '@type': 'Organization',
    '@id': abs(site, '/#organization'),
    name: s.companyName,
    brand: { '@type': 'Brand', name: s.brandName },
    url: site.origin,
    logo: abs(site, '/rapisystems-logo.png'),
    email: s.email,
    telephone: s.phoneHref,
    sameAs: [s.facebookUrl],
  };
}

export function localBusiness(s: Settings, site: URL) {
  return {
    '@type': 'LocalBusiness',
    '@id': abs(site, '/#business'),
    name: s.companyName,
    alternateName: s.brandName,
    url: site.origin,
    image: abs(site, s.defaultOgImage),
    telephone: s.phoneHref,
    email: s.email,
    address: {
      '@type': 'PostalAddress',
      addressLocality: 'Tisdale',
      addressRegion: 'SK',
      addressCountry: 'CA',
    },
    areaServed: { '@type': 'Country', name: 'Canada' },
    parentOrganization: { '@id': abs(site, '/#organization') },
  };
}

export function breadcrumbs(site: URL, items: { name: string; path: string }[]) {
  return {
    '@type': 'BreadcrumbList',
    itemListElement: [{ name: 'Home', path: '/' }, ...items].map((it, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: it.name,
      item: abs(site, it.path),
    })),
  };
}

export function product(site: URL, p: { name: string; description: string; image: string; anchor: string }) {
  return {
    '@type': 'Product',
    name: p.name,
    description: p.description,
    image: abs(site, p.image),
    url: abs(site, `/rapitower-rapitruss#${p.anchor}`),
    brand: { '@type': 'Brand', name: 'RapiSYSTEMS' },
    manufacturer: { '@id': abs(site, '/#organization') },
    material: 'Galvanized structural steel',
    countryOfOrigin: 'CA',
  };
}

export function faqPage(items: { question: string; answer: string }[]) {
  return {
    '@type': 'FAQPage',
    mainEntity: items.map((q) => ({
      '@type': 'Question',
      name: q.question,
      acceptedAnswer: { '@type': 'Answer', text: q.answer },
    })),
  };
}

export const graph = (...nodes: object[]) => ({ '@context': 'https://schema.org', '@graph': nodes });
