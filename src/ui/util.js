// Aides d'affichage : échappement, icônes, formats, écussons.
import { NATIONS } from '../data/names.js';
import { PAYS } from '../data/pays.js';
import ASSETS from '../assets/assets.json';
import { POS_GROUP } from '../core/constants.js';
import { lookSite, maillot } from '../core/looks.js';

const FLAG_CODES = [...Object.keys(ASSETS.drapeaux.i), ...Object.keys(ASSETS.alias)];

export const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const I = (d, extra = '') => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" ${extra}>${d}</svg>`;
// Icônes du pack Tactico Outline (planche intégrée au CSS par build.mjs : classes .ic-<nom>)
export const ic = (nom, cls = '') => `<i class="ic ic-${nom}${cls ? ' ' + cls : ''}" aria-hidden="true"></i>`;
export const ICON = {
  home: ic('accueil'), squad: ic('effectif'), tactics: ic('tactique'), transfer: ic('mercato'),
  more: I('<circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/>'),
  cal: ic('calendrier'), trophy: ic('trophee'), table: ic('resultats'), money: ic('finances'), train: ic('plot-d-entrainement'),
  club: ic('ecusson'), career: ic('profil'), world: ic('classement-mondial'), inbox: ic('messagerie'), cog: ic('reglages'),
  play: ic('jouer'), pause: ic('pause'), next: ic('suivant'), x: ic('fermer'), back: ic('retour'), star: ic('etoile'),
  ball: ic('ballon-de-match'), sub: ic('remplacement'), plus: ic('ajouter'), search: ic('recherche'), heart: ic('medaille'),
  inj: ic('blessure'), card: ic('carton-jaune'), red: ic('carton-rouge'), save: ic('sauvegarder'), gk: ic('gant-de-gardien'),
  var: ic('ecran-var'), whistle: ic('sifflet'), medal: ic('medaille'), contract: ic('contrat'), scout: ic('recruteur'),
  stadium: ic('stade'), shirt: ic('maillot'), academy: ic('academie'), tickets: ic('billetterie'), sponsor: ic('sponsor'),
  shop: ic('boutique'), filter: ic('filtre'), sort: ic('trier'), bell: ic('notification'), lock: ic('verrou'), help: ic('aide'),
  info: ic('informations'), speed: ic('vitesse'), random: ic('aleatoire'), replay: ic('rejouer'), check: ic('valider'),
  timer: ic('chronometre'), penalty: ic('penalty'), freekick: ic('coup-franc'), offside: ic('hors-jeu'), corner: ic('fanion-de-corner'),
  boot: ic('chaussure-a-crampons'), cone: ic('plot-d-entrainement'), bottle: ic('gourde'), bib: ic('chasuble'), bench: ic('banc-de-touche'),
  locker: ic('vestiaire'), progress: ic('progression'), goal: ic('but'), cards: ic('cartons'),
};

// Drapeaux : planche de 264 drapeaux (codes ISO, plus EN, SCO, WAL et NIR), XX si le pays est inconnu
const FLAGS = new Set(FLAG_CODES);
export const flag = (nat) => `<span class="fl fl-${FLAGS.has(nat) ? nat : 'XX'}" title="${esc(natName(nat))}"></span>`;
export const natName = (nat) => NATIONS[nat]?.name || PAYS[nat] || nat;

