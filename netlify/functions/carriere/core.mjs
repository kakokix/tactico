// Carrière Tactico pour Roblox : le jeu complet du site tourne ici, côté serveur.
// Chaque carrière est rangée dans Netlify Blobs sous un jeton secret, gardé par le serveur Roblox.
// Les vues renvoient des données déjà mises en forme, pour que les écrans Roblox restent simples.
import { randomBytes } from 'node:crypto';
import { gzipSync, gunzipSync } from 'node:zlib';
import { construireMonde, GRAINE, maillot, lookDe } from '../../../roblox/outils/monde.mjs';
import { startCareer, continueGame, userMatchToday, nextUserMatch, createSim, finishUserMatch } from '../../../src/core/game.js';
import { leagueTable, compName, matchWinner, positionOf } from '../../../src/core/competitions.js';
import { fmtDate, toDate, monthName, windowOpen } from '../../../src/core/dates.js';
import { pname, pshort, avgRating, ovrAt } from '../../../src/core/player.js';
import { serialize, deserialize } from '../../../src/core/save.js';
import {
  FORMATIONS, FORMATION_LIST, MENTALITY, PRESSING, STYLE, WIDTH, DLINE, TRAINING_FOCUS, TRAINING_INTENSITY,
  POS_GROUP, SCORE_RULES, contiName, ATTR_NAMES, A, ATTR_GROUPS,
} from '../../../src/core/constants.js';
import { autoLineup, lineupStrength } from '../../../src/core/team.js';
import { fmtMoney, evaluateBid, willJoin, wageDemand, contractResponse, canAfford, executeTransfer } from '../../../src/core/transfers.js';
import { wageBill, projectRevenue, ticketPrice, FAC_NAMES, facUpgradeCost, tvMoney, commercial } from '../../../src/core/finance.js';
import { vacancies, jobChance, applyForJob } from '../../../src/core/board.js';
import { careerScore, trophyCount } from '../../../src/core/score.js';
import { addNews } from '../../../src/core/messages.js';
import { NATIONS } from '../../../src/data/names.js';
import { REAL_COUNTRIES } from '../../../src/data/real/index.js';
import { R } from '../../../src/core/rng.js';

const money = fmtMoney;
const etoiles = (rep) => Math.max(1, Math.min(5, Math.round((rep - 30) / 13)));
const drapeau = (nat) => NATIONS[nat]?.flag || '';
const saison = (S) => `${S.season}-${String((S.season + 1) % 100).padStart(2, '0')}`;
const signe = (n) => (n > 0 ? '+' + n : String(n));
const FINS = [45, 90, 105, 120];

// ---------- Monde de départ (même graine que monde.json) ----------
let base = null;
function mondeDeBase() {
  if (!base) base = construireMonde(GRAINE);
  return base;
}

// ---------- Stockage ----------
export function nouveauJeton() {
  return randomBytes(16).toString('hex');
}
export async function charger(store, t) {
  if (!/^[a-f0-9]{32}$/.test(t || '')) return null;
  const buf = await store.get('c/' + t, { type: 'arrayBuffer' });
  if (!buf) return null;
  return deserialize(gunzipSync(Buffer.from(buf)).toString('utf8'));
}
export async function sauver(store, t, S) {
  const gz = gzipSync(Buffer.from(serialize(S), 'utf8'));
  await store.set('c/' + t, gz.buffer.slice(gz.byteOffset, gz.byteOffset + gz.byteLength));
}

// ---------- Morceaux communs ----------
function clubMini(S, c) {
  return { id: c.id, n: c.name, c: c.short, a: c.abbr, coul: c.colors, et: etoiles(c.rep) };
}
function resultat(m, cid) {
  const us = m.h === cid ? 0 : 1;
  const gf = us === 0 ? m.hg : m.ag, ga = us === 0 ? m.ag : m.hg;
  const w = matchWinner(m);
  return w === cid ? 'V' : w && w !== cid ? 'D' : gf === ga ? 'N' : gf > ga ? 'V' : 'D';
}
function haut(S) {
  const club = S.user ? S.clubs[S.user] : null;
  return {
    club: club ? club.name : 'Sans club', abr: club ? club.abbr : '', coul: club ? club.colors : ['#0d1d15', '#1d3327'],
    date: `${fmtDate(S.day, 'wdm')} · ${toDate(S.day).y}`, argent: club ? money(club.balance) : '',
    jourDeMatch: !!userMatchToday(S), nonLus: S.inbox.filter((m) => !m.read).length,
  };
}
function ligneJoueur(S, p, inXI) {
  return {
    id: p.id, num: p.youth ? '' : p.num, pos: p.pos, nom: pname(p), dr: drapeau(p.nat), xi: inXI ? 1 : 0, age: p.age, note: p.ovr, pot: p.pot,
    fr: Math.round(p.cond), mo: Math.round(p.morale), fo: p.form.toFixed(1), mj: p.st.apps, b: p.st.gls, pd: p.st.ast,
    moy: p.st.apps ? avgRating(p).toFixed(2) : '–', val: money(p.value), sal: money(p.wage), ctr: p.until,
    statut: p.inj > 0 ? `Blessé ${p.inj} j` : p.susp > 0 ? `Suspendu ${p.susp}` : p.listed ? 'Transférable' : p.youth ? 'Jeune' : '',
  };
}

// ---------- Vues ----------
const VUES = {};

