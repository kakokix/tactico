// Fin de saison : classements finaux, récompenses, montées, contrats, nouvelle saison.
import { R, clamp } from './rng.js';
import { LEAGUE_COUNTRIES } from './constants.js';
import { leagueTable, contiQualifiers, scheduleLeague, scheduleCup, scheduleConti, rebuildIndexes, newRow, maxRoundsOf } from './competitions.js';
import { seasonDates } from './dates.js';
import { addFin, PRIZE, setBudgets } from './finance.js';
import { newSeasonStats, pname, avgRating, playerValue } from './player.js';
import { addMsg, addNews } from './messages.js';
import { evaluateSeason, setObjectives, sackUser, spontaneousOffers } from './board.js';
import { aiRenewal, detachPlayer, aiTrim, aiFillFree } from './transfers.js';
import { genFreeAgent, assignNumbers, clubLevelTarget } from './worldgen.js';
import { createPlayer } from './player.js';
import { projectRevenue } from './finance.js';
import { refreshClubStrength, bestFormation, autoLineup } from './team.js';
import { userTrophy } from './game.js';

function leagueAwards(state, compId) {
  const comp = state.comps[compId];
  const set = new Set(comp.clubs);
  const ps = Object.values(state.players).filter((p) => p.club && set.has(p.club) && !p.youth);
  const lg = (p) => p.st.lg || 0;
  const scorer = ps.slice().sort((a, b) => lg(b) - lg(a) || a.st.apps - b.st.apps)[0];
  const best = ps.filter((p) => p.st.apps >= 20).sort((a, b) => avgRating(b) - avgRating(a))[0];
  const young = ps.filter((p) => p.st.apps >= 12 && p.age <= 21).sort((a, b) => avgRating(b) - avgRating(a))[0];
  const out = [];
  if (scorer) out.push({ k: 'Meilleur buteur', p: scorer.id, n: pname(scorer), c: scorer.club, v: `${lg(scorer)} buts en championnat` });
  if (best) out.push({ k: 'Joueur de la saison', p: best.id, n: pname(best), c: best.club, v: `note ${avgRating(best).toFixed(2)}` });
  if (young) out.push({ k: 'Meilleur jeune', p: young.id, n: pname(young), c: young.club, v: `note ${avgRating(young).toFixed(2)}` });
  return out;
}

// Complète un effectif trop court avec des joueurs générés (libres)
function regenFill(state, club, target) {
  const C = LEAGUE_COUNTRIES.find((c) => c.code === club.country);
  const lvl = clubLevelTarget(club, C.str);
  const need = ['GB', 'DC', 'DD', 'DG', 'MC', 'MDC', 'MOC', 'AD', 'AG', 'BU', 'MD', 'MG'];
  let k = 0;
  while (club.squad.length < target && k < 20) {
    const counts = {};
    for (const id of club.squad) { const p = state.players[id]; counts[p.pos] = (counts[p.pos] || 0) + 1; }
    const pos = need.find((x) => !counts[x] || (x === 'GB' && counts[x] < 2) || (x === 'DC' && counts[x] < 3)) || R.pick(need);
    const age = R.int(19, 29);
    const p = createPlayer(state, { nat: R.chance(0.7) ? club.country : 'FR', pos, ovr: clamp(Math.round(lvl - R.range(2, 9)), 35, 90), age, club: club.id });
    p.until = state.season + R.int(1, 3);
    p.wage = Math.round(club.wBudget * 0.025 / 100) * 100 || 1000;
    club.squad.push(p.id);
    k++;
  }
}

// Match de barrage simulé (force des clubs + avantage du terrain)
function simTie(state, h, a, neutral) {
  const sh = state.clubs[h].str || 60, sa = state.clubs[a].str || 60;
  const pH = 1 / (1 + Math.exp(-((sh - sa) + (neutral ? 0 : 1.5)) / 4.2));
  const hw = R.chance(pH);
  const wg = R.weighted([1, 2, 3], [5, 4, 1]);
  const lg = R.int(0, wg - 1);
  const pens = R.chance(0.18);
  const sc = pens ? (() => { const g = R.int(0, 2); return `${g}-${g}, t.a.b.`; })() : hw ? `${wg}-${lg}` : `${lg}-${wg}`;
  return { w: hw ? h : a, l: hw ? a : h, sc };
}

