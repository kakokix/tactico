// Fonction Netlify : /api/carriere (POST). Le jeu de carrière complet pour les joueurs Roblox.
// Corps JSON : { a: action, t: jeton de la carrière, e: écran, q: paramètres }.
import { getStore } from '@netlify/blobs';
import { traiter } from './core.mjs';
import { handle as classement } from '../leaderboard/core.mjs';

const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });

export default async (req) => {
  if (req.method !== 'POST') return json({ error: 'Requête POST attendue.' }, 405);
  let b;
  try {
    b = await req.json();
  } catch {
    return json({ error: 'Données invalides.' }, 400);
  }
  try {
    const store = getStore({ name: 'carrieres', consistency: 'strong' });
    const lire = async () => {
      const r = await classement(new Request('https://tactico.local/api/leaderboard?sort=score'), getStore({ name: 'leaderboard', consistency: 'strong' }));
      return r.json();
    };
    return json(await traiter(b, store, lire));
  } catch (e) {
    console.error(e);
    return json({ error: 'Erreur serveur.' }, 500);
  }
};

export const config = {
  path: '/api/carriere',
  method: ['POST'],
  rateLimit: { windowLimit: 600, windowSize: 60, aggregateBy: ['ip', 'domain'] },
};
