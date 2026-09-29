import type { APIRoute } from 'astro';
import { env } from '../../lib/server';

export const prerender = false;

// Step 2: exchange the code for a token and hand it to the Decap window that opened this popup.
export const GET: APIRoute = async ({ url, cookies }) => {
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const expected = cookies.get('decap_oauth_state')?.value;
  cookies.delete('decap_oauth_state', { path: '/api' });

  let status: 'success' | 'error' = 'error';
  let content: Record<string, string> = { error: 'Login failed.' };

  if (code && state && expected && state === expected) {
    const res = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: { accept: 'application/json', 'content-type': 'application/json' },
      body: JSON.stringify({
        client_id: env('GITHUB_OAUTH_CLIENT_ID'),
        client_secret: env('GITHUB_OAUTH_CLIENT_SECRET'),
        code,
      }),
    });
    const data = (await res.json()) as { access_token?: string; error_description?: string };
    if (data.access_token) {
      status = 'success';
      content = { token: data.access_token, provider: 'github' };
    } else {
      content = { error: data.error_description ?? 'Login failed.' };
    }
  }

  const message = JSON.stringify(`authorization:github:${status}:${JSON.stringify(content)}`);
  const nonce = crypto.randomUUID().replace(/-/g, '');
  const origin = JSON.stringify(url.origin);
  const html = `<!doctype html><meta charset="utf-8"><title>Signing in…</title><p>Signing in…</p>
<script nonce="${nonce}">
  (function () {
    function receive(e) {
      if (e.origin !== ${origin}) return;
      window.opener.postMessage(${message}, e.origin);
      window.removeEventListener('message', receive);
    }
    window.addEventListener('message', receive);
    window.opener && window.opener.postMessage('authorizing:github', ${origin});
  })();
</script>`;
  return new Response(html, {
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'no-store',
      'content-security-policy': `default-src 'none'; script-src 'nonce-${nonce}'`,
    },
  });
};
