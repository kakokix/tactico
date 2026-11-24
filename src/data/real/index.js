// Monde réel 2026-27 : vrais clubs et joueurs des cinq grands championnats, plus le Portugal, les Pays-Bas,
// la Belgique, la Turquie et l'Écosse (joueurs clés seulement, le reste de l'effectif est généré).
// Les écussons sont génériques (aucun logo officiel). Effectifs indicatifs à l'été 2026.
import FR from './fr.js';
import EN from './en.js';
import ES from './es.js';
import IT from './it.js';
import DE from './de.js';
import PT from './pt.js';
import NL from './nl.js';
import BE from './be.js';
import TR from './tr.js';
import SCO from './sco.js';

export const REAL_DATA = { FR, EN, ES, IT, DE, PT, NL, BE, TR, SCO };

// down = relégations directes, up = montées directes, po = 'playoff' (3e à 6e de D2) ou 'barrage' (16e de D1 contre 3e de D2)
// conti = places en coupe d'Europe (16 clubs en tout, d'après le classement des pays)
export const REAL_COUNTRIES = [
  { code: 'FR', name: 'France', d1: 'Ligue 1', d2: 'Ligue 2', cup: 'Coupe de France', str: 0.95, tv: 30, down: 2, up: 2, po: 'barrage', conti: 3 },
  { code: 'EN', name: 'Angleterre', d1: 'Premier League', d2: 'Championship', cup: 'FA Cup', str: 1.0, tv: 70, down: 3, up: 2, po: 'playoff', conti: 3 },
  { code: 'ES', name: 'Espagne', d1: 'LaLiga', d2: 'LaLiga 2', cup: 'Copa del Rey', str: 0.99, tv: 45, down: 3, up: 2, po: 'playoff', conti: 3 },
  { code: 'IT', name: 'Italie', d1: 'Serie A', d2: 'Serie B', cup: 'Coppa Italia', str: 0.97, tv: 40, down: 3, up: 2, po: 'playoff', conti: 3 },
  { code: 'DE', name: 'Allemagne', d1: 'Bundesliga', d2: '2. Bundesliga', cup: 'DFB-Pokal', str: 0.97, tv: 40, down: 2, up: 2, po: 'barrage', conti: 2 },
  { code: 'PT', name: 'Portugal', d1: 'Liga Portugal', d2: 'Liga Portugal 2', cup: 'Taça de Portugal', str: 0.91, tv: 14, down: 2, up: 2, po: 'barrage', conti: 1 },
  { code: 'NL', name: 'Pays-Bas', d1: 'Eredivisie', d2: 'Eerste Divisie', cup: 'KNVB Beker', str: 0.9, tv: 13, down: 2, up: 2, po: 'barrage', conti: 1 },
  { code: 'BE', name: 'Belgique', d1: 'Pro League', d2: 'Challenger Pro League', cup: 'Coupe de Belgique', str: 0.88, tv: 10, down: 2, up: 2, po: null, conti: 0 },
  { code: 'TR', name: 'Turquie', d1: 'Süper Lig', d2: '1. Lig', cup: 'Coupe de Turquie', str: 0.9, tv: 16, down: 3, up: 2, po: 'playoff', conti: 0 },
  { code: 'SCO', name: 'Écosse', d1: 'Premiership', d2: 'Championship', cup: 'Coupe d\'Écosse', str: 0.84, tv: 6, down: 1, up: 1, po: 'barrage', conti: 0 },
];
export const REAL_CONTI = "Coupe d'Europe";

function splitName(raw) {
  if (raw[0] === '*') return { fn: '', ln: raw.slice(1) };
  const u = raw.indexOf('_');
  if (u > 0) return { fn: raw.slice(0, u), ln: raw.slice(u + 1) };
  const s = raw.indexOf(' ');
  return s < 0 ? { fn: '', ln: raw } : { fn: raw.slice(0, s), ln: raw.slice(s + 1) };
}

export function parseClub(text) {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  const [name, short, abbr, c1, c2, stadium, cap, rep, city, lvl] = lines[0].split('|');
  const players = lines.slice(1).map((l) => {
    const [raw, pos, ovr, age, nat, alt, pot] = l.split('|');
    return { ...splitName(raw), pos, ovr: +ovr, age: +age, nat, alt: alt ? alt.split('/') : [], pot: pot ? +pot : null };
  });
  return { name, short, abbr, colors: [c1, c2], stadium, cap: +cap, rep: +rep, city, lvl: lvl ? +lvl : null, players };
}
