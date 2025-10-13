export const config = { runtime: 'edge' };

export default async function handler() {
  return new Response('pong', {
    status: 200,
    headers: { 'content-type': 'text/plain' }
  });
}
