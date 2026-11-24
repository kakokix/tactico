// Carrière Tactico pour Roblox : le jeu complet du site tourne ici, côté serveur, en anglais.
// Chaque carrière est rangée dans Netlify Blobs sous un jeton secret, gardé par le serveur Roblox.
// Les vues renvoient des données déjà mises en forme, pour que les écrans Roblox restent simples.
import { randomBytes } from 'node:crypto';
import { gzipSync, gunzipSync } from 'node:zlib';
import { setLang, posL, ordL, paysL } from '../../../src/core/i18n.js';
import { construireMonde, GRAINE, maillot, lookDe, adapterPourRoblox, adapterPourSite } from '../../../roblox/outils/monde.mjs';
import { deposer, retirer, DUREE_MIN } from '../lien/core.mjs';
import { startCareer, continueGame, userMatchToday, nextUserMatch, createSim, finishUserMatch } from '../../../src/core/game.js';
import { leagueTable, compName, matchWinner, positionOf } from '../../../src/core/competitions.js';
import { fmtDate, toDate, monthName, windowOpen } from '../../../src/core/dates.js';
import { pname, pshort, avgRating, ovrAt } from '../../../src/core/player.js';
import { serialize, deserialize } from '../../../src/core/save.js';
import { FORMATIONS, FORMATION_LIST, TRAINING_FOCUS, TRAINING_INTENSITY, POS_GROUP, SCORE_RULES, contiName, A, ATTR_GROUPS } from '../../../src/core/constants.js';
import { autoLineup, lineupStrength } from '../../../src/core/team.js';
import { fmtMoney, askingPrice, evaluateBid, willJoin, wageDemand, contractResponse, canAfford, executeTransfer, releasePlayer, releaseCost } from '../../../src/core/transfers.js';
import { wageBill, projectRevenue, ticketPrice, facUpgradeCost, stadiumExpandCost, addFin, tvMoney, commercial } from '../../../src/core/finance.js';
import { confLabel, vacancies, jobChance, applyForJob, takeJob, sackUser } from '../../../src/core/board.js';
import { careerScore, trophyCount } from '../../../src/core/score.js';
import { addNews } from '../../../src/core/messages.js';
import { NATION_CODES } from '../../../src/data/names.js';
import { REAL_COUNTRIES } from '../../../src/data/real/index.js';
import { R } from '../../../src/core/rng.js';

setLang('en'); // le jeu Roblox est entièrement en anglais (textes du moteur compris)

const money = fmtMoney;
const etoiles = (rep) => Math.max(1, Math.min(5, Math.round((rep - 30) / 13)));
const sais = (y) => `${y}-${String((y + 1) % 100).padStart(2, '0')}`;
const saison = (S) => sais(S.season);
const signe = (n) => (n > 0 ? '+' + n : String(n));
const nombre = (n) => Math.round(n).toLocaleString('en-GB');
const FINS = [45, 90, 105, 120];

// ---------- Textes anglais des réglages ----------
const MENT = ['Very defensive', 'Defensive', 'Balanced', 'Attacking', 'Very attacking'];
const PRESS = ['Low', 'Medium', 'High'];
const STYLE = ['Possession', 'Balanced', 'Direct', 'Counter-attack'];
const WIDTH = ['Narrow', 'Normal', 'Wide'];
const DLINE = ['Deep', 'Normal', 'High'];
const INTENS = ['Light', 'Normal', 'Intense'];
const FOCUS = { eq: 'Balanced', att: 'Attacking', def: 'Defending', tech: 'Technique', phy: 'Physical', tac: 'Tactical' };
const FOCUS_DESC = {
  eq: 'Balanced development of every attribute.', att: 'Finishing, long shots, dribbling and crossing improve faster.',
  def: 'Tackling, marking, heading and positioning.', tech: 'Passing, vision, dribbling and set pieces.',
  phy: 'Pace, stamina and strength.', tac: 'Positioning, composure and work rate; team cohesion grows faster.',
};
const FAC = { train: 'Training ground', youth: 'Youth academy', med: 'Medical centre' };
const FAC_DESC = { train: 'Player development', youth: 'Quality of academy graduates', med: 'Recovery and injury length' };
const FIN = {
  Billetterie: 'Ticketing', 'Droits TV': 'TV rights', Sponsors: 'Sponsors', Primes: 'Prize money', Transferts: 'Transfers',
  Salaires: 'Wages', Fonctionnement: 'Running costs', Infrastructures: 'Facilities', Indemnités: 'Severance pay', Prêts: 'Loans', Travaux: 'Construction',
};
const ATTR = {
  fin: 'Finishing', tir: 'Long shots', pas: 'Passing', vis: 'Vision', dri: 'Dribbling', cen: 'Crossing', tac: 'Tackling', mar: 'Marking',
  tet: 'Heading', pla: 'Positioning', sgf: 'Composure', tra: 'Work rate', vit: 'Pace', end: 'Stamina', pui: 'Strength', cpa: 'Set pieces',
  arr: 'Shot stopping', sor: 'Sweeping',
};
const GROUPE = { Attaque: 'Attacking', Jeu: 'Playmaking', Défense: 'Defending', Physique: 'Physical', Gardien: 'Goalkeeping' };
const POS_NOM = {
  GB: 'Goalkeeper', DD: 'Right back', DC: 'Centre back', DG: 'Left back', MDC: 'Defensive midfielder', MD: 'Right midfielder',
  MC: 'Central midfielder', MG: 'Left midfielder', MOC: 'Attacking midfielder', AD: 'Right winger', AG: 'Left winger', BU: 'Striker',
};
const PAYS_ISO = { GB: 'EN' }; // pays Roblox (ISO) → nationalités du jeu
const NO_CLUB = "You don't have a club.";

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
  return w === cid ? 'W' : w && w !== cid ? 'L' : gf === ga ? 'D' : gf > ga ? 'W' : 'L';
}
// Forme : V/N/D (site) → W/D/L
const forme = (f) => String(f || '').split('').map((x) => (x === 'V' ? 'W' : x === 'N' ? 'D' : x === 'D' ? 'L' : x)).join('');
function haut(S) {
  const club = S.user ? S.clubs[S.user] : null;
  return {
    club: club ? club.name : 'No club', abr: club ? club.abbr : '', coul: club ? club.colors : ['#0d1d15', '#1d3327'],
    date: `${fmtDate(S.day, 'wdm')} ${toDate(S.day).y}`, argent: club ? money(club.balance) : '',
    jourDeMatch: !!userMatchToday(S), nonLus: S.inbox.filter((m) => !m.read).length, sansClub: club ? 0 : 1,
  };
}
function statut(p) {
  return p.inj > 0 ? `Injured ${p.inj}d` : p.susp > 0 ? `Suspended ${p.susp}` : p.listed ? 'Listed' : p.youth ? 'Youth' : '';
}
function ligneJoueur(S, p, inXI) {
  return {
    id: p.id, num: p.youth ? '' : p.num, pos: posL(p.pos), nom: pname(p), xi: inXI ? 1 : 0, age: p.age, note: p.ovr, pot: p.pot,
    fr: Math.round(p.cond), mo: Math.round(p.morale), fo: p.form.toFixed(1), mj: p.st.apps, b: p.st.gls, pd: p.st.ast,
    moy: p.st.apps ? avgRating(p).toFixed(2) : '–', val: money(p.value), sal: money(p.wage), ctr: p.until, statut: statut(p),
  };
}
const dispo = (p) => (p.inj > 0 || p.susp > 0 ? 0 : 1);

