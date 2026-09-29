// Quote form: accessible inline validation, reCAPTCHA v3 (loaded on first interaction),
// optional direct-to-Blob upload, and clear success/failure states.

type Grecaptcha = { ready(cb: () => void): void; execute(key: string, o: { action: string }): Promise<string> };
declare global { interface Window { grecaptcha?: Grecaptcha; rsTrack?: (e: string, p?: object) => void } }

const MAX_BYTES = 10 * 1024 * 1024;
const TYPES = ['application/pdf', 'image/jpeg', 'image/png'];

const messages: Record<string, (el: HTMLInputElement) => string> = {
  name: (el) => (el.validity.valueMissing ? 'Please enter your name.' : 'Please enter at least 2 characters.'),
  email: (el) => (el.validity.valueMissing ? 'Please enter your email address.' : 'Please enter a valid email, like name@example.com.'),
  phone: () => 'Please use numbers, spaces, brackets, + or - only.',
  consent: () => 'Please confirm we can contact you about your request.',
};

let recaptchaPromise: Promise<Grecaptcha> | null = null;
function loadRecaptcha(siteKey: string) {
  recaptchaPromise ??= new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = `https://www.google.com/recaptcha/api.js?render=${encodeURIComponent(siteKey)}`;
    s.async = true;
    s.onload = () => window.grecaptcha!.ready(() => resolve(window.grecaptcha!));
    s.onerror = () => { recaptchaPromise = null; reject(new Error('reCAPTCHA failed to load')); };
    document.head.append(s);
  });
  return recaptchaPromise;
}

export function initQuoteForm() {
  const form = document.getElementById('quote-form') as HTMLFormElement | null;
  if (!form) return;
  const siteKey = form.dataset.sitekey ?? '';
  const errorBox = form.querySelector<HTMLElement>('[data-form-error]')!;
  const success = document.querySelector<HTMLElement>('[data-form-success]')!;
  const submit = form.querySelector<HTMLButtonElement>('[data-submit]')!;
  const label = form.querySelector<HTMLElement>('[data-submit-label]')!;
  const fileInput = form.querySelector<HTMLInputElement>('input[type="file"]')!;

  const warm = () => { if (siteKey) loadRecaptcha(siteKey).catch(() => {}); };
  form.addEventListener('focusin', warm, { once: true });
  form.addEventListener('pointerdown', warm, { once: true });

  const setError = (name: string, msg: string) => {
    const el = form.elements.namedItem(name) as HTMLInputElement | null;
    const slot = form.querySelector<HTMLElement>(`[data-error-for="${name}"]`);
    if (slot) slot.textContent = msg;
    if (el && 'setAttribute' in el) el.setAttribute('aria-invalid', msg ? 'true' : 'false');
  };

  const checkFile = () => {
    const f = fileInput.files?.[0];
    if (!f) return setError('file', ''), true;
    if (!TYPES.includes(f.type)) return setError('file', 'Please attach a PDF, JPG or PNG file.'), false;
    if (f.size > MAX_BYTES) return setError('file', 'That file is over 10 MB. Please attach a smaller file.'), false;
    setError('file', '');
    return true;
  };
  fileInput.addEventListener('change', checkFile);

  const validateField = (el: HTMLInputElement) => {
    if (!messages[el.name]) return true;
    const ok = el.checkValidity();
    setError(el.name, ok ? '' : messages[el.name](el));
    return ok;
  };
  // Validate on blur only once the visitor has left a field, then live as they fix it.
  form.addEventListener('focusout', (e) => {
    const el = e.target as HTMLInputElement;
    if (el.name && messages[el.name] && el.value) validateField(el);
  });
  form.addEventListener('input', (e) => {
    const el = e.target as HTMLInputElement;
    if (el.getAttribute('aria-invalid') === 'true') validateField(el);
  });

  const busy = (on: boolean, text = 'Request a Quote') => {
    submit.disabled = on;
    submit.setAttribute('aria-busy', String(on));
    label.textContent = text;
  };

  const showFormError = (msg: string) => {
    errorBox.textContent = msg;
    errorBox.classList.toggle('hidden', !msg);
    if (msg) errorBox.focus();
  };

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    showFormError('');

    const fields = ['name', 'email', 'phone', 'consent'].map((n) => form.elements.namedItem(n) as HTMLInputElement);
    const invalid = fields.filter((el) => !validateField(el));
    const fileOk = checkFile();
    if (invalid.length || !fileOk) {
      (invalid[0] ?? fileInput).focus();
      return;
    }
    if (!siteKey) {
      showFormError('The form is not configured yet. Please call or email us directly.');
      return;
    }

    const data = new FormData(form);
    try {
      busy(true, 'Checking…');
      const grecaptcha = await loadRecaptcha(siteKey);

      let upload: { url: string; name: string; contentType: string; size: number } | undefined;
      const file = fileInput.files?.[0];
      if (file) {
        busy(true, 'Uploading file…');
        const uploadToken = await grecaptcha.execute(siteKey, { action: 'upload' });
        const { upload: put } = await import('@vercel/blob/client');
        const safeName = file.name.replace(/[^\w.\-]+/g, '_').slice(-80);
        const blob = await put(`quote-uploads/${safeName}`, file, {
          access: 'private',
          handleUploadUrl: '/api/upload',
          clientPayload: JSON.stringify({ token: uploadToken }),
          contentType: file.type,
        });
        upload = { url: blob.url, name: file.name, contentType: file.type, size: file.size };
      }

      busy(true, 'Sending…');
      const token = await grecaptcha.execute(siteKey, { action: 'quote' });
      const res = await fetch('/api/quote', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          name: data.get('name'),
          company: data.get('company'),
          email: data.get('email'),
          phone: data.get('phone'),
          province: data.get('province'),
          town: data.get('town'),
          interests: data.getAll('interests'),
          install: data.get('install'),
          timeline: data.get('timeline'),
          message: data.get('message'),
          consent: data.get('consent') === 'on',
          website: data.get('website'),
          token,
          upload,
        }),
      });
      const body = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string; fields?: Record<string, string> };

      if (!res.ok || !body.ok) {
        if (body.fields) {
          Object.entries(body.fields).forEach(([k, v]) => setError(k, v));
          const first = Object.keys(body.fields)[0];
          (form.elements.namedItem(first) as HTMLElement | null)?.focus();
        }
        showFormError(body.error ?? 'Something went wrong. Please try again, or call or email us directly.');
        busy(false);
        return;
      }

      window.rsTrack?.('generate_lead', { form: 'quote', interests: data.getAll('interests').join(',') });
      form.hidden = true;
      success.hidden = false;
      success.focus();
      success.scrollIntoView({ block: 'center', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    } catch (err) {
      console.error(err);
      showFormError('We could not send your request. Check your connection and try again, or call or email us directly.');
      busy(false);
    }
  });
}
