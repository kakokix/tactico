// Vérifie l'API de carrière pour Roblox (/api/carriere) : carrières en mémoire, classement mondial sur un serveur Blobs local.
// Usage : node tests/carriere.mjs [matchs]
import { BlobsServer } from '@netlify/blobs/server';
import { setEnvironmentContext, getStore } from '@netlify/blobs';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { traiter } from '../netlify/functions/carriere/core.mjs';
import { handle as classement } from '../netlify/functions/leaderboard/core.mjs';

const dir = mkdtempSync(join(tmpdir(), 'blobs-'));
const server = new BlobsServer({ directory: dir, token: 'tok', port: 0 });
const { port } = await server.start();
setEnvironmentContext({ siteID: 'site', token: 'tok', edgeURL: `http://localhost:${port}`, uncachedEdgeURL: `http://localhost:${port}`, primaryRegion: 'us-east-2' });
const lbStore = getStore({ name: 'leaderboard', consistency: 'strong' });
const lire = async () => (await classement(new Request('https://x/api/leaderboard?sort=score'), lbStore)).json();
const envoyer = async (e) => (await classement(new Request('https://x/api/leaderboard', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(e) }), lbStore)).json();

const mem = new Map();
const store = { get: async (k) => mem.get(k) ?? null, set: async (k, v) => { mem.set(k, v); }, delete: async (k) => { mem.delete(k); } };
let erreurs = 0;
const err = (m) => { erreurs++; console.log('ERREUR', m); };
// Le jeu Roblox est en anglais : aucun mot français dans les textes renvoyés (hors noms propres)
const FR = /\b(Saison|Objectif|joueurs|Victoire|Défaite|Match nul|domicile|extérieur|Budget transferts|réputation|Entraîneur|Sans club|non lu|Tirage|Blessure|Président|Adjoint|Médecin|semaine|libre|prêt|journée|Coupe d'Europe|Angleterre|Espagne|Allemagne|Italie|Finir|maintien|Bienvenue)\b/;
const textes = (o, out = []) => {
  if (typeof o === 'string') out.push(o);
  else if (o && typeof o === 'object') for (const v of Object.values(o)) textes(v, out);
  return out;
};
const verifierAnglais = (r, ou) => {
  for (const txt of textes(r)) {
    const m = txt.match(FR);
    if (m) { err(`texte français dans ${ou} : « ${txt.slice(0, 140)} »`); return; }
  }
};
const appel = async (b) => {
  const t0 = Date.now();
  const r = await traiter(JSON.parse(JSON.stringify(b)), store, lire, envoyer);
  const ms = Date.now() - t0;
  if (r.error && !b.attendreErreur) err(`${b.a}/${b.e || ''} : ${r.error}`);
  verifierAnglais(r, `${b.a}/${b.e || ''}`);
  return { r, ms };
};

const { r: clubs } = await appel({ a: 'clubs' });
const fr = clubs.pays.find((p) => p.code === 'FR');
const nice = fr.clubs[0].find((c) => c.n === 'OGC Nice');
console.log('pays', clubs.pays.length, '· clubs Ligue 1', fr.clubs[0].length, '· Nice', nice.note, nice.obj);

const { r: nv, ms: msNv } = await appel({ a: 'nouvelle', nom: 'Kakokix', club: nice.id, nat: 'GB' });
const t = nv.t;
console.log('nouvelle carrière en', msNv, 'ms · jeton', t.length, '· sauvegarde', (mem.get('c/' + t).byteLength / 1024).toFixed(0), 'Ko');
console.log('haut :', JSON.stringify(nv.haut));
console.log('accueil :', nv.d.titre, '|', nv.d.sous, '|', nv.d.kpis.objectif);

for (const e of ['messagerie', 'effectif', 'tactique', 'calendrier', 'competitions', 'mercato', 'entrainement', 'finances', 'club', 'carriere', 'options', 'mondial']) {
  const { r, ms } = await appel({ a: 'vue', t, e });
  if (r.ecran !== e) err(`écran ${e} renvoie ${r.ecran}`);
  console.log(`vue ${e} en ${ms} ms :`, JSON.stringify(r.d).slice(0, 110));
}
for (const o of ['resultats', 'coupes', 'europe', 'stats', 'palmares']) await appel({ a: 'vue', t, e: 'competitions', q: { o } });
const { r: en1 } = await appel({ a: 'vue', t, e: 'competitions', q: { pays: 'EN', div: 1 } });
console.log('Premier League :', en1.d.titre, '·', en1.d.lignes.length, 'clubs ·', en1.d.legende);
for (const o of ['free', 'mine', 'news']) await appel({ a: 'vue', t, e: 'mercato', q: { o } });
const { r: eff } = await appel({ a: 'vue', t, e: 'effectif', q: { g: 'DEF', tri: 'ovr' } });
const { r: fiche } = await appel({ a: 'vue', t, e: 'joueur', q: { id: eff.d.joueurs[0].id } });
console.log('fiche :', fiche.d.nom, fiche.d.pos, fiche.d.groupes.map((g) => g.n).join('/'), '·', fiche.d.kpis.map((k) => k.join(' ')).join(' · '));
// actions sur ses joueurs
const pid = eff.d.joueurs[0].id;
for (const f of ['liste', 'liste', 'penalty', 'prolonger']) {
  const { r } = await appel({ a: 'joueur', t, e: 'joueur', q: { id: pid, f } });
  console.log(`joueur ${f} :`, r.ok || r.refus || r.error);
}
const { r: jeunes } = await appel({ a: 'vue', t, e: 'effectif', q: { g: 'youth' } });
if (jeunes.d.joueurs.length >= 2) {
  const { r: pr } = await appel({ a: 'joueur', t, e: 'joueur', q: { id: jeunes.d.joueurs[0].id, f: 'promouvoir' } });
  const { r: li } = await appel({ a: 'joueur', t, e: 'effectif', q: { id: jeunes.d.joueurs[1].id, f: 'liberer' } });
  console.log('jeunes :', pr.ok, '·', li.ok);
}
// club : délégation, budgets, infrastructures, stade
for (const q of [{ f: 'delegation', k: 'renew' }, { f: 'delegation', k: 'renew' }, { f: 'budget', v: 1 }, { f: 'budget', v: -1 }, { f: 'infra', k: 'med' }]) {
  const { r } = await appel({ a: 'club', t, e: 'finances', q, attendreErreur: true });
  console.log('club', JSON.stringify(q), ':', r.ok || r.error || 'ok', '· solde', r.d.kpis?.solde);
}
const { r: rep0 } = await appel({ a: 'repondre', t, id: nv.d.messages[0]?.id, q: { r: 'accepter' }, attendreErreur: true });
if (!rep0.error) err('répondre à un message sans action devrait échouer');

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
console.log('carrière :', carr.d.kpis.bilan, '· score', carr.d.kpis.score);
// messages avec action (offres pour nos joueurs, offres d'emploi)
const { r: boite } = await appel({ a: 'vue', t, e: 'messagerie' });
const avecAction = boite.d.messages.find((m) => m.action);
if (avecAction) {
  const { r: lu } = await appel({ a: 'lire', t, id: avecAction.id });
  console.log('message à traiter :', lu.message.titre, '·', lu.message.act?.texte);
  const { r: rp } = await appel({ a: 'repondre', t, id: avecAction.id, q: { r: 'refuser' } });
  console.log('réponse :', rp.ok || rp.refus);
}
// classement mondial : la carrière Roblox y figure
const { r: monde } = await appel({ a: 'vue', t, e: 'mondial' });
console.log('classement mondial :', monde.d.moi || '(absent)', '·', monde.d.lignes?.length, 'ligne(s)');
if (joues && !monde.d.moi) err('la carrière devrait apparaître au classement mondial');
const { r: cl } = await appel({ a: 'classement' });
if (!cl.classement || !cl.classement.lignes) err('classement sans carrière illisible');
const { r: perdu } = await appel({ a: 'vue', t: 'f'.repeat(32), e: 'accueil', attendreErreur: true });
if (!perdu.perdue) err('une carrière inconnue devrait être signalée');
await server.stop();
console.log(erreurs ? `${erreurs} erreur(s)` : 'OK');
process.exit(erreurs ? 1 : 0);
