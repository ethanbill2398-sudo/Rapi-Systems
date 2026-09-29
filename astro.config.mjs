// @ts-check
import { defineConfig } from 'astro/config';
import vercel from '@astrojs/vercel';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';

// Canonical production origin. Set SITE_URL in Vercel (e.g. https://rapisystems.ca).
const site = process.env.SITE_URL || 'http://localhost:4321';

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
