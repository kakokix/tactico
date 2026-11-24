// Fonction Netlify : /api/match?h=<club>&a=<club>&s=<graine>
// Simule un match amical avec le moteur du site (MatchSim) et renvoie de quoi l'animer dans Roblox :
// compositions (postes et places de la formation), phases de jeu et événements minute par minute.
import { simulerMatch } from './core.mjs';

const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });

export default async (req) => {
  try {
    const url = new URL(req.url);
    const res = simulerMatch(url.searchParams.get('h'), url.searchParams.get('a'), url.searchParams.get('s'));
    return res.error ? json(res, 400) : json(res);
  } catch (e) {
    console.error(e);
    return json({ error: 'Server error.' }, 500);
  }
};

export const config = {
  path: '/api/match',
  method: ['GET'],
  rateLimit: { windowLimit: 300, windowSize: 60, aggregateBy: ['ip', 'domain'] },
};