VUES.accueil = (S) => {
  if (!S.user) {
    return { sansClub: true, titre: 'Sans club', sous: `${S.mgr.name} · réputation ${Math.round(S.mgr.rep)}/100`, actus: S.news.slice(0, 10).map((n) => ({ d: fmtDate(n.d, 'dm'), t: n.t })) };
  }
  const club = S.clubs[S.user];
  const comp = S.comps[club.league];
  const table = leagueTable(S, comp);
  const pos = table.findIndex((r) => r.c === club.id) + 1;
  const row = comp.table[club.id];
  const nm = nextUserMatch(S);
  const today = userMatchToday(S);
  let prochain = null;
  if (nm) {
    const H = S.clubs[nm.h], Aw = S.clubs[nm.a];
    const j = nm.d - S.day;
    prochain = {
      comp: compName(S, nm.c) + (nm.lb ? ' · ' + nm.lb : ''), quand: `${fmtDate(nm.d, 'wdm')}${j > 0 ? ` · dans ${j} j` : " · aujourd'hui"}`,
      dom: clubMini(S, H), ext: clubMini(S, Aw), stade: nm.neutral ? 'Terrain neutre' : H.stadium.name, aujourdhui: !!today,
    };
  }
  const autour = table.slice(Math.max(0, Math.min(pos - 3, table.length - 5)), Math.max(5, Math.min(pos + 2, table.length)));
  const results = Object.values(S.matches).filter((m) => m.done && (m.h === club.id || m.a === club.id)).sort((a, b) => b.d - a.d).slice(0, 5);
  return {
    titre: club.name, sous: `${comp.name} · Saison ${saison(S)} · Entraîneur ${S.mgr.name}`, prochain,
    kpis: { classement: row && row.p ? `${pos}e · ${row.pts} pts` : '—', objectif: club.obj.label, confiance: Math.round(S.mgr.conf), score: careerScore(S.mgr.career) },
    ligue: comp.name,
    table: autour.map((r) => ({ pos: table.indexOf(r) + 1, n: S.clubs[r.c].name, coul: S.clubs[r.c].colors, j: r.p, diff: signe(r.gf - r.ga), pts: r.pts, moi: r.c === club.id ? 1 : 0 })),
    forme: row?.f || '',
    resultats: results.map((m) => ({ r: resultat(m, club.id), txt: `${S.clubs[m.h].short} ${m.hg}-${m.ag} ${S.clubs[m.a].short}${m.pen ? ` (${m.pen[0]}-${m.pen[1]} tab)` : ''}`, meta: `${compName(S, m.c)} · ${fmtDate(m.d, 'dm')}` })),
    messages: S.inbox.filter((m) => !m.read).slice(0, 3).map((m) => ({ id: m.id, titre: m.title, meta: `${m.from} · ${fmtDate(m.day, 'dm')}` })),
    absents: club.squad.map((id) => S.players[id]).filter((p) => p.inj > 0 || p.susp > 0).map((p) => ({ id: p.id, pos: p.pos, nom: pname(p), meta: p.inj > 0 ? `${p.injName} · ${p.inj} j` : `Suspendu · ${p.susp} match(s)`, etat: p.inj > 0 ? 'Blessé' : 'Suspendu' })),
    actus: S.news.slice(0, 8).map((n) => ({ d: fmtDate(n.d, 'dm'), t: n.t })),
  };
};

VUES.messagerie = (S) => ({
  sous: `${S.inbox.filter((m) => !m.read).length} non lu(s)`,
  messages: S.inbox.slice(0, 80).map((m) => ({ id: m.id, titre: m.title, meta: `${m.from} · ${fmtDate(m.day, 'dm')}`, lu: m.read ? 1 : 0, action: m.act && !m.done ? 1 : 0 })),
});

const GROUPES = { all: () => true, GB: (p) => p.pos === 'GB', DEF: (p) => POS_GROUP[p.pos] === 'DEF', MIL: (p) => POS_GROUP[p.pos] === 'MIL', ATT: (p) => POS_GROUP[p.pos] === 'ATT' };
const TRIS = { pos: (p) => 'GB DD DC DG MDC MD MC MG MOC AD AG BU'.split(' ').indexOf(p.pos) * 100 - p.ovr, ovr: (p) => -p.ovr, age: (p) => p.age, val: (p) => -p.value, fr: (p) => p.cond };
VUES.effectif = (S, q = {}) => {
  if (!S.user) return { vide: "Tu n'as pas de club." };
  const club = S.clubs[S.user];
  const g = q.g || 'all';
  let ps;
  if (g === 'youth') ps = club.youth.map((id) => S.players[id]);
  else if (g === 'loan') ps = Object.values(S.players).filter((p) => p.loan && p.loan.from === S.user);
  else ps = club.squad.map((id) => S.players[id]).filter(GROUPES[g] || GROUPES.all);
  const key = TRIS[q.tri] || TRIS.pos;
  ps.sort((a, b) => key(a) - key(b));
  const xi = new Set(club.lineup);
  const moyAge = club.squad.reduce((s, id) => s + S.players[id].age, 0) / Math.max(1, club.squad.length);
  return {
    sous: `${club.squad.length} joueurs · ${club.youth.length} au centre de formation · moyenne d'âge ${moyAge.toFixed(1)} ans`,
    g, tri: q.tri || 'pos', joueurs: ps.map((p) => ligneJoueur(S, p, xi.has(p.id))),
  };
};

