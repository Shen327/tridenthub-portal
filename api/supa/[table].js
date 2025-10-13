export const config = { runtime: 'edge' };

// Allow only the tables your UI needs.
const ALLOWED = new Set(['tasks', 'clients', 'sites', 'equipments', 'inspections']);

// Basic CORS headers (not needed for same-origin, but harmless).
function cors(req) {
  return {
    'Access-Control-Allow-Origin': req.headers.get('origin') || '*',
    'Access-Control-Allow-Headers': 'authorization, content-type, apikey, prefer',
    'Access-Control-Allow-Methods': 'GET,POST,PATCH,DELETE,OPTIONS',
    'Vary': 'Origin'
  };
}

export default async function handler(req) {
  // Preflight
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors(req) });

  const url = new URL(req.url);
  const table = url.pathname.split('/').pop(); // /api/supa/<table>
  if (!ALLOWED.has(table)) return new Response('Forbidden table', { status: 403, headers: cors(req) });

  const sbUrl = process.env.SUPABASE_URL;
  const sbKey = process.env.SUPABASE_ANON_KEY;
  if (!sbUrl || !sbKey) return new Response('Server not configured', { status: 500, headers: cors(req) });

  // Forward to Supabase REST
  const target = `${sbUrl}/rest/v1/${table}${url.search}`;
  const init = {
    method: req.method,
    headers: {
      apikey: sbKey,
      Authorization: `Bearer ${sbKey}`,
      'Content-Type': 'application/json',
      Prefer: req.headers.get('prefer') || ''
    },
    body: ['GET', 'DELETE'].includes(req.method) ? undefined : await req.text()
  };

  try {
    const resp = await fetch(target, init);
    const body = await resp.text();
    return new Response(body, {
      status: resp.status,
      headers: { ...cors(req), 'Content-Type': resp.headers.get('content-type') || 'application/json' }
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: 'Upstream fetch failed', detail: String(e) }), {
      status: 502,
      headers: { ...cors(req), 'Content-Type': 'application/json' }
    });
  }
}
