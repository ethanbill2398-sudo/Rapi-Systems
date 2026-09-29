// @ts-check
import { defineConfig } from 'astro/config';
import vercel from '@astrojs/vercel';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';

// Canonical production origin. Set SITE_URL in Vercel (e.g. https://rapisystems.ca).
// Until then, fall back to the project's Vercel production domain, which Vercel sets automatically.
const site =
  process.env.SITE_URL ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL && `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`) ||
  'http://localhost:4321';

export default defineConfig({
  site,
  trailingSlash: 'never',
  build: { inlineStylesheets: 'always' },
  adapter: vercel({ imageService: false }),
  integrations: [sitemap({ filter: (page) => !page.includes('/admin') && !page.includes('/404') })],
  image: { responsiveStyles: true },
  vite: {
    plugins: [tailwindcss()],
    build: { assetsInlineLimit: 0 },
  },
});