VUES.tactique = (S) => {
  if (!S.user) return { vide: "Tu n'as pas de club." };
  const club = S.clubs[S.user];
  const t = club.tactics;
  const slots = FORMATIONS[t.formation];
  const note = lineupStrength(S, t.formation, club.lineup);
  const xi = slots.map((sl, i) => {
    const p = S.players[club.lineup[i]];
    return p ? { pid: p.id, pos: sl.pos, x: sl.x, y: sl.y, nom: pshort(p), num: p.num, note: Math.round(ovrAt(p, sl.pos)), fr: Math.round(p.cond) } : { pid: '', pos: sl.pos, x: sl.x, y: sl.y, nom: '—', num: '', note: 0, fr: 0 };
  });
  const banc = (club.bench || []).map((id) => S.players[id]).filter(Boolean).map((p) => ({ pid: p.id, pos: p.pos, nom: pname(p), note: p.ovr, fr: Math.round(p.cond) }));
  const pris = new Set([...club.lineup, ...(club.bench || [])]);
  const reste = club.squad.map((id) => S.players[id]).filter((p) => !pris.has(p.id)).sort((a, b) => b.ovr - a.ovr).map((p) => ({ pid: p.id, pos: p.pos, nom: pname(p), note: p.ovr, fr: Math.round(p.cond), dispo: p.inj > 0 || p.susp > 0 ? 0 : 1 }));
  const tireurs = club.lineup.map((id) => S.players[id]).filter(Boolean).map((p) => ({ pid: p.id, nom: pshort(p) }));
  return {
    note: note.toFixed(1), cohesion: Math.round(club.coh), f: t.formation, formations: FORMATION_LIST, xi, banc, reste,
    consignes: { ment: t.ment, press: t.press, style: t.style, width: t.width, line: t.line },
    choix: { ment: MENTALITY, press: PRESSING, style: STYLE, width: WIDTH, line: DLINE },
    penalty: club.penTaker || '', tireurs, delegue: S.mgr.autoPick ? 1 : 0,
  };
};

VUES.calendrier = (S, q = {}) => {
  if (!S.user) return { vide: "Tu n'as pas de club." };
  const club = S.clubs[S.user];
  const f = q.f || 'all';
  let ms = Object.values(S.matches).filter((m) => m.h === club.id || m.a === club.id);
  if (f !== 'all') ms = ms.filter((m) => S.comps[m.c]?.type === f);
  ms.sort((a, b) => a.d - b.d);
  return {
    sous: `Saison ${saison(S)} · ${ms.filter((m) => m.done).length}/${ms.length} matchs joués`, f, conti: contiName(S),
    matchs: ms.map((m) => {
      const t = toDate(m.d);
      const dom = m.h === club.id;
      const adv = S.clubs[dom ? m.a : m.h];
      const typ = S.comps[m.c]?.type;
      return {
        mois: `${monthName(t.m)} ${t.y}`, date: fmtDate(m.d, 'wdm'), adv: adv.name, coul: adv.colors, dom: dom ? 1 : 0,
        meta: `${compName(S, m.c)}${m.lb ? ' · ' + m.lb : typ === 'league' ? ' · J' + m.rd : ''}${m.neutral ? ' · terrain neutre' : dom ? ' · domicile' : ' · extérieur'}`,
        r: m.done ? resultat(m, club.id) : '', score: m.done ? `${dom ? m.hg : m.ag}-${dom ? m.ag : m.hg}${m.pen ? '*' : ''}` : '', auj: m.d === S.day ? 1 : 0,
      };
    }),
  };
};

VUES.competitions = (S, q = {}) => {
  const club = S.user ? S.clubs[S.user] : null;
  const pays = q.pays || club?.country || 'FR';
  const div = q.div || (club && club.country === pays ? S.comps[club.league].level : 1);
  const onglet = q.o || 'table';
  const C = REAL_COUNTRIES.find((c) => c.code === pays) || REAL_COUNTRIES[0];
  const comp = S.comps[pays + div];
  const out = { o: onglet, pays, div, ligues: REAL_COUNTRIES.map((c) => ({ code: c.code, nom: c.name, dr: drapeau(c.code), d1: c.d1, d2: c.d2 })) };
  if (onglet === 'table' && comp) {
    const rows = leagueTable(S, comp);
    const n = rows.length;
    out.lignes = rows.map((r, i) => {
      let z = '';
      if (div === 1 && i < C.conti) z = 'c';
      else if (div === 1 && i >= n - C.down) z = 'r';
      else if (div === 1 && C.po === 'barrage' && i === n - C.down - 1) z = 'b';
      else if (div === 2 && i < C.up) z = 'p';
      else if (div === 2 && ((C.po === 'playoff' && i < 6) || (C.po === 'barrage' && i === C.up))) z = 'b';
      const c = S.clubs[r.c];
      return { pos: i + 1, n: c.name, coul: c.colors, j: r.p, g: r.w, nu: r.d, p: r.l, bp: r.gf, bc: r.ga, diff: signe(r.gf - r.ga), pts: r.pts, forme: r.f, z, moi: r.c === S.user ? 1 : 0 };
    });
  } else if (onglet === 'resultats' && comp) {
    const ms = Object.values(S.matches).filter((m) => m.c === comp.id && m.done).sort((a, b) => b.d - a.d).slice(0, 40);
    out.matchs = ms.map((m) => ({ date: fmtDate(m.d, 'dm'), txt: `${S.clubs[m.h].name} ${m.hg}-${m.ag} ${S.clubs[m.a].name}`, moi: m.h === S.user || m.a === S.user ? 1 : 0 }));
  } else if (onglet === 'stats' && comp) {
    const ps = comp.clubs.flatMap((cid) => S.clubs[cid].squad.map((id) => S.players[id]));
    out.buteurs = ps.filter((p) => p.st.lg).sort((a, b) => b.st.lg - a.st.lg).slice(0, 20).map((p) => ({ nom: pname(p), club: S.clubs[p.club]?.name || '', v: p.st.lg }));
    out.passeurs = ps.filter((p) => p.st.ast).sort((a, b) => b.st.ast - a.st.ast).slice(0, 20).map((p) => ({ nom: pname(p), club: S.clubs[p.club]?.name || '', v: p.st.ast }));
  } else if (onglet === 'palmares') {
    out.palmares = (S.history || []).slice(0, 15).map((h) => ({
      s: `${h.s}-${String((h.s + 1) % 100).padStart(2, '0')}`,
      lignes: (h.leagues || []).filter((l) => l.id.startsWith(pays)).map((l) => `${l.name} : ${S.clubs[l.champ]?.name || l.champ || '—'}`),
    }));
  }
  return out;
};

