// Monde Tactico pour Roblox : le monde réel du site (même graine), avec des noms modifiés
// pour les vrais joueurs, un personnage R6 différent pour chaque joueur et les maillots des clubs.
// Utilisé par build.mjs (fichier dist/roblox/monde.json) et par la fonction /api/match.
import { generateRealWorld } from '../../src/core/worldgen.js';
import { pshort } from '../../src/core/player.js';
import { POS_ORDER } from '../../src/core/constants.js';
import { REAL_COUNTRIES, REAL_CONTI } from '../../src/data/real/index.js';
import { SOSIES } from './sosies.mjs';

export const GRAINE = 2026;
// pays des carrières Roblox créées avant les nouveaux championnats (pour retrouver les vrais noms)
const PAYS_DEPART = ['FR', 'EN', 'ES', 'IT', 'DE'];
export const VERSION_MONDE = 1;

// ---------- Noms modifiés (façon anciens jeux sans licence) ----------
const SPECIAUX = { Ø: 'O', ø: 'o', Æ: 'Ae', æ: 'ae', ß: 'ss', Ł: 'L', ł: 'l', Đ: 'D', đ: 'd', ı: 'i', İ: 'I', Œ: 'Oe', œ: 'oe' };
export const sansAccents = (s) =>
  s.replace(/[ØøÆæßŁłĐđıİŒœ]/g, (c) => SPECIAUX[c]).normalize('NFD').replace(/[̀-ͯ]/g, '');
const VOY = { a: 'e', e: 'i', i: 'e', o: 'a', u: 'o', y: 'i' };
const VOY2 = { a: 'o', e: 'a', i: 'a', o: 'e', u: 'a', y: 'e' };

// Change la dernière voyelle d'un mot (en évitant de doubler une voyelle voisine)
function modifierMot(mot) {
  const low = mot.toLowerCase();
  let i = -1;
  for (let k = low.length - 1; k >= 0; k--) if (VOY[low[k]]) { i = k; break; }
  if (i < 0) return mot + 'o';
  const v = low[i];
  let n = VOY[v];
  if (low[i - 1] === n || low[i + 1] === n) n = VOY2[v];
  if (mot[i] !== low[i]) n = n.toUpperCase();
  return mot.slice(0, i) + n + mot.slice(i + 1);
}

// Modifie le mot le plus long du nom : « Mbappé » → « Mbappi », « Vinícius Júnior » → « Vinicios Junior »
export function nomModifie(nom) {
  const propre = sansAccents(nom);
  const mots = propre.split(/([ -])/);
  let best = -1;
  for (let k = 0; k < mots.length; k += 2) if (best < 0 || mots[k].length >= mots[best].length) best = k;
  mots[best] = modifierMot(mots[best]);
  return mots.join('');
}

// ---------- Personnages R6 ----------
// Clés des coupes : mêmes noms que Apparence.COUPES dans Roblox
const ALEA = [
  ['buzz', 3], ['buzz2', 2], ['buzzBrun', 2], ['buzzBlond', 0.5], ['noirFrange', 2], ['brunCourt', 3], ['brunCoiffe', 2],
  ['brunStyle', 1], ['brunMeche', 1.5], ['brunLisse', 1.5], ['bouclesNoires', 1.5], ['bouclesBrunes', 1.5], ['ondulesNoirs', 1.5],
  ['twists', 1], ['locks', 1], ['afro', 0.5], ['longsBoucles', 0.4], ['longsBruns', 0.5], ['blondCourt', 1], ['blondEpi', 0.8],
  ['chignonBlond', 0.3], ['chignonNoir', 0.4], ['noirArriere', 0.6], ['roux', 0.4], ['auburn', 0.4], ['desordre', 1], ['chauve', 0.6],
];
export const COUPES = ALEA.map((x) => x[0]);
const CLAIRES = new Set(['buzzBlond', 'blondCourt', 'blondEpi', 'chignonBlond', 'roux', 'auburn']); // seulement avec les teints clairs