// ---------- Vues ----------
const VUES = {};

VUES.accueil = (S) => {
  if (!S.user) {
    return {
      sansClub: true, titre: 'No club', sous: `${S.mgr.name} · reputation ${Math.round(S.mgr.rep)}/100 · look for a job in Career`,
      actus: S.news.slice(0, 10).map((n) => ({ d: fmtDate(n.d, 'dm'), t: n.t })),
      messages: S.inbox.filter((m) => !m.read).slice(0, 3).map((m) => ({ id: m.id, titre: m.title, meta: `${m.from} · ${fmtDate(m.day, 'dm')}` })),
    };
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
      comp: compName(S, nm.c) + (nm.lb ? ' · ' + nm.lb : ''), quand: `${fmtDate(nm.d, 'wdm')}${j > 0 ? ` · in ${j} day${j > 1 ? 's' : ''}` : ' · today'}`,
      dom: clubMini(S, H), ext: clubMini(S, Aw), stade: nm.neutral ? 'Neutral ground' : H.stadium.name, aujourdhui: !!today,
    };
  }
  const autour = table.slice(Math.max(0, Math.min(pos - 3, table.length - 5)), Math.max(5, Math.min(pos + 2, table.length)));
  const results = Object.values(S.matches).filter((m) => m.done && (m.h === club.id || m.a === club.id)).sort((a, b) => b.d - a.d).slice(0, 5);
  return {
    titre: club.name, sous: `${comp.name} · Season ${saison(S)} · Manager ${S.mgr.name}`, prochain,
    kpis: { classement: row && row.p ? `${ordL(pos)} · ${row.pts} pts` : '—', objectif: club.obj.label, confiance: Math.round(S.mgr.conf), score: nombre(careerScore(S.mgr.career)) },
    ligue: comp.name,
    table: autour.map((r) => ({ pos: table.indexOf(r) + 1, n: S.clubs[r.c].name, coul: S.clubs[r.c].colors, j: r.p, diff: signe(r.gf - r.ga), pts: r.pts, moi: r.c === club.id ? 1 : 0 })),
    forme: forme(row?.f),
    resultats: results.map((m) => ({ r: resultat(m, club.id), txt: `${S.clubs[m.h].short} ${m.hg}-${m.ag} ${S.clubs[m.a].short}${m.pen ? ` (${m.pen[0]}-${m.pen[1]} pens)` : ''}`, meta: `${compName(S, m.c)} · ${fmtDate(m.d, 'dm')}` })),
    messages: S.inbox.filter((m) => !m.read).slice(0, 3).map((m) => ({ id: m.id, titre: m.title, meta: `${m.from} · ${fmtDate(m.day, 'dm')}` })),
    absents: club.squad.map((id) => S.players[id]).filter((p) => p.inj > 0 || p.susp > 0).map((p) => ({ id: p.id, pos: posL(p.pos), nom: pname(p), meta: p.inj > 0 ? `${p.injName} · ${p.inj}d` : `Suspended · ${p.susp} match(es)`, etat: p.inj > 0 ? 'Injured' : 'Suspended' })),
    actus: S.news.slice(0, 8).map((n) => ({ d: fmtDate(n.d, 'dm'), t: n.t })),
  };
};

VUES.messagerie = (S) => ({
  sous: `${S.inbox.filter((m) => !m.read).length} unread`,
  messages: S.inbox.slice(0, 80).map((m) => ({ id: m.id, titre: m.title, meta: `${m.from} · ${fmtDate(m.day, 'dm')}`, lu: m.read ? 1 : 0, action: m.act && !m.done ? 1 : 0 })),
});

const GROUPES = { all: () => true, GB: (p) => p.pos === 'GB', DEF: (p) => POS_GROUP[p.pos] === 'DEF', MIL: (p) => POS_GROUP[p.pos] === 'MIL', ATT: (p) => POS_GROUP[p.pos] === 'ATT' };
const TRIS = { pos: (p) => 'GB DD DC DG MDC MD MC MG MOC AD AG BU'.split(' ').indexOf(p.pos) * 100 - p.ovr, ovr: (p) => -p.ovr, age: (p) => p.age, val: (p) => -p.value, fr: (p) => p.cond };
VUES.effectif = (S, q = {}) => {
  if (!S.user) return { vide: NO_CLUB };
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
    sous: `${club.squad.length} players · ${club.youth.length} in the youth academy · average age ${moyAge.toFixed(1)}`,
    g, tri: q.tri || 'pos', joueurs: ps.map((p) => ligneJoueur(S, p, xi.has(p.id))),
  };
};

VUES.tactique = (S) => {
  if (!S.user) return { vide: NO_CLUB };
  const club = S.clubs[S.user];
  const t = club.tactics;
  const slots = FORMATIONS[t.formation];
  const note = lineupStrength(S, t.formation, club.lineup);
  const xi = slots.map((sl, i) => {
    const p = S.players[club.lineup[i]];
    return p ? { pid: p.id, pos: posL(sl.pos), x: sl.x, y: sl.y, nom: pshort(p), num: p.num, note: Math.round(ovrAt(p, sl.pos)), fr: Math.round(p.cond), dispo: dispo(p) }
      : { pid: '', pos: posL(sl.pos), x: sl.x, y: sl.y, nom: '—', num: '', note: 0, fr: 0, dispo: 1 };
  });
  const banc = (club.bench || []).map((id) => S.players[id]).filter(Boolean).map((p) => ({ pid: p.id, pos: posL(p.pos), nom: pname(p), note: p.ovr, fr: Math.round(p.cond), dispo: dispo(p) }));
  const pris = new Set([...club.lineup, ...(club.bench || [])]);
  const reste = club.squad.map((id) => S.players[id]).filter((p) => !pris.has(p.id)).sort((a, b) => b.ovr - a.ovr).map((p) => ({ pid: p.id, pos: posL(p.pos), nom: pname(p), note: p.ovr, fr: Math.round(p.cond), dispo: dispo(p) }));
  const tireurs = club.lineup.map((id) => S.players[id]).filter(Boolean).map((p) => ({ pid: p.id, nom: pshort(p) }));
  return {
    sous: `Team rating ${note.toFixed(1)} · cohesion ${Math.round(club.coh)}% · ${t.formation}`,
    note: note.toFixed(1), cohesion: Math.round(club.coh), f: t.formation, formations: FORMATION_LIST, xi, banc, reste,
    consignes: { ment: t.ment, press: t.press, style: t.style, width: t.width, line: t.line },
    choix: { ment: MENT, press: PRESS, style: STYLE, width: WIDTH, line: DLINE },
    penalty: club.penTaker || '', tireurs, delegue: S.mgr.autoPick ? 1 : 0,
  };
};