export const ovrClass = (o) => (o >= 85 ? 'o5' : o >= 78 ? 'o4' : o >= 70 ? 'o3' : o >= 62 ? 'o2' : o >= 54 ? 'o1' : 'o0');
export const ovrB = (o) => `<span class="ovr ${ovrClass(o)}">${o}</span>`;
export const attrClass = (v) => (v >= 17 ? 'a5' : v >= 14 ? 'a4' : v >= 11 ? 'a3' : v >= 8 ? 'a2' : v >= 5 ? 'a1' : 'a0');
export const rtClass = (r) => (r >= 8 ? 'r5' : r >= 7.2 ? 'r4' : r >= 6.6 ? 'r3' : r >= 6 ? 'r2' : r >= 5.3 ? 'r1' : 'r0');
export const rtB = (r) => (r ? `<span class="rt ${rtClass(r)}">${Number(r).toFixed(1)}</span>` : '<span class="rt">–</span>');
export const posB = (pos) => `<span class="posb p${POS_GROUP[pos]}">${pos}</span>`;
export const condBar = (c) => {
  const v = Math.round(c);
  const col = v >= 90 ? 'var(--green)' : v >= 75 ? 'var(--lime)' : v >= 60 ? 'var(--orange)' : 'var(--red)';
  return `<span class="cond"><span class="bar"><i style="width:${v}%;background:${col}"></i></span>${v}%</span>`;
};
export const stars = (rep) => {
  const n = Math.max(1, Math.min(5, Math.round((rep - 30) / 13)));
  return `<span class="stars" title="Réputation ${rep}">${'★'.repeat(n)}<span class="dim">${'★'.repeat(5 - n)}</span></span>`;
};

export function money(v) {
  const a = Math.abs(v), s = v < 0 ? '-' : '';
  if (a >= 1e9) return s + (a / 1e9).toFixed(2).replace(/\.?0+$/, '') + ' Md€';
  if (a >= 1e6) return s + (a / 1e6).toFixed(a >= 1e8 ? 0 : 1).replace(/\.0$/, '') + ' M€';
  if (a >= 1e3) return s + Math.round(a / 1e3) + ' k€';
  return s + Math.round(a) + ' €';
}

// ---------- Écussons (SVG en data-URI, mis en cache) ----------
const crestCache = new Map();
const SHAPES = [
  'M50 4 L94 16 V60 C94 88 72 106 50 116 C28 106 6 88 6 60 V16 Z',
  'M50 6 A54 54 0 1 1 49.9 6 Z',
  'M14 10 H86 Q94 10 94 18 V82 Q94 112 50 116 Q6 112 6 82 V18 Q6 10 14 10 Z',
  'M10 8 H90 V58 C90 84 70 104 50 114 C30 104 10 84 10 58 Z',
];
function patternSVG(pat, c2) {
  switch (pat) {
    case 1: return [10, 30, 50, 70, 90].map((x) => `<rect x="${x - 5}" y="0" width="10" height="120" fill="${c2}"/>`).join('');
    case 2: return `<rect x="0" y="46" width="100" height="26" fill="${c2}"/>`;
    case 3: return `<polygon points="0,30 30,0 100,90 100,120 70,120 0,40" fill="${c2}"/>`;
    case 4: return `<polygon points="0,46 50,86 100,46 100,66 50,106 0,66" fill="${c2}"/>`;
    case 5: return `<rect x="50" y="0" width="50" height="120" fill="${c2}"/>`;
    case 6: return `<rect x="50" y="0" width="50" height="60" fill="${c2}"/><rect x="0" y="60" width="50" height="60" fill="${c2}"/>`;
    case 7: return [18, 46, 74, 102].map((y) => `<rect x="0" y="${y}" width="100" height="13" fill="${c2}"/>`).join('');
    default: return '';
  }
}
export function crestURI(club) {
  if (!club) return '';
  const key = club.id + club.colors.join('') + club.crest.shape + club.crest.pat;
  if (crestCache.has(key)) return crestCache.get(key);
  const [c1, c2] = club.colors;
  const d = SHAPES[club.crest.shape] || SHAPES[0];
  const txt = (club.abbr || club.short || '?').slice(0, 4);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 120"><defs><clipPath id="k"><path d="${d}"/></clipPath></defs>`
    + `<path d="${d}" fill="${c1}"/><g clip-path="url(#k)">${patternSVG(club.crest.pat, c2)}</g>`
    + `<path d="${d}" fill="none" stroke="${c2}" stroke-width="5"/><path d="${d}" fill="none" stroke="rgba(0,0,0,.35)" stroke-width="1.5"/>`
    + `<circle cx="50" cy="60" r="25" fill="${c1}" stroke="${c2}" stroke-width="4"/>`
    + `<text x="50" y="67.5" text-anchor="middle" font-family="Arial Black,Arial,Helvetica,sans-serif" font-weight="900" font-size="${txt.length > 3 ? 15 : txt.length > 2 ? 19 : 23}" fill="${c2}">${txt}</text></svg>`;
  const uri = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  crestCache.set(key, uri);
  return uri;
}
export const crest = (club, cls = '') => (club ? `<img class="crest ${cls}" src="${crestURI(club)}" alt="" loading="lazy">` : '');