const PRIX = [0, 5e5, 1e6, 2e6, 5e6, 1e7, 2e7, 4e7, 8e7, 1e12];
VUES.mercato = (S, q = {}) => {
  if (!S.user) return { vide: "Tu n'as pas de club." };
  const club = S.clubs[S.user];
  const bill = wageBill(S, club);
  const ouvert = windowOpen(S);
  const o = q.o || 'search';
  const out = {
    o, ouvert: ouvert ? 1 : 0,
    sous: ouvert ? `Ouvert jusqu'au ${fmtDate(S.day <= S.sd.summerClose ? S.sd.summerClose : S.sd.winterClose, 'dm')}` : `Fermé · réouverture le ${fmtDate(S.day < S.sd.winterOpen ? S.sd.winterOpen : S.sd.start + 365, 'dm')} · les joueurs libres restent recrutables`,
    kpis: { budget: money(club.tBudget), masse: money(bill), max: money(club.wBudget), marge: money(club.wBudget - bill), margeOk: club.wBudget - bill >= 0 ? 1 : 0, solde: money(club.balance) },
  };
  const ligne = (p) => ({ id: p.id, pos: p.pos, nom: pname(p), dr: drapeau(p.nat), age: p.age, club: p.club ? S.clubs[p.club].name : 'Libre', val: money(p.value), note: p.ovr, pot: p.pot, tr: p.listed ? 1 : 0 });
  if (o === 'search') {
    const posF = q.pos || 'all', noteMin = q.note || 60, ageMax = q.age || 40, prix = PRIX[q.prix || 9];
    let ps = Object.values(S.players).filter((p) => p.club && p.club !== S.user && !p.youth && !p.loan);
    if (posF !== 'all') ps = ps.filter((p) => (['GB', 'DEF', 'MIL', 'ATT'].includes(posF) ? (posF === 'GB' ? p.pos === 'GB' : POS_GROUP[p.pos] === posF) : p.pos === posF));
    ps = ps.filter((p) => p.age <= ageMax && p.ovr >= noteMin && p.value <= prix).sort((a, b) => b.ovr - a.ovr);
    out.total = ps.length;
    out.joueurs = ps.slice(0, 60).map(ligne);
    out.filtres = { pos: posF, note: noteMin, age: ageMax, prix: q.prix || 9 };
  } else if (o === 'free') {
    out.joueurs = S.free.map((id) => S.players[id]).filter(Boolean).sort((a, b) => b.ovr - a.ovr).slice(0, 80).map(ligne);
  } else if (o === 'mine') {
    out.mouvements = S.transfers.filter((t) => t.from === S.user || t.to === S.user).slice(0, 60).map((t) => ({ arrivee: t.to === S.user ? 1 : 0, n: t.n, meta: `${fmtDate(t.d, 'dm')} · ${t.to === S.user ? 'de ' + (t.from ? S.clubs[t.from].name : 'libre') : 'vers ' + S.clubs[t.to].name}${t.loan ? ' · prêt' : ''}`, fee: t.fee ? money(t.fee) : '—' }));
  } else {
    out.mouvements = S.transfers.slice(0, 80).map((t) => ({ n: `${t.n} (${t.pos}, ${t.ovr})`, meta: `${fmtDate(t.d, 'dm')} · ${t.from ? S.clubs[t.from]?.name || '?' : 'Libre'} → ${S.clubs[t.to]?.name || '?'}${t.loan ? ' (prêt)' : ''}`, fee: t.fee ? money(t.fee) : '—' }));
  }
  return out;
};