VUES.calendrier = (S, q = {}) => {
  if (!S.user) return { vide: NO_CLUB };
  const club = S.clubs[S.user];
  const f = q.f || 'all';
  let ms = Object.values(S.matches).filter((m) => m.h === club.id || m.a === club.id);
  if (f !== 'all') ms = ms.filter((m) => S.comps[m.c]?.type === f);
  ms.sort((a, b) => a.d - b.d);
  return {
    sous: `Season ${saison(S)} · ${ms.filter((m) => m.done).length}/${ms.length} matches played`, f, conti: contiName(S),
    matchs: ms.map((m) => {
      const t = toDate(m.d);
      const dom = m.h === club.id;
      const adv = S.clubs[dom ? m.a : m.h];
      const typ = S.comps[m.c]?.type;
      return {
        mois: `${monthName(t.m)} ${t.y}`, date: fmtDate(m.d, 'wdm'), adv: adv.name, abr: adv.abbr, coul: adv.colors, dom: dom ? 1 : 0,
        meta: `${compName(S, m.c)}${m.lb ? ' · ' + m.lb : typ === 'league' ? ' · MD' + m.rd : ''}${m.neutral ? ' · neutral ground' : dom ? ' · home' : ' · away'}`,
        r: m.done ? resultat(m, club.id) : '', score: m.done ? `${dom ? m.hg : m.ag}-${dom ? m.ag : m.hg}${m.pen ? '*' : ''}` : '', auj: m.d === S.day ? 1 : 0,
      };
    }),
  };
};

VUES.competitions = (S, q = {}) => {
  const club = S.user ? S.clubs[S.user] : null;
  const pays = REAL_COUNTRIES.some((c) => c.code === q.pays) ? q.pays : club?.country || 'FR';
  const div = q.div === 1 || q.div === 2 ? q.div : (club && club.country === pays ? S.comps[club.league].level : 1);
  const onglet = q.o || 'table';
  const C = REAL_COUNTRIES.find((c) => c.code === pays) || REAL_COUNTRIES[0];
  const comp = S.comps[pays + div];
  const out = { o: onglet, pays, div, sous: `Season ${saison(S)}`, ligues: REAL_COUNTRIES.map((c) => ({ code: c.code, nom: paysL(c.name), d1: c.d1, d2: c.d2 })) };
  if (onglet === 'table' && comp) {
    const rows = leagueTable(S, comp);
    const n = rows.length;
    out.titre = comp.name;
    out.lignes = rows.map((r, i) => {
      let z = '';
      if (div === 1 && i < C.conti) z = 'c';
      else if (div === 1 && i >= n - C.down) z = 'r';
      else if (div === 1 && C.po === 'barrage' && i === n - C.down - 1) z = 'b';
      else if (div === 2 && i < C.up) z = 'p';
      else if (div === 2 && ((C.po === 'playoff' && i < 6) || (C.po === 'barrage' && i === C.up))) z = 'b';
      const c = S.clubs[r.c];
      return { pos: i + 1, n: c.name, coul: c.colors, j: r.p, g: r.w, nu: r.d, p: r.l, bp: r.gf, bc: r.ga, diff: signe(r.gf - r.ga), pts: r.pts, forme: forme(r.f), z, moi: r.c === S.user ? 1 : 0 };
    });
    out.legende = div === 1
      ? `Top ${C.conti}: ${contiName(S)} · bottom ${C.down}: relegated${C.po === 'barrage' ? ` · ${ordL(n - C.down)}: play-off` : ''}`
      : `Top ${C.up}: promoted${C.po === 'playoff' ? ' · 3rd to 6th: play-offs' : C.po === 'barrage' ? ` · ${ordL(C.up + 1)}: play-off` : ''}`;
  } else if (onglet === 'resultats' && comp) {
    out.titre = comp.name;
    const ms = Object.values(S.matches).filter((m) => m.c === comp.id && m.done).sort((a, b) => b.d - a.d).slice(0, 40);
    out.matchs = ms.map((m) => ({ date: fmtDate(m.d, 'dm'), txt: `${S.clubs[m.h].name} ${m.hg}-${m.ag} ${S.clubs[m.a].name}`, moi: m.h === S.user || m.a === S.user ? 1 : 0 }));
  } else if (onglet === 'coupes' || onglet === 'europe') {
    const cid = onglet === 'coupes' ? pays + 'C' : 'CONT';
    out.titre = S.comps[cid]?.name || (onglet === 'europe' ? contiName(S) : 'Cup');
    out.matchs = Object.values(S.matches).filter((m) => m.c === cid).sort((a, b) => b.d - a.d).slice(0, 60).map((m) => ({
      date: `${fmtDate(m.d, 'dm')}${m.lb ? ' · ' + m.lb : ''}`,
      txt: m.done ? `${S.clubs[m.h].name} ${m.hg}-${m.ag} ${S.clubs[m.a].name}${m.pen ? ` (${m.pen[0]}-${m.pen[1]} pens)` : ''}` : `${S.clubs[m.h].name} v ${S.clubs[m.a].name}`,
      moi: m.h === S.user || m.a === S.user ? 1 : 0,
    }));
  } else if (onglet === 'stats' && comp) {
    out.titre = comp.name;
    const ps = comp.clubs.flatMap((cid) => S.clubs[cid].squad.map((id) => S.players[id]));
    out.buteurs = ps.filter((p) => p.st.lg).sort((a, b) => b.st.lg - a.st.lg).slice(0, 20).map((p) => ({ nom: pname(p), club: S.clubs[p.club]?.name || '', v: p.st.lg }));
    out.passeurs = ps.filter((p) => p.st.ast).sort((a, b) => b.st.ast - a.st.ast).slice(0, 20).map((p) => ({ nom: pname(p), club: S.clubs[p.club]?.name || '', v: p.st.ast }));
  } else if (onglet === 'palmares') {
    out.palmares = (S.history || []).slice(0, 15).map((h) => ({
      s: sais(h.s),
      lignes: (h.leagues || []).filter((l) => l.id.startsWith(pays)).map((l) => `${l.name}: ${S.clubs[l.champ]?.name || l.champ || '—'}`),
    }));
  }
  return out;
};

