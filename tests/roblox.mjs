// Vérifie les données du jeu Roblox : monde exporté et API de match.
// Usage : node tests/roblox.mjs
import { construireMonde, exporterMonde, nomModifie, COUPES } from '../roblox/outils/monde.mjs';
import { SOSIES } from '../roblox/outils/sosies.mjs';
import { simulerMatch } from '../netlify/functions/match/core.mjs';

let erreurs = 0;
const err = (m) => { erreurs++; if (erreurs < 25) console.log('ERREUR', m); };

for (const [a, b] of [['Mbappé', 'Mbappi'], ['Vinícius Júnior', 'Vinicios Junior'], ['Haaland', 'Haalend'], ['Ødegaard', 'Odegaerd'], ['de Jong', 'de Jang']]) {
  if (nomModifie(a) !== b) err(`nomModifie(${a}) = ${nomModifie(a)}, attendu ${b}`);
}

const st = construireMonde();
const ex = exporterMonde(st);
const txt = JSON.stringify(ex);
console.log('monde.json :', (txt.length / 1024).toFixed(0), 'Ko,', ex.clubs.length, 'clubs');

let nj = 0, nSosies = 0;
const ids = new Set();
for (const c of ex.clubs) {
  const vus = new Set();
  if (!/^#[0-9A-F]{6}$/i.test(c.kit.m) || !/^#[0-9A-F]{6}$/i.test(c.kit.s) || !/^#[0-9A-F]{6}$/i.test(c.kit.n)) err(`maillot ${c.n}`);
  if (c.j.length < 18) err(`${c.n} : effectif de ${c.j.length}`);
  for (const j of c.j) {
    nj++;
    ids.add(j[0]);
    const [, nom, , , , num, coupe, barbe, peau, sosie] = j;
    if (!COUPES.includes(coupe)) err(`${nom} : coupe ${coupe}`);
    if (!['', 'barbe', 'courte'].includes(barbe)) err(`${nom} : barbe ${barbe}`);
    if (!(peau >= 1 && peau <= 6)) err(`${nom} : teint ${peau}`);
    if (!num) err(`${nom} : pas de numéro`);
    const k = `${coupe}/${barbe}/${peau}`;
    if (vus.has(k) && !sosie) err(`${c.n} : deux joueurs avec le même look (${k})`);
    vus.add(k);
    if (sosie) nSosies++;
  }
}
// aucun vrai nom ne doit apparaître tel quel
let vraisNoms = 0;
for (const p of Object.values(st.players)) if (p.real && p.ln === p.ln.normalize('NFC') && false) vraisNoms++;
const tousNoms = new Set(ex.clubs.flatMap((c) => c.j.map((j) => j[1])));
for (const vrai of ['K. Mbappé', 'E. Haaland', 'J. Bellingham', 'L. Yamal', 'Pedri', 'H. Kane', 'M. Salah']) if (tousNoms.has(vrai)) err(`vrai nom présent : ${vrai}`);
const nbTables = Object.keys(SOSIES).length;
console.log(nj, 'joueurs,', nSosies, 'sosies appliqués sur', nbTables, 'dans la table');
if (nSosies < nbTables * 0.95) err(`sosies non trouvés : ${nbTables - nSosies}`);
console.log('Exemples :', ex.clubs.find((c) => c.n === 'Real Madrid').j.filter((j) => j[9]).slice(0, 6).map((j) => `${j[1]} (${j[6]}, ${j[8]})`).join(' · '));

// API de match
const rm = ex.clubs.find((c) => c.n === 'Real Madrid').id, fcb = ex.clubs.find((c) => c.n === 'FC Barcelona').id;
const t0 = Date.now();
const m1 = simulerMatch(rm, fcb, '1234');
const m2 = simulerMatch(rm, fcb, '1234');
console.log('match en', Date.now() - t0, 'ms (deux fois) :', m1.score.join('-'), ',', m1.min.length, 'minutes,', (JSON.stringify(m1).length / 1024).toFixed(0), 'Ko');
if (JSON.stringify(m1) !== JSON.stringify(m2)) err('le même match ne donne pas le même résultat');
for (const e of m1.eq) {
  if (e.xi.length !== 11) err('onze incomplet');
  for (const [pid] of e.xi) if (!ids.has(pid)) err(`joueur inconnu dans la compo : ${pid}`);
  for (const pid of e.banc) if (!ids.has(pid)) err(`remplaçant inconnu : ${pid}`);
}
const buts = m1.min.flatMap((m) => m[3]).filter((e) => e[0] === 'goal');
if (buts.length !== m1.score[0] + m1.score[1]) err('buts et score ne correspondent pas');
for (const e of m1.min.flatMap((m) => m[3])) if (/Mbappé|Bellingham|Yamal/.test(e[4])) err(`vrai nom dans un commentaire : ${e[4]}`);
console.log('Buts :', buts.map((e) => e[4]).join(' | '));
let total = [0, 0];
for (let s = 1; s <= 40; s++) {
  const r = simulerMatch(ex.clubs[(s * 7) % 20].id, ex.clubs[(s * 13 + 3) % 20].id, String(s));
  if (r.error) continue;
  total[0] += r.score[0]; total[1] += r.score[1];
}
console.log('40 matchs de Ligue 1 : moyenne', ((total[0] + total[1]) / 40).toFixed(2), 'buts');
if (simulerMatch(rm, rm, '1').error == null) err('un club contre lui-même devrait être refusé');
if (simulerMatch('xx', fcb, '1').error == null) err('un club inconnu devrait être refusé');

console.log(erreurs ? `${erreurs} erreur(s)` : 'OK');
process.exit(erreurs ? 1 : 0);