const DESC_ENTR = { eq: 'Développement harmonieux de tous les attributs.', att: 'Finition, tir, dribble et centres progressent plus vite.', def: 'Tacles, marquage, jeu de tête et placement.', tech: 'Passes, vision, dribble et coups de pied arrêtés.', phy: 'Vitesse, endurance et puissance.', tac: 'Placement, sang-froid, volume de jeu ; la cohésion monte plus vite.' };
VUES.entrainement = (S) => {
  if (!S.user) return { vide: "Tu n'as pas de club." };
  const c = S.clubs[S.user];
  return {
    sous: `${FAC_NAMES.train} niveau ${c.fac.train}/5 · ${FAC_NAMES.youth} niveau ${c.fac.youth}/5`,
    themes: TRAINING_FOCUS.map((f) => ({ id: f.id, nom: f.name, desc: DESC_ENTR[f.id], on: c.training.focus === f.id ? 1 : 0 })),
    intensites: TRAINING_INTENSITY, intensite: c.training.int,
    progres: c.squad.map((id) => S.players[id]).filter((p) => p.o0 != null && p.ovr !== p.o0).sort((a, b) => (b.ovr - b.o0) - (a.ovr - a.o0)).slice(0, 8).map((p) => ({ id: p.id, pos: p.pos, nom: pname(p), meta: `${p.age} ans · ${p.o0} → ${p.ovr}`, d: signe(p.ovr - p.o0), plus: p.ovr >= p.o0 ? 1 : 0 })),
    jeunes: c.youth.map((id) => S.players[id]).sort((a, b) => b.pot - a.pot).map((p) => ({ id: p.id, pos: p.pos, nom: pname(p), meta: `${p.age} ans · potentiel ${p.pot}`, note: p.ovr })),
  };
};

VUES.finances = (S) => {
  if (!S.user) return { vide: "Tu n'as pas de club." };
  const c = S.clubs[S.user];
  const bill = wageBill(S, c);
  const sum = (o) => Object.values(o).reduce((a, b) => a + b, 0);
  const tin = sum(c.fin.in), tout = sum(c.fin.out);
  const maxv = Math.max(1, ...Object.values(c.fin.in), ...Object.values(c.fin.out));
  const barres = (o) => Object.entries(o).sort((a, b) => b[1] - a[1]).map(([k, v]) => ({ k, v: money(v), part: v / maxv }));
  return {
    sous: `Saison ${saison(S)} · revenus prévus ${money(projectRevenue(S, c))} / saison`,
    kpis: { solde: money(c.balance), soldeOk: c.balance >= 0 ? 1 : 0, budget: money(c.tBudget), salaires: money(bill), max: money(c.wBudget), bilan: money(tin - tout), bilanOk: tin - tout >= 0 ? 1 : 0 },
    recettes: { total: money(tin), lignes: barres(c.fin.in) }, depenses: { total: money(tout), lignes: barres(c.fin.out) },
    stade: { nom: c.stadium.name, cap: c.stadium.cap.toLocaleString('fr-FR'), billet: `${ticketPrice(S, c)} €`, tv: money(tvMoney(S, c)), sponsors: money(commercial(c)) },
    infra: Object.entries(FAC_NAMES).map(([k, n]) => ({ k, n, niv: c.fac[k], cout: c.fac[k] < 5 ? money(facUpgradeCost(c.fac[k])) : '' })),
    salaires: c.squad.map((id) => S.players[id]).sort((a, b) => b.wage - a.wage).slice(0, 8).map((p) => ({ id: p.id, pos: p.pos, nom: pname(p), v: money(p.wage) })),
  };
};

VUES.club = (S) => {
  if (!S.user) return { vide: "Tu n'as pas de club." };
  const c = S.clubs[S.user];
  return {
    titre: c.name, sous: `${c.city} · fondé il y a longtemps · réputation ${c.rep}/100`, coul: c.colors, et: etoiles(c.rep),
    stade: `${c.stadium.name} · ${c.stadium.cap.toLocaleString('fr-FR')} places`,
    infra: Object.entries(FAC_NAMES).map(([k, n]) => ({ n, niv: c.fac[k] })),
    trophees: (c.trophies || []).slice().reverse().slice(0, 20).map((t) => ({ n: t.n || t.name || String(t), s: t.s || '' })),
    historique: (c.hist || []).slice(0, 12).map((h) => ({ s: `${h.s}-${String((h.s + 1) % 100).padStart(2, '0')}`, txt: `${h.ln} · ${h.pos}e · ${h.pts} pts (${h.w}V ${h.d}N ${h.lo}D)` })),
  };
};

VUES.carriere = (S) => {
  const m = S.mgr, c = m.career;
  const games = c.w + c.d + c.l;
  const R_ = SCORE_RULES;
  const club = S.user ? S.clubs[S.user] : null;
  const parts = [['Victoires', c.w * R_.win], ['Nuls', c.d * R_.draw], ['Titres D1', c.titles1 * R_.title1], ['Titres D2', c.titles2 * R_.title2], ['Coupes', c.cups * R_.cup], [contiName(S), c.conti * R_.conti], ['Montées', c.promos * R_.promo], ['Objectifs atteints', c.objMet * R_.objMet], ['Objectifs dépassés', c.objEx * R_.objEx]].filter(([, v]) => v);
  const apps = m.apps || [];
  return {
    titre: `${drapeau(m.nat)} ${m.name}`, sous: `${club ? `Entraîneur de ${club.name}` : 'Sans club'} · réputation ${Math.round(m.rep)}/100 · ${c.seasons} saison(s) terminée(s)`,
    kpis: { score: careerScore(c), matchs: games, bilan: `${c.w}V ${c.d}N ${c.l}D`, pct: `${games ? Math.round((c.w / games) * 100) : 0}%`, trophees: trophyCount(c), licenciements: c.sacked },
    calcul: parts.map(([k, v]) => ({ k, v: '+' + v })),
    trophees: m.trophies.slice().reverse().map((t) => ({ n: t.n, meta: `${t.c} · ${t.s}-${(t.s + 1) % 100}` })),
    postes: vacancies(S).sort((a, b) => b.rep - a.rep).slice(0, 30).map((v) => ({ id: v.id, n: v.name, coul: v.colors, meta: `${S.comps[v.league].name} · réputation ${v.rep} · chances ${Math.round(jobChance(S, v) * 100)}%`, envoye: apps.some((a) => a.club === v.id) ? 1 : 0 })),
  };
};

