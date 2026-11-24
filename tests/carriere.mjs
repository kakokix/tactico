// Vérifie l'API de carrière pour Roblox (/api/carriere) avec un stockage en mémoire.
// Usage : node tests/carriere.mjs [matchs]
import { traiter } from '../netlify/functions/carriere/core.mjs';

const mem = new Map();
const store = { get: async (k) => mem.get(k) ?? null, set: async (k, v) => { mem.set(k, v); }, delete: async (k) => { mem.delete(k); } };
const lb = async () => ({ total: 0, top: [], me: null });
let erreurs = 0;
const err = (m) => { erreurs++; console.log('ERREUR', m); };
const appel = async (b) => {
  const t0 = Date.now();
  const r = await traiter(JSON.parse(JSON.stringify(b)), store, lb);
  const ms = Date.now() - t0;
  if (r.error && !b.attendreErreur) err(`${b.a}/${b.e || ''} : ${r.error}`);
  return { r, ms };
};

const { r: clubs } = await appel({ a: 'clubs' });
const fr = clubs.pays.find((p) => p.code === 'FR');
const nice = fr.clubs[0].find((c) => c.n === 'OGC Nice');
console.log('pays', clubs.pays.length, '· clubs Ligue 1', fr.clubs[0].length, '· Nice', nice.note, nice.obj);

const { r: nv, ms: msNv } = await appel({ a: 'nouvelle', nom: 'Kakokix', club: nice.id });
const t = nv.t;
console.log('nouvelle carrière en', msNv, 'ms · jeton', t.length, '· sauvegarde', (mem.get('c/' + t).byteLength / 1024).toFixed(0), 'Ko');
console.log('haut :', JSON.stringify(nv.haut));
console.log('accueil :', nv.d.titre, '|', nv.d.sous, '|', nv.d.kpis.objectif);

for (const e of ['messagerie', 'effectif', 'tactique', 'calendrier', 'competitions', 'mercato', 'entrainement', 'finances', 'club', 'carriere', 'options', 'mondial']) {
  const { r, ms } = await appel({ a: 'vue', t, e });
  if (r.ecran !== e) err(`écran ${e} renvoie ${r.ecran}`);
  console.log(`vue ${e} en ${ms} ms :`, JSON.stringify(r.d).slice(0, 110));
}
for (const o of ['resultats', 'stats', 'palmares']) await appel({ a: 'vue', t, e: 'competitions', q: { o } });
for (const o of ['free', 'mine', 'news']) await appel({ a: 'vue', t, e: 'mercato', q: { o } });
const { r: eff } = await appel({ a: 'vue', t, e: 'effectif', q: { g: 'DEF', tri: 'ovr' } });
const { r: fiche } = await appel({ a: 'vue', t, e: 'joueur', q: { id: eff.d.joueurs[0].id } });
console.log('fiche :', fiche.d.nom, fiche.d.pos, fiche.d.groupes.map((g) => g.n).join('/'));

// tactique
let { r: tac } = await appel({ a: 'tactique', t, q: { f: '4-4-2', ment: 3, press: 2 } });
if (tac.d.f !== '4-4-2' || tac.d.consignes.ment !== 3) err('tactique non appliquée');
const b0 = tac.d.banc[0]?.pid, x0 = tac.d.xi[1].pid;
({ r: tac } = await appel({ a: 'tactique', t, q: { a: x0, b: b0 } }));
if (tac.d.xi[1].pid !== b0) err('échange non appliqué');
({ r: tac } = await appel({ a: 'tactique', t, q: { f: '4-3-3', auto: true } }));
await appel({ a: 'entrainement', t, q: { focus: 'att', int: 2 } });
const { r: msg } = await appel({ a: 'lire', t, id: nv.d.messages[0]?.id });
console.log('message :', msg.message?.titre);

// recrutement d'un joueur libre
const { r: libres } = await appel({ a: 'vue', t, e: 'mercato', q: { o: 'free' } });
const { r: off } = await appel({ a: 'offre', t, q: { id: libres.d.joueurs[0].id, fee: 0 } });
console.log('offre joueur libre :', off.ok || off.refus || off.error);

// saison : continuer et jouer les matchs
const N = Number(process.argv[2] || 6);
let joues = 0, tours = 0, maxMs = 0;
while (joues < N && tours++ < 200) {
  const { r, ms } = await appel({ a: 'continuer', t });
  maxMs = Math.max(maxMs, ms);
  if (r.stop === 'match' || r.stop === 'matchday') {
    if (r.ecran !== 'match') err('écran du jour de match attendu');
    const { r: m, ms: msM } = await appel({ a: 'jouer', t, s: 1000 + joues });
    if (!m.match) { err('pas de match'); break; }
    const mm = m.match;
    const ids = new Set(Object.keys(mm.joueurs));
    for (const e of mm.eq) for (const [pid] of e.xi) if (!ids.has(pid)) err('joueur sans infos ' + pid);
    if (mm.min.length < 90) err('match trop court');
    joues++;
    console.log(`match ${joues} en ${msM} ms : ${mm.clubs[0].n} ${mm.score.join('-')} ${mm.clubs[1].n} · ${mm.apres.titre} · HDM ${mm.apres.hdm} · ${(JSON.stringify(m).length / 1024).toFixed(0)} Ko`);
  } else if (r.stop === 'season') {
    console.log('fin de saison :', r.rapport?.titre);
  }
}
const { r: acc } = await appel({ a: 'vue', t, e: 'accueil' });
console.log('après', joues, 'matchs :', acc.d.kpis.classement, '· forme', acc.d.forme, '· score', acc.d.kpis.score, '· continuer max', maxMs, 'ms');
const { r: carr } = await appel({ a: 'vue', t, e: 'carriere' });
console.log('carrière :', carr.d.kpis.bilan);
const { r: perdu } = await appel({ a: 'vue', t: 'f'.repeat(32), e: 'accueil', attendreErreur: true });
if (!perdu.perdue) err('une carrière inconnue devrait être signalée');
console.log(erreurs ? `${erreurs} erreur(s)` : 'OK');
process.exit(erreurs ? 1 : 0);
