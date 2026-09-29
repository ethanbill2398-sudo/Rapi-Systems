import type { APIRoute } from 'astro';
import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';
import { clientIp, json, rateLimited, sameOrigin, verifyRecaptcha, UPLOAD_MAX_BYTES, UPLOAD_PREFIX, UPLOAD_TYPES } from '../../lib/server';

export const prerender = false;

// Issues a short-lived token so the browser can upload a site plan straight to private Vercel Blob storage
// (Vercel functions cap request bodies at 4.5 MB, so 10 MB files cannot pass through the quote function).
export const POST: APIRoute = async ({ request }) => {
  if (!sameOrigin(request)) return json({ error: 'Forbidden' }, 403);
  const ip = clientIp(request);
  if (rateLimited(`upload:${ip}`, 6)) return json({ error: 'Too many uploads. Please try again later.' }, 429);

  try {
    const body = (await request.json()) as HandleUploadBody;
    const result = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        if (!pathname.startsWith(UPLOAD_PREFIX)) throw new Error('Invalid path');
        const { token } = JSON.parse(clientPayload ?? '{}') as { token?: string };
        const check = await verifyRecaptcha(token, 'upload', ip);
        if (!check.ok) throw new Error('Spam check failed');
        return {
          allowedContentTypes: UPLOAD_TYPES,
          maximumSizeInBytes: UPLOAD_MAX_BYTES,
          addRandomSuffix: true,
          validUntil: Date.now() + 10 * 60_000,
        };
      },
    });
    return json(result);
  } catch (err) {
    console.error('Upload token refused', err);
    return json({ error: 'Upload failed. Please try again, or email the file to us.' }, 400);
  }
};