const PRIX = [0, 5e5, 1e6, 2e6, 5e6, 1e7, 2e7, 4e7, 8e7, 1e12];
VUES.mercato = (S, q = {}) => {
  if (!S.user) return { vide: NO_CLUB };
  const club = S.clubs[S.user];
  const bill = wageBill(S, club);
  const ouvert = windowOpen(S);
  const o = q.o || 'search';
  const out = {
    o, ouvert: ouvert ? 1 : 0,
    sous: ouvert ? `Window open until ${fmtDate(S.day <= S.sd.summerClose ? S.sd.summerClose : S.sd.winterClose, 'dm')}` : `Window closed · reopens on ${fmtDate(S.day < S.sd.winterOpen ? S.sd.winterOpen : S.sd.start + 365, 'dm')} · free agents can still be signed`,
    kpis: { budget: money(club.tBudget), masse: money(bill), max: money(club.wBudget), marge: money(club.wBudget - bill), margeOk: club.wBudget - bill >= 0 ? 1 : 0, solde: money(club.balance) },
  };
  const ligne = (p) => ({ id: p.id, pos: posL(p.pos), nom: pname(p), age: p.age, club: p.club ? S.clubs[p.club].name : 'Free agent', val: money(p.value), note: p.ovr, pot: p.pot, tr: p.listed ? 1 : 0 });
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
    out.total = S.free.length;
  } else if (o === 'mine') {
    out.mouvements = S.transfers.filter((t) => t.from === S.user || t.to === S.user).slice(0, 60).map((t) => ({ arrivee: t.to === S.user ? 1 : 0, n: t.n, meta: `${fmtDate(t.d, 'dm')} · ${t.to === S.user ? 'from ' + (t.from ? S.clubs[t.from].name : 'free agency') : 'to ' + S.clubs[t.to].name}${t.loan ? ' · loan' : ''}`, fee: t.fee ? money(t.fee) : '—' }));
  } else {
    out.mouvements = S.transfers.slice(0, 80).map((t) => ({ n: `${t.n} (${posL(t.pos)}, ${t.ovr})`, meta: `${fmtDate(t.d, 'dm')} · ${t.from ? S.clubs[t.from]?.name || '?' : 'Free agent'} → ${S.clubs[t.to]?.name || '?'}${t.loan ? ' (loan)' : ''}`, fee: t.fee ? money(t.fee) : '—' }));
  }
  return out;
};

VUES.entrainement = (S) => {
  if (!S.user) return { vide: NO_CLUB };
  const c = S.clubs[S.user];
  return {
    sous: `${FAC.train} level ${c.fac.train}/5 · ${FAC.youth} level ${c.fac.youth}/5`,
    themes: TRAINING_FOCUS.map((f) => ({ id: f.id, nom: FOCUS[f.id] || f.name, desc: FOCUS_DESC[f.id], on: c.training.focus === f.id ? 1 : 0 })),
    intensites: INTENS.slice(0, TRAINING_INTENSITY.length), intensite: c.training.int,
    progres: c.squad.map((id) => S.players[id]).filter((p) => p.o0 != null && p.ovr !== p.o0).sort((a, b) => (b.ovr - b.o0) - (a.ovr - a.o0)).slice(0, 8).map((p) => ({ id: p.id, pos: posL(p.pos), nom: pname(p), meta: `Age ${p.age} · ${p.o0} → ${p.ovr}`, d: signe(p.ovr - p.o0), plus: p.ovr >= p.o0 ? 1 : 0 })),
    jeunes: c.youth.map((id) => S.players[id]).sort((a, b) => b.pot - a.pot).map((p) => ({ id: p.id, pos: posL(p.pos), nom: pname(p), meta: `Age ${p.age} · potential ${p.pot}`, note: p.ovr })),
  };
};

VUES.finances = (S) => {
  if (!S.user) return { vide: NO_CLUB };
  const c = S.clubs[S.user];
  const bill = wageBill(S, c);
  const sum = (o) => Object.values(o).reduce((a, b) => a + b, 0);
  const tin = sum(c.fin.in), tout = sum(c.fin.out);
  const maxv = Math.max(1, ...Object.values(c.fin.in), ...Object.values(c.fin.out));
  const barres = (o) => Object.entries(o).sort((a, b) => b[1] - a[1]).map(([k, v]) => ({ k: FIN[k] || k, v: money(v), part: v / maxv }));
  const coutStade = stadiumExpandCost(2000);
  return {
    sous: `Season ${saison(S)} · projected revenue ${money(projectRevenue(S, c))} per season`,
    kpis: { solde: money(c.balance), soldeOk: c.balance >= 0 ? 1 : 0, budget: money(c.tBudget), salaires: money(bill), max: money(c.wBudget), bilan: money(tin - tout), bilanOk: tin - tout >= 0 ? 1 : 0 },
    recettes: { total: money(tin), lignes: barres(c.fin.in) }, depenses: { total: money(tout), lignes: barres(c.fin.out) },
    budgets: { versSalaires: c.tBudget >= 1e6 ? 1 : 0, versTransferts: c.wBudget - bill >= 1e6 / 52 ? 1 : 0, taux: money(1e6 / 52) },
    stade: {
      nom: c.stadium.name, cap: nombre(c.stadium.cap), billet: `€${ticketPrice(S, c)}`, tv: money(tvMoney(S, c)), sponsors: money(commercial(c)),
      cout: money(coutStade), possible: c.balance >= coutStade ? 1 : 0,
    },
    infra: Object.keys(FAC).map((k) => ({ k, n: FAC[k], desc: FAC_DESC[k], niv: c.fac[k], cout: c.fac[k] < 5 ? money(facUpgradeCost(c.fac[k])) : '', possible: c.fac[k] < 5 && c.balance >= facUpgradeCost(c.fac[k]) ? 1 : 0 })),
    salaires: c.squad.map((id) => S.players[id]).sort((a, b) => b.wage - a.wage).slice(0, 8).map((p) => ({ id: p.id, pos: posL(p.pos), nom: pname(p), v: money(p.wage) })),
  };
};

VUES.club = (S) => {
  if (!S.user) return { vide: NO_CLUB };
  const c = S.clubs[S.user];
  const comp = S.comps[c.league];
  const pos = positionOf(S, c.id);
  const del = S.mgr.delegate || { renew: true, fill: true };
  return {
    titre: c.name, sous: `${comp.name} · ${c.city} · reputation ${c.rep}/100`, coul: c.colors, abr: c.abbr, et: etoiles(c.rep),
    stade: `${c.stadium.name} · ${nombre(c.stadium.cap)} seats`,
    president: {
      confiance: Math.round(S.mgr.conf), label: confLabel(S.mgr.conf), position: comp.table[c.id]?.p ? ordL(pos) : '—', objectif: c.obj.label,
      aide: 'Confidence goes up with wins and trophies, and down with defeats and debts. Below 12% you are sacked.',
    },
    delegation: { renew: del.renew ? 1 : 0, fill: del.fill ? 1 : 0, auto: S.mgr.autoPick ? 1 : 0 },
    infra: Object.keys(FAC).map((k) => ({ n: FAC[k], niv: c.fac[k] })),
    trophees: (c.trophies || []).slice().reverse().slice(0, 20).map((t) => ({ n: t.n || t.name || String(t), s: t.s ? sais(t.s) : '' })),
    historique: (c.hist || []).slice(0, 12).map((h) => ({ s: sais(h.s), txt: `${h.ln} · ${ordL(h.pos)} · ${h.pts} pts (${h.w}W ${h.d}D ${h.lo}L)` })),
  };
};

