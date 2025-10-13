export const config = { runtime: 'edge' };

// Minimal allow-list so only your intended tables are reachable
const ALLOWED = new Set(['tasks', 'clients', 'sites', 'equipments', 'inspections']);

export default async function handler(req) {
  // No CORS needed because same-origin
  if (req.method === 'OPTIONS') return new Response('ok');

  const parts = new URL(req.url).pathname.split('/');
  const table = parts[parts.length - 1];
  if (!ALLOWED.has(table)) return new Response('Forbidden', { status: 403 });

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY;
  if (!url || !key) return new Response('Server not configured', { status: 500 });

  const target = `${url}/rest/v1/${table}${new URL(req.url).search}`;
  const init = {
    method: req.method,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      Prefer: req.headers.get('prefer') || '',
    },
    body: ['GET', 'DELETE', 'OPTIONS'].includes(req.method) ? undefined : await req.text(),
  };

  const resp = await fetch(target, init);
  const body = await resp.text();
  return new Response(body, {
    status: resp.status,
    headers: { 'Content-Type': resp.headers.get('content-type') || 'application/json' },
  });
}
