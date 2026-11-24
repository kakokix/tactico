// Fonction Netlify : /api/lien (POST). Passe une carrière du site vers le jeu Roblox, et inversement, avec un code.
// Corps JSON : { a: 'deposer', etat: texte d'export du site } ou { a: 'recuperer', code }.
import { getStore } from '@netlify/blobs';
import { traiterSite } from './core.mjs';

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
    return json(await traiterSite(b, getStore({ name: 'carrieres', consistency: 'strong' })));
  } catch (e) {
    console.error(e);
    return json({ error: 'Erreur du serveur.' }, 500);
  }
};

export const config = {
  path: '/api/lien',
  method: ['POST'],
  rateLimit: { windowLimit: 30, windowSize: 60, aggregateBy: ['ip', 'domain'] },
};