VUES.carriere = (S) => {
  const m = S.mgr, c = m.career;
  const games = c.w + c.d + c.l;
  const R_ = SCORE_RULES;
  const club = S.user ? S.clubs[S.user] : null;
  const parts = [['Wins', c.w * R_.win], ['Draws', c.d * R_.draw], ['League titles (D1)', c.titles1 * R_.title1], ['League titles (D2)', c.titles2 * R_.title2], ['Cups', c.cups * R_.cup], [contiName(S), c.conti * R_.conti], ['Promotions', c.promos * R_.promo], ['Objectives met', c.objMet * R_.objMet], ['Objectives exceeded', c.objEx * R_.objEx]].filter(([, v]) => v);
  const apps = m.apps || [];
  return {
    titre: m.name, sous: `${club ? `Manager of ${club.name}` : 'No club'} · reputation ${Math.round(m.rep)}/100 · ${c.seasons} season(s) completed`, club: club ? 1 : 0,
    kpis: { score: nombre(careerScore(c)), matchs: games, bilan: `${c.w}W ${c.d}D ${c.l}L`, pct: `${games ? Math.round((c.w / games) * 100) : 0}%`, trophees: trophyCount(c), licenciements: c.sacked },
    calcul: parts.map(([k, v]) => ({ k, v: '+' + nombre(v) })),
    regle: `Win ${R_.win} · draw ${R_.draw} · D1 title ${R_.title1} · D2 title ${R_.title2} · cup ${R_.cup} · ${contiName(S)} ${R_.conti} · promotion ${R_.promo} · objective met ${R_.objMet} (+${R_.objEx} if exceeded).`,
    trophees: m.trophies.slice().reverse().map((t) => ({ n: t.n, meta: `${t.c} · ${sais(t.s)}` })),
    postes: vacancies(S).sort((a, b) => b.rep - a.rep).slice(0, 30).map((v) => ({ id: v.id, n: v.name, coul: v.colors, abr: v.abbr, meta: `${S.comps[v.league].name} · reputation ${v.rep} · ${Math.round(jobChance(S, v) * 100)}% chance`, envoye: apps.some((a) => a.club === v.id) ? 1 : 0 })),
    saisons: m.log.slice(0, 12).map((l) => ({ s: sais(l.s), txt: `${l.club} · ${ordL(l.pos)} · ${l.res || (l.met ? 'Objective met' : 'Objective missed')}`, ok: l.met ? 1 : 0 })),
  };
};

VUES.options = (S) => ({ manager: S.mgr.name, club: S.user ? S.clubs[S.user].name : 'No club', saison: saison(S) });

VUES.match = (S) => {
  const m = userMatchToday(S);
  if (!m) return { vide: 'No match today.' };
  const club = S.clubs[S.user];
  const H = S.clubs[m.h], Aw = S.clubs[m.a];
  const info = (c) => {
    const comp = S.comps[c.league];
    const row = comp?.table?.[c.id];
    const pos = comp ? positionOf(S, c.id) : 0;
    return { ...clubMini(S, c), meta: row && row.p ? `${ordL(pos)} · ${row.pts} pts` : comp?.name || '', note: Math.round(c.str || 0) };
  };
  const t = club.tactics;
  const slots = FORMATIONS[t.formation];
  return {
    titre: 'Match day', sous: `${compName(S, m.c)}${m.lb ? ' · ' + m.lb : m.rd && S.comps[m.c]?.type === 'league' ? ' · matchday ' + m.rd : ''} · ${fmtDate(m.d, 'long')}`,
    dom: info(H), ext: info(Aw), stade: m.neutral ? 'Neutral ground' : H.stadium.name,
    onze: `Your XI · ${t.formation}`, consignes: `${MENT[t.ment]} · ${PRESS[t.press].toLowerCase()} pressing · ${STYLE[t.style].toLowerCase()}`,
    joueurs: slots.map((sl, i) => { const p = S.players[club.lineup[i]]; return p ? { pos: posL(sl.pos), nom: pname(p), fr: Math.round(p.cond), note: Math.round(ovrAt(p, sl.pos)), dispo: dispo(p) } : null; }).filter(Boolean),
  };
};

VUES.joueur = (S, q = {}) => {
  const p = S.players[q.id];
  if (!p) return { vide: 'This player has retired.' };
  const c = p.club ? S.clubs[p.club] : null;
  const mien = !!S.user && p.club === S.user;
  const me = S.user ? S.clubs[S.user] : null;
  const groupes = p.pos === 'GB' ? [ATTR_GROUPS[4], ...ATTR_GROUPS.slice(0, 4)] : ATTR_GROUPS.slice(0, 4);
  const out = {
    id: p.id, nom: pname(p), pos: posL(p.pos), poste: POS_NOM[p.pos] || p.pos, age: p.age, note: p.ovr, pot: p.pot,
    club: c ? c.name : 'Free agent', coul: c ? c.colors : null, abr: c ? c.abbr : '', num: p.num, statut: statut(p),
    sous: `${POS_NOM[p.pos] || p.pos}${p.alt && p.alt.length ? ' · also ' + p.alt.map(posL).join(', ') : ''} · age ${p.age} · ${c ? c.name : 'free agent'}`,
    kpis: [['Overall', String(p.ovr)], ['Potential', String(p.pot)], ['Value', money(p.value)], ['Wage / wk', money(p.wage)], ['Contract', p.club ? `June ${p.until}` : '—'], ['Fitness', `${Math.round(p.cond)}%`], ['Morale', `${Math.round(p.morale)}/100`], ['Form', p.form.toFixed(1)]],
    groupes: groupes.map(([n, keys]) => ({ n: GROUPE[n] || n, attrs: keys.map((k) => ({ n: ATTR[k] || k, v: p.attr[A[k]] })) })),
    stats: `Season ${saison(S)}: ${p.st.apps} apps · ${p.st.gls} goals · ${p.st.ast} assists${p.st.apps ? ' · average rating ' + avgRating(p).toFixed(2) : ''} · ${p.st.motm || 0} MOTM`,
    blessure: p.inj > 0 ? `${p.injName} · out for ${p.inj} days` : '',
    monJoueur: mien ? 1 : 0, transferable: p.listed ? 1 : 0, jeune: p.youth ? 1 : 0, pret: p.loan ? 1 : 0,
    // portrait : la tête de son personnage R6, avec le maillot de son club
    look: (({ coupe, barbe, peau }) => ({ coupe, barbe, peau }))(lookDe(p)), kit: c ? maillot(c.colors) : { m: '#3a4a42', s: '#2b3a33', n: '#ffffff' }, nat: p.nat,
  };
  if (mien) {
    const club = S.clubs[S.user];
    out.tireur = club.penTaker === p.id ? 1 : 0;
    out.demande = p.youth ? '' : money(wageDemand(S, p, club));
    out.liberation = p.youth ? '' : money(releaseCost(S, p));
  } else if (me && !p.youth) {
    out.prix = p.club ? money(askingPrice(S, p)) : '';
    out.prixBrut = p.club ? askingPrice(S, p) : 0;
    out.libre = p.club ? 0 : 1;
    out.ouvert = windowOpen(S) ? 1 : 0;
  }
  return out;
};

export function vue(S, ecran, q) {
  const f = VUES[ecran] || VUES.accueil;
  return { ecran: VUES[ecran] ? ecran : 'accueil', haut: haut(S), d: f(S, q || {}) };
}

