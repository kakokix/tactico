// Constantes du jeu : attributs, postes, formations, tactiques.
export const VERSION = 1;
export const GAME_NAME = 'Tactico';

export const ATTRS = ['fin', 'tir', 'pas', 'vis', 'dri', 'cen', 'tac', 'mar', 'tet', 'pla', 'sgf', 'tra', 'vit', 'end', 'pui', 'cpa', 'arr', 'sor'];
export const A = Object.fromEntries(ATTRS.map((k, i) => [k, i]));
export const ATTR_NAMES = {
  fin: 'Finition', tir: 'Tir de loin', pas: 'Passes', vis: 'Vision', dri: 'Dribble', cen: 'Centres',
  tac: 'Tacles', mar: 'Marquage', tet: 'Jeu de tête', pla: 'Placement', sgf: 'Sang-froid', tra: 'Volume de jeu',
  vit: 'Vitesse', end: 'Endurance', pui: 'Puissance', cpa: 'Coups de pied arrêtés', arr: 'Arrêts', sor: 'Sorties',
};
export const ATTR_GROUPS = [
  ['Attaque', ['fin', 'tir', 'dri', 'cen', 'cpa']],
  ['Jeu', ['pas', 'vis', 'sgf', 'tra']],
  ['Défense', ['tac', 'mar', 'tet', 'pla']],
  ['Physique', ['vit', 'end', 'pui']],
  ['Gardien', ['arr', 'sor']],
];

export const POS = ['GB', 'DD', 'DC', 'DG', 'MDC', 'MD', 'MC', 'MG', 'MOC', 'AD', 'AG', 'BU'];
export const POS_NAMES = {
  GB: 'Gardien', DD: 'Latéral droit', DC: 'Défenseur central', DG: 'Latéral gauche', MDC: 'Milieu défensif',
  MD: 'Milieu droit', MC: 'Milieu central', MG: 'Milieu gauche', MOC: 'Milieu offensif', AD: 'Ailier droit',
  AG: 'Ailier gauche', BU: 'Attaquant',
};
export const POS_GROUP = { GB: 'GB', DD: 'DEF', DC: 'DEF', DG: 'DEF', MDC: 'MIL', MD: 'MIL', MC: 'MIL', MG: 'MIL', MOC: 'MIL', AD: 'ATT', AG: 'ATT', BU: 'ATT' };
export const POS_ORDER = Object.fromEntries(POS.map((p, i) => [p, i]));

// Poids des attributs pour la note globale à chaque poste (somme = 1)
const W = {
  GB: { arr: .40, sor: .25, pla: .12, sgf: .08, pas: .05, pui: .04, vit: .03, end: .03 },
  DC: { tac: .20, mar: .20, tet: .15, pla: .15, pui: .10, vit: .06, sgf: .05, pas: .05, tra: .02, end: .02 },
  DD: { tac: .15, mar: .12, vit: .14, end: .10, cen: .12, pas: .09, pla: .10, tra: .08, dri: .06, sgf: .02, pui: .02 },
  MDC: { tac: .18, mar: .10, pla: .14, pas: .15, vis: .07, tra: .12, end: .08, pui: .08, sgf: .06, tet: .02 },
  MC: { pas: .20, vis: .14, tra: .10, end: .09, tac: .08, dri: .08, sgf: .10, pla: .07, tir: .07, pui: .03, mar: .02, fin: .02 },
  MD: { cen: .15, dri: .15, vit: .14, pas: .12, end: .10, tra: .09, vis: .07, fin: .05, tir: .05, sgf: .04, tac: .04 },
  MOC: { vis: .18, pas: .17, dri: .15, sgf: .10, tir: .10, fin: .10, vit: .06, pla: .06, tra: .04, cpa: .04 },
  AD: { dri: .20, vit: .20, fin: .12, cen: .12, pas: .08, sgf: .08, tir: .07, vis: .05, tra: .04, end: .04 },
  BU: { fin: .28, sgf: .14, tet: .12, pla: .12, vit: .10, pui: .08, dri: .08, tir: .05, pas: .03 },
};
W.DG = W.DD; W.MG = W.MD; W.AG = W.AD;
export const WEIGHTS = {};
for (const p of POS) {
  const arr = new Array(ATTRS.length).fill(0);
  for (const [k, v] of Object.entries(W[p])) arr[A[k]] = v;
  WEIGHTS[p] = arr;
}

// Compatibilité entre postes (joueur naturel → poste occupé)
const NEAR = {
  GB: {},
  DC: { DD: .8, DG: .8, MDC: .85 },
  DD: { DC: .8, MD: .85, DG: .82, AD: .72 },
  DG: { DC: .8, MG: .85, DD: .82, AG: .72 },
  MDC: { MC: .9, DC: .85 },
  MC: { MDC: .9, MOC: .86, MD: .8, MG: .8 },
  MD: { MG: .85, AD: .88, MC: .8, DD: .78 },
  MG: { MD: .85, AG: .88, MC: .8, DG: .78 },
  MOC: { MC: .86, AD: .8, AG: .8, BU: .8 },
  AD: { AG: .88, MD: .88, MOC: .8, BU: .8 },
  AG: { AD: .88, MG: .88, MOC: .8, BU: .8 },
  BU: { MOC: .8, AD: .78, AG: .78 },
};
export function posFit(player, slotPos) {
  if (player.pos === slotPos) return 1;
  if (player.alt && player.alt.includes(slotPos)) return 0.96;
  if (player.pos === 'GB' || slotPos === 'GB') return 0.3;
  return NEAR[player.pos][slotPos] || 0.62;
}