VUES.options = (S) => ({ manager: S.mgr.name, club: S.user ? S.clubs[S.user].name : 'Sans club', saison: saison(S) });

VUES.match = (S) => {
  const m = userMatchToday(S);
  if (!m) return { vide: "Pas de match aujourd'hui." };
  const club = S.clubs[S.user];
  const H = S.clubs[m.h], Aw = S.clubs[m.a];
  const info = (c) => {
    const comp = S.comps[c.league];
    const row = comp?.table?.[c.id];
    const pos = comp ? positionOf(S, c.id) : 0;
    return { ...clubMini(S, c), meta: row ? `${pos}e · ${row.pts} pts` : '', note: Math.round(c.str || 0) };
  };
  const t = club.tactics;
  const slots = FORMATIONS[t.formation];
  return {
    titre: 'Jour de match', sous: `${compName(S, m.c)}${m.lb ? ' · ' + m.lb : m.rd ? ' · journée ' + m.rd : ''} · ${fmtDate(m.d, 'long')}`,
    dom: info(H), ext: info(Aw), stade: m.neutral ? 'Terrain neutre' : H.stadium.name,
    onze: `Ton onze · ${t.formation}`, consignes: `${MENTALITY[t.ment]} · pressing ${PRESSING[t.press].toLowerCase()}`,
    joueurs: slots.map((sl, i) => { const p = S.players[club.lineup[i]]; return p ? { pos: sl.pos, nom: pname(p), fr: Math.round(p.cond), note: Math.round(ovrAt(p, sl.pos)) } : null; }).filter(Boolean),
  };
};

VUES.joueur = (S, q = {}) => {
  const p = S.players[q.id];
  if (!p) return { vide: 'Joueur introuvable.' };
  const c = p.club ? S.clubs[p.club] : null;
  return {
    id: p.id, nom: pname(p), dr: drapeau(p.nat), pos: p.pos, alt: p.alt || [], age: p.age, note: p.ovr, pot: p.pot,
    club: c ? c.name : 'Libre', val: money(p.value), sal: money(p.wage), ctr: p.until, num: p.num,
    groupes: ATTR_GROUPS.filter(([n]) => n !== 'Gardien' || p.pos === 'GB').map(([n, keys]) => ({ n, attrs: keys.map((k) => ({ n: ATTR_NAMES[k] || k, v: p.attr[A[k]] })) })),
    stats: `${p.st.apps} matchs · ${p.st.gls} buts · ${p.st.ast} passes déc.${p.st.apps ? ' · moyenne ' + avgRating(p).toFixed(2) : ''}`,
    monJoueur: p.club === S.user ? 1 : 0, transferable: p.listed ? 1 : 0,
  };
};

export function vue(S, ecran, q) {
  const f = VUES[ecran] || VUES.accueil;
  return { ecran: VUES[ecran] ? ecran : 'accueil', haut: haut(S), d: f(S, q || {}) };
}

// ---------- Choix du club (nouvelle carrière) ----------
export function listeClubs() {
  const S = mondeDeBase();
  return REAL_COUNTRIES.map((C) => ({
    code: C.code, nom: C.name, dr: drapeau(C.code), d1: C.d1, d2: C.d2,
    clubs: [1, 2].map((div) => S.comps[C.code + div].clubs.map((id) => S.clubs[id]).sort((a, b) => b.rep - a.rep).map((c) => ({ id: c.id, n: c.name, coul: c.colors, et: etoiles(c.rep), note: Math.round(c.str || 0), obj: c.obj?.label || '' }))),
  }));
}

// ---------- Match de l'utilisateur ----------
function infosMatch(S, sim) {
  const joueurs = {};
  const ajouter = (pid) => {
    const p = S.players[pid];
    if (!p || joueurs[pid]) return;
    const l = lookDe(p);
    joueurs[pid] = [pshort(p), p.num || 0, p.pos, l.coupe, l.barbe, l.peau];
  };
  for (const side of sim.sides) {
    for (const sl of side.slots) if (sl.pid) ajouter(sl.pid);
    for (const id of side.bench) ajouter(id);
  }
  return joueurs;
}

