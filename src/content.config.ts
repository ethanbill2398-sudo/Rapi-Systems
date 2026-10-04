import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';
import type { ImageFunction } from 'astro:content';

// Every image in the CMS carries required alt text.
const pic = (image: ImageFunction) =>
  z.object({
    src: image(),
    alt: z.string().min(8, 'Describe the image in at least a few words (alt text is required).'),
  });

const seo = (image: ImageFunction) =>
  z.object({
    title: z.string().max(60, 'Keep meta titles under 60 characters.'),
    description: z.string().max(155, 'Keep meta descriptions under 155 characters.'),
    ogImage: image().optional(),
  });

const video = (image: ImageFunction) =>
  z.object({
    title: z.string(),
    vimeoId: z.string().regex(/^\d+$/),
    hash: z.string().optional(),
    aspect: z.enum(['16/9', '9/16', '4/3', '1/1']).default('16/9'),
    poster: pic(image),
  });

const cta = z.object({ heading: z.string(), text: z.string() });

const page = <T extends z.ZodRawShape>(pattern: string, shape: (image: ImageFunction) => T) =>
  defineCollection({
    loader: glob({ pattern, base: './src/content/pages' }),
    schema: ({ image }) => z.object({ seo: seo(image), ...shape(image) }),
  });

const settings = defineCollection({
  loader: glob({ pattern: 'site.json', base: './src/content/settings' }),
  schema: ({ image }) =>
    z.object({
      brandName: z.string(),
      companyName: z.string(),
      phone: z.string(),
      phoneHref: z.string().regex(/^\+\d{11}$/),
      email: z.email(),
      office: z.string(),
      serviceArea: z.string(),
      shippingArea: z.string(),
      facebookUrl: z.url(),
      announcement: z.object({ enabled: z.boolean(), text: z.string(), link: z.string().optional() }),
      defaultOgImage: z.string(),
      footerTagline: z.string(),
      retailer: z.object({ heading: z.string(), text: z.string(), button: z.string() }),
      installer: z.object({
        name: z.string(),
        url: z.url(),
        heading: z.string(),
        text: z.string(),
        note: z.string(),
      }),
    }),
});

const icon = z.enum([
  'shield-check', 'wrench', 'arrows-out', 'gear-six', 'grains', 'truck-trailer',
  'blueprint', 'hard-hat', 'crane-tower', 'stairs', 'path', 'nut', 'package', 'clock',
]);

const home = page('home.yml', (image) => ({
  hero: z.object({ heading: z.string(), subheading: z.string(), image: pic(image) }),
  intro: z.object({ heading: z.string(), lead: z.string(), body: z.string(), image: pic(image) }),
  features: z.array(z.object({ title: z.string(), text: z.string(), icon })).min(1),
  stats: z.array(z.object({ value: z.number(), suffix: z.string().default(''), label: z.string() })),
  productsHeading: z.string(),
  video: video(image).extend({ heading: z.string(), text: z.string() }),
  projectsHeading: z.string(),
  fullService: z.object({
    heading: z.string(),
    text: z.string(),
    items: z.array(z.object({ title: z.string(), text: z.string(), icon })),
    image: pic(image),
  }),
  map: z.object({ heading: z.string(), text: z.string(), credit: z.string() }),
  cta,
}));

const about = page('about.yml', (image) => ({
  hero: z.object({ heading: z.string(), subheading: z.string(), image: pic(image) }),
  story: z.object({ heading: z.string(), body: z.string(), image: pic(image), logo: pic(image) }),
  vision: z.object({ heading: z.string(), text: z.string() }),
  approach: z.object({ heading: z.string(), text: z.string() }),
  expertise: z.object({ heading: z.string(), text: z.string(), image: pic(image) }),
  services: z.object({
    heading: z.string(),
    text: z.string(),
    items: z.array(z.object({ title: z.string(), text: z.string(), icon, image: pic(image) })),
  }),
  cta,
}));

const product = page('product.yml', (image) => ({
  hero: z.object({ heading: z.string(), subheading: z.string(), image: pic(image) }),
  system: z.object({
    heading: z.string(),
    body: z.string(),
    image: pic(image),
    points: z.array(z.object({ title: z.string(), text: z.string(), icon })),
  }),
  steps: z.object({
    heading: z.string(),
    items: z.array(z.object({ title: z.string(), text: z.string(), icon })).min(2),
  }),
  comparison: z.object({
    heading: z.string(),
    text: z.string(),
    rows: z.array(z.object({ label: z.string(), bolted: z.string(), welded: z.string() })),
  }),
  specs: z.object({
    heading: z.string(),
    note: z.string(),
    groups: z.array(
      z.object({ title: z.string(), rows: z.array(z.object({ label: z.string(), value: z.string() })) }),
    ),
    downloads: z.array(
      z.object({ label: z.string(), file: z.string(), format: z.string(), size: z.string().optional() }),
    ),
  }),
  faq: z.object({
    heading: z.string(),
    items: z.array(z.object({ question: z.string(), answer: z.string() })).min(1),
  }),
  cta,
}));

const projectsPage = page('projects.yml', () => ({
  heading: z.string(),
  intro: z.string(),
  cta,
}));

const contact = page('contact.yml', (image) => ({
  heading: z.string(),
  intro: z.string(),
  image: pic(image),
  successHeading: z.string(),
  successText: z.string(),
  timelines: z.array(z.string()).min(1),
}));

const legal = defineCollection({
  loader: glob({ pattern: '{privacy,terms}.md', base: './src/content/pages' }),
  schema: z.object({
    heading: z.string(),
    updated: z.string(),
    seo: z.object({ title: z.string().max(60), description: z.string().max(155) }),
  }),
});

const products = defineCollection({
  loader: glob({ pattern: '*.md', base: './src/content/products' }),
  schema: ({ image }) =>
    z.object({
      name: z.string(),
      order: z.number(),
      anchor: z.string().regex(/^[a-z0-9-]+$/),
      summary: z.string().max(200),
      image: pic(image),
      highlights: z.array(z.string()),
      schemaDescription: z.string(),
    }),
});

export const projectCategories = {
  towers: 'Towers',
  catwalks: 'Catwalks',
  stairs: 'Stairs',
  'full-systems': 'Full systems',
} as const;

const projects = defineCollection({
  loader: glob({ pattern: '*.md', base: './src/content/projects' }),
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      order: z.number(),
      draft: z.boolean().default(false),
      location: z.string().optional(),
      category: z.enum(['towers', 'catwalks', 'stairs', 'full-systems']),
      scope: z.string(),
      summary: z.string().max(200),
      cover: pic(image),
      card: pic(image).optional(),
      gallery: z.array(pic(image)).default([]),
      video: video(image).optional(),
      clip: z.object({ title: z.string(), file: z.string(), poster: z.string() }).optional(),
      seo: z.object({ title: z.string().max(60), description: z.string().max(155) }),
    }),
});

export const collections = { settings, home, about, product, projectsPage, contact, legal, products, projects };