// Formations : x = largeur (0 = gauche de l'équipe), y = profondeur (0 = propre but)
const F = (s) => s.split(' ').map((t) => { const [pos, x, y] = t.split(':'); return { pos, x: +x, y: +y }; });
export const FORMATIONS = {
  '4-4-2': F('GB:50:5 DG:15:25 DC:38:21 DC:62:21 DD:85:25 MG:14:52 MC:38:48 MC:62:48 MD:86:52 BU:38:78 BU:62:78'),
  '4-3-3': F('GB:50:5 DG:15:25 DC:38:21 DC:62:21 DD:85:25 MC:30:48 MDC:50:39 MC:70:48 AG:17:74 BU:50:80 AD:83:74'),
  '4-2-3-1': F('GB:50:5 DG:15:25 DC:38:21 DC:62:21 DD:85:25 MDC:37:40 MDC:63:40 AG:17:66 MOC:50:62 AD:83:66 BU:50:82'),
  '4-1-2-1-2': F('GB:50:5 DG:14:27 DC:38:21 DC:62:21 DD:86:27 MDC:50:37 MC:30:50 MC:70:50 MOC:50:64 BU:38:80 BU:62:80'),
  '3-5-2': F('GB:50:5 DC:27:22 DC:50:19 DC:73:22 MG:9:53 MC:33:48 MDC:50:38 MC:67:48 MD:91:53 BU:38:78 BU:62:78'),
  '3-4-3': F('GB:50:5 DC:27:22 DC:50:19 DC:73:22 MG:11:50 MC:38:45 MC:62:45 MD:89:50 AG:19:75 BU:50:80 AD:81:75'),
  '5-3-2': F('GB:50:5 DG:9:33 DC:29:22 DC:50:19 DC:71:22 DD:91:33 MC:29:50 MC:50:46 MC:71:50 BU:38:78 BU:62:78'),
  '4-5-1': F('GB:50:5 DG:15:25 DC:38:21 DC:62:21 DD:85:25 MG:12:55 MC:32:50 MDC:50:40 MC:68:50 MD:88:55 BU:50:80'),
  '5-4-1': F('GB:50:5 DG:9:31 DC:29:22 DC:50:19 DC:71:22 DD:91:31 MG:14:53 MC:38:48 MC:62:48 MD:86:53 BU:50:78'),
};
export const FORMATION_LIST = Object.keys(FORMATIONS);

export const MENTALITY = ['Très défensive', 'Défensive', 'Équilibrée', 'Offensive', 'Très offensive'];
export const PRESSING = ['Bas', 'Moyen', 'Haut'];
export const STYLE = ['Possession', 'Équilibré', 'Jeu direct', 'Contre-attaque'];
export const WIDTH = ['Étroit', 'Normal', 'Large'];
export const DLINE = ['Basse', 'Normale', 'Haute'];
export const DEFAULT_TACTICS = { formation: '4-3-3', ment: 2, press: 1, style: 1, width: 1, line: 1 };

export const TRAINING_FOCUS = [
  { id: 'eq', name: 'Équilibré', attrs: null },
  { id: 'att', name: 'Attaque', attrs: ['fin', 'tir', 'dri', 'cen'] },
  { id: 'def', name: 'Défense', attrs: ['tac', 'mar', 'tet', 'pla'] },
  { id: 'tech', name: 'Technique', attrs: ['pas', 'vis', 'dri', 'cpa'] },
  { id: 'phy', name: 'Physique', attrs: ['vit', 'end', 'pui'] },
  { id: 'tac', name: 'Tactique', attrs: ['pla', 'sgf', 'tra', 'vis'] },
];
export const TRAINING_INTENSITY = ['Légère', 'Normale', 'Intense'];

// Pays jouables (championnats)
export const LEAGUE_COUNTRIES = [
  { code: 'FR', name: 'France', d1: 'Ligue Élite', d2: 'Ligue Pro', cup: 'Coupe de la Nation', str: 0.95, tv: 30 },
  { code: 'EN', name: 'Angleterre', d1: 'Premier Division', d2: 'First Division', cup: 'National Cup', str: 1.0, tv: 70 },
  { code: 'ES', name: 'Espagne', d1: 'Primera División', d2: 'Segunda División', cup: 'Copa Nacional', str: 0.99, tv: 45 },
  { code: 'IT', name: 'Italie', d1: 'Prima Divisione', d2: 'Seconda Divisione', cup: 'Coppa Nazionale', str: 0.97, tv: 40 },
  { code: 'DE', name: 'Allemagne', d1: 'Erste Liga', d2: 'Zweite Liga', cup: 'Pokal', str: 0.97, tv: 40 },
];
export const CONTI_NAME = 'Coupe des Étoiles';
export const CLUBS_PER_DIV = 18;
export const RELEGATION = 3;

// Score manager (classement mondial) — même formule côté serveur
export const SCORE_RULES = { win: 3, draw: 1, title1: 250, title2: 100, cup: 120, conti: 400, promo: 80, objMet: 40, objEx: 60 };
