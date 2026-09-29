// Server-only helpers for the quote form. Secrets come from Vercel environment variables.

export const env = (name: string) => process.env[name] ?? '';

export const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
  });

export const clientIp = (request: Request) =>
  request.headers.get('x-real-ip') ?? request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';

// Per-instance sliding window. Serverless instances are short-lived, so this is a speed bump,
// not a hard guarantee; reCAPTCHA and the honeypot do the heavy lifting.
const hits = new Map<string, number[]>();
export function rateLimited(key: string, limit = 5, windowMs = 10 * 60_000) {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  recent.push(now);
  hits.set(key, recent);
  if (hits.size > 5000) hits.clear();
  return recent.length > limit;
}

export function sameOrigin(request: Request) {
  const origin = request.headers.get('origin');
  if (!origin) return false;
  return new URL(origin).host === new URL(request.url).host;
}

export async function verifyRecaptcha(token: string | undefined, action: string, ip: string) {
  const secret = env('RECAPTCHA_SECRET_KEY');
  if (!secret) return { ok: false, reason: 'not-configured' as const };
  if (!token) return { ok: false, reason: 'missing' as const };
  const res = await fetch('https://www.google.com/recaptcha/api/siteverify', {
    method: 'POST',
    body: new URLSearchParams({ secret, response: token, remoteip: ip }),
  });
  const data = (await res.json()) as { success: boolean; score?: number; action?: string };
  const ok = data.success && data.action === action && (data.score ?? 0) >= 0.5;
  return { ok, reason: ok ? ('ok' as const) : ('low-score' as const) };
}

export const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

export const UPLOAD_PREFIX = 'quote-uploads/';
export const UPLOAD_MAX_BYTES = 10 * 1024 * 1024;
export const UPLOAD_TYPES = ['application/pdf', 'image/jpeg', 'image/png'];
