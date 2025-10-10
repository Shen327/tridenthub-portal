// File: api/supa/[[...path]].js
export const config = { runtime: 'nodejs18.x' }; // use Node runtime on Vercel

// Tables you allow the portal to touch
const ALLOWED = new Set(['tasks', 'clients', 'sites', 'equipments', 'inspections']);

const cors = {
  'Access-Control-Allow-Origin': process.env.ALLOW_ORIGIN || '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, prefer',
  'Access-Control-Allow-Methods': 'GET,POST,PATCH,DELETE,OPTIONS',
};

export default async function handler(req) {
  // CORS preflight
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  const url = new URL(req.url);
  // Paths that match:
  //   /api/supa         -> []            (not allowed)
  //   /api/supa/tasks   -> ["tasks"]
  //   /api/supa/tasks/1 -> ["tasks","1"] (id part is ignored here)
  const parts = url.pathname.split('/').slice(3); // remove ["","api","supa"]
  const table = parts[0] || '';
  if (!ALLOWED.has(table)) {
    return new Response(`Forbidden table ${table}`, { status: 403, headers: cors });
  }

  const sUrl = process.env.SUPABASE_URL;
  const sKey = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE;
  if (!sUrl || !sKey) {
    return new Response('Server not configured', { status: 500, headers: cors });
  }

  // Forward to Supabase REST
  const target = `${sUrl}/rest/v1/${table}${url.search}`;
  const init = {
    method: req.method,
    headers: {
      apikey: sKey,
      Authorization: `Bearer ${sKey}`,
      'Content-Type': 'application/json',
      Prefer: req.headers.get('Prefer') ?? '',
    },
    body: ['GET', 'DELETE', 'OPTIONS'].includes(req.method) ? undefined : await req.text(),
  };

  try {
    const resp = await fetch(target, init);
    const ct = resp.headers.get('content-type') || 'application/json';
    const body = await resp.text();
    return new Response(body, { status: resp.status, headers: { ...cors, 'Content-Type': ct } });
  } catch (e) {
    return new Response(`Upstream fetch failed: ${e}`, { status: 502, headers: cors });
  }
}
