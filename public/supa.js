export const config = { runtime: 'edge' };

const allowOrigin = process.env.ALLOW_ORIGIN || '*';
const cors = {
  'Access-Control-Allow-Origin': allowOrigin,
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, prefer',
  'Access-Control-Allow-Methods': 'GET,POST,PATCH,DELETE,OPTIONS'
};

const ALLOWED = new Set(['tasks','clients','sites','equipments','inspections']);

export default async function handler(req) {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  const url = new URL(req.url);
  // URL will be /supa/<table>
  const [, table] = url.pathname.split('/');

  if (!ALLOWED.has(table)) {
    return new Response(`Forbidden table ${table}`, { status: 403, headers: cors });
  }

  const sUrl = process.env.SUPABASE_URL;
  const sKey = process.env.SUPABASE_ANON_KEY;
  if (!sUrl || !sKey) return new Response('Server not configured', { status: 500, headers: cors });

  if (!['GET','POST','PATCH','DELETE'].includes(req.method))
    return new Response('Method Not Allowed', { status: 405, headers: cors });

  const target = `${sUrl}/rest/v1/${table}${url.search}`;
  const body   = ['POST','PATCH','DELETE'].includes(req.method) ? await req.text() : undefined;

  const init = {
    method: req.method,
    headers: {
      apikey: sKey,
      Authorization: `Bearer ${sKey}`,
      'Content-Type': 'application/json',
      Prefer: req.headers.get('Prefer') || ''
    },
    body
  };

  try {
    const resp = await fetch(target, init);
    const ct   = resp.headers.get('content-type') || 'application/json';
    const out  = await resp.text();
    return new Response(out, { status: resp.status, headers: { ...cors, 'Content-Type': ct } });
  } catch (e) {
    return new Response(`Upstream fetch failed: ${e}`, { status: 502, headers: cors });
  }
}