// ---------- Choix du club (nouvelle carrière) ----------
export function listeClubs() {
  const S = mondeDeBase();
  return REAL_COUNTRIES.map((C) => ({
    code: C.code, nom: paysL(C.name), d1: C.d1, d2: C.d2,
    clubs: [1, 2].map((div) => S.comps[C.code + div].clubs.map((id) => S.clubs[id]).sort((a, b) => b.rep - a.rep).map((c) => ({ id: c.id, n: c.name, a: c.abbr, coul: c.colors, et: etoiles(c.rep), note: Math.round(c.str || 0), obj: c.obj?.label || '' }))),
  }));
}

// ---------- Match de l'utilisateur ----------
function infoJoueur(p) {
  const l = lookDe(p);
  return [pshort(p), p.num || 0, posL(p.pos), l.coupe, l.barbe, l.peau];
}
function infosMatch(S, sim) {
  const joueurs = {};
  const ajouter = (pid) => {
    const p = S.players[pid];
    if (p && !joueurs[pid]) joueurs[pid] = infoJoueur(p);
  };
  for (const side of sim.sides) {
    for (const sl of side.slots) if (sl.pid) ajouter(sl.pid);
    for (const id of side.bench) ajouter(id);
  }
  return joueurs;
}

export function jouerMatch(S, graine) {
  const m = userMatchToday(S);
  if (!m) return { error: 'No match today.' };
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
    for (const e of out.events) if (e.type === 'sub' && e.pid && !joueurs[e.pid] && S.players[e.pid]) joueurs[e.pid] = infoJoueur(S.players[e.pid]);
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
      titre: res === 'W' ? 'Victory!' : res === 'L' ? 'Defeat' : 'Draw', res, comp: compName(S, m.c), score: `${score[0]} - ${score[1]}${m.pen ? ` (${m.pen[0]}-${m.pen[1]} pens)` : ''}`,
      dom: H.short, ext: Aw.short, buts,
      hdm: hdm ? `${pname(hdm)} (${tous[0][1].toFixed(1)})` : '',
      stats: `Shots ${stats.tirs[0]}-${stats.tirs[1]} · on target ${stats.cadres[0]}-${stats.cadres[1]} · possession ${stats.poss[0]}%-${stats.poss[1]}%`,
      notes: notes.map(({ pid, r }) => { const p = S.players[pid]; return { pos: posL(sim.sides[userSide].posOf[pid] || p.pos), nom: pshort(p), r: r.toFixed(1) }; }),
    },
  };
}

// ---------- Bilan de saison ----------
function bilanSaison(S, rep) {
  const L = [];
  const u = rep.user;
  if (u) {
    L.push(`${u.club}: ${ordL(u.pos)} in the ${u.league}. ${u.res}.`);
    L.push(`Objective: ${u.obj}`);
    if (u.promoted) L.push('Promoted to the top flight! 🎉');
    if (u.relegated) L.push('Relegated…');
    L.push(`Chairman's confidence: ${Math.round(u.conf)}% · reputation ${Math.round(u.rep)}/100`);
    if (u.sacked) L.push('The chairman has decided to sack you.');
    L.push('');
  }
  if (rep.gold) L.push(`⭐ Tactico Golden Ball: ${rep.gold.n} (${S.clubs[rep.gold.c]?.name || ''})`, '');
  L.push('Champions:');
  for (const l of rep.leagues.filter((x) => x.level === 1)) {
    const top = l.awards && l.awards[0];
    L.push(`• ${l.name}: ${S.clubs[l.champ]?.name || '—'}${top ? ` (top scorer ${top.n}, ${top.v})` : ''}`);
  }
  if (rep.conti) L.push(`• ${contiName(S)}: ${S.clubs[rep.conti]?.name || '—'}`);
  const coupes = (rep.cups || []).filter((c) => c.winner);
  if (coupes.length) L.push('', 'Cups:', ...coupes.map((c) => `• ${c.name}: ${S.clubs[c.winner]?.name || '—'}`));
  if (rep.po && rep.po.length) L.push('', 'Play-offs:', ...rep.po.map((t) => `• ${t}`));
  return { titre: `Season ${sais(rep.s)} review`, texte: L.join('\n'), bouton: `Start the ${sais(rep.s + 1)} season` };
}

