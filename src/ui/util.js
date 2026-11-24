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
