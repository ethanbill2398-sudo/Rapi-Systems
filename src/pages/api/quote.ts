import type { APIRoute } from 'astro';
import { z } from 'astro/zod';
import { Resend } from 'resend';
import { get, del } from '@vercel/blob';
import { provinces, productInterests, installOptions } from '../../lib/quote-fields';
import {
  clientIp, env, escapeHtml, json, rateLimited, sameOrigin, verifyRecaptcha,
  UPLOAD_MAX_BYTES, UPLOAD_PREFIX, UPLOAD_TYPES,
} from '../../lib/server';

export const prerender = false;

const Quote = z.object({
  name: z.string().trim().min(2, 'Please enter your name.').max(100),
  company: z.string().trim().max(120).optional().default(''),
  email: z.email('Please enter a valid email address.').max(160),
  phone: z.string().trim().max(40).regex(/^[\d\s()+.-]*$/, 'Please enter a valid phone number.').optional().default(''),
  province: z.enum(provinces, 'Please choose a province or territory from the list.').or(z.literal('')).optional().default(''),
  town: z.string().trim().max(100).optional().default(''),
  interests: z.array(z.enum(productInterests.map((p) => p.value) as [string, ...string[]])).max(5).default([]),
  install: z.enum(installOptions.map((o) => o.value) as [string, ...string[]]).optional().default('unsure'),
  timeline: z.string().trim().max(60).optional().default(''),
  message: z.string().trim().max(5000).optional().default(''),
  consent: z.literal(true, 'Please confirm we can contact you about your request.'),
  website: z.string().max(0).optional(), // honeypot
  token: z.string('Spam check did not load. Please refresh and try again.').min(10, 'Spam check did not load. Please refresh and try again.'),
  upload: z
    .object({
      url: z.url(),
      name: z.string().max(200),
      contentType: z.enum(UPLOAD_TYPES as [string, ...string[]]),
      size: z.number().int().positive().max(UPLOAD_MAX_BYTES),
    })
    .optional(),
});

export const POST: APIRoute = async ({ request }) => {
  if (!sameOrigin(request)) return json({ error: 'Forbidden' }, 403);
  const ip = clientIp(request);
  if (rateLimited(`quote:${ip}`)) {
    return json({ error: 'Too many requests. Please wait a few minutes or call us.' }, 429);
  }

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return json({ error: 'Invalid request.' }, 400);
  }

  // Honeypot filled in: answer like a success so bots learn nothing.
  if (raw && typeof raw === 'object' && 'website' in raw && (raw as { website?: string }).website) {
    return json({ ok: true });
  }

  const parsed = Quote.safeParse(raw);
  if (!parsed.success) {
    const fields: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? 'form');
      fields[key] ??= issue.message;
    }
    return json({ error: 'Please check the highlighted fields.', fields }, 422);
  }
  const q = parsed.data;

  const captcha = await verifyRecaptcha(q.token, 'quote', ip);
  if (!captcha.ok) {
    return json({ error: 'We could not verify your request. Please try again, or call or email us directly.' }, 400);
  }

  const apiKey = env('RESEND_API_KEY');
  const to = env('QUOTE_TO_EMAIL');
  const from = env('QUOTE_FROM_EMAIL');
  if (!apiKey || !to || !from) {
    console.error('Quote form is missing RESEND_API_KEY, QUOTE_TO_EMAIL or QUOTE_FROM_EMAIL');
    return json({ error: 'Our form is temporarily unavailable. Please call or email us directly.' }, 503);
  }

  // Pull the uploaded site plan from private Blob storage so it arrives as a real attachment.
  let attachment: { filename: string; content: Buffer } | undefined;
  if (q.upload) {
    const u = new URL(q.upload.url);
    if (!u.hostname.endsWith('.blob.vercel-storage.com') || !u.pathname.slice(1).startsWith(UPLOAD_PREFIX)) {
      return json({ error: 'Invalid attachment.' }, 400);
    }
    const file = await get(q.upload.url, { access: 'private' });
    if (file?.statusCode === 200 && file.stream && file.blob.size <= UPLOAD_MAX_BYTES) {
      const content = Buffer.from(await new Response(file.stream).arrayBuffer());
      attachment = { filename: q.upload.name.replace(/[^\w.\- ]+/g, '_'), content };
    }
  }

  const interestLabels = q.interests.map((v) => productInterests.find((p) => p.value === v)?.label ?? v);
  const rows: [string, string][] = [
    ['Name', q.name],
    ['Company / farm', q.company],
    ['Email', q.email],
    ['Phone', q.phone],
    ['Province', q.province],
    ['Town', q.town],
    ['Interested in', interestLabels.join(', ')],
    ['Installation', installOptions.find((o) => o.value === q.install)?.label ?? ''],
    ['Timeline', q.timeline],
    ['Attachment', attachment ? attachment.filename : ''],
  ];
  const tableHtml = rows
    .filter(([, v]) => v)
    .map(([k, v]) => `<tr><th align="left" style="padding:6px 12px 6px 0;color:#46524e">${k}</th><td style="padding:6px 0">${escapeHtml(v)}</td></tr>`)
    .join('');
  const messageHtml = q.message ? `<p style="white-space:pre-wrap">${escapeHtml(q.message)}</p>` : '';
  const text = `${rows.filter(([, v]) => v).map(([k, v]) => `${k}: ${v}`).join('\n')}\n\n${q.message}`;

  const resend = new Resend(apiKey);
  const sent = await resend.emails.send({
    from,
    to: to.split(',').map((s) => s.trim()),
    replyTo: q.email,
    subject: `Quote request: ${q.name}${q.company ? ` (${q.company})` : ''}${q.install === 'griffin' ? ' + Griffin Ag install' : ''}`,
    html: `<h2 style="font-family:sans-serif">New RapiSYSTEMS quote request</h2><table style="font-family:sans-serif;font-size:15px">${tableHtml}</table>${messageHtml}`,
    text,
    attachments: attachment ? [attachment] : undefined,
  });

  if (sent.error) {
    console.error('Resend error', sent.error);
    return json({ error: 'Sorry, we could not send your request. Please call or email us directly.' }, 502);
  }

  // Remove the uploaded file now that it is in the inbox.
  if (q.upload) await del(q.upload.url).catch((e) => console.error('Blob delete failed', e));

  // Auto-reply to the customer. Deliberately does not echo their message, so the form can't relay spam.
  // A failure here should not fail the submission.
  await resend.emails
    .send({
      from,
      to: q.email,
      replyTo: to.split(',')[0].trim(),
      subject: 'We received your RapiSYSTEMS quote request',
      html: `<div style="font-family:sans-serif;font-size:15px;line-height:1.6;color:#1e2626">
        <p>Hello,</p>
        <p>Thanks for contacting RapiSYSTEMS. We have your request and will get back to you shortly.</p>
        <p>If anything is urgent, call us at <a href="tel:+13068738717">(306) 873-8717</a>.</p>
        <p>Griffin Ag Services Ltd.<br>Tisdale, Saskatchewan</p></div>`,
      text: `Hello,\n\nThanks for contacting RapiSYSTEMS. We have your request and will get back to you shortly.\n\nIf anything is urgent, call us at (306) 873-8717.\n\nGriffin Ag Services Ltd.\nTisdale, Saskatchewan`,
    })
    .catch((e) => console.error('Auto-reply failed', e));

  return json({ ok: true });
};

export const ALL: APIRoute = () => json({ error: 'Method not allowed' }, 405);
