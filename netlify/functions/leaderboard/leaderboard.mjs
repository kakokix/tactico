// Fonction Netlify : /api/leaderboard (GET classement, POST score).
import { getStore } from '@netlify/blobs';
import { handle } from './core.mjs';

export default async (req) => {
  const store = getStore({ name: 'leaderboard', consistency: 'strong' });
  try {
    return await handle(req, store);
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: 'Erreur serveur.' }), { status: 500, headers: { 'content-type': 'application/json' } });
  }
};

export const config = {
  path: '/api/leaderboard',
  method: ['GET', 'POST'],
  rateLimit: { windowLimit: 40, windowSize: 60, aggregateBy: ['ip', 'domain'] },
};