// Couleur visible sur fond sombre (barres de stats)
export function barColor(hex) {
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  return r * 0.299 + g * 0.587 + b * 0.114 < 60 ? '#b8c6bf' : hex;
}

// Couleur lisible sur une couleur de fond
export function inkOn(hex) {
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  return r * 0.299 + g * 0.587 + b * 0.114 > 150 ? '#0b130e' : '#ffffff';
}
export function colorDist(a, b) {
  const p = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const x = p(a), y = p(b);
  return Math.sqrt((x[0] - y[0]) ** 2 + (x[1] - y[1]) ** 2 + (x[2] - y[2]) ** 2);
}

// Maillot vu de face (couleurs du club), numéro au centre
export function jersey(club, num, { gk = false, size = 40 } = {}) {
  const c1 = gk ? '#f5c542' : club.colors[0];
  let c2 = gk ? '#111827' : club.colors[1];
  if (!gk && colorDist(c1, c2) < 60) c2 = inkOn(c1) === '#ffffff' ? '#ffffff' : '#111827';
  const ink = inkOn(c1);
  return `<svg class="jersey" width="${size}" height="${size}" viewBox="0 0 40 40" aria-hidden="true"><path d="M14 3.5 8 5.8 2.5 12.5l5.3 5.6 3-2.6V36.5h18.4V15.5l3 2.6 5.3-5.6L32 5.8 26 3.5c-1.4 2.6-3.5 3.9-6 3.9s-4.6-1.3-6-3.9z" fill="${c1}" stroke="${c2}" stroke-width="1.6" stroke-linejoin="round"/><path d="M14 3.5c1.4 2.6 3.5 3.9 6 3.9s4.6-1.3 6-3.9" fill="none" stroke="${c2}" stroke-width="2.2"/><path d="M2.5 12.5l5.3 5.6M37.5 12.5l-5.3 5.6" stroke="${c2}" stroke-width="2.4"/><text x="20" y="27.5" text-anchor="middle" font-family="Barlow Condensed,Arial Narrow,Arial" font-weight="700" font-size="14" fill="${ink}">${num ?? ''}</text></svg>`;
}

// Radar à six axes (valeurs 1-20)
export function radar(axes, color = '#c6f43d') {
  const n = axes.length, R0 = 42, cx = 60, cy = 56;
  const pt = (i, v) => { const a = -Math.PI / 2 + i * 2 * Math.PI / n; return [cx + Math.cos(a) * R0 * v, cy + Math.sin(a) * R0 * v]; };
  const ring = (v) => axes.map((_, i) => pt(i, v).map((x) => x.toFixed(1)).join(',')).join(' ');
  const poly = axes.map(([, v], i) => pt(i, Math.max(0.05, v / 20)).map((x) => x.toFixed(1)).join(',')).join(' ');
  const labels = axes.map(([l, v], i) => { const [x, y] = pt(i, 1.22); return `<text x="${x.toFixed(1)}" y="${(y + 3).toFixed(1)}" text-anchor="middle" font-size="7.4" fill="#8fa99b">${l}</text><text x="${x.toFixed(1)}" y="${(y + 11).toFixed(1)}" text-anchor="middle" font-size="8" font-weight="700" fill="#eaf4ee">${Math.round(v)}</text>`; }).join('');
  return `<svg class="radar" viewBox="-16 -2 152 126" role="img" aria-label="Profil du joueur">${[0.25, 0.5, 0.75, 1].map((v) => `<polygon points="${ring(v)}" fill="none" stroke="#2b4a39" stroke-width=".7"/>`).join('')}${axes.map((_, i) => { const [x, y] = pt(i, 1); return `<line x1="${cx}" y1="${cy}" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}" stroke="#2b4a39" stroke-width=".6"/>`; }).join('')}<polygon points="${poly}" fill="${color}" fill-opacity=".28" stroke="${color}" stroke-width="1.6" stroke-linejoin="round"/>${labels}</svg>`;
}

