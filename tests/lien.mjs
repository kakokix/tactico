// Vérifie la liaison site ↔ Roblox (/api/lien et actions importer/exporter de /api/carriere) sur un serveur Blobs local.
// Une carrière du site part sur Roblox (noms modifiés, personnages R6), y avance, puis revient sur le site avec ses vrais noms.
// Usage : node tests/lien.mjs
import { BlobsServer } from '@netlify/blobs/server';
import { setEnvironmentContext, getStore } from '@netlify/blobs';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { gunzipSync, gzipSync } from 'node:zlib';
import { traiter } from '../netlify/functions/carriere/core.mjs';
import { traiterSite, lireTexte, ecrireTexte } from '../netlify/functions/lien/core.mjs';
import { generateRealWorld, generateWorld } from '../src/core/worldgen.js';
import { startCareer, continueGame } from '../src/core/game.js';
import { serialize, deserialize } from '../src/core/save.js';
import { REAL_CONTI } from '../src/data/real/index.js';
import { adapterPourRoblox } from '../roblox/outils/monde.mjs';

const dir = mkdtempSync(join(tmpdir(), 'blobs-'));
const server = new BlobsServer({ directory: dir, token: 'tok', port: 0 });
const { port } = await server.start();
setEnvironmentContext({ siteID: 'site', token: 'tok', edgeURL: `http://localhost:${port}`, uncachedEdgeURL: `http://localhost:${port}`, primaryRegion: 'us-east-2' });
const store = getStore({ name: 'carrieres', consistency: 'strong' });
let erreurs = 0;
const err = (m) => { erreurs++; console.log('ERREUR', m); };
const etat = async (t) => deserialize(gunzipSync(Buffer.from(await store.get('c/' + t, { type: 'arrayBuffer' }))).toString('utf8'));

// 1. Carrière du site (monde réel), quelques jours joués
const S0 = generateRealWorld(4242);
const cid = Object.values(S0.clubs).find((c) => c.name === 'Olympique Lyonnais')?.id || Object.keys(S0.clubs)[0];
startCareer(S0, { name: 'Kakokix', nat: 'FR', clubId: cid });
for (let i = 0; i < 6; i++) continueGame(S0);
const vrais = new Map(Object.values(S0.players).filter((p) => p.real).map((p) => [p.id, [p.fn, p.ln]]));
const texteSite = ecrireTexte(S0);
console.log('carrière du site :', S0.mgr.name, '·', S0.clubs[cid].name, '·', (texteSite.length / 1024).toFixed(0), 'Ko à envoyer');

// 2. Site → Roblox
const dep = await traiterSite({ a: 'deposer', etat: texteSite }, store);
if (!dep.code || dep.code.length !== 6) err('pas de code pour le dépôt : ' + JSON.stringify(dep));
const imp = await traiter({ a: 'importer', code: dep.code.toLowerCase(), nom: 'RobloxGuy' }, store, null, null);
if (imp.error || !imp.t) err('import dans Roblox : ' + imp.error);
const R1 = await etat(imp.t);
const unVrai = Object.values(R1.players).find((p) => p.real && p.club === cid);
console.log('dans Roblox :', R1.mgr.name, '·', unVrai.fn, unVrai.ln, '(vrai nom gardé à part :', unVrai.ln0 + ')');
if (R1.mgr.name !== 'RobloxGuy') err('le manager devrait prendre le nom Roblox');
if (R1.mgr.id !== S0.mgr.id || R1.mgr.secret !== S0.mgr.secret) err('le manager doit garder son identité (classement mondial)');
if (!R1.roblox || R1.contiName !== 'European Cup') err('carrière non adaptée à Roblox');
if (!unVrai.look || unVrai.ln === unVrai.ln0) err('les vrais joueurs doivent avoir un nom modifié et un personnage');
if (R1.day !== S0.day) err('la date de la carrière doit être gardée');
// aucun vrai nom (hors mots des noms de clubs) dans ce que voit Roblox ni dans les textes de la carrière
const proteges = JSON.stringify(Object.values(R1.clubs).map((c) => [c.name, c.short, c.city, c.stadium?.name]));
const textesR1 = JSON.stringify([imp, R1.inbox, R1.news, R1.transfers]);
// (noms complets : un nom de famille seul peut être le prénom d'un autre joueur ou un nom généré)
// (les noms d'usage seuls, comme « Wesley », sont aussi des prénoms de joueurs générés : on ne vérifie que les noms complets)
const fuites = [...new Set([...vrais.values()].filter(([fn]) => fn).map(([fn, ln]) => fn + ' ' + ln))].filter((n) => !proteges.includes(n) && new RegExp(`(?<![\\p{L}])${n}(?![\\p{L}])`, 'u').test(textesR1));
if (fuites.length) err('vrais noms dans Roblox : ' + fuites.slice(0, 5).join(', '));
console.log('messages repris dans Roblox :', R1.inbox.length, '· ex. :', R1.inbox.find((m) => m.kind === 'bid')?.title || R1.inbox[0]?.title);
const deja = await traiter({ a: 'importer', code: dep.code, nom: 'X' }, store, null, null);
if (!deja.error) err('un code ne doit servir qu\'une fois');

