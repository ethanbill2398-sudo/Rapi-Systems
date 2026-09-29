import type { APIRoute } from 'astro';
import { env } from '../../lib/server';

export const prerender = false;

// Step 1 of Decap CMS GitHub login: send the editor to GitHub with a CSRF state cookie.
export const GET: APIRoute = ({ url, cookies, redirect }) => {
  const clientId = env('GITHUB_OAUTH_CLIENT_ID');
  if (!clientId) return new Response('CMS login is not configured (GITHUB_OAUTH_CLIENT_ID).', { status: 500 });
  const state = crypto.randomUUID();
  cookies.set('decap_oauth_state', state, { httpOnly: true, secure: true, sameSite: 'lax', path: '/api', maxAge: 600 });
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: new URL('/api/callback', url).href,
    scope: url.searchParams.get('scope') ?? 'repo',
    state,
  });
  return redirect(`https://github.com/login/oauth/authorize?${params}`, 302);
};