export function jouerMatch(S, graine) {
  const m = userMatchToday(S);
  if (!m) return { error: "Pas de match aujourd'hui." };
  R.seed((graine >>> 0) || ((Date.now() % 2147483647) + 1));
  const sim = createSim(S, m, { userAuto: true, quiet: false });
  const eq = sim.sides.map((side) => ({ f: side.tactics.formation, xi: side.slots.map((sl) => [sl.pid, sl.pos, sl.x, sl.y]), banc: side.bench.slice() }));
  const joueurs = infosMatch(S, sim);
  const minutes = [];
  let garde = 0;
  while (!sim.done && garde++ < 400) {
    const per = sim.period, fin = FINS[per - 1];
    const label = sim.minute < fin ? String(sim.minute + 1) : `${fin}+${sim.extra + 1}`;
    const out = sim.step();
    if (!out) break;
    minutes.push([label, per, out.phases.map((ph) => [ph.t, ph.z, ph.k, ph.type || '', ph.ids || []]), out.events.map((e) => [e.type, e.t ?? -1, e.pid || '', e.pid2 || '', e.text || '', e.score || 0, e.ph ?? -1])]);
    for (const e of out.events) if (e.type === 'sub' && e.pid) { const p = S.players[e.pid]; if (p && !joueurs[e.pid]) { const l = lookDe(p); joueurs[e.pid] = [pshort(p), p.num || 0, p.pos, l.coupe, l.barbe, l.peau]; } }
  }
  const H = S.clubs[m.h], Aw = S.clubs[m.a];
  const userSide = m.h === S.user ? 0 : 1;
  const notes = Object.entries(sim.sides[userSide].rat).map(([pid, r]) => ({ pid, r })).sort((a, b) => b.r - a.r);
  const tous = [...Object.entries(sim.sides[0].rat), ...Object.entries(sim.sides[1].rat)].sort((a, b) => b[1] - a[1]);
  const hdm = tous[0] ? S.players[tous[0][0]] : null;
  const buts = sim.goals.map((g) => ({ min: g.min, t: g.t, txt: `${pshort(S.players[g.s])}${g.a ? ' · ' + pshort(S.players[g.a]) : ''}` }));
  const score = [sim.sides[0].goals, sim.sides[1].goals];
  const stats = { tirs: sim.stats.sh, cadres: sim.stats.on, poss: (() => { const t = sim.stats.poss[0] + sim.stats.poss[1] || 1; const p = Math.round((100 * sim.stats.poss[0]) / t); return [p, 100 - p]; })() };
  finishUserMatch(S, m, sim);
  const res = resultat(m, S.user);
  return {
    v: 1, h: m.h, a: m.a, eq, min: minutes, score, stats, joueurs,
    clubs: [{ ...clubMini(S, H), kit: maillot(H.colors) }, { ...clubMini(S, Aw), kit: maillot(Aw.colors) }],
    apres: {
      titre: res === 'V' ? 'Victoire !' : res === 'D' ? 'Défaite' : 'Match nul', comp: compName(S, m.c), score: `${score[0]} - ${score[1]}`,
      dom: H.short, ext: Aw.short, buts,
      hdm: hdm ? `${pname(hdm)} (${tous[0][1].toFixed(1)})` : '',
      notes: notes.map(({ pid, r }) => { const p = S.players[pid]; return { pos: sim.sides[userSide].posOf[pid] || p.pos, nom: pshort(p), r: r.toFixed(1) }; }),
    },
  };
}