// Carte des postes : poste principal en vert vif, postes secondaires plus pâles
const POS_XY = { GB: [50, 93], DC: [50, 78], DD: [84, 74], DG: [16, 74], MDC: [50, 63], MC: [50, 50], MD: [86, 48], MG: [14, 48], MOC: [50, 36], AD: [82, 24], AG: [18, 24], BU: [50, 13] };
export function posMap(main, alts = []) {
  const dot = (pos, cls) => { const [x, y] = POS_XY[pos]; return `<span class="pd ${cls}" style="left:${x}%;top:${y}%">${pos}</span>`; };
  return `<div class="posmap"><svg viewBox="0 0 68 100" preserveAspectRatio="none" fill="none" stroke="rgba(255,255,255,.35)" stroke-width=".5"><rect x="2" y="2" width="64" height="96"/><path d="M2 50h64"/><circle cx="34" cy="50" r="8"/><rect x="16" y="2" width="36" height="15"/><rect x="16" y="83" width="36" height="15"/></svg>${alts.map((a) => dot(a, 'p2')).join('')}${dot(main, 'p1')}</div>`;
}

// ---------- Avatar d'un joueur : son personnage R6, comme dans le jeu Roblox ----------
// Même coupe, même barbe et même teint que dans le jeu (src/core/looks.js), tirés de l'identifiant du joueur :
// jamais d'après son nom, sa nationalité ou un vrai visage. Pas de sosie de star sur le site.
const R6_PEAU = ['#f5cdaf', '#eab892', '#cc8e69', '#a06948', '#7c5238', '#5c3c2a'];
const R6_TEINTE = { noir: '#1c1613', brun: '#4a2d1a', marron: '#6b4426', blond: '#d9b35c', roux: '#c25f2c', auburn: '#9c4526' };
// coupe du jeu → forme dessinée et teinte (d'après les accessoires du catalogue Roblox utilisés dans le jeu)
const R6_COUPES = {
  buzz: ['buzz', 'noir'], buzz2: ['buzz', 'noir'], buzzBrun: ['buzz', 'marron'], buzzBlond: ['buzz', 'blond'],
  noirFrange: ['frange', 'noir'], brunCourt: ['ondule', 'brun'], brunCoiffe: ['coiffe', 'brun'], brunStyle: ['houppe', 'brun'],
  brunMeche: ['meche', 'brun'], brunLisse: ['lisse', 'brun'], bouclesNoires: ['boucles', 'noir'], bouclesBrunes: ['boucles', 'brun'],
  ondulesNoirs: ['ondule', 'noir'], twists: ['twists', 'noir'], locks: ['locks', 'noir'], afro: ['afro', 'noir'],
  longsBoucles: ['longsBoucles', 'brun'], longsBruns: ['longs', 'marron'], blondCourt: ['balaye', 'blond'], blondEpi: ['epi', 'blond'],
  chignonBlond: ['chignonFou', 'blond'], chignonNoir: ['chignon', 'noir'], noirArriere: ['chignonFou', 'noir'],
  roux: ['court', 'roux'], auburn: ['desordre', 'auburn'], desordre: ['desordre', 'marron'],
};
const R6_CAP = 'M19.4 24 V20.5 Q19.4 12.9 27.2 12.9 H36.8 Q44.6 12.9 44.6 20.5 V24 Q43.4 20 40.6 19 Q32 17.6 23.4 19 Q20.6 20 19.4 24 Z';
const R6_BOUCLES = [[20.6, 20.2, 3.2], [22.6, 15.6, 3.6], [26.6, 12.8, 3.8], [31.4, 11.8, 3.9], [36.4, 12.4, 3.8], [40.6, 15, 3.6], [43, 19.6, 3.2], [24.5, 18.4, 2.2], [28.6, 17.4, 2.2], [32.6, 17.1, 2.2], [36.6, 17.5, 2.2], [40, 18.6, 2]];
const ronds = (l, c) => l.map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${c}"/>`).join('');
const brins = (xs, haut, bas, c) => xs.map((x) => `<rect x="${x - 1.45}" y="${haut(x)}" width="2.9" height="${bas - haut(x)}" rx="1.45" fill="${c}" stroke="#000" stroke-opacity=".3" stroke-width=".5"/>`).join('');
const R6_DERRIERE = {
  afro: (c) => `<ellipse cx="32" cy="19" rx="17.5" ry="14" fill="${c}"/>`,
  longs: (c) => `<path d="M18 22 Q18 11.5 27 11.5 H37 Q46 11.5 46 22 V44 H39 V30 H25 V44 H18 Z" fill="${c}"/>`,
  longsBoucles: (c) => ronds([[18.6, 19, 3.6], [18, 25, 3.6], [18.4, 31, 3.6], [19.2, 37, 3.4], [45.4, 19, 3.6], [46, 25, 3.6], [45.6, 31, 3.6], [44.8, 37, 3.4]], c),
  locks: (c) => brins([17.2, 20.2, 43.8, 46.8], () => 15, 35, c),
};
const R6_DEVANT = {
  buzz: (c) => `<path d="M20 23.5 V21 Q20 14 27.5 14 H36.5 Q44 14 44 21 V23.5 Q42.5 19.6 39 18.6 Q32 17.2 25 18.6 Q21.5 19.6 20 23.5 Z" fill="${c}" fill-opacity=".93"/>`,
  court: (c) => `<path d="${R6_CAP}" fill="${c}"/>`,
  frange: (c) => `<path d="M19.4 23 V20 Q19.4 12.9 27.2 12.9 H36.8 Q44.6 12.9 44.6 20 V23 L42.5 20.8 L40.5 21.6 L38.2 20.4 L35.8 21.8 L33.5 20.5 L31 21.8 L28.6 20.4 L26.2 21.6 L23.8 20.4 L21.6 21.5 Z" fill="${c}"/>`,
  coiffe: (c) => `<path d="M19.4 25 V20.5 Q19.4 12.9 27.2 12.9 H36.8 Q44.6 12.9 44.6 20.5 V24.5 Q43.6 19.2 39.5 18.4 Q35 17.6 33.6 16.2 Q30.5 19.2 24.5 19.4 Q21 20 19.4 25 Z" fill="${c}"/><path d="M33.6 16.2 L35.6 13.4" stroke="#000" stroke-opacity=".35" stroke-width=".8"/>`,
  houppe: (c) => `<path d="M19.4 24 V20 Q19.4 13.2 25 12.2 Q27.5 7.2 34 7.6 Q41.5 8.2 43.8 13.2 Q44.6 15.2 44.6 20 V24 Q43.2 19.6 40 18.8 Q32 17.4 24 18.8 Q20.8 19.6 19.4 24 Z" fill="${c}"/><path d="M27 10.8 Q32 8.9 38 10.5" fill="none" stroke="#fff" stroke-opacity=".2" stroke-width="1"/>`,
  meche: (c) => `<path d="M19.4 24.5 V20 Q19.4 12.9 27.2 12.9 H36.8 Q44.6 12.9 44.6 20 V24 Q43.5 19.8 41 18.6 Q36 21.8 29 21.2 Q24 20.8 21.5 22.4 Q20.4 23 19.4 24.5 Z" fill="${c}"/>`,
  lisse: (c) => `<path d="M19.6 23 V20.2 Q19.6 13.2 27.3 13.2 H36.7 Q44.4 13.2 44.4 20.2 V23 Q43.6 19 41 18 Q37 17.2 34.6 15.6 Q31.6 18.2 25 18.4 Q21.2 18.8 19.6 23 Z" fill="${c}"/><path d="M24.5 15.7 Q29 14.5 32.5 14.9" fill="none" stroke="#fff" stroke-opacity=".22" stroke-width="1"/>`,
  ondule: (c) => `<path d="M19.4 24.5 V20.5 Q19.4 12.9 27.2 12.9 H36.8 Q44.6 12.9 44.6 20.5 V24.5 Q43.8 20.6 42 21 Q40.8 18.6 38.6 20.2 Q36.6 17.8 34.2 19.8 Q32 17.6 29.8 19.8 Q27.4 17.8 25.4 20.2 Q23.2 18.6 22 21 Q20.2 20.6 19.4 24.5 Z" fill="${c}"/>`,
  boucles: (c) => `<path d="${R6_CAP}" fill="${c}"/>` + ronds(R6_BOUCLES, c),
  twists: (c) => `<path d="${R6_CAP}" fill="${c}"/>` + brins([21.6, 24.6, 27.6, 30.6, 33.6, 36.6, 39.6, 42.6], (x) => 9.4 + Math.abs(x - 32) * 0.28, 19.2, c),
  locks: (c) => `<path d="${R6_CAP}" fill="${c}"/>` + brins([21.6, 24.6, 27.6, 30.6, 33.6, 36.6, 39.6, 42.6], (x) => 9.4 + Math.abs(x - 32) * 0.28, 20.6, c),
  afro: (c) => `<path d="M20 22.5 Q20 15 27 14.6 H37 Q44 15 44 22.5 Q40 18.6 32 18.4 Q24 18.6 20 22.5 Z" fill="${c}"/>`,
  longs: (c) => `<path d="M19.2 26 V20 Q19.2 12.6 27 12.6 H37 Q44.8 12.6 44.8 20 V26 Q43.6 20.4 40 18.6 Q35 17.4 32 15.4 Q29 17.4 24 18.6 Q20.4 20.4 19.2 26 Z" fill="${c}"/><path d="M19.2 22 V34.5 L21.4 34 V21 Z M44.8 22 V34.5 L42.6 34 V21 Z" fill="${c}"/>`,
  longsBoucles: (c) => `<path d="${R6_CAP}" fill="${c}"/>` + ronds(R6_BOUCLES, c) + ronds([[19.8, 24.5, 2.6], [44.2, 24.5, 2.6]], c),
  balaye: (c) => `<path d="M19.4 24 V20.2 Q19.4 12.9 27.2 12.9 H36.8 Q44.6 12.9 44.6 20.2 V23 Q43 18.6 39 18.2 Q33.5 18.6 27.5 20.8 Q22.6 22.4 19.4 24 Z" fill="${c}"/><path d="M23.5 16.4 Q31 14.8 39.5 16.6" fill="none" stroke="#000" stroke-opacity=".22" stroke-width=".9"/>`,
  epi: (c) => `<path d="M19.6 23.5 V19.5 L19.2 14.5 L22.8 15.6 L23.6 10.2 L27 13.4 L28.8 8.4 L31.6 12.6 L33.8 8 L35.8 12.6 L38.6 9 L39.8 13.6 L43.4 11.6 L43.2 15.8 L44.8 15.4 L44.4 19.5 V23.5 Q43 19.4 39.6 18.6 Q32 17.4 24.4 18.6 Q21 19.4 19.6 23.5 Z" fill="${c}"/>`,
  chignon: (c) => `<circle cx="32" cy="10" r="4.6" fill="${c}"/><path d="M19.6 23 V20.2 Q19.6 13.2 27.3 13.2 H36.7 Q44.4 13.2 44.4 20.2 V23 Q42.6 18.4 32 18 Q21.4 18.4 19.6 23 Z" fill="${c}"/><path d="M25 15.8 Q32 14.2 39 15.8" fill="none" stroke="#fff" stroke-opacity=".18" stroke-width="1"/>`,
  chignonFou: (c) => `<circle cx="32" cy="10" r="4.8" fill="${c}"/><path d="M27.6 8.4 L25.4 6.6 M36.4 8.4 L38.8 6.8 M32 5.4 L32.6 3.6" stroke="${c}" stroke-width="1.6" stroke-linecap="round"/><path d="M19.4 24 V20.2 Q19.4 13 27.3 13 H36.7 Q44.6 13 44.6 20.2 V24 L43 20.6 L41.4 21.4 Q36 18.2 32 18.4 Q27 18.4 22.6 21.4 L21 20.6 Z" fill="${c}"/>`,
  desordre: (c) => `<path d="M19.2 25 L19 19.5 L17.6 17.6 L20.6 16.4 L20.4 13.4 L23.8 13.8 L24.8 10.6 L27.8 12.6 L30 9.6 L32.4 12.2 L35.2 9.8 L36.8 12.6 L40 11 L40.6 14.4 L44 14.2 L43.4 17 L46.2 18.4 L44.8 20.2 L45 25 Q43.2 20.4 40.4 20.6 L38.6 18.2 L36.2 20.6 L33.4 17.8 L30.8 20.4 L28.2 18 L25.6 20.6 L23.2 18.6 Q20.6 20.6 19.2 25 Z" fill="${c}"/>`,
};
export function avatar(p, club, size = 40) {
  const l = lookSite(p);
  const sk = R6_PEAU[Math.min(6, Math.max(1, l.peau || 3)) - 1];
  const [forme, teinte] = R6_COUPES[l.coupe] || [null, null];
  const c = R6_TEINTE[teinte] || R6_TEINTE.brun;
  const k = club ? maillot(club.colors) : { m: '#3a4a42', n: '#ffffff' };
  const num = size >= 56 && typeof p.num === 'number' && !p.youth ? `<text x="44" y="47.5" font-size="7" font-weight="800" font-family="Arial,sans-serif" text-anchor="middle" fill="${esc(k.n)}">${p.num}</text>` : '';
  const barbe = l.barbe === 'barbe' ? '<path d="M20 26.5 V30 Q20 37.2 27.5 37.2 H36.5 Q44 37.2 44 30 V26.5 Q42.6 32.2 38.6 33.4 Q32 35.4 25.4 33.4 Q21.4 32.2 20 26.5 Z" fill="#3a2616"/>'
    : l.barbe === 'courte' ? '<path d="M20 26.5 V30 Q20 37.2 27.5 37.2 H36.5 Q44 37.2 44 30 V26.5 Q42.6 32.2 38.6 33.4 Q32 35.4 25.4 33.4 Q21.4 32.2 20 26.5 Z" fill="#2a1d14" fill-opacity=".3"/>' : '';
  // personnage un peu agrandi autour des épaules, comme le portrait de la fiche dans le jeu
  return `<svg class="av" width="${size}" height="${size}" viewBox="0 0 64 64" aria-hidden="true"><rect width="64" height="64" fill="#183022"/><g transform="translate(32 44) scale(1.15) translate(-32 -44)">`
    + (forme && R6_DERRIERE[forme] ? R6_DERRIERE[forme](c) : '')
    + `<rect x="-6" y="37" width="76" height="30" fill="${esc(k.m)}"/><rect x="-6" y="37" width="19" height="30" fill="#000" fill-opacity=".12"/><rect x="51" y="37" width="19" height="30" fill="#000" fill-opacity=".12"/>`
    + '<path d="M13 37v30M51 37v30" stroke="#000" stroke-opacity=".3" stroke-width=".8"/><ellipse cx="32" cy="37.7" rx="11" ry="1.8" fill="#000" fill-opacity=".25"/>'
    + num
    + `<rect x="20" y="14" width="24" height="23" rx="7.5" fill="${sk}" stroke="#000" stroke-opacity=".18" stroke-width=".8"/>`
    + barbe
    + '<ellipse cx="28.2" cy="24.6" rx="1.35" ry="2.3" fill="#1b1b1b"/><ellipse cx="35.8" cy="24.6" rx="1.35" ry="2.3" fill="#1b1b1b"/><path d="M26.2 29.4 Q32 34.6 37.8 29.4" fill="none" stroke="#1b1b1b" stroke-width="1.5" stroke-linecap="round"/>'
    + (forme ? R6_DEVANT[forme](c) : '<path d="M26 16.6 Q29 15.3 32 15.3" fill="none" stroke="#fff" stroke-opacity=".3" stroke-width="1.2" stroke-linecap="round"/>')
    + '</g></svg>';
}
