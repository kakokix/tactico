// Client du classement mondial.
import { careerScore, trophyCount } from '../core/score.js';

export const SITE_URL = 'https://tactico123.netlify.app';
const API = '/api/leaderboard';
let lastSubmit = 0;
let cache = { at: 0, id: null, data: null };

export function apiAvailable() {
  try {
    const h = location.hostname;
    if (location.protocol === 'file:' || !h) return false;
    if (h.endsWith('claude.ai') || h.endsWith('claudeusercontent.com') || h.includes('claude')) return false;
    return true;
  } catch (e) { return false; }
}

export function entryFor(S) {
  const m = S.mgr;
  const club = S.user ? S.clubs[S.user] : null;
  return {
    id: m.id, secret: m.secret, name: m.name, nat: m.nat,
    club: club ? club.name : '', cc: club ? club.colors : null,
    rep: Math.round(m.rep), seasons: m.career.seasons, season: S.season,
    w: m.career.w, d: m.career.d, l: m.career.l,
    titles1: m.career.titles1, titles2: m.career.titles2, cups: m.career.cups, conti: m.career.conti,
    promos: m.career.promos, objMet: m.career.objMet, objEx: m.career.objEx, v: 1,
  };
}

export function myScore(S) { return careerScore(S.mgr.career); }
export function myTrophies(S) { return trophyCount(S.mgr.career); }

export async function submitScore(S, force = false) {
  if (!S || !S.mgr || !apiAvailable()) return null;
  if (!S.flags.lbDirty && !force) return null;
  if (!force && Date.now() - lastSubmit < 90000) return null;
  lastSubmit = Date.now();
  try {
    const r = await fetch(API, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(entryFor(S)) });
    const j = await r.json().catch(() => ({}));
    if (r.ok) { S.flags.lbDirty = false; S.flags.lbRank = j.rank || null; cache.at = 0; return j; }
    return { error: j.error || `Erreur ${r.status}` };
  } catch (e) { return { error: 'Connexion impossible' }; }
}

export async function fetchBoard(id, sort = 'score') {
  if (!apiAvailable()) return { error: 'offline' };
  if (cache.data && cache.id === id + sort && Date.now() - cache.at < 30000) return cache.data;
  try {
    const r = await fetch(`${API}?id=${encodeURIComponent(id || '')}&sort=${sort}`);
    const j = await r.json();
    if (!r.ok) return { error: j.error || `Erreur ${r.status}` };
    cache = { at: Date.now(), id: id + sort, data: j };
    return j;
  } catch (e) { return { error: 'Connexion impossible' }; }
}
