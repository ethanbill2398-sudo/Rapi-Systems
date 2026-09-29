# RapiSYSTEMS website

Marketing site for **RapiSYSTEMS** (RapiTower and RapiTruss), the galvanized, bolt-together support towers, catwalks and stairs developed by **Griffin Ag Services Ltd.**, Tisdale, Saskatchewan.

- **Stack:** Astro 7 (static pages, one serverless function) + Tailwind CSS 4 + TypeScript
- **CMS:** Decap CMS at `/admin`, editing Astro content collections in this repo
- **Hosting:** Vercel. Quote form email via Resend, spam protection via reCAPTCHA v3, file uploads via Vercel Blob (private)

---

## 1. Run locally

Requires Node 22+.

```bash
npm install
cp .env.example .env      # fill in what you have; the site runs without keys
npm run dev               # http://localhost:4321
```

Edit content locally without GitHub:

```bash
npm run cms               # starts the Decap local proxy (in a second terminal)
# then open http://localhost:4321/admin/
```

Build: `npm run build` (output in `.vercel/output`). Type check: `npm run check`.

## 2. Environment variables

Set these in **Vercel → Project → Settings → Environment Variables**. Names only live in `.env.example`; no secret is ever sent to the browser except the two `PUBLIC_` keys, which are designed to be public.

| Variable | Used for |
| --- | --- |
| `SITE_URL` | Canonical origin, e.g. `https://rapisystems.ca`. Drives canonical tags, sitemap, Open Graph URLs. **Required in production.** |
| `PUBLIC_RECAPTCHA_SITE_KEY` | reCAPTCHA v3 site key (browser) |
| `RECAPTCHA_SECRET_KEY` | reCAPTCHA v3 secret (server only) |
| `RESEND_API_KEY` | Resend API key (server only) |
| `QUOTE_TO_EMAIL` | Where quote requests go: `griffinagservices@yahoo.com` (comma-separate for several) |
| `QUOTE_FROM_EMAIL` | Sender on a Resend-verified domain, e.g. `RapiSYSTEMS <quotes@rapisystems.ca>` |
| `BLOB_READ_WRITE_TOKEN` | Added automatically when you create a Blob store in Vercel (Storage → Blob) |
| `PUBLIC_GA_MEASUREMENT_ID` | GA4 ID `G-XXXXXXX`. Analytics loads only after cookie consent. |
| `GITHUB_OAUTH_CLIENT_ID` / `GITHUB_OAUTH_CLIENT_SECRET` | GitHub OAuth app for CMS login (see section 4) |

**reCAPTCHA:** create a v3 key at https://www.google.com/recaptcha/admin, add the production domain (and `localhost` for testing).
**Resend:** verify the sending domain (DNS records) before `QUOTE_FROM_EMAIL` will work. Yahoo mail rejects unverified senders.

## 3. Deploy to Vercel

1. Push this folder to a GitHub repo.
2. In Vercel, **Add New → Project**, import the repo. Framework preset: Astro (auto-detected).
3. **Storage → Create → Blob**, connect it to the project (adds `BLOB_READ_WRITE_TOKEN`).
4. Add the environment variables above, then deploy.
5. **Domains:** add `rapisystems.ca` (or the chosen domain) *and* `www.rapisystems.ca`, and set the `www` one to **Redirect to** the apex (or the reverse; pick one). Vercel serves HTTPS automatically; `vercel.json` adds HSTS.
6. Set `SITE_URL` to the canonical domain and redeploy.

`vercel.json` sets security headers (CSP, HSTS, X-Frame-Options, Referrer-Policy, Permissions-Policy), long caching for hashed assets, and redirects for old paths.

## 4. Editing content (Decap CMS)

Everything on the site is editable at **`https://<domain>/admin`**: page copy, images and alt text, SEO titles and descriptions, products, projects, videos, FAQ, specs, downloads, phone, email and the announcement bar.

**One-time setup**

1. In `public/admin/config.yml`, replace `https://SITE_DOMAIN` (twice) with the live domain. The repo is already set to `ethanbill2398-sudo/Rapi-Systems`.
2. Create a GitHub OAuth App (GitHub → Settings → Developer settings → OAuth Apps):
   - Homepage URL: `https://<domain>`
   - Authorization callback URL: `https://<domain>/api/callback`
3. Put its Client ID and a generated Client Secret in `GITHUB_OAUTH_CLIENT_ID` / `GITHUB_OAUTH_CLIENT_SECRET`.
4. Give each editor write access to the repo. They log in at `/admin` with GitHub.

**How it works:** saving in the CMS commits to the repo, and Vercel rebuilds and publishes in about a minute.