// Montées et descentes d'un pays, avec barrages éventuels
function promotions(state, C, finals, report) {
  const t1 = finals[C.code + '1'].map((r) => r.c), t2 = finals[C.code + '2'].map((r) => r.c);
  const nm = (id) => state.clubs[id].name;
  const down = t1.slice(t1.length - (C.down || 3));
  const up = t2.slice(0, C.up || 3);
  const notes = [];
  if (C.po === 'playoff' && t2.length >= 6) {
    const s1 = simTie(state, t2[2], t2[5]), s2 = simTie(state, t2[3], t2[4]);
    const f = simTie(state, s1.w, s2.w, true);
    up.push(f.w);
    notes.push(`Barrages de ${C.d2} : ${nm(s1.w)} élimine ${nm(s1.l)} (${s1.sc}), ${nm(s2.w)} élimine ${nm(s2.l)} (${s2.sc}). Finale : ${nm(f.w)} bat ${nm(f.l)} (${f.sc}) et monte.`);
    for (const x of [s1, s2, f]) for (const id of [x.w, x.l]) if (id === state.user) addMsg(state, { from: 'Adjoint', kind: 'board', prio: 1, title: 'Barrages d\'accession', body: notes[notes.length - 1] });
  } else if (C.po === 'barrage' && t1.length >= 3 && t2.length >= 3) {
    const a = t1[t1.length - (C.down || 2) - 1], b = t2[(C.up || 2)];
    const r = simTie(state, a, b, true);
    if (r.w === b) { down.push(a); up.push(b); }
    notes.push(`Barrage ${C.d1}/${C.d2} : ${nm(r.w)} bat ${nm(r.l)} (${r.sc}) et ${r.w === a ? `reste en ${C.d1}` : `monte en ${C.d1}`}.`);
    if (a === state.user || b === state.user) addMsg(state, { from: 'Adjoint', kind: 'board', prio: 1, title: 'Barrage', body: notes[0] });
  }
  for (const n of notes) addNews(state, n, 'league');
  if (report) (report.po ||= []).push(...notes);
  return { up, down };
}

