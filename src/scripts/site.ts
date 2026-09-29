// Sitewide behaviour. Kept small: no framework, no animation library.

type Gtag = (...args: unknown[]) => void;
declare global {
  interface Window { dataLayer: unknown[]; gtag?: Gtag }
}

const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------- Analytics (GA4 + Consent Mode v2, loads only after consent) ---------- */
const GA_ID = document.body.dataset.ga ?? '';
const CONSENT_KEY = 'rs-consent-v1';

function readConsent(): { analytics: boolean } | null {
  try {
    const raw = localStorage.getItem(CONSENT_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeConsent(analytics: boolean) {
  try {
    localStorage.setItem(CONSENT_KEY, JSON.stringify({ analytics, at: Date.now() }));
  } catch { /* storage blocked: banner will ask again next visit */ }
}

let gaLoaded = false;
function loadAnalytics() {
  if (!GA_ID || gaLoaded) return;
  gaLoaded = true;
  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag() { window.dataLayer.push(arguments); };
  window.gtag('consent', 'default', {
    ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied', analytics_storage: 'denied',
  });
  window.gtag('consent', 'update', { analytics_storage: 'granted' });
  window.gtag('js', new Date());
  window.gtag('config', GA_ID, { anonymize_ip: true });
  const s = document.createElement('script');
  s.async = true;
  s.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(GA_ID)}`;
  document.head.append(s);
}

export function track(event: string, params: Record<string, unknown> = {}) {
  if (gaLoaded && window.gtag) window.gtag('event', event, params);
}
(window as unknown as { rsTrack: typeof track }).rsTrack = track;

const banner = document.getElementById('consent');
if (banner) {
  const details = banner.querySelector<HTMLElement>('[data-consent-details]')!;
  const analyticsBox = banner.querySelector<HTMLInputElement>('input[name="analytics"]')!;
  const saveBtn = banner.querySelector<HTMLElement>('[data-consent="save"]')!;
  const customizeBtn = banner.querySelector<HTMLElement>('[data-consent="customize"]')!;

  const close = (analytics: boolean) => {
    writeConsent(analytics);
    banner.hidden = true;
    if (analytics) loadAnalytics();
    else if (gaLoaded) window.gtag?.('consent', 'update', { analytics_storage: 'denied' });
  };
  const open = () => {
    analyticsBox.checked = readConsent()?.analytics ?? false;
    banner.hidden = false;
    banner.querySelector<HTMLElement>('button')?.focus();
  };

  const saved = readConsent();
  if (!saved) banner.hidden = false;
  else if (saved.analytics) loadAnalytics();

  banner.addEventListener('click', (e) => {
    const action = (e.target as HTMLElement).closest<HTMLElement>('[data-consent]')?.dataset.consent;
    if (action === 'accept') close(true);
    if (action === 'reject') close(false);
    if (action === 'customize') {
      details.hidden = !details.hidden;
      saveBtn.hidden = details.hidden;
      customizeBtn.setAttribute('aria-expanded', String(!details.hidden));
    }
  });
  banner.querySelector('form')!.addEventListener('submit', (e) => {
    e.preventDefault();
    close(analyticsBox.checked);
  });
  document.querySelectorAll('[data-consent-open]').forEach((b) => b.addEventListener('click', open));
}

/* ---------- Click tracking: CTAs, tel:, mailto: ---------- */
document.addEventListener('click', (e) => {
  const a = (e.target as HTMLElement).closest('a');
  if (!a) return;
  const href = a.getAttribute('href') ?? '';
  if (href.startsWith('tel:')) track('phone_click', { link_url: href });
  else if (href.startsWith('mailto:')) track('email_click', { link_url: href });
  if (a.dataset.cta) track('cta_click', { cta_location: a.dataset.cta, link_url: href });
});

/* ---------- Mobile menu (native <dialog> gives focus trap + Esc) ---------- */
const menu = document.getElementById('mobile-menu') as HTMLDialogElement | null;
const menuOpen = document.querySelector<HTMLButtonElement>('[data-menu-open]');
if (menu && menuOpen) {
  menuOpen.addEventListener('click', () => menu.showModal());
  menu.querySelector('[data-menu-close]')?.addEventListener('click', () => menu.close());
  menu.addEventListener('click', (e) => { if (e.target === menu) menu.close(); });
  menu.addEventListener('close', () => menuOpen.focus());
  matchMedia('(min-width: 1024px)').addEventListener('change', (m) => { if (m.matches) menu.close(); });
}

/* ---------- Scroll reveal + heading bars ---------- */
const revealables = [...document.querySelectorAll<HTMLElement>('.reveal, .reveal-stagger > *')];
if (!reduceMotion && 'IntersectionObserver' in window) {
  const io = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      entry.target.classList.add('is-visible');
      io.unobserve(entry.target);
    }
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });

  const fold = innerHeight;
  revealables.forEach((el) => {
    if (el.getBoundingClientRect().top < fold) return; // already on screen: never hide it
    const parent = el.parentElement;
    if (parent?.classList.contains('reveal-stagger')) el.style.setProperty('--i', String([...parent.children].indexOf(el) % 6));
    el.classList.add('reveal-armed');
    io.observe(el);
  });
}

/* ---------- Stat counters ---------- */
const counters = document.querySelectorAll<HTMLElement>('[data-count]');
if (counters.length && !reduceMotion && 'IntersectionObserver' in window) {
  const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);
  const cio = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      const el = entry.target as HTMLElement;
      cio.unobserve(el);
      const target = Number(el.dataset.count);
      const start = performance.now();
      const step = (now: number) => {
        const t = Math.min(1, (now - start) / 1200);
        el.textContent = String(Math.round(target * easeOut(t)));
        if (t < 1) requestAnimationFrame(step);
      };
      el.textContent = '0';
      requestAnimationFrame(step);
    }
  }, { threshold: 0.6 });
  counters.forEach((c) => { if (c.getBoundingClientRect().top > innerHeight) cio.observe(c); });
}

/* ---------- Vimeo click-to-load ---------- */
document.querySelectorAll<HTMLElement>('[data-video]').forEach((wrap) => {
  wrap.querySelector('[data-video-play]')?.addEventListener('click', () => {
    const iframe = document.createElement('iframe');
    iframe.src = wrap.dataset.video!;
    iframe.title = wrap.dataset.videoTitle ?? 'Video';
    iframe.allow = 'autoplay; fullscreen; picture-in-picture';
    iframe.allowFullscreen = true;
    iframe.className = 'absolute inset-0 h-full w-full border-0';
    wrap.replaceChildren(iframe);
    iframe.focus();
    track('video_play', { video_title: iframe.title, video_provider: 'vimeo' });
  }, { once: true });
});
