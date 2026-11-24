// Aides d'affichage : échappement, icônes, formats, écussons.
import { NATIONS } from '../data/names.js';
import { PAYS } from '../data/pays.js';
import ASSETS from '../assets/assets.json';
import { POS_GROUP } from '../core/constants.js';

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

// ---------- Avatar dessiné d'un joueur ----------
// Tiré au hasard à partir de son seul identifiant : jamais d'après son nom, sa nationalité ou un vrai visage.
const AV_PEAU = ['#f5cdaf', '#eab892', '#cc8e69', '#a06948', '#7c5238', '#5c3c2a'];
const AV_CHEV = ['#17120f', '#2e1d13', '#4a2f1c', '#6e4527', '#c99b4a', '#a4522b'];
function avHash(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
function avRnd(seed) {
  let t = seed >>> 0;
  return () => {
    t = (t + 0x6d2b79f5) >>> 0;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}
const AV_O = '#13201a';
const AV_COUPES = {
  ras: (c) => `<path d="M20.6 25c.4-10 5.4-11.5 11.4-11.5s11 1.5 11.4 11.5c-3.4-5.5-7.4-6.5-11.4-6.5s-8 1-11.4 6.5z" fill="${c}"/>`,
  court: (c) => `<path d="M20 26c-1-13 6-15 12-15 7 0 13 2.5 12 15-2-5-4-6.5-8-5.5-3-2.5-9-2-12-.5-2 1-3 3-4 6z" fill="${c}" stroke="${AV_O}" stroke-width="1.6" stroke-linejoin="round"/>`,
  raie: (c) => `<path d="M20 26c-1-12 5-15 13-15 7 0 12 3 11 14-3-6-7-8-13-8-4 0-8 2-11 9z" fill="${c}" stroke="${AV_O}" stroke-width="1.6" stroke-linejoin="round"/>`,
  boucles: (c) => `<g fill="${c}" stroke="${AV_O}" stroke-width="1.4">${[[21.5, 21], [25.5, 16], [32, 14], [38.5, 16], [42.5, 21]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="5.2"/>`).join('')}</g>`,
  iroquois: (c) => `<path d="M29 12c1-3 5-3 6 0v9c-1-1.5-5-1.5-6 0z" fill="${c}" stroke="${AV_O}" stroke-width="1.4"/>`,
  chauve: () => '<path d="M26 17.5c2-1.2 4-1.6 6-1.6" fill="none" stroke="#fff" stroke-opacity=".35" stroke-width="1.6" stroke-linecap="round"/>',
};
const AV_DERRIERE = {
  afro: (c) => `<circle cx="32" cy="23" r="17" fill="${c}" stroke="${AV_O}" stroke-width="2"/>`,
  longs: (c) => `<path d="M19 28c-2-16 7-19 13-19s15 3 13 19l1 14c-4 2-6-2-6-6H24c0 4-2 8-6 6z" fill="${c}" stroke="${AV_O}" stroke-width="1.8" stroke-linejoin="round"/>`,
};
export function avatar(p, club, size = 40) {
  const r = avRnd(avHash(String(p.id) + ':avatar'));
  const peau = Math.floor(r() * 6);
  const styles = ['ras', 'ras', 'court', 'court', 'court', 'raie', 'raie', 'boucles', 'boucles', 'afro', 'longs', 'iroquois', 'chauve'];
  const style = styles[Math.floor(r() * styles.length)];
  let chev = AV_CHEV[Math.floor(r() * (peau > 2 ? 3 : AV_CHEV.length))];
  if (p.age >= 32 && r() < 0.3) chev = '#8d8d8d';
  const barbe = p.age >= 21 && r() < 0.28;
  const c1 = club ? club.colors[0] : '#3a4a42', c2 = club ? club.colors[1] : '#8fa99b';
  const sk = AV_PEAU[peau];
  return `<svg class="av" width="${size}" height="${size}" viewBox="0 0 64 64" aria-hidden="true"><rect width="64" height="64" fill="#183022"/>`
    + (AV_DERRIERE[style] ? AV_DERRIERE[style](chev) : '')
    + `<rect x="27.5" y="35" width="9" height="13" rx="3" fill="${sk}" stroke="${AV_O}" stroke-width="2"/>`
    + `<path d="M5 66c2-13 12-18.5 27-18.5S57 53 59 66z" fill="${c1}" stroke="${AV_O}" stroke-width="2"/><path d="M25.5 48 32 55l6.5-7" fill="none" stroke="${c2}" stroke-width="3" stroke-linejoin="round"/>`
    + `<circle cx="20.6" cy="28.5" r="3" fill="${sk}" stroke="${AV_O}" stroke-width="1.8"/><circle cx="43.4" cy="28.5" r="3" fill="${sk}" stroke="${AV_O}" stroke-width="1.8"/>`
    + `<ellipse cx="32" cy="27" rx="11.6" ry="13" fill="${sk}" stroke="${AV_O}" stroke-width="2"/>`
    + (barbe ? `<path d="M20.9 29c.3 9.5 5 12.5 11.1 12.5S42.8 38.5 43.1 29c-2 5.5-6 7-11.1 7s-9.1-1.5-11.1-7z" fill="${chev}"/>` : '')
    + `<circle cx="27.4" cy="28" r="1.5" fill="${AV_O}"/><circle cx="36.6" cy="28" r="1.5" fill="${AV_O}"/><path d="M25 24.3h4.6M34.4 24.3H39" stroke="${chev}" stroke-width="1.7" stroke-linecap="round"/>`
    + `<path d="M29.2 33.8q2.8 1.9 5.6 0" fill="none" stroke="#6b2f24" stroke-width="1.5" stroke-linecap="round"/>`
    + (AV_COUPES[style] || (style === 'afro' ? AV_COUPES.boucles : AV_COUPES.court))(chev)
    + '</svg>';
}
