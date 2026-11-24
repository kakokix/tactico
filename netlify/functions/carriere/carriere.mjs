// Fonction Netlify : /api/carriere (POST). Le jeu de carrière complet pour les joueurs Roblox (en anglais).
// Corps JSON : { a: action, t: jeton de la carrière, e: écran, q: paramètres }.
import { getStore } from '@netlify/blobs';
import { traiter } from './core.mjs';
import { handle as classement } from '../leaderboard/core.mjs';

const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });

export default async (req) => {
  if (req.method !== 'POST') return json({ error: 'POST request expected.' }, 405);
  let b;
  try {
    b = await req.json();
  } catch {
    return json({ error: 'Invalid data.' }, 400);
  }
  try {
    const store = getStore({ name: 'carrieres', consistency: 'strong' });
    const lb = getStore({ name: 'leaderboard', consistency: 'strong' });
    const lire = async () => (await classement(new Request('https://tactico.local/api/leaderboard?sort=score'), lb)).json();
    // Les carrières Roblox entrent au classement mondial du site, comme les autres managers
    const envoyer = async (entree) => (await classement(new Request('https://tactico.local/api/leaderboard', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(entree) }), lb)).json();
    return json(await traiter(b, store, lire, envoyer));
  } catch (e) {
    console.error(e);
    return json({ error: 'Server error.' }, 500);
  }
};

export const config = {
  path: '/api/carriere',
  method: ['POST'],
  rateLimit: { windowLimit: 600, windowSize: 60, aggregateBy: ['ip', 'domain'] },
};
