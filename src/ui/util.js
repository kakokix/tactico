// Aides d'affichage : échappement, icônes, formats, écussons.
import { NATIONS } from '../data/names.js';
import { POS_GROUP } from '../core/constants.js';

export const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const I = (d, extra = '') => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" ${extra}>${d}</svg>`;
export const ICON = {
  home: I('<path d="M3 11l9-7 9 7"/><path d="M5 10v10h14V10"/><path d="M10 20v-6h4v6"/>'),
  squad: I('<circle cx="9" cy="8" r="3.2"/><path d="M3.5 19c.6-3.2 3-5 5.5-5s4.9 1.8 5.5 5"/><circle cx="17" cy="9" r="2.4"/><path d="M15.5 14.2c2.4-.2 4.4 1.3 5 4.3"/>'),
  tactics: I('<rect x="3" y="3" width="18" height="18" rx="3"/><path d="M3 12h18"/><circle cx="12" cy="12" r="3"/><circle cx="7" cy="7" r="1"/><circle cx="17" cy="17" r="1"/>'),
  transfer: I('<path d="M4 8h13l-3-3"/><path d="M20 16H7l3 3"/>'),
  more: I('<circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/>'),
  cal: I('<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>'),
  trophy: I('<path d="M8 4h8v5a4 4 0 0 1-8 0V4z"/><path d="M16 5h3v2a3 3 0 0 1-3 3M8 5H5v2a3 3 0 0 0 3 3"/><path d="M12 13v4M8 21h8M9.5 17h5"/>'),
  table: I('<path d="M4 6h16M4 12h16M4 18h16"/><path d="M8 6v12"/>'),
  money: I('<rect x="3" y="6" width="18" height="12" rx="2"/><circle cx="12" cy="12" r="2.6"/><path d="M7 9.5v5M17 9.5v5"/>'),
  train: I('<path d="M4 18l4-4 3 3 8-8"/><path d="M15 9h4v4"/>'),
  club: I('<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3z"/>'),
  career: I('<circle cx="12" cy="7" r="3.5"/><path d="M5 21c.7-4 3.6-6 7-6s6.3 2 7 6"/>'),
  world: I('<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.8 3 2.8 15 0 18M12 3c-2.8 3-2.8 15 0 18"/>'),
  inbox: I('<path d="M4 4h16v12H15l-3 3-3-3H4z"/><path d="M8 9h8M8 12h5"/>'),
  cog: I('<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1"/>'),
  play: I('<path d="M7 4l13 8-13 8z" fill="currentColor"/>'),
  pause: I('<path d="M7 4h4v16H7zM13 4h4v16h-4z" fill="currentColor" stroke="none"/>'),
  next: I('<path d="M5 4l10 8-10 8z" fill="currentColor"/><path d="M19 4v16"/>'),
  x: I('<path d="M6 6l12 12M18 6L6 18"/>'),
  back: I('<path d="M15 5l-7 7 7 7"/>'),
  star: I('<path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z" fill="currentColor" stroke="none"/>'),
  ball: I('<circle cx="12" cy="12" r="9"/><path d="M12 7l4 3-1.5 4.5h-5L8 10z"/>'),
  sub: I('<path d="M7 4v14M3 14l4 4 4-4"/><path d="M17 20V6M13 10l4-4 4 4"/>'),
  plus: I('<path d="M12 5v14M5 12h14"/>'),
  search: I('<circle cx="11" cy="11" r="6.5"/><path d="M20 20l-4-4"/>'),
  heart: I('<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/>'),
  inj: I('<path d="M12 4v16M4 12h16"/>'),
  card: I('<rect x="7" y="3" width="10" height="16" rx="2"/>'),
  save: I('<path d="M5 3h11l3 3v15H5z"/><path d="M8 3v6h8V3M8 21v-7h8v7"/>'),
};

export const flag = (nat) => `<span class="flag" title="${esc(NATIONS[nat]?.name || nat)}">${NATIONS[nat]?.flag || '🏳️'}</span>`;
export const natName = (nat) => NATIONS[nat]?.name || nat;

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
  const txt = (club.short || '?').slice(0, 3);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 120"><defs><clipPath id="k"><path d="${d}"/></clipPath></defs>`
    + `<path d="${d}" fill="${c1}"/><g clip-path="url(#k)">${patternSVG(club.crest.pat, c2)}</g>`
    + `<path d="${d}" fill="none" stroke="${c2}" stroke-width="5"/><path d="${d}" fill="none" stroke="rgba(0,0,0,.35)" stroke-width="1.5"/>`
    + `<circle cx="50" cy="60" r="25" fill="${c1}" stroke="${c2}" stroke-width="4"/>`
    + `<text x="50" y="67.5" text-anchor="middle" font-family="Arial Black,Arial,Helvetica,sans-serif" font-weight="900" font-size="${txt.length > 2 ? 19 : 23}" fill="${c2}">${txt}</text></svg>`;
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
