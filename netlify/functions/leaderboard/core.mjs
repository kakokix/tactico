// Classement mondial : validation et logique (testable sans Netlify).
import { careerScore, trophyCount } from '../../../src/core/score.js';
import { NATION_CODES } from '../../../src/data/names.js';

const NATS = new Set(NATION_CODES);
const CACHE_KEY = 'cache/v1';
const REBUILD_MS = 5 * 60 * 1000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const BAD = ['merde', 'putain', 'connard', 'connasse', 'salope', 'encule', 'nique', 'niquer', 'pute', 'putes', 'batard', 'fdp', 'ntm', 'pd', 'tg', 'fuck', 'fucker', 'shit', 'bitch', 'nigger', 'nigga', 'negro', 'negre', 'hitler', 'nazi', 'cunt', 'dick', 'pussy', 'asshole', 'whore', 'fag', 'faggot', 'retard', 'slut', 'bite', 'couille', 'couilles', 'chatte', 'enfoire', 'pede', 'tapette', 'bougnoule', 'youpin', 'sexe', 'porn', 'porno', 'viol'];
const LONG = BAD.filter((w) => w.length >= 5);

export function isBad(name) {
  const n = name.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const tokens = n.split(/[^a-z0-9]+/).filter(Boolean);
  if (tokens.some((t) => BAD.includes(t))) return true;
  const glued = n.replace(/[^a-z]/g, '').replace(/0/g, 'o').replace(/1/g, 'i').replace(/3/g, 'e');
  return LONG.some((w) => glued.includes(w));
}