export function endSeason(state, nt) {
  const Y = state.season;
  const report = { s: Y, leagues: [], cups: [], conti: null, awards: [], user: null, gold: null };
  const finals = {};
  for (const C of LEAGUE_COUNTRIES) for (const lvl of [1, 2]) {
    const comp = state.comps[C.code + lvl];
    finals[comp.id] = leagueTable(state, comp).map((r) => ({ ...r }));
  }
  const nextConti = contiQualifiers(state);

  // Classements, primes, historique
  for (const [cid, rows] of Object.entries(finals)) {
    const comp = state.comps[cid];
    rows.forEach((r, i) => {
      const club = state.clubs[r.c], pos = i + 1;
      addFin(club, 'in', 'Primes', comp.level === 1 ? PRIZE.league1(pos, rows.length) : PRIZE.league2(pos, rows.length));
      club.hist.unshift({ s: Y, l: cid, ln: comp.name, pos, pts: r.pts, w: r.w, d: r.d, lo: r.l, gf: r.gf, ga: r.ga });
      if (club.hist.length > 25) club.hist.length = 25;
    });
    const champ = state.clubs[rows[0].c];
    champ.trophies.push({ s: Y, n: comp.name, k: comp.level === 1 ? 'league' : 'league2' });
    champ.rep = clamp(champ.rep + (comp.level === 1 ? 3 : 2), 1, 99);
    addNews(state, `🏆 ${champ.name} est champion de ${comp.name} ${Y}-${(Y + 1) % 100} !`, 'trophy', { c: champ.id });
    const awards = leagueAwards(state, cid);
    report.leagues.push({ id: cid, name: comp.name, level: comp.level, champ: champ.id, table: rows.map((r) => r.c), awards });
  }
  for (const C of LEAGUE_COUNTRIES) {
    const cup = state.comps[C.code + 'C'];
    report.cups.push({ id: cup.id, name: cup.name, winner: cup.winner });
  }
  report.conti = state.comps.CONT?.winner || null;

  // Ballon d'or du jeu
  const d1 = new Set(LEAGUE_COUNTRIES.flatMap((C) => state.comps[C.code + '1'].clubs));
  const gold = Object.values(state.players).filter((p) => p.club && d1.has(p.club) && p.st.apps >= 25)
    .map((p) => [p, avgRating(p) + ((state.clubs[p.club].str || 70) - 70) / 25 + p.st.gls * 0.01 + p.st.ast * 0.008 + (state.comps.CONT?.winner === p.club ? 0.15 : 0)])
    .sort((a, b) => b[1] - a[1]);
  if (gold.length) {
    const p = gold[0][0];
    report.gold = { p: p.id, n: pname(p), c: p.club, top: gold.slice(0, 5).map(([x]) => ({ p: x.id, n: pname(x), c: x.club })) };
    addNews(state, `⭐ ${pname(p)} (${state.clubs[p.club].name}) remporte le Tactico d'Or ${Y + 1} !`, 'award');
  }

  // Montées, descentes et barrages (décidés avant le bilan de l'entraîneur)
  const moves = {};
  for (const C of LEAGUE_COUNTRIES) moves[C.code] = promotions(state, C, finals, report);

  // Bilan de l'entraîneur
  if (state.user) {
    const club = state.clubs[state.user];
    const comp = state.comps[club.league];
    const pos = finals[comp.id].findIndex((r) => r.c === club.id) + 1;
    const ev = evaluateSeason(state, club, pos);
    const mgr = state.mgr;
    mgr.career.seasons++;
    if (ev.met) mgr.career.objMet++;
    if (ev.ex) mgr.career.objEx++;
    let repD = ev.ex ? 6 : ev.met ? 3 : ev.bad ? -6 : -3;
    let confD = ev.ex ? 25 : ev.met ? 15 : ev.bad ? -30 : -12;
    if (pos === 1) {
      if (comp.level === 1) { mgr.career.titles1++; repD += 10; } else { mgr.career.titles2++; repD += 4; }
      userTrophy(state, comp.name, comp.level === 1 ? 'league' : 'league2');
    }
    const mv = moves[club.country];
    const promoted = mv.up.includes(club.id);
    const relegated = mv.down.includes(club.id);
    if (promoted) { mgr.career.promos++; repD += 3; }
    if (relegated) repD -= 4;
    mgr.rep = clamp(mgr.rep + repD, 1, 100);
    mgr.conf = clamp(Math.round(mgr.conf + confD), 0, 100);
    const entry = { s: Y, club: club.name, cid: club.id, league: comp.name, pos, obj: club.obj.label, res: ev.label, met: ev.met, promoted, relegated };
    mgr.log.unshift(entry);
    report.user = { ...entry, conf: mgr.conf, rep: mgr.rep };
    state.flags.lbDirty = true;
    if (!ev.met && (ev.bad || relegated) && mgr.conf < 40) report.user.sacked = true;
  }

  // Joueurs : historique, âge, prêts, contrats, retraites
  const leaving = [];
  for (const p of Object.values(state.players)) {
    if (p.st.apps > 0) {
      p.hist.unshift({ s: Y, c: p.club ? state.clubs[p.club].short : '—', cid: p.club, apps: p.st.apps, gls: p.st.gls, ast: p.st.ast, r: Math.round(avgRating(p) * 100) / 100 });
      if (p.hist.length > 16) p.hist.length = 16;
    }
    p.st = newSeasonStats();
    p.yc = 0; p.susp = 0;
    p.age++;
  }
  for (const p of Object.values(state.players)) {
    if (p.loan && p.loan.until <= Y + 1) {
      const back = state.clubs[p.loan.from];
      detachPlayer(state, p);
      p.loan = null;
      if (back) { p.club = back.id; back.squad.push(p.id); p.num = 0; }
      else { p.club = null; state.free.push(p.id); }
    }
  }
  const userExpired = [];
  for (const club of Object.values(state.clubs)) {
    for (const id of club.squad.slice()) {
      const p = state.players[id];
      if (p.loan || p.until > Y + 1) continue;
      if (club.id === state.user) { userExpired.push(pname(p)); leaving.push(p); continue; }
      if (!aiRenewal(state, p)) leaving.push(p);
    }
  }
  for (const p of leaving) {
    detachPlayer(state, p);
    p.club = null; p.listed = false;
    state.free.push(p.id);
  }
  // Jeunes du centre de formation
  for (const club of Object.values(state.clubs)) {
    for (const id of club.youth.slice()) {
      const p = state.players[id];
      if (p.age < 18) continue;
      const lvl = club.str || 65;
      if (club.id === state.user) {
        if (p.age >= 19) {
          club.youth.splice(club.youth.indexOf(id), 1);
          p.youth = false; club.squad.push(id); p.until = Y + 3;
          addMsg(state, { from: 'Centre de formation', kind: 'youth', title: `${pname(p)} rejoint l'équipe première`, body: `À ${p.age} ans, ${pname(p)} quitte le centre de formation et intègre l'effectif professionnel.`, pid: p.id });
        }
        continue;
      }
      club.youth.splice(club.youth.indexOf(id), 1);
      if (p.pot >= lvl - 4 || p.ovr >= lvl - 14) { p.youth = false; club.squad.push(id); p.until = Y + R.int(2, 4); }
      else delete state.players[id];
    }
  }
  // Retraites
  let retiredNotable = [];
  for (const p of Object.values(state.players)) {
    if (p.youth) continue;
    let pr = 0;
    if (p.age >= 38) pr = 1;
    else if (p.age >= 35) pr = 0.35 + (p.age - 35) * 0.2;
    else if (p.age >= 33) pr = 0.12 + (p.ovr < 65 ? 0.2 : 0);
    if (!p.club && p.age >= 31) pr += 0.3;
    if (!p.club && p.age >= 30 && p.ovr < 55) pr += 0.4;
    if (pr > 0 && R.chance(pr)) {
      if (p.ovr >= 78) retiredNotable.push(`${pname(p)} (${p.age} ans)`);
      if (p.club === state.user && state.user) addMsg(state, { from: 'Adjoint', kind: 'retire', title: `${pname(p)} prend sa retraite`, body: `À ${p.age} ans, ${pname(p)} raccroche les crampons. Merci pour tout !` });
      detachPlayer(state, p);
      delete state.players[p.id];
    }
  }
  state.free = state.free.filter((id) => state.players[id]);
  if (retiredNotable.length) addNews(state, `Retraites : ${retiredNotable.slice(0, 6).join(', ')}.`, 'retire');
  if (state.user && userExpired.length) addMsg(state, { from: 'Directeur sportif', kind: 'contract', title: 'Fins de contrat', body: `Ces joueurs ont quitté le club en fin de contrat :\n${userExpired.map((n) => `• ${n}`).join('\n')}`, prio: 1 });

  // Montées / descentes
  for (const C of LEAGUE_COUNTRIES) {
    const c1 = state.comps[C.code + '1'], c2 = state.comps[C.code + '2'];
    const { up, down } = moves[C.code];
    c1.clubs = c1.clubs.filter((x) => !down.includes(x)).concat(up);
    c2.clubs = c2.clubs.filter((x) => !up.includes(x)).concat(down);
    for (const id of up) { const k = state.clubs[id]; k.league = c1.id; k.rep = clamp(Math.max(k.rep + 3, 52), 1, 99); }
    for (const id of down) { const k = state.clubs[id]; k.league = c2.id; k.rep = clamp(Math.min(k.rep - 4, 58), 1, 99); }
    addNews(state, `${C.name} : montée de ${up.map((x) => state.clubs[x].name).join(', ')} ; relégation de ${down.map((x) => state.clubs[x].name).join(', ')}.`, 'league');
  }
  for (const club of Object.values(state.clubs)) {
    const lvl = state.comps[club.league].level;
    if (lvl === 2 && club.rep > 60) club.rep -= 1;
    if (lvl === 1 && club.rep < 50) club.rep += 1;
  }

  state.history.unshift({ s: Y, leagues: report.leagues.map((l) => ({ id: l.id, name: l.name, champ: l.champ, awards: l.awards })), cups: report.cups, conti: report.conti, gold: report.gold });
  if (state.history.length > 40) state.history.length = 40;

  // ---------- Nouvelle saison ----------
  state.season = Y + 1;
  state.sd = seasonDates(Y + 1, maxRoundsOf(state));
  state.day = state.sd.start;
  state.matches = {};
  state.byDay = {};
  for (const club of Object.values(state.clubs)) {
    club.fin = { in: {}, out: {} };
    if (club.id !== state.user) {
      if (club.squad.length > 28) aiTrim(state, club);
      if (club.squad.length < 23) aiFillFree(state, club, nt, 23);
      regenFill(state, club, 22);
      const rev = projectRevenue(state, club);
      if (club.balance > rev) club.balance -= Math.round((club.balance - rev) * 0.35);
    }
    assignNumbers(state, club);
  }
  if (state.free.length > 260) {
    const sorted = state.free.map((id) => state.players[id]).sort((a, b) => (b.ovr - b.age * 0.5) - (a.ovr - a.age * 0.5));
    for (const p of sorted.slice(260)) delete state.players[p.id];
    state.free = sorted.slice(0, 260).map((p) => p.id);
  }
  while (state.free.length < 140) genFreeAgent(state);
  for (const club of Object.values(state.clubs)) {
    refreshClubStrength(state, club);
    if (club.id !== state.user) {
      club.pref = bestFormation(state, club);
      club.tactics.formation = club.pref;
      const r = autoLineup(state, club, club.pref, { rotate: false });
      club.lineup = r.lineup; club.bench = r.bench;
    }
    setBudgets(state, club);
  }
  for (const p of Object.values(state.players)) { p.value = playerValue(p, state.season); p.o0 = p.ovr; p.gripe = false; }
  for (const C of LEAGUE_COUNTRIES) {
    scheduleLeague(state, state.comps[C.code + '1']);
    scheduleLeague(state, state.comps[C.code + '2']);
    scheduleCup(state, state.comps[C.code + 'C']);
  }
  scheduleConti(state, nextConti);
  for (const id of nextConti) addFin(state.clubs[id], 'in', 'Primes', PRIZE.contiGroup);
  rebuildIndexes(state);
  setObjectives(state);
  state.flags.warned = false;

  if (state.user) {
    const club = state.clubs[state.user];
    if (report.user?.sacked) {
      sackUser(state, `Saison décevante (${report.user.pos}e, objectif : ${report.user.obj.toLowerCase()}).`);
    } else {
      addMsg(state, {
        from: 'Président', kind: 'board', prio: 2, cid: club.id,
        title: `Saison ${Y + 1}-${(Y + 2) % 100} : vos objectifs`,
        body: `Nouvelle saison pour ${club.name} en ${state.comps[club.league].name}.\nObjectif : ${club.obj.label.toLowerCase()}.\nBudget transferts : ${Math.round(club.tBudget / 1e5) / 10} M€.\nLe mercato d'été est ouvert jusqu'au 31 août.`,
      });
      spontaneousOffers(state, true);
    }
  }
  return report;
}

export { newRow };