// 3. Quelques jours dans Roblox
for (let i = 0; i < 4; i++) {
  const r = await traiter({ a: 'continuer', t: imp.t }, store, null, null);
  if (r.error) err('continuer dans Roblox : ' + r.error);
}

// 4. Roblox → site
const exp = await traiter({ a: 'exporter', t: imp.t }, store, null, null);
if (!exp.code) err('pas de code pour l\'export : ' + JSON.stringify(exp));
const mauvaisSens = await traiter({ a: 'importer', code: exp.code, nom: 'X' }, store, null, null);
if (!mauvaisSens.error || !/website/.test(mauvaisSens.error)) err('un code Roblox ne doit pas être importé dans Roblox');
const rec = await traiterSite({ a: 'recuperer', code: exp.code }, store);
if (rec.error || !rec.etat) err('récupération sur le site : ' + rec.error);
const S2 = lireTexte(rec.etat);
let faux = 0;
for (const p of Object.values(S2.players)) {
  if (!p.real) continue;
  const v = vrais.get(p.id);
  if (!v || v[1] !== p.ln || (v[0] || '') !== (p.fn || '') || p.ln0 !== undefined) faux++;
}
console.log('retour sur le site :', S2.mgr.name, '· jour', S2.day, '·', faux, 'nom(s) faux');
if (faux) err(faux + ' vrais joueurs sans leur vrai nom');
if (S2.roblox || S2.contiName !== REAL_CONTI) err('carrière non rendue au site');
const R2 = await etat(imp.t);
if (S2.day !== R2.day || S2.season !== R2.season) err('la carrière Roblox doit revenir telle quelle sur le site');
const modifies = new Set(Object.values(R2.players).filter((p) => p.real && p.ln0 && p.ln !== p.ln0).map((p) => p.ln));
const textesS2 = JSON.stringify([S2.inbox, S2.news, S2.transfers]);
const restes = [...modifies].filter((ln) => ln.length > 3 && new RegExp(`(?<![\\p{L}])${ln}(?![\\p{L}])`, 'u').test(textesS2));
if (restes.length) err('noms modifiés restés dans les messages du site : ' + restes.slice(0, 5).join(', '));
console.log('messages rendus au site :', S2.inbox.find((m) => m.kind === 'bid')?.title || S2.inbox[0]?.title);

// 5. Carrière Roblox d'avant la liaison (sans vrais noms gardés à part) : noms retrouvés dans le monde de départ
// (créée comme avant les nouveaux championnats : monde à cinq pays, noms modifiés sans les vrais noms à part)
const PAYS5 = ['FR', 'EN', 'ES', 'IT', 'DE'];
const R3 = adapterPourRoblox(generateRealWorld(2026, PAYS5));
for (const p of Object.values(R3.players)) { delete p.ln0; delete p.fn0; }
delete R3.roblox;
startCareer(R3, { name: 'Ancien', nat: 'FR', clubId: Object.values(R3.clubs).find((c) => c.name === 'Olympique Lyonnais').id });
const t3 = 'a'.repeat(32);
const gz = gzipSync(Buffer.from(serialize(R3), 'utf8'));
await store.set('c/' + t3, gz.buffer.slice(gz.byteOffset, gz.byteOffset + gz.byteLength));
const exp3 = await traiter({ a: 'exporter', t: t3 }, store, null, null);
const S3 = lireTexte((await traiterSite({ a: 'recuperer', code: exp3.code }, store)).etat);
const base = generateRealWorld(2026, PAYS5);
let faux3 = 0;
for (const p of Object.values(S3.players)) if (p.real && base.players[p.id] && base.players[p.id].ln !== p.ln) faux3++;
console.log('ancienne carrière Roblox :', faux3, 'nom(s) faux');
if (faux3) err('noms non retrouvés pour une ancienne carrière Roblox');

// 6. Refus
const fict = generateWorld(77);
startCareer(fict, { name: 'F', nat: 'FR', clubId: Object.keys(fict.clubs)[0] });
const r6 = await traiterSite({ a: 'deposer', etat: ecrireTexte(fict) }, store);
if (!r6.error) err('une carrière du monde fictif ne doit pas aller sur Roblox');
const r7 = await traiterSite({ a: 'recuperer', code: 'ZZZZZZ' }, store);
if (!r7.error) err('code inconnu accepté');
const r8 = await traiterSite({ a: 'deposer', etat: 'n\'importe quoi' }, store);
if (!r8.error) err('texte illisible accepté');

await server.stop();
console.log(erreurs ? `${erreurs} erreur(s)` : 'OK');
process.exit(erreurs ? 1 : 0);