const clean = (s, max) => String(s ?? '').normalize('NFC').replace(/[\u0000-\u001f\u007f<>"`]/g, '').replace(/\s+/g, ' ').trim().slice(0, max);
const int = (v, lo, hi) => Number.isInteger(v) && v >= lo && v <= hi;

export function validate(b) {
  if (!b || typeof b !== 'object') return { error: 'Données invalides.' };
  if (!/^[a-f0-9]{16}$/.test(b.id || '')) return { error: 'Identifiant invalide.' };
  if (!/^[a-f0-9]{32}$/.test(b.secret || '')) return { error: 'Clé invalide.' };
  const name = clean(b.name, 20);
  if (name.length < 2) return { error: 'Pseudo trop court.' };
  if (!/^[\p{L}\p{N} _.\-']+$/u.test(name)) return { error: 'Pseudo : caractères non autorisés.' };
  if (isBad(name)) return { error: 'Pseudo refusé.' };
  if (!NATS.has(b.nat)) return { error: 'Nationalité inconnue.' };
  const club = clean(b.club, 40);
  const cc = Array.isArray(b.cc) && b.cc.length === 2 && b.cc.every((c) => /^#[0-9a-f]{6}$/i.test(c)) ? b.cc.map((c) => c.toLowerCase()) : null;
  const n = {};
  for (const k of ['seasons', 'w', 'd', 'l', 'titles1', 'titles2', 'cups', 'conti', 'promos', 'objMet', 'objEx', 'rep', 'season']) n[k] = b[k];
  if (!int(n.seasons, 0, 400) || !int(n.season, 2026, 2600) || !int(n.rep, 0, 100)) return { error: 'Données de carrière invalides.' };
  const maxGames = 62 * (n.seasons + 1);
  for (const k of ['w', 'd', 'l']) if (!int(n[k], 0, maxGames)) return { error: 'Nombre de matchs invalide.' };
  if (n.w + n.d + n.l > maxGames) return { error: 'Nombre de matchs invalide.' };
  if (n.seasons > n.season - 2026 + 1) return { error: 'Nombre de saisons invalide.' };
  for (const k of ['titles1', 'titles2', 'promos', 'objMet', 'objEx']) if (!int(n[k], 0, n.seasons)) return { error: 'Palmarès invalide.' };
  for (const k of ['cups', 'conti']) if (!int(n[k], 0, n.seasons + 1)) return { error: 'Palmarès invalide.' };
  if (n.titles1 + n.titles2 > n.seasons || n.objEx > n.objMet) return { error: 'Palmarès invalide.' };
  return { ok: true, entry: { id: b.id, name, nat: b.nat, club, cc, ...n } };
}

async function sha256(s) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return [...new Uint8Array(buf)].map((x) => x.toString(16).padStart(2, '0')).join('');
}

export const pub = (e) => ({ id: e.id, name: e.name, nat: e.nat, club: e.club, cc: e.cc, score: e.score, trophies: e.trophies, seasons: e.seasons, w: e.w, d: e.d, l: e.l, rep: e.rep, at: e.at });

async function rebuild(store) {
  const { blobs } = await store.list({ prefix: 'm/' });
  const out = [];
  for (let i = 0; i < blobs.length; i += 40) {
    const part = await Promise.all(blobs.slice(i, i + 40).map((b) => store.get(b.key, { type: 'json' }).catch(() => null)));
    for (const e of part) if (e && e.id) out.push(pub(e));
  }
  const cache = { at: Date.now(), list: out };
  await store.setJSON(CACHE_KEY, cache);
  return cache;
}

async function readCache(store) {
  const c = await store.get(CACHE_KEY, { type: 'json' }).catch(() => null);
  if (!c || !Array.isArray(c.list) || Date.now() - c.at > REBUILD_MS) return rebuild(store);
  return c;
}

const sorters = {
  score: (a, b) => b.score - a.score || b.trophies - a.trophies || a.at - b.at,
  trophies: (a, b) => b.trophies - a.trophies || b.score - a.score || a.at - b.at,
};

const json = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });

export async function handle(req, store) {
  if (req.method === 'GET') {
    const url = new URL(req.url);
    const id = url.searchParams.get('id') || '';
    const sort = url.searchParams.get('sort') === 'trophies' ? 'trophies' : 'score';
    const cache = await readCache(store);
    const list = cache.list.slice().sort(sorters[sort]);
    const top = list.slice(0, 100).map((e, i) => ({ ...e, rank: i + 1 }));
    let me = null;
    const i = id ? list.findIndex((e) => e.id === id) : -1;
    if (i >= 0) me = { rank: i + 1, name: list[i].name, score: list[i].score, trophies: list[i].trophies };
    return json({ total: list.length, top, me, sort });
  }
  if (req.method === 'POST') {
    let body;
    try { body = await req.json(); } catch (e) { return json({ error: 'JSON invalide.' }, 400); }
    const v = validate(body);
    if (!v.ok) return json({ error: v.error }, 400);
    const key = 'm/' + v.entry.id;
    const prev = await store.get(key, { type: 'json' }).catch(() => null);
    const h = await sha256(body.secret);
    if (prev && prev.h !== h) return json({ error: 'Cet identifiant appartient à un autre manager.' }, 403);
    const e = { ...v.entry, h, score: careerScore(v.entry), trophies: trophyCount(v.entry), at: Date.now(), created: prev?.created || Date.now() };
    await store.setJSON(key, e);
    // Mise à jour optimiste du cache (réparé par la reconstruction périodique)
    let rank = null, total = null;
    for (let tries = 0; tries < 10; tries++) {
      if (tries) await sleep(15 + Math.random() * 60 * tries);
      const cur = await store.getWithMetadata(CACHE_KEY, { type: 'json' }).catch(() => null);
      if (!cur || !cur.data) { const c = await rebuild(store); total = c.list.length; rank = c.list.filter((x) => x.score > e.score).length + 1; break; }
      const list = cur.data.list.filter((x) => x.id !== e.id);
      list.push(pub(e));
      const opts = cur.etag ? { onlyIfMatch: cur.etag } : {};
      const res = await store.setJSON(CACHE_KEY, { at: cur.data.at, list }, opts).catch(() => ({ modified: false }));
      if (res.modified) { total = list.length; rank = list.filter((x) => x.score > e.score).length + 1; break; }
    }
    return json({ ok: true, rank, total, score: e.score });
  }
  return json({ error: 'Méthode non autorisée.' }, 405);
}