// ---------- Actions ----------
export function nouvelleCarriere(nom, clubId) {
  const name = String(nom || '').normalize('NFC').replace(/[\u0000-\u001f<>"`]/g, '').replace(/\s+/g, ' ').trim().slice(0, 20);
  if (name.length < 2) return { error: 'Choisis un nom de manager (2 lettres au moins).' };
  const S = construireMonde(GRAINE);
  if (!S.clubs[clubId]) return { error: 'Club inconnu.' };
  S.seed = (Date.now() % 2147483647) + 1;
  R.seed(S.seed);
  startCareer(S, { name, nat: 'FR', clubId });
  return { S };
}

export function continuer(S) {
  const r = continueGame(S);
  const out = { stop: r.stop };
  if (r.stop === 'season' && r.report) {
    out.rapport = { titre: `Fin de la saison ${saison(S)}`, texte: typeof r.report === 'string' ? r.report : (r.report.lines || r.report.text || []).toString?.() || '' };
  }
  return out;
}

export function changerTactique(S, q) {
  if (!S.user) return { error: "Tu n'as pas de club." };
  const club = S.clubs[S.user];
  const t = club.tactics;
  if (q.f && FORMATIONS[q.f] && q.f !== t.formation) {
    t.formation = q.f;
    const { lineup, bench } = autoLineup(S, club, q.f, { rotate: true });
    club.lineup = lineup;
    club.bench = bench;
  }
  for (const [k, n] of [['ment', 5], ['press', 3], ['style', 4], ['width', 3], ['line', 3]]) {
    if (Number.isInteger(q[k]) && q[k] >= 0 && q[k] < n) t[k] = q[k];
  }
  if (q.auto) {
    const { lineup, bench } = autoLineup(S, club, t.formation, { rotate: true });
    club.lineup = lineup;
    club.bench = bench;
  }
  if (typeof q.delegue === 'boolean') S.mgr.autoPick = q.delegue;
  if (typeof q.penalty === 'string') club.penTaker = q.penalty && club.squad.includes(q.penalty) ? q.penalty : null;
  if (typeof q.a === 'string' && typeof q.b === 'string' && q.a !== q.b) {
    // échange de deux joueurs entre onze, banc et réserve
    const ou = (pid) => { let i = club.lineup.indexOf(pid); if (i >= 0) return ['lineup', i]; i = (club.bench || []).indexOf(pid); if (i >= 0) return ['bench', i]; return club.squad.includes(pid) ? ['reste', -1] : null; };
    const pa = ou(q.a), pb = ou(q.b);
    if (pa && pb) {
      const poser = (pos, pid) => { if (pos[0] === 'lineup') club.lineup[pos[1]] = pid; else if (pos[0] === 'bench') club.bench[pos[1]] = pid; };
      poser(pa, q.b);
      poser(pb, q.a);
    }
  }
  return {};
}

export function entrainer(S, q) {
  if (!S.user) return { error: "Tu n'as pas de club." };
  const c = S.clubs[S.user];
  if (TRAINING_FOCUS.some((f) => f.id === q.focus)) c.training.focus = q.focus;
  if (Number.isInteger(q.int) && q.int >= 0 && q.int < TRAINING_INTENSITY.length) c.training.int = q.int;
  return {};
}

export function lire(S, id) {
  const m = S.inbox.find((x) => x.id === id);
  if (!m) return { error: 'Message introuvable.' };
  m.read = true;
  return { titre: m.title, de: m.from, date: fmtDate(m.day, 'long'), corps: m.body || '' };
}

export function toutLire(S) {
  for (const m of S.inbox) m.read = true;
  return {};
}

export function offre(S, q) {
  if (!S.user) return { error: "Tu n'as pas de club." };
  const me = S.clubs[S.user];
  const p = S.players[q.id];
  if (!p || p.club === S.user) return { error: 'Joueur introuvable.' };
  const fee = p.club ? Math.max(0, Math.round(Number(q.fee) || 0)) : 0;
  if (p.club && !windowOpen(S)) return { error: 'Le mercato est fermé.' };
  if (fee > me.tBudget) return { error: `Budget insuffisant (${money(me.tBudget)}).` };
  const wj = willJoin(S, p, me);
  if (!wj.ok) return { error: wj.reason };
  if (p.club) {
    const ev = evaluateBid(S, p, fee, me);
    if (ev.res === 'counter') return { refus: `${S.clubs[p.club].name} demande ${money(ev.counter)}.`, contre: ev.counter };
    if (ev.res !== 'accept') return { refus: ev.reason || 'Offre refusée.' };
  }
  const wage = wageDemand(S, p, me);
  const years = p.age >= 31 ? 1 : p.age >= 28 ? 2 : 3;
  if (!canAfford(S, me, fee, wage)) return { refus: `Salaire demandé trop élevé pour ta masse salariale (${money(wage)} par semaine).` };
  const cr = contractResponse(S, p, me, wage, years);
  if (cr && cr.ok === false) return { refus: cr.reason || 'Le joueur refuse ton contrat.' };
  const from = p.club ? S.clubs[p.club] : null;
  executeTransfer(S, p, me, fee, wage, years);
  addNews(S, `${pname(p)} (${p.ovr}) : ${from ? from.name : 'libre'} → ${me.name}${fee ? ` pour ${money(fee)}` : ''}.`, 'transfer');
  me.bench = me.bench || [];
  if (me.bench.length < 9) me.bench.push(p.id);
  return { ok: `${pname(p)} signe pour ${years} an(s) à ${money(wage)} par semaine.` };
}

export function transferable(S, id) {
  const p = S.players[id];
  if (!p || p.club !== S.user) return { error: 'Joueur introuvable.' };
  p.listed = !p.listed;
  return {};
}

export function postuler(S, id) {
  if (!S.clubs[id]) return { error: 'Club inconnu.' };
  return applyForJob(S, id) ? { ok: 'Candidature envoyée.' } : { error: 'Tu as déjà postulé.' };
}

// ---------- Point d'entrée ----------
export async function traiter(b, store, lireClassement) {
  const a = b && b.a;
  if (a === 'clubs') return { pays: listeClubs() };
  if (a === 'nouvelle') {
    const r = nouvelleCarriere(b.nom, b.club);
    if (r.error) return r;
    const t = nouveauJeton();
    await sauver(store, t, r.S);
    return { t, ...vue(r.S, 'accueil') };
  }
  const S = await charger(store, b && b.t);
  if (!S) return { error: 'Carrière introuvable.', perdue: true };
  const q = (b.q && typeof b.q === 'object') ? b.q : {};
  let res = {}, modifie = false, ecran = typeof b.e === 'string' ? b.e : 'accueil';
  switch (a) {
    case 'vue':
      break;
    case 'continuer':
      res = continuer(S);
      modifie = true;
      ecran = res.stop === 'match' || res.stop === 'matchday' ? 'match' : res.stop === 'inbox' ? 'messagerie' : 'accueil';
      break;
    case 'jouer': {
      const m = jouerMatch(S, Number(b.s) || 0);
      if (m.error) return m;
      await sauver(store, b.t, S);
      return { match: m, haut: haut(S) };
    }
    case 'tactique':
      res = changerTactique(S, q);
      modifie = true;
      ecran = 'tactique';
      break;
    case 'entrainement':
      res = entrainer(S, q);
      modifie = true;
      ecran = 'entrainement';
      break;
    case 'lire':
      res = { message: lire(S, b.id) };
      modifie = true;
      break;
    case 'toutLire':
      res = toutLire(S);
      modifie = true;
      ecran = 'messagerie';
      break;
    case 'offre':
      res = offre(S, q);
      modifie = !!res.ok;
      ecran = 'mercato';
      break;
    case 'transferable':
      res = transferable(S, b.id);
      modifie = true;
      ecran = 'joueur';
      break;
    case 'postuler':
      res = postuler(S, b.id);
      modifie = !res.error;
      ecran = 'carriere';
      break;
    case 'supprimer':
      await store.delete('c/' + b.t);
      return { supprime: true };
    default:
      return { error: 'Action inconnue.' };
  }
  if (res.error) return { ...res, ...vue(S, ecran, q) };
  if (modifie) await sauver(store, b.t, S);
  const v = vue(S, ecran, q);
  if (v.ecran === 'mondial' || ecran === 'mondial') {
    v.ecran = 'mondial';
    v.d = { score: careerScore(S.mgr.career), classement: lireClassement ? await lireClassement() : null };
  }
  return { ...res, ...v };
}
