export const config = { runtime: 'edge' };

const allowOrigin = process.env.ALLOW_ORIGIN || '*';
const cors = {
  'Access-Control-Allow-Origin': allowOrigin,
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, prefer',
  'Access-Control-Allow-Methods': 'GET,POST,PATCH,DELETE,OPTIONS',
};

const ALLOWED = new Set(['tasks', 'clients', 'sites', 'equipments', 'inspections']);

export default async function handler(req) {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  const url = new URL(req.url);
  // /api/supa/<table>
  const [, , , table] = url.pathname.split('/');
  if (!ALLOWED.has(table)) {
    return new Response(`Forbidden table ${table}`, { status: 403, headers: cors });
  }

  const sbUrl = process.env.SUPABASE_URL;
  const sbKey = process.env.SUPABASE_ANON_KEY;
  if (!sbUrl || !sbKey) {
    return new Response('Server not configured', { status: 500, headers: cors });
  }

  const target = `${sbUrl}/rest/v1/${table}${url.search}`;
  const init = {
    method: req.method,
    headers: {
      apikey: sbKey,
      Authorization: `Bearer ${sbKey}`,
      'Content-Type': 'application/json',
      Prefer: req.headers.get('Prefer') ?? '',
    },
    body: ['GET', 'DELETE', 'OPTIONS'].includes(req.method) ? undefined : await req.text(),
  };

  try {
    const resp = await fetch(target, init);
    const body = await resp.text();
    const ct = resp.headers.get('content-type') || 'application/json';
    return new Response(body, { status: resp.status, headers: { ...cors, 'Content-Type': ct } });
  } catch (e) {
    return new Response(`Upstream fetch failed: ${e}`, { status: 502, headers: cors });
  }
}
