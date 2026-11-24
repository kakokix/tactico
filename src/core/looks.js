// Personnages R6 des joueurs : coupe, barbe et teint, tirés de l'identifiant du joueur.
// Partagé par le jeu Roblox (roblox/outils/monde.mjs) et par le site (avatar dans src/ui/util.js) :
// un joueur a la même tête des deux côtés. Les sosies des stars n'existent que dans le jeu Roblox,
// sous un nom modifié : le site garde toujours le look tiré au hasard.

// Clés des coupes : mêmes noms que Apparence.COUPES dans Roblox, avec leur poids dans le tirage
export const ALEA = [
  ['buzz', 3], ['buzz2', 2], ['buzzBrun', 2], ['buzzBlond', 0.5], ['noirFrange', 2], ['brunCourt', 3], ['brunCoiffe', 2],
  ['brunStyle', 1], ['brunMeche', 1.5], ['brunLisse', 1.5], ['bouclesNoires', 1.5], ['bouclesBrunes', 1.5], ['ondulesNoirs', 1.5],
  ['twists', 1], ['locks', 1], ['afro', 0.5], ['longsBoucles', 0.4], ['longsBruns', 0.5], ['blondCourt', 1], ['blondEpi', 0.8],
  ['chignonBlond', 0.3], ['chignonNoir', 0.4], ['noirArriere', 0.6], ['roux', 0.4], ['auburn', 0.4], ['desordre', 1], ['chauve', 0.6],
];
export const COUPES = ALEA.map((x) => x[0]);
const CLAIRES = new Set(['buzzBlond', 'blondCourt', 'blondEpi', 'chignonBlond', 'roux', 'auburn']); // seulement avec les teints clairs
const TOTAL = ALEA.reduce((s, x) => s + x[1], 0);

// Graine des looks : celle du monde réel (roblox/outils/monde.mjs, GRAINE)
export const GRAINE_LOOKS = 2026;

export function hashLook(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
export function aleaLook(seed) {
  let t = seed >>> 0;
  return () => {
    t = (t + 0x6d2b79f5) >>> 0;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}
export function tirerLook(rnd, age) {
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

// Look affiché sur le site : celui que la carrière a reçu dans le jeu Roblox, sauf un sosie de star
export function lookSite(p) {
  if (p.look && !p.look.sosie && p.look.coupe) return p.look;
  return tirerLook(aleaLook(hashLook(p.id + ':' + GRAINE_LOOKS)), p.age);
}

// Couleurs du maillot (comme dans le jeu) : maillot, short, numéro
function lum(hex) {
  const n = parseInt(hex.slice(1), 16);
  return (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
}
export function maillot([c1, c2]) {
  const clair = lum(c1) > 0.85;
  const num = Math.abs(lum(c1) - lum(c2)) > 0.35 ? c2 : lum(c1) > 0.5 ? '#111111' : '#FFFFFF';
  return { m: c1, s: clair ? c1 : c2, n: num };
}