function hash(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
function alea(seed) {
  let t = seed >>> 0;
  return () => {
    t = (t + 0x6d2b79f5) >>> 0;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}
const TOTAL = ALEA.reduce((s, x) => s + x[1], 0);
function tirerLook(rnd, age) {
  const peau = 1 + Math.floor(rnd() * 6);
  let coupe;
  for (let essai = 0; essai < 10; essai++) {
    let x = rnd() * TOTAL;
    coupe = ALEA.find(([, w]) => (x -= w) < 0)?.[0] || 'brunCourt';
    if (!(CLAIRES.has(coupe) && peau > 3)) break;
  }
  const b = rnd();
  const barbe = age >= 21 && b < 0.15 ? 'barbe' : age >= 20 && b < 0.3 ? 'courte' : '';
  return { coupe, barbe, peau };
}
const cle = (l) => `${l.coupe}/${l.barbe}/${l.peau}`;

// Look d'un joueur apparu en cours de carrière (jeunes, joueurs libres) : tiré de son identifiant
export function lookDe(p) {
  if (!p.look) p.look = tirerLook(alea(hash(p.id + ':' + GRAINE)), p.age);
  return p.look;
}

function lireSosie(txt) {
  const [coupe, barbe, peau] = txt.split('/');
  return { coupe, barbe, peau: +peau, sosie: 1 };
}

// ---------- Maillots ----------
function lum(hex) {
  const n = parseInt(hex.slice(1), 16);
  return (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
}
export function maillot([c1, c2]) {
  const clair = lum(c1) > 0.85;
  const num = Math.abs(lum(c1) - lum(c2)) > 0.35 ? c2 : lum(c1) > 0.5 ? '#111111' : '#FFFFFF';
  return { m: c1, s: clair ? c1 : c2, n: num };
}

// ---------- Noms dans les textes gardés par une carrière (messages, actualités, transferts, palmarès) ----------
const TEXTES = ['inbox', 'news', 'transfers', 'history', 'awards'];
const echapper = (x) => x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
function remplacerNoms(state, paires) {
  // mots des noms de clubs, villes, stades et compétitions : jamais remplacés (« AC Milan » reste « AC Milan »)
  const proteges = new Set();
  const mots = (t) => String(t || '').split(/[^\p{L}\p{N}'-]+/u).forEach((w) => w && proteges.add(w));
  for (const c of Object.values(state.clubs)) { mots(c.name); mots(c.short); mots(c.city); mots(c.stadium?.name); }
  for (const c of Object.values(state.comps)) mots(c.name);
  const map = new Map();
  for (const [a, b] of paires) if (a && b && a !== b && a.length >= 3 && !proteges.has(a)) map.set(a, b);
  if (!map.size) return;
  const re = new RegExp(`(?<![\\p{L}\\p{N}])(?:${[...map.keys()].sort((x, y) => y.length - x.length).map(echapper).join('|')})(?![\\p{L}\\p{N}])`, 'gu');
  const visite = (o) => {
    for (const k of Object.keys(o)) {
      const v = o[k];
      if (typeof v === 'string') o[k] = v.replace(re, (m) => map.get(m));
      else if (v && typeof v === 'object') visite(v);
    }
  };
  for (const k of TEXTES) if (state[k] && typeof state[k] === 'object') visite(state[k]);
}
const complet = (fn, ln) => (fn ? fn + ' ' + ln : '');

// ---------- Construction ----------
// Habille un monde réel pour Roblox : un personnage R6 différent pour chaque joueur (sosies pour les stars)
// et des noms modifiés pour les vrais joueurs. Les vrais noms restent à part (fn0, ln0, jamais envoyés à Roblox)
// pour qu'une carrière puisse revenir sur le site sans perte.
export function adapterPourRoblox(state, graine = GRAINE) {
  if (state.roblox) return state;
  // Homonymes (deux « Vitinha ») : le sosie va au joueur le mieux noté
  const star = new Map();
  for (const p of Object.values(state.players)) {
    if (!p.real || !p.club) continue;
    const vrai = (p.fn ? p.fn + ' ' : '') + p.ln;
    if (SOSIES[vrai] && (!star.has(vrai) || star.get(vrai).ovr < p.ovr)) star.set(vrai, p);
  }
  for (const club of Object.values(state.clubs)) {
    const pris = new Set();
    const ps = club.squad.map((id) => state.players[id]).filter(Boolean);
    // les stars d'abord (look fixe), puis un look unique pour chacun des autres
    for (const p of ps) {
      if (!p.real) continue;
      const vrai = (p.fn ? p.fn + ' ' : '') + p.ln;
      if (star.get(vrai) === p) { p.look = lireSosie(SOSIES[vrai]); pris.add(cle(p.look)); }
    }
    for (const p of ps) {
      if (p.look) { pris.add(cle(p.look)); continue; }
      const rnd = alea(hash(p.id + ':' + graine));
      let l = tirerLook(rnd, p.age);
      for (let k = 0; k < 30 && pris.has(cle(l)); k++) l = tirerLook(rnd, p.age);
      p.look = l;
      pris.add(cle(l));
    }
  }
  // noms modifiés pour tous les vrais joueurs (le moteur de match les utilise dans ses commentaires)
  const paires = [];
  for (const p of Object.values(state.players)) {
    if (!p.real) continue;
    p.ln0 = p.ln;
    p.ln = nomModifie(p.ln);
    if (p.fn) { p.fn0 = p.fn; p.fn = sansAccents(p.fn); }
    paires.push([complet(p.fn0, p.ln0), complet(p.fn, p.ln)], [p.ln0, p.ln]);
  }
  // une carrière venue du site : ses messages et actualités prennent aussi les noms modifiés
  if (state.mgr) remplacerNoms(state, paires);
  if (state.contiName === REAL_CONTI) state.contiName = 'European Cup';
  state.roblox = 1;
  return state;
}

// Retour sur le site : vrais noms rendus (gardés à part, ou retrouvés dans le monde de départ des carrières Roblox)
export function adapterPourSite(state) {
  if (!state.roblox) return state;
  let depart = null;
  const paires = [];
  for (const p of Object.values(state.players)) {
    if (!p.real) continue;
    const fn = p.fn, ln = p.ln;
    if (p.ln0 !== undefined) {
      p.ln = p.ln0;
      if (p.fn0 !== undefined) p.fn = p.fn0;
    } else {
      depart = depart || generateRealWorld(GRAINE, PAYS_DEPART);
      const o = depart.players[p.id];
      if (o && o.real) { p.ln = o.ln; p.fn = o.fn; }
    }
    delete p.ln0;
    delete p.fn0;
    paires.push([complet(fn, ln), complet(p.fn, p.ln)], [ln, p.ln]);
  }
  if (state.mgr) remplacerNoms(state, paires);
  if (state.contiName === 'European Cup') state.contiName = REAL_CONTI;
  delete state.roblox;
  return state;
}

export function construireMonde(graine = GRAINE) {
  return adapterPourRoblox(generateRealWorld(graine), graine);
}

// Données compactes pour Roblox
// Noms des pays en anglais (le jeu Roblox est en anglais)
const PAYS_EN = { FR: 'France', EN: 'England', ES: 'Spain', IT: 'Italy', DE: 'Germany', PT: 'Portugal', NL: 'Netherlands', BE: 'Belgium', TR: 'Turkey', SCO: 'Scotland' };
export function exporterMonde(state) {
  const clubs = [];
  for (const C of REAL_COUNTRIES) {
    for (const div of [1, 2]) {
      const comp = state.comps[C.code + div];
      for (const id of comp.clubs) {
        const c = state.clubs[id];
        const joueurs = c.squad
          .map((pid) => state.players[pid])
          .sort((a, b) => POS_ORDER[a.pos] - POS_ORDER[b.pos] || b.ovr - a.ovr)
          .map((p) => [p.id, pshort(p), p.pos, p.ovr, p.age, p.num, p.look.coupe, p.look.barbe, p.look.peau, p.look.sosie || 0]);
        clubs.push({
          id: c.id, n: c.name, c: c.short, a: c.abbr, pays: C.code, div, coul: c.colors, kit: maillot(c.colors),
          stade: c.stadium.name, cap: c.stadium.cap, rep: c.rep, j: joueurs,
        });
      }
    }
  }
  return {
    v: VERSION_MONDE, graine: state.seed ?? GRAINE,
    pays: REAL_COUNTRIES.map((C) => ({ code: C.code, nom: PAYS_EN[C.code] || C.name, d1: C.d1, d2: C.d2 })),
    coupes: COUPES, clubs,
  };
}