**Rules the CMS enforces**
- Every image needs alt text (8+ characters).
- Meta titles ≤ 60 characters, descriptions ≤ 155.
- Text written as `[SPEC: ...]` or `[PROJECT: ...]` shows as a yellow placeholder on the site. Replace it with the confirmed value.

**Common edits**
- *Announcement bar:* Site settings → Business info → Announcement bar.
- *Recommended installer:* Site settings → Business info → Recommended installer (name, website, wording). This drives the installer callouts, footer line and contact-page link. The "Griffin Ag Services" nav link is set in `src/lib/site.ts`.
- *Add a project:* Projects → New. The 3 with the lowest "Order" appear on the home page. Tick "Hide (draft)" to keep one offline.
- *Add a spec sheet PDF:* Pages → RapiTower & RapiTruss → Specifications → Downloads → add item, upload the PDF.
- *Swap a video:* paste the Vimeo number, and for unlisted videos the `h=` hash from Vimeo's embed code.

## 5. Placeholders that still need client input

| Where | What's needed |
| --- | --- |
| Product page → Specifications | Max tower width (brochure scan reads "1f feet", illegible), catwalk walkway widths, load ratings, certifications / engineering stamp, engineering spec sheet PDF |
| Home stats + FAQ + specs | **Confirm** figures taken from the RapiSYSTEMS brochure: towers 6 ft × 20 ft up to 160 ft tall in 5 ft increments; RapiTruss up to 400 ft in 5 ft increments; spans for bins up to 90 ft diameter |
| All 4 projects | Location (town, province), confirmed scope, and a real write-up. Project names/groupings were inferred from the photos. |
| Projects | Photos from the RapiSYSTEMS Facebook page (Facebook blocks automated access, so none were pulled) |
| Brand | Vector logo (SVG). The site uses a trimmed PNG; the favicon SVG currently embeds a raster of the "R" mark. |
| Domain | Final domain for `SITE_URL`, `config.yml`, and the GitHub OAuth app |
| Legal | Privacy Policy and Terms are **template text for legal review**; set the "Last updated" date on publication |
| Analytics / forms | GA4 ID, reCAPTCHA keys, Resend domain + key |

## 6. Redirects from the old site (SEO)

The current RapiSYSTEMS page lives at `griffinagservices.com/rapisystems`. Set a **301** on the old site/host to the new domain so rankings carry over:

| Old URL | New URL |
| --- | --- |
| `griffinagservices.com/rapisystems` | `https://<new-domain>/rapitower-rapitruss` |

If `griffinagservices.com` is rebuilt, add that redirect in its hosting config. If it stays on GoDaddy Website Builder, use its URL redirect setting, or point the old path to the new domain via a forwarding rule. `vercel.json` also redirects `/rapisystems`, `/about-us`, `/contact-us`, `/services`, `/quote` on this site in case old links are reused on the new domain. After launch, submit the new sitemap (`/sitemap-index.xml`) in Google Search Console and use the Change of Address / URL inspection tools.

## 7. What's where

```
src/content/            All editable content (Decap writes here)
  settings/site.json    Phone, email, office, announcement bar, Facebook
  pages/*.yml|md        Per-page copy + SEO
  products/*.md         The four structure types
  projects/*.md         Project case studies
src/assets/images/      Photos (WebP originals; Astro serves AVIF + WebP at build)
src/pages/              Routes; api/ holds the quote, upload and CMS-login endpoints
src/scripts/            site.ts (nav, reveal, counters, video, consent/GA), quote-form.ts
public/admin/           Decap CMS
public/downloads/       Flyer and brochure JPGs (spec sheet PDFs go here too)
```

**Analytics events** (GA4, only after consent): `generate_lead` (quote submitted), `cta_click` (with `cta_location`), `phone_click`, `email_click`, `video_play`.

**Form flow:** browser validates → reCAPTCHA v3 token → optional file goes straight to private Vercel Blob (Vercel functions cap request bodies at 4.5 MB, so 10 MB files can't pass through the function) → `/api/quote` checks origin, rate limit, honeypot, schema and reCAPTCHA → Resend emails the team with the file attached (the subject line says "+ Griffin Ag install" when the customer picks Griffin Ag installation) and deletes the blob → customer gets a short confirmation.

## 8. Image credits

- Photos, brochure and flyer: Griffin Ag Services Ltd. (from griffinagservices.com and supplied files).
- Canada map: derived from "Canada provinces-blank-map" on Wikimedia Commons, **CC BY-SA 3.0**. Keep the credit line on the home page. The derived SVG (`src/assets/svg/canada-map.svg`) is shared under the same licence.
- Icons: Phosphor Icons (MIT).
- Fonts: Barlow Condensed and Inter (SIL Open Font License), self-hosted.
