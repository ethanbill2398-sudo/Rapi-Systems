import { getEntry } from 'astro:content';

export async function getSettings() {
  const entry = await getEntry('settings', 'site');
  if (!entry) throw new Error('Missing src/content/settings/site.json');
  return entry.data;
}

export type Settings = Awaited<ReturnType<typeof getSettings>>;

// Keep in sync with settings.installer.url (Griffin Ag, the recommended installer)
export const GRIFFIN_URL = 'https://griffinagservices.com/';

export const nav = [
  { href: '/rapitower-rapitruss', label: 'RapiTower & RapiTruss' },
  { href: '/projects', label: 'Projects' },
  { href: '/about', label: 'About' },
  { href: '/contact', label: 'Contact' },
  { href: GRIFFIN_URL, label: 'Griffin Ag Services' },
];

export const isExternal = (href: string) => /^https?:\/\//.test(href);
export const linkAttrs = (href: string) => (isExternal(href) ? { target: '_blank', rel: 'noopener' } : {});

export const vimeoEmbed = (id: string, hash?: string) =>
  `https://player.vimeo.com/video/${id}?${new URLSearchParams({
    ...(hash ? { h: hash } : {}),
    autoplay: '1',
    title: '0',
    byline: '0',
    portrait: '0',
    dnt: '1',
  })}`;

const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

/** Escapes text and highlights client placeholders like [SPEC: ...] or [PROJECT: ...]. */
export const flagPlaceholders = (s: string) =>
  escapeHtml(s).replace(/\[([A-Z]+): ([^\]]+)\]/g, '<mark class="placeholder-flag">[$1: $2]</mark>');