// ---------- Actions ----------
export function nouvelleCarriere(nom, clubId, natRoblox) {
  const name = String(nom || '').normalize('NFC').replace(/[\u0000-\u001f<>"`]/g, '').replace(/\s+/g, ' ').trim().slice(0, 20);
  if (name.length < 2) return { error: 'Choose a manager name (at least 2 letters).' };
  const S = construireMonde(GRAINE);
  if (!S.clubs[clubId]) return { error: 'Unknown club.' };
  const iso = String(natRoblox || '').toUpperCase();
  const nat = PAYS_ISO[iso] || (NATION_CODES.includes(iso) ? iso : 'EN');
  S.seed = (Date.now() % 2147483647) + 1;
  R.seed(S.seed);
  startCareer(S, { name, nat, clubId });
  return { S };
}

export function continuer(S) {
  const r = continueGame(S);
  const out = { stop: r.stop };
  if (r.stop === 'season' && r.report) out.rapport = bilanSaison(S, r.report);
  return out;
}

export function changerTactique(S, q) {
  if (!S.user) return { error: NO_CLUB };
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
  if (!S.user) return { error: NO_CLUB };
  const c = S.clubs[S.user];
  if (TRAINING_FOCUS.some((f) => f.id === q.focus)) c.training.focus = q.focus;
  if (Number.isInteger(q.int) && q.int >= 0 && q.int < TRAINING_INTENSITY.length) c.training.int = q.int;
  return {};
}

export function lire(S, id) {
  const m = S.inbox.find((x) => x.id === id);
  if (!m) return { error: 'Message not found.' };
  m.read = true;
  const out = { id: m.id, titre: m.title, de: m.from, date: fmtDate(m.day, 'long'), corps: m.body || '', pid: m.pid && S.players[m.pid] ? m.pid : '' };
  if (m.act && !m.done) {
    if (m.act.type === 'bid') {
      const p = S.players[m.act.pid];
      if (p && p.club === S.user) out.act = { type: 'bid', texte: `Offer: ${money(m.act.fee)} · value ${money(p.value)} · expires on ${fmtDate(m.act.exp, 'dm')}`, plus: m.countered ? 0 : 1 };
    } else if (m.act.type === 'job') {
      const c = S.clubs[m.act.club];
      if (c) out.act = { type: 'job', texte: `${c.name} · ${S.comps[c.league].name} · reputation ${c.rep}/100` };
    }
  } else if (m.act && m.done) out.traite = m.expired ? 'Offer expired.' : 'Done.';
  return out;
}

export function repondre(S, id, r) {
  const msg = S.inbox.find((x) => x.id === id);
  if (!msg || !msg.act || msg.done) return { error: 'This offer is no longer available.' };
  if (msg.act.type === 'bid') {
    const p = S.players[msg.act.pid], buyer = S.clubs[msg.act.club];
    if (!p || !buyer || p.club !== S.user) { msg.done = true; return { error: 'This player is no longer at your club.' }; }
    if (r === 'accepter') {
      executeTransfer(S, p, buyer, msg.act.fee, wageDemand(S, p, buyer), R.int(2, 5));
      addNews(S, `${pname(p)}: ${S.clubs[S.user].name} → ${buyer.name} for ${money(msg.act.fee)}.`, 'transfer');
      msg.done = true;
      return { ok: `${pname(p)} sold for ${money(msg.act.fee)}!` };
    }
    if (r === 'plus') {
      if (msg.countered) return { error: 'The club has already made its final offer.' };
      msg.countered = true;
      if (R.chance(0.55)) {
        msg.act.fee = Math.round((msg.act.fee * 1.2) / 25000) * 25000;
        msg.body += `\n\n${buyer.name} agree to go up to ${money(msg.act.fee)}.`;
        return { ok: 'The club has raised its offer!' };
      }
      msg.done = true;
      msg.body += `\n\n${buyer.name} have withdrawn their offer.`;
      return { refus: 'The club has withdrawn its offer.' };
    }
    msg.done = true;
    return { ok: 'Offer rejected.' };
  }
  if (msg.act.type === 'job') {
    if (r === 'accepter') {
      if (!S.clubs[msg.act.club]) return { error: 'Unknown club.' };
      takeJob(S, msg.act.club);
      msg.done = true;
      return { ok: `New challenge: ${S.clubs[S.user].name}!`, nouveauClub: 1 };
    }
    msg.done = true;
    return { ok: 'Offer declined.' };
  }
  return { error: 'Unknown action.' };
}

export function toutLire(S) {
  for (const m of S.inbox) m.read = true;
  return {};
}

export function offre(S, q) {
  if (!S.user) return { error: NO_CLUB };
  const me = S.clubs[S.user];
  const p = S.players[q.id];
  if (!p || p.club === S.user || p.youth) return { error: 'Player not found.' };
  if (p.loan) return { error: 'This player is on loan and cannot be signed.' };
  const fee = p.club ? Math.max(0, Math.round(Number(q.fee) || 0)) : 0;
  if (p.club && !windowOpen(S)) return { error: 'The transfer window is closed.' };
  if (fee > me.tBudget) return { error: `Not enough transfer budget (${money(me.tBudget)}).` };
  const wj = willJoin(S, p, me);
  if (!wj.ok) return { error: wj.reason };
  if (p.club) {
    const ev = evaluateBid(S, p, fee, me);
    if (ev.res === 'counter') return { refus: `${S.clubs[p.club].name} want ${money(ev.counter)}.`, contre: ev.counter };
    if (ev.res !== 'accept') return { refus: ev.reason || 'Offer rejected.' };
  }
  const wage = wageDemand(S, p, me);
  const years = p.age >= 31 ? 1 : p.age >= 28 ? 2 : 3;
  const aff = canAfford(S, me, fee, wage);
  if (!aff.ok) return { refus: `${aff.reason} ${pname(p)} wants ${money(wage)} a week.` };
  const cr = contractResponse(S, p, me, wage, years);
  if (cr && cr.ok === false) return { refus: cr.reason || 'The player turns down your contract.' };
  const from = p.club ? S.clubs[p.club] : null;
  executeTransfer(S, p, me, fee, wage, years);
  addNews(S, `${pname(p)} (${p.ovr}): ${from ? from.name : 'free agent'} → ${me.name}${fee ? ` for ${money(fee)}` : ''}.`, 'transfer');
  me.bench = me.bench || [];
  if (me.bench.length < 9 && !me.bench.includes(p.id) && !me.lineup.includes(p.id)) me.bench.push(p.id);
  return { ok: `${pname(p)} signs a ${years}-year contract at ${money(wage)} a week!` };
}

// Actions sur un joueur de son effectif
export function actionJoueur(S, q) {
  const p = S.players[q.id];
  const club = S.user ? S.clubs[S.user] : null;
  if (!club) return { error: NO_CLUB };
  if (!p || p.club !== S.user) return { error: 'Player not found.' };
  switch (q.f) {
    case 'liste':
      p.listed = !p.listed;
      return { ok: p.listed ? `${pname(p)} is on the transfer list.` : `${pname(p)} is off the transfer list.` };
    case 'penalty':
      club.penTaker = club.penTaker === p.id ? null : p.id;
      return { ok: club.penTaker ? `${pname(p)} will take the penalties.` : 'Penalty taker cleared.' };
    case 'prolonger': {
      if (p.youth) return { error: 'Promote him to the first team first.' };
      if (p.loan) return { error: 'You cannot extend a loan player.' };
      const wage = wageDemand(S, p, club);
      const years = p.age >= 32 ? 1 : p.age >= 29 ? 2 : 3;
      const aff = canAfford(S, club, 0, wage, p.wage);
      if (!aff.ok) return { refus: aff.reason };
      const r = contractResponse(S, p, club, wage, years);
      if (!r.ok) return { refus: r.reason };
      p.wage = wage;
      p.until = S.season + years;
      p.noRenew = false;
      p.morale = Math.min(100, p.morale + 6);
      return { ok: `${pname(p)} extends until June ${p.until} (${money(wage)} a week).` };
    }
    case 'promouvoir': {
      if (!p.youth) return { error: 'He is already in the first team.' };
      club.youth.splice(club.youth.indexOf(p.id), 1);
      club.squad.push(p.id);
      p.youth = false;
      p.until = Math.max(p.until, S.season + 3);
      const used = new Set(club.squad.map((id) => S.players[id].num));
      let n = 30;
      while (used.has(n)) n++;
      p.num = n;
      return { ok: `${pname(p)} joins the first team!` };
    }
    case 'liberer': {
      if (p.loan) return { error: 'You cannot release a loan player.' };
      if (p.youth) {
        club.youth.splice(club.youth.indexOf(p.id), 1);
        delete S.players[p.id];
      } else {
        if (club.squad.length <= 16) return { error: 'Your squad is too small to release a player.' };
        releasePlayer(S, p);
      }
      return { ok: 'Player released.', ferme: 1 };
    }
    default:
      return { error: 'Unknown action.' };
  }
}

// Club : délégation, stade, infrastructures, budgets, démission
export function actionClub(S, q) {
  const c = S.user ? S.clubs[S.user] : null;
  if (!c) return { error: NO_CLUB };
  switch (q.f) {
    case 'demission':
      sackUser(S, 'You handed in your resignation.');
      S.mgr.career.sacked = Math.max(0, S.mgr.career.sacked - 1);
      S.mgr.rep = Math.min(100, S.mgr.rep + 4);
      return { ok: 'You have resigned. Look for a new job in Career.' };
    case 'delegation': {
      const del = S.mgr.delegate || (S.mgr.delegate = { renew: true, fill: true });
      if (q.k === 'auto') S.mgr.autoPick = !S.mgr.autoPick;
      else if (q.k === 'renew' || q.k === 'fill') del[q.k] = !del[q.k];
      return {};
    }
    case 'stade': {
      const cost = stadiumExpandCost(2000);
      if (c.balance < cost) return { error: `Not enough money (${money(cost)} needed).` };
      addFin(c, 'out', 'Travaux', cost);
      c.stadium.cap += 2000;
      return { ok: 'The stadium gains 2,000 seats!' };
    }
    case 'infra': {
      const lvl = c.fac[q.k];
      if (lvl == null) return { error: 'Unknown facility.' };
      if (lvl >= 5) return { error: 'Already at the maximum level.' };
      const cost = facUpgradeCost(lvl);
      if (c.balance < cost) return { error: `Not enough money (${money(cost)} needed).` };
      addFin(c, 'out', 'Travaux', cost);
      c.fac[q.k]++;
      return { ok: `${FAC[q.k]} upgraded to level ${c.fac[q.k]}!` };
    }
    case 'budget': {
      const bill = wageBill(S, c);
      if (q.v > 0) {
        if (c.tBudget < 1e6) return { error: 'Not enough transfer budget.' };
        c.tBudget -= 1e6;
        c.wBudget += Math.round(1e6 / 52);
      } else {
        if (c.wBudget - bill < 1e6 / 52) return { error: 'Not enough room in the wage budget.' };
        c.tBudget += 1e6;
        c.wBudget -= Math.round(1e6 / 52);
      }
      return {};
    }
    default:
      return { error: 'Unknown action.' };
  }
}

export function postuler(S, id) {
  if (!S.clubs[id]) return { error: 'Unknown club.' };
  return applyForJob(S, id) ? { ok: 'Application sent. You will get an answer in a few days.' } : { error: 'You have already applied.' };
}

// ---------- Classement mondial (partagé avec le site) ----------
export function entreeClassement(S) {
  const m = S.mgr;
  const club = S.user ? S.clubs[S.user] : null;
  return {
    id: m.id, secret: m.secret, name: m.name, nat: m.nat, club: club ? club.name : '', cc: club ? club.colors : null,
    rep: Math.round(m.rep), seasons: m.career.seasons, season: S.season,
    w: m.career.w, d: m.career.d, l: m.career.l, titles1: m.career.titles1, titles2: m.career.titles2, cups: m.career.cups, conti: m.career.conti,
    promos: m.career.promos, objMet: m.career.objMet, objEx: m.career.objEx, v: 1,
  };
}
function classement(data, S) {
  if (!data || !Array.isArray(data.top)) return { erreur: 'The world ranking is unavailable right now. Try again later.' };
  const me = S?.mgr?.id;
  const mine = me ? data.top.find((r) => r.id === me) : null;
  return {
    total: data.total || data.top.length,
    moi: mine ? `#${mine.rank} · ${nombre(mine.score)} pts · out of ${data.total} managers` : '',
    lignes: data.top.slice(0, 50).map((r, i) => {
      const g = r.w + r.d + r.l;
      return { rang: r.rank || i + 1, nom: r.name, club: r.club || '—', coul: r.cc || null, score: nombre(r.score), tr: r.trophies, saisons: r.seasons, pct: `${g ? Math.round((r.w / g) * 100) : 0}%`, moi: r.id === me ? 1 : 0 };
    }),
  };
}
async function soumettre(S, envoyer, force) {
  if (!envoyer || !S.mgr || (!S.flags.lbDirty && !force)) return false;
  try {
    const r = await envoyer(entreeClassement(S));
    if (r && r.ok) {
      S.flags.lbDirty = false;
      return true;
    }
  } catch (e) { /* le classement n'empêche jamais de jouer */ }
  return false;
}
const lireSur = async (lire) => (lire ? lire().catch(() => null) : null);

// ---------- Liaison avec le site (code à 6 caractères, voir /api/lien) ----------
const ERREURS_LIEN = {
  code: 'The code must be 6 characters (letters and numbers).',
  inconnu: 'Unknown code: check it, or get a new code on the website.',
  expire: 'This code has expired (30 minutes): get a new one on the website.',
  sens: 'This code sends a career from Roblox to the website: enter it on the website.',
};
// Carrière du site → Roblox (remplace la carrière Roblox du joueur s'il en a une)
async function importer(b, store) {
  const r = await retirer(store, b.code, 'site');
  if (r.erreur) return { error: ERREURS_LIEN[r.erreur] };
  const S = adapterPourRoblox(r.S);
  if (typeof b.nom === 'string' && b.nom.trim()) S.mgr.name = b.nom.trim().slice(0, 20);
  S.flags.lbDirty = true;
  const t = /^[a-f0-9]{32}$/.test(b.t || '') ? b.t : nouveauJeton();
  await sauver(store, t, S);
  return { t, ok: 'Career imported from the website.', ...vue(S, 'accueil') };
}
// Carrière Roblox → site (vrais noms rendus) : le code est à entrer sur le site
async function exporter(S, store) {
  S.roblox = 1; // les carrières d'avant la liaison n'avaient pas encore cette marque
  const code = await deposer(store, 'roblox', adapterPourSite(S));
  return { code, minutes: DUREE_MIN };
}

// ---------- Point d'entrée ----------
export async function traiter(b, store, lireClassement, envoyerScore) {
  const a = b && b.a;
  if (a === 'clubs') return { pays: listeClubs() };
  if (a === 'classement') return { classement: classement(await lireSur(lireClassement), null) };
  if (a === 'nouvelle') {
    const r = nouvelleCarriere(b.nom, b.club, b.nat);
    if (r.error) return r;
    const t = nouveauJeton();
    await sauver(store, t, r.S);
    return { t, ...vue(r.S, 'accueil') };
  }
  if (a === 'importer') return importer(b, store);
  const S = await charger(store, b && b.t);
  if (!S) return { error: 'Career not found.', perdue: true };
  if (a === 'exporter') return exporter(S, store);
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
      await soumettre(S, envoyerScore);
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
    case 'repondre':
      res = repondre(S, b.id, q.r);
      modifie = true;
      if (res.nouveauClub) ecran = 'accueil';
      break;
    case 'toutLire':
      res = toutLire(S);
      modifie = true;
      ecran = 'messagerie';
      break;
    case 'offre':
      res = offre(S, q);
      modifie = !!res.ok;
      break;
    case 'joueur':
      res = actionJoueur(S, q);
      modifie = !res.error;
      break;
    case 'club':
      res = actionClub(S, q);
      modifie = !res.error;
      break;
    case 'transferable':
      q.id = b.id;
      res = actionJoueur(S, { id: b.id, f: 'liste' });
      modifie = !res.error;
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
      return { error: 'Unknown action.' };
  }
  if ((modifie || ecran === 'mondial') && (await soumettre(S, envoyerScore, ecran === 'mondial'))) modifie = true;
  if (modifie) await sauver(store, b.t, S);
  const v = vue(S, ecran, q);
  if (ecran === 'mondial') {
    v.ecran = 'mondial';
    v.d = { score: nombre(careerScore(S.mgr.career)), ...classement(await lireSur(lireClassement), S) };
  }
  return { ...res, ...v };
}
