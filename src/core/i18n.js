// Langue des textes produits par le moteur : français sur le site, anglais pour le jeu Roblox.
// Le site ne change jamais la langue ; les fonctions Netlify du jeu Roblox appellent setLang('en').
// Règle : jamais de tirage aléatoire dans les arguments de L() (les deux textes sont évalués).
export let LANG = 'fr';
export function setLang(l) { LANG = l === 'en' ? 'en' : 'fr'; }
export const L = (fr, en) => (LANG === 'en' ? en : fr);

const POS_EN = { GB: 'GK', DD: 'RB', DC: 'CB', DG: 'LB', MDC: 'DM', MD: 'RM', MC: 'CM', MG: 'LM', MOC: 'AM', AD: 'RW', AG: 'LW', BU: 'ST' };
export const posL = (p) => (LANG === 'en' ? POS_EN[p] || p : p);

const PAYS_EN = { Angleterre: 'England', Espagne: 'Spain', Italie: 'Italy', Allemagne: 'Germany', 'Pays-Bas': 'Netherlands', Belgique: 'Belgium', Turquie: 'Turkey', Écosse: 'Scotland' };
export const paysL = (n) => (LANG === 'en' ? PAYS_EN[n] || n : n);

// 1er / 1st, 2e / 2nd…
export function ordL(n) {
  if (LANG !== 'en') return `${n}e`;
  const s = ['th', 'st', 'nd', 'rd'], v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}
