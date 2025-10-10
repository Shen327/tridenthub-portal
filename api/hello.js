export const config = { runtime: 'edge' };

export default () => new Response(
  JSON.stringify({ ok: true }),
  { headers: { 'content-type': 'application/json' } }
);
