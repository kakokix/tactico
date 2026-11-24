// Boucle de jeu : journées, matchs, semaine, mois, carrière.
import { R, clamp } from './rng.js';
import { MatchSim, minutesPlayed } from './match.js';
import { autoLineup, aiTactics, pickBench, refreshClubStrength, condFactor } from './team.js';
import { recordResult, progressCompetitions, positionOf } from './competitions.js';
import { weeklyFinances, attendance, ticketPrice, addFin, PRIZE } from './finance.js';
import { weeklyDevelopment, playerValue, pname, pshort, isAvailable } from './player.js';
import { toDate, windowOpen, fmtDate } from './dates.js';
import { addMsg, addNews } from './messages.js';
import { aiTransferDay, aiInterestInListed, aiRenewal, fmtMoney, aiFillFree, wageDemand } from './transfers.js';
import { wageBill } from './finance.js';
import { boardAfterMatch, boardMonthly, aiManagerChanges, fillVacancies, processApplications, spontaneousOffers, takeJob, computeObjective } from './board.js';
import { genYouth } from './worldgen.js';
import { TRAINING_FOCUS, FORMATIONS, LEAGUE_COUNTRIES, contiName } from './constants.js';
import { endSeason } from './season.js';
import { L, posL } from './i18n.js';

export function startCareer(state, { name, nat, clubId }) {
  const club = state.clubs[clubId];
  state.mgr = {
    id: R.hex(16), secret: R.hex(32), name, nat,
    club: null, rep: clamp(Math.round(club.rep * 0.6), 20, 60), conf: 60, started: state.day, startSeason: state.season,
    career: { w: 0, d: 0, l: 0, gf: 0, ga: 0, titles1: 0, titles2: 0, cups: 0, conti: 0, promos: 0, objMet: 0, objEx: 0, seasons: 0, sacked: 0 },
    trophies: [], clubs: [], log: [], apps: [], autoPick: false, delegate: { renew: true, fill: true },
  };
  takeJob(state, clubId);
  state.inbox = state.inbox.filter((m) => m.kind !== 'board');
  addMsg(state, {
    from: L('Président', 'Chairman'), kind: 'board', cid: club.id, prio: 1,
    title: L(`Bienvenue à ${club.name}, coach !`, `Welcome to ${club.name}, coach!`),
    body: L(`Toute l'équipe de ${club.name} est ravie de vous accueillir.\n\nObjectif de la saison : ${club.obj.label.toLowerCase()}.\nBudget transferts : ${fmtMoney(club.tBudget)}.\nMasse salariale max : ${fmtMoney(club.wBudget)} par semaine.\n\nLe mercato est ouvert jusqu'au 31 août. Bonne chance !`,
      `Everyone at ${club.name} is delighted to welcome you.\n\nSeason objective: ${club.obj.label.toLowerCase()}.\nTransfer budget: ${fmtMoney(club.tBudget)}.\nMax wage bill: ${fmtMoney(club.wBudget)} per week.\n\nThe transfer window is open until 31 August. Good luck!`),
  });
  addMsg(state, {
    from: L('Adjoint', 'Assistant'), kind: 'tip', title: L('Conseils de votre adjoint', 'Advice from your assistant'),
    body: L("• Réglez votre composition et vos consignes dans Tactique.\n• Surveillez la fraîcheur (%) : faites tourner l'effectif.\n• Le Mercato permet d'acheter, vendre et prêter des joueurs.\n• Votre score au classement mondial monte avec les victoires, les trophées et les objectifs atteints.",
      '• Set your line-up and instructions in Tactics.\n• Watch your players\' fitness (%) and rotate the squad.\n• The Transfers screen lets you buy players and sign free agents.\n• Your world ranking score goes up with wins, trophies and objectives met.'),
  });
  state.flags.stop = false;
}

// ---------- Matchs ----------
export function userMatchToday(state) {
  if (!state.user) return null;
  for (const id of state.byDay[state.day] || []) {
    const m = state.matches[id];
    if (!m.done && (m.h === state.user || m.a === state.user)) return m;
  }
  return null;
}

export function nextUserMatch(state) {
  if (!state.user) return null;
  let best = null;
  for (const m of Object.values(state.matches)) {
    if (m.done || (m.h !== state.user && m.a !== state.user)) continue;
    if (!best || m.d < best.d) best = m;
  }
  return best;
}

// Vérifie/complète la compo de l'utilisateur avant un match
export function validateUserLineup(state, club) {
  const notes = [];
  const slots = FORMATIONS[club.tactics.formation];
  if (!club.lineup || club.lineup.length !== slots.length) club.lineup = new Array(slots.length).fill(null);
  if (state.mgr?.autoPick) {
    const r = autoLineup(state, club, club.tactics.formation, { rotate: true });
    club.lineup = r.lineup; club.bench = r.bench;
    return notes;
  }
  const used = new Set();
  club.lineup = club.lineup.map((id) => {
    const p = state.players[id];
    if (!p || p.club !== club.id || !isAvailable(p) || used.has(id)) {
      if (p && p.club === club.id && !isAvailable(p)) notes.push(L(`${pname(p)} est ${p.inj > 0 ? 'blessé' : 'suspendu'}.`, `${pname(p)} is ${p.inj > 0 ? 'injured' : 'suspended'}.`));
      return null;
    }
    used.add(id);
    return id;
  });
  if (club.lineup.some((x) => !x)) {
    const pool = club.squad.map((id) => state.players[id]).filter((p) => isAvailable(p) && !used.has(p.id));
    slots.forEach((s, i) => {
      if (club.lineup[i]) return;
      let best = null, bs = -1;
      for (const p of pool) {
        if (used.has(p.id)) continue;
        const v = (p.pos === s.pos ? 1 : s.pos === 'GB' || p.pos === 'GB' ? 0.2 : 0.75) * p.ovr * condFactor(p.cond);
        if (v > bs) { bs = v; best = p; }
      }
      if (best) { club.lineup[i] = best.id; used.add(best.id); notes.push(L(`${pname(best)} est titularisé au poste de ${s.pos}.`, `${pname(best)} starts at ${posL(s.pos)}.`)); }
    });
  }
  club.bench = (club.bench || []).filter((id) => {
    const p = state.players[id];
    return p && p.club === club.id && isAvailable(p) && !used.has(id);
  });
  if (club.bench.length < 7) {
    const rest = club.squad.map((id) => state.players[id]).filter((p) => isAvailable(p) && !used.has(p.id) && !club.bench.includes(p.id));
    const extra = pickBench(rest, true).filter((id) => !club.bench.includes(id));
    club.bench = [...club.bench, ...extra].slice(0, 9);
  }
  return notes;
}

function sideFor(state, club, opp, isHome, isUser, userAuto) {
  if (isUser) {
    validateUserLineup(state, club);
    return { tactics: { ...club.tactics }, lineup: club.lineup.slice(), bench: club.bench.slice(0, 9), auto: userAuto };
  }
  const tactics = aiTactics(state, club, opp, isHome);
  const { lineup, bench } = autoLineup(state, club, tactics.formation, { rotate: true });
  return { tactics, lineup, bench, auto: true };
}

export function createSim(state, m, { userAuto = true, quiet = false } = {}) {
  const H = state.clubs[m.h], A = state.clubs[m.a];
  return new MatchSim(state, m, {
    quiet,
    home: sideFor(state, H, A, true, H.id === state.user, userAuto),
    away: sideFor(state, A, H, false, A.id === state.user, userAuto),
  });
}

const INJ = [['Contusion', 3, 8, 30], ['Élongation', 7, 18, 28], ['Entorse de la cheville', 10, 28, 18], ['Déchirure musculaire', 18, 45, 12], ['Blessure au genou', 25, 70, 7], ['Fracture du pied', 40, 90, 4], ['Rupture des ligaments croisés', 150, 240, 1]];
const INJ_EN = { Contusion: 'Bruise', Élongation: 'Strain', 'Entorse de la cheville': 'Ankle sprain', 'Déchirure musculaire': 'Torn muscle', 'Blessure au genou': 'Knee injury', 'Fracture du pied': 'Broken foot', 'Rupture des ligaments croisés': 'Torn knee ligaments' };
export function injure(state, p, minor = false) {
  const club = state.clubs[p.club];
  const list = minor ? INJ.slice(0, 2) : INJ;
  const it = R.weighted(list, (x) => x[3]);
  const med = club ? club.fac.med : 2;
  p.inj = Math.max(1, Math.round(R.int(it[1], it[2]) * (1.15 - 0.06 * med)));
  p.injName = L(it[0], INJ_EN[it[0]] || it[0]);
  return p;
}

export function applyMatchResult(state, m, sim) {
  m.hg = sim.sides[0].goals; m.ag = sim.sides[1].goals; m.done = true;
  if (sim.pens) m.pen = sim.pens.slice();
  if (sim.period >= 3) m.et = 1;
  m.sc = sim.goals.map((g) => [g.min, g.s, g.t, g.type === 'pen' ? 'p' : '', g.a || 0]);
  m.motm = sim.motm;
  const st = sim.stats;
  const poss = Math.round(st.poss[0] / (st.poss[0] + st.poss[1]) * 100);
  m.st = { sh: st.sh, on: st.on, xg: st.xg.map((x) => Math.round(x * 10) / 10), pos: [poss, 100 - poss], cor: st.cor, fo: st.fo, yc: st.yc, rc: st.rc };
  recordResult(state, m);
  const comp = state.comps[m.c];
  const isUserMatch = m.h === state.user || m.a === state.user;
  if (isUserMatch) {
    m.rat = {};
    for (let t = 0; t < 2; t++) Object.assign(m.rat, sim.sides[t].rat);
    m.lu = sim.sides.map((s) => Object.keys(s.rat));
  }
  for (let t = 0; t < 2; t++) {
    const side = sim.sides[t];
    const club = side.club;
    const gf = sim.sides[t].goals, ga = sim.sides[1 - t].goals;
    const res = sim.winner === t ? 1 : sim.winner === 1 - t ? -1 : 0;
    // Suspensions purgées
    for (const id of club.squad) {
      const p = state.players[id];
      if (p.susp > 0 && side.rat[id] == null) p.susp--;
    }
    const played = new Set(Object.keys(side.rat));
    for (const pid of played) {
      const p = state.players[pid];
      const mins = minutesPlayed(side, pid, sim.endMin);
      const r = side.rat[pid];
      p.st.apps++; p.st.min += mins; p.st.rat += r;
      p.car.apps++;
      p.form = Math.round((p.form * 0.7 + r * 0.3) * 100) / 100;
      p.cond = Math.round(side.cond[pid] ?? p.cond);
      if (sim.motm === pid) p.st.motm++;
      p.morale = clamp(p.morale + (res > 0 ? 4 : res < 0 ? -4 : 0) + (r >= 7.6 ? 2 : r < 5.9 ? -2 : 0), 5, 100);
      if (side.yel[pid]) { const n = Math.min(side.yel[pid], 1); p.st.yc += n; p.yc += n; if (!side.reds.has(pid) && p.yc % 5 === 0) p.susp += 1; }
      if (side.reds.has(pid)) { p.st.rc++; p.susp += side.yel[pid] >= 2 ? 1 : R.int(1, 3); }
      if (ga === 0 && side.posOf[pid] === 'GB' && mins >= 60) p.st.cs++;
      if (sim.injuries[pid]) injure(state, p);
      else if (mins > 0 && p.cond < 62 && R.chance(0.025)) injure(state, p, true);
    }
    for (const id of club.squad) {
      const p = state.players[id];
      if (!p) continue;
      if (played.has(id)) p.rm = p.rm * 0.85 + 0.15 * Math.min(1, minutesPlayed(side, id, sim.endMin) / 90);
      else p.rm *= 0.85;
    }
    if (comp.type === 'conti' && m.rd[0] === 'g') addFin(club, 'in', 'Primes', res > 0 ? PRIZE.contiWin : res === 0 ? PRIZE.contiDraw : 0);
  }
  for (const g of sim.goals) {
    const s = state.players[g.s];
    if (s) { s.st.gls++; s.car.gls++; if (comp.type === 'league') s.st.lg = (s.st.lg || 0) + 1; }
    const a = g.a ? state.players[g.a] : null;
    if (a) { a.st.ast++; a.car.ast++; }
  }
  // Recette guichet
  const H = state.clubs[m.h], A = state.clubs[m.a];
  if (!m.neutral) {
    const big = comp.type !== 'league' || Math.abs(H.rep - A.rep) < 5 && H.rep > 75;
    m.att = attendance(state, H, A, big);
    const gate = m.att * ticketPrice(state, H) * (comp.type === 'conti' ? 1.6 : 1);
    addFin(H, 'in', 'Billetterie', gate);
  } else m.att = Math.round(Math.min(H.stadium.cap, A.stadium.cap) * 1.3);
  if (comp.type === 'cup' && m.ko) {
    const stIdx = comp.stages.findIndex((s) => s.key === m.rd);
    const w = sim.winner === 0 ? H : A;
    addFin(w, 'in', 'Primes', PRIZE.cupRound[stIdx] || 0);
  }
  if (isUserMatch) userMatchAftermath(state, m, sim);
  else if (comp.type !== 'league' || Math.abs(m.hg - m.ag) >= 5) {
    const big = (H.rep >= 80 || A.rep >= 80) && comp.type !== 'league';
    if (big || Math.abs(m.hg - m.ag) >= 5) addNews(state, L(`${comp.name} : ${H.name} ${m.hg}-${m.ag} ${A.name}${m.pen ? ` (${m.pen[0]}-${m.pen[1]} t.a.b.)` : ''}`, `${comp.name}: ${H.name} ${m.hg}-${m.ag} ${A.name}${m.pen ? ` (${m.pen[0]}-${m.pen[1]} on pens)` : ''}`), 'result');
  }
}

function userMatchAftermath(state, m, sim) {
  const us = m.h === state.user ? 0 : 1;
  const opp = state.clubs[us === 0 ? m.a : m.h];
  const gf = us === 0 ? m.hg : m.ag, ga = us === 0 ? m.ag : m.hg;
  const c = state.mgr.career;
  const cur = state.mgr.clubs[state.mgr.clubs.length - 1];
  if (gf > ga) { c.w++; if (cur) cur.w++; } else if (gf === ga) { c.d++; if (cur) cur.d++; } else { c.l++; if (cur) cur.l++; }
  c.gf += gf; c.ga += ga;
  boardAfterMatch(state, m, us, opp);
  state.flags.lbDirty = true;
  const club = state.clubs[state.user];
  for (const pid of Object.keys(sim.injuries)) {
    const p = state.players[pid];
    if (p && p.club === club.id && p.inj > 0) {
      addMsg(state, { from: L('Médecin', 'Club doctor'), kind: 'injury', title: L(`Blessure : ${pname(p)}`, `Injury: ${pname(p)}`), body: L(`${pname(p)} souffre d'une ${p.injName.toLowerCase()}. Indisponibilité estimée : ${p.inj} jours.`, `${pname(p)} is injured (${p.injName.toLowerCase()}). Expected to be out for ${p.inj} days.`), pid: p.id, prio: p.inj > 20 ? 2 : 1 });
    }
  }
  for (const pid of sim.sides[us].reds) {
    const p = state.players[pid];
    if (p) addMsg(state, { from: L('Adjoint', 'Assistant'), kind: 'susp', title: L(`Suspension : ${pname(p)}`, `Suspension: ${pname(p)}`), body: L(`${pname(p)} est suspendu pour ${p.susp} match(s) après son expulsion.`, `${pname(p)} is suspended for ${p.susp} match(es) after his sending-off.`), pid });
  }
}

export function playAIMatch(state, m) {
  const sim = createSim(state, m, { quiet: true });
  sim.playToEnd();
  applyMatchResult(state, m, sim);
}

export function playOtherMatchesToday(state) {
  for (const id of state.byDay[state.day] || []) {
    const m = state.matches[id];
    if (m.done || m.h === state.user || m.a === state.user) continue;
    playAIMatch(state, m);
  }
}

// ---------- Temps ----------
const notify = (state) => (type, d) => {
  if (type === 'transfer') {
    const from = d.from ? state.clubs[d.from] : null, to = state.clubs[d.to];
    if (d.fee >= 15e6 || to.rep >= 82 || (from && from.id === state.user)) addNews(state, L(`${d.n} (${d.ovr}) : ${from ? from.name : 'libre'} → ${to.name}${d.fee ? ` pour ${fmtMoney(d.fee)}` : ''}${d.loan ? ' (prêt)' : ''}.`, `${d.n} (${d.ovr}): ${from ? from.name : 'free agent'} → ${to.name}${d.fee ? ` for ${fmtMoney(d.fee)}` : ''}${d.loan ? ' (loan)' : ''}.`), 'transfer');
    if (from && from.id === state.user) addMsg(state, { from: L('Directeur sportif', 'Director of football'), kind: 'transfer', title: L(`${d.n} quitte le club`, `${d.n} leaves the club`), body: L(`${d.n} a rejoint ${to.name}${d.fee ? ` pour ${fmtMoney(d.fee)}` : ''}.`, `${d.n} has joined ${to.name}${d.fee ? ` for ${fmtMoney(d.fee)}` : ''}.`), pid: d.p });
  } else if (type === 'aiBid') {
    const { club, p, fee } = d;
    if (state.inbox.some((x) => x.act && x.act.type === 'bid' && x.act.pid === p.id && !x.done)) return;
    addMsg(state, {
      from: club.name, kind: 'bid', cid: club.id, pid: p.id, prio: 2,
      title: L(`Offre pour ${pname(p)}`, `Bid for ${pname(p)}`),
      body: L(`${club.name} propose ${fmtMoney(fee)} pour ${pname(p)} (valeur estimée ${fmtMoney(p.value)}).`, `${club.name} offer ${fmtMoney(fee)} for ${pname(p)} (estimated value ${fmtMoney(p.value)}).`),
      act: { type: 'bid', pid: p.id, club: club.id, fee, exp: state.day + 4 },
    });
  } else if (type === 'cupDraw') {
    const st = d.stage;
    const mine = st.mids.map((id) => state.matches[id]).find((m) => m.h === state.user || m.a === state.user);
    if (mine) {
      const opp = state.clubs[mine.h === state.user ? mine.a : mine.h];
      addMsg(state, { from: d.cup.name, kind: 'draw', title: L(`Tirage : ${st.label}`, `Draw: ${st.label}`), body: L(`${d.cup.name}, ${st.label.toLowerCase()} : vous affronterez ${opp.name} (${state.comps[opp.league].name}) ${mine.neutral ? 'en terrain neutre' : mine.h === state.user ? 'à domicile' : "à l'extérieur"} le ${fmtDate(mine.d, 'wdm')}.`, `${d.cup.name}, ${st.label.toLowerCase()}: you will face ${opp.name} (${state.comps[opp.league].name}) ${mine.neutral ? 'on neutral ground' : mine.h === state.user ? 'at home' : 'away'} on ${fmtDate(mine.d, 'wdm')}.`), cid: opp.id });
    }
  } else if (type === 'contiDraw') {
    const st = d.stage;
    const mine = st.mids.map((id) => state.matches[id]).find((m) => m.h === state.user || m.a === state.user);
    if (mine) {
      const opp = state.clubs[mine.h === state.user ? mine.a : mine.h];
      addMsg(state, { from: contiName(state), kind: 'draw', title: L(`Tirage : ${st.label}`, `Draw: ${st.label}`), body: L(`Vous affronterez ${opp.name} le ${fmtDate(mine.d, 'wdm')}.`, `You will face ${opp.name} on ${fmtDate(mine.d, 'wdm')}.`), cid: opp.id });
    }
  } else if (type === 'cupWin') {
    const w = state.clubs[d.club];
    addNews(state, L(`🏆 ${w.name} remporte la ${d.cup.name} !`, `🏆 ${w.name} win the ${d.cup.name}!`), 'trophy', { c: w.id });
    w.trophies.push({ s: state.season, n: d.cup.name, k: 'cup' });
    addFin(w, 'in', 'Primes', PRIZE.cupWin);
    if (w.id === state.user) userTrophy(state, d.cup.name, 'cup');
  } else if (type === 'contiWin') {
    const w = state.clubs[d.club];
    addNews(state, L(`🏆 ${w.name} remporte la ${contiName(state)} !`, `🏆 ${w.name} win the ${contiName(state)}!`), 'trophy', { c: w.id });
    w.trophies.push({ s: state.season, n: contiName(state), k: 'conti' });
    addFin(w, 'in', 'Primes', PRIZE.contiChamp);
    w.rep = Math.min(99, w.rep + 3);
    if (w.id === state.user) userTrophy(state, contiName(state), 'conti');
  }
};

export function userTrophy(state, name, kind) {
  const mgr = state.mgr;
  const club = state.clubs[state.user];
  mgr.trophies.push({ s: state.season, n: name, c: club.name, k: kind });
  if (kind === 'cup') { mgr.career.cups++; mgr.rep = clamp(mgr.rep + 5, 1, 100); mgr.conf = clamp(mgr.conf + 15, 0, 100); }
  if (kind === 'conti') { mgr.career.conti++; mgr.rep = clamp(mgr.rep + 12, 1, 100); mgr.conf = clamp(mgr.conf + 25, 0, 100); }
  state.flags.lbDirty = true;
  addMsg(state, { from: L('Président', 'Chairman'), kind: 'trophy', title: L(`🏆 ${name} !`, `🏆 ${name}!`), body: L(`Félicitations ! ${club.name} remporte la ${name}. Toute la ville est en fête !`, `Congratulations! ${club.name} have won the ${name}. The whole city is celebrating!`), prio: 2 });
}

function dailyRecovery(state) {
  for (const club of Object.values(state.clubs)) {
    const med = club.fac.med;
    const intensity = club.id === state.user ? club.training.int : 1;
    for (const id of club.squad) {
      const p = state.players[id];
      if (p.inj > 0) {
        p.inj--;
        if (p.inj === 0) {
          p.injName = '';
          p.cond = Math.min(p.cond, 72);
          if (club.id === state.user) addMsg(state, { from: L('Médecin', 'Club doctor'), kind: 'injury', title: L(`${pname(p)} est rétabli`, `${pname(p)} is fit again`), body: L(`${pname(p)} est de nouveau disponible.`, `${pname(p)} is available again.`), pid: p.id });
        }
      } else if (p.cond < 100) {
        p.cond = Math.min(100, p.cond + 6.5 + p.attr[13] * 0.2 + med * 0.4 + (intensity === 0 ? 2 : intensity === 2 ? -1.5 : 0));
      }
    }
  }
}

function weekly(state) {
  const focusOf = (club) => TRAINING_FOCUS.find((f) => f.id === club.training.focus)?.attrs || null;
  for (const club of Object.values(state.clubs)) {
    weeklyFinances(state, club);
    const ctx = { training: club.fac.train, intensity: club.training.int, focus: focusOf(club) };
    for (const id of club.squad) {
      const p = state.players[id];
      weeklyDevelopment(p, ctx);
      p.morale = Math.round(p.morale + (66 - p.morale) * 0.08);
      if (club.id === state.user && club.training.int === 2 && p.inj <= 0 && R.chance(0.004)) {
        injure(state, p, true);
        addMsg(state, { from: L('Médecin', 'Club doctor'), kind: 'injury', title: L(`Blessure à l'entraînement : ${pname(p)}`, `Training injury: ${pname(p)}`), body: L(`${pname(p)} s'est blessé à l'entraînement (${p.injName.toLowerCase()}, ${p.inj} jours).`, `${pname(p)} was injured in training (${p.injName.toLowerCase()}, ${p.inj} days).`), pid: p.id });
      }
    }
    if (club.id === state.user) {
      const sorted = club.squad.map((id) => state.players[id]).sort((a, b) => b.ovr - a.ovr);
      const median = sorted[Math.floor(sorted.length / 2)]?.ovr || 60;
      for (const p of sorted) {
        if (p.loan || p.age < 22 || p.inj > 0 || p.ovr < median + 2 || p.rm > 0.3) continue;
        p.morale = Math.max(5, p.morale - 3);
        if (p.morale < 32 && !p.gripe) {
          p.gripe = true;
          addMsg(state, { from: L('Agent du joueur', "Player's agent"), kind: 'morale', pid: p.id, title: L(`${pname(p)} réclame du temps de jeu`, `${pname(p)} wants more playing time`), body: L(`Son agent nous fait savoir qu'il estime ne pas jouer assez et qu'il envisage un départ s'il ne devient pas titulaire.\n\nSon moral est au plus bas (${Math.round(p.morale)}/100). Fais-le jouer, ou place-le sur la liste des transferts.`, `His agent tells us he feels he isn't playing enough and is considering leaving unless he becomes a starter.\n\nHis morale is at rock bottom (${Math.round(p.morale)}/100). Play him, or put him on the transfer list.`) });
        }
      }
    }
    const yctx = { training: club.fac.youth, intensity: 1, focus: null };
    for (const id of club.youth) {
      const p = state.players[id];
      p.rm = 0.6;
      weeklyDevelopment(p, yctx);
    }
    const target = 70 + (club.training.focus === 'tac' ? 15 : 0);
    club.coh = Math.round(clamp((club.coh ?? 60) + (target - (club.coh ?? 60)) * 0.06 + 0.3, 0, 100) * 10) / 10;
  }
  for (const p of Object.values(state.players)) p.value = playerValue(p, state.season);
  for (const club of Object.values(state.clubs)) refreshClubStrength(state, club);
  for (const club of Object.values(state.clubs)) if (club.id !== state.user && club.squad.length < 20) aiFillFree(state, club, notify(state), 21);
  directorFill(state);
  fillVacancies(state);
  processApplications(state);
  if (!state.user) spontaneousOffers(state);
  if (state.user) {
    const club = state.clubs[state.user];
    if (club.balance < 0 && !state.flags.debtWarn) {
      state.flags.debtWarn = true;
      addMsg(state, { from: L('Président', 'Chairman'), kind: 'board', title: L('Finances dans le rouge', 'Finances in the red'), body: L(`Le solde du club est négatif (${fmtMoney(club.balance)}). Vendez des joueurs ou réduisez la masse salariale, sinon la confiance du président va baisser.`, `The club's balance is negative (${fmtMoney(club.balance)}). Sell players or cut the wage bill, or the chairman's confidence will drop.`), prio: 2 });
    } else if (club.balance >= 0) state.flags.debtWarn = false;
  }
}

function monthly(state) {
  boardMonthly(state);
  aiManagerChanges(state);
  const dt = toDate(state.day);
  if (dt.m === 4 && state.user && state.mgr.delegate?.renew) directorRenewals(state);
  if (state.user && dt.m === 1) {
    const club = state.clubs[state.user];
    const exp = club.squad.map((id) => state.players[id]).filter((p) => p.until <= state.season + 1 && !p.loan);
    if (exp.length) addMsg(state, { from: L('Directeur sportif', 'Director of football'), kind: 'contract', title: L('Contrats qui expirent en fin de saison', 'Contracts expiring at the end of the season'), body: L(`Ces joueurs seront libres le 30 juin s'ils ne prolongent pas :\n${exp.map((p) => `• ${pname(p)} (${p.pos}, ${p.ovr})`).join('\n')}\n\nOuvrez leur fiche pour proposer une prolongation.`, `These players will be free on 30 June unless they extend:\n${exp.map((p) => `• ${pname(p)} (${posL(p.pos)}, ${p.ovr})`).join('\n')}\n\nYour director of football will try to extend the key players.`), prio: 1 });
  }
}

function youthIntake(state) {
  for (const club of Object.values(state.clubs)) {
    const n = R.int(2, 3) + (club.fac.youth >= 4 ? 1 : 0);
    const gen = [];
    for (let i = 0; i < n; i++) gen.push(genYouth(state, club, R.int(15, 16)));
    if (club.id === state.user) {
      const best = gen.slice().sort((a, b) => b.pot - a.pot)[0];
      addMsg(state, { from: L('Centre de formation', 'Youth academy'), kind: 'youth', title: L('Nouvelle génération au centre de formation', 'New intake at the youth academy'), body: L(`${n} jeunes rejoignent le centre de formation. Le plus prometteur : ${pname(best)} (${best.pos}, ${best.age} ans). Retrouvez-les dans Entraînement > Centre de formation.`, `${n} youngsters join the youth academy. The most promising: ${pname(best)} (${posL(best.pos)}, age ${best.age}). Find them in Training > Youth academy.`), prio: 2, pid: best.id });
    }
    while (club.youth.length > 10) {
      const worst = club.youth.map((id) => state.players[id]).sort((a, b) => a.pot - b.pot)[0];
      club.youth.splice(club.youth.indexOf(worst.id), 1);
      delete state.players[worst.id];
    }
  }
}

function windowEvents(state) {
  const sd = state.sd, d = state.day;
  if (d === sd.summerClose - 3 || d === sd.winterClose - 3) addMsg(state, { from: L('Directeur sportif', 'Director of football'), kind: 'window', title: L('Le mercato ferme dans 3 jours', 'The transfer window closes in 3 days'), body: L('Dernière ligne droite pour boucler vos transferts !', 'Last chance to finalise your transfers!') });
  if (d === sd.summerClose + 1 || d === sd.winterClose + 1) addMsg(state, { from: L('Directeur sportif', 'Director of football'), kind: 'window', title: L('Le mercato est fermé', 'The transfer window is closed'), body: L('Plus aucun transfert possible (sauf joueurs libres) jusqu\'à la prochaine fenêtre.', 'No more transfers (except free agents) until the next window.') });
  if (d === sd.winterOpen) addMsg(state, { from: L('Directeur sportif', 'Director of football'), kind: 'window', title: L('Le mercato d\'hiver est ouvert', 'The winter transfer window is open'), body: L('Vous pouvez acheter, vendre et prêter des joueurs jusqu\'au 31 janvier.', 'You can buy and sell players until 31 January.') });
}

function expireOffers(state) {
  for (const m of state.inbox) {
    if (m.act && m.act.type === 'bid' && !m.done && state.day > m.act.exp) { m.done = true; m.expired = true; }
  }
}

// Directeur sportif : prolongations automatiques (1er avril)
export function directorRenewals(state) {
  const club = state.clubs[state.user];
  const ps = club.squad.map((id) => state.players[id]).filter((p) => !p.loan);
  const ranked = ps.slice().sort((a, b) => b.ovr - a.ovr);
  const keep = [], gone = [];
  for (const p of ps) {
    if (p.until > state.season + 1 || p.noRenew) continue;
    const rank = ranked.indexOf(p);
    const wanted = (rank < 18 && p.age <= 31) || (p.age <= 21 && p.pot >= (club.str || 60) - 2) || (rank < 12 && p.age <= 33);
    if (!wanted) { gone.push(p); continue; }
    const w = wageDemand(state, p, club);
    if (wageBill(state, club) - p.wage + w > club.wBudget * 1.02) { gone.push(p); continue; }
    p.wage = w;
    p.until = state.season + 1 + (p.age <= 27 ? 3 : p.age <= 30 ? 2 : 1);
    keep.push(p);
  }
  if (keep.length || gone.length) addMsg(state, {
    from: L('Directeur sportif', 'Director of football'), kind: 'contract', prio: 1,
    title: L('Bilan des prolongations', 'Contract extensions'),
    body: L((keep.length ? `Prolongés :\n${keep.map((p) => `• ${pname(p)} jusqu'en ${p.until} (${fmtMoney(p.wage)}/sem.)`).join('\n')}\n\n` : '') + (gone.length ? `Non prolongés (libres le 30 juin, sauf si vous prolongez vous-même) :\n${gone.map((p) => `• ${pname(p)} (${p.age} ans, ${p.ovr})`).join('\n')}` : '') + '\n\nVous pouvez désactiver ces décisions automatiques dans Club > Délégation.',
      (keep.length ? `Extended:\n${keep.map((p) => `• ${pname(p)} until ${p.until} (${fmtMoney(p.wage)}/wk)`).join('\n')}\n\n` : '') + (gone.length ? `Not extended (free on 30 June):\n${gone.map((p) => `• ${pname(p)} (age ${p.age}, ${p.ovr})`).join('\n')}` : '')),
  });
}

// Effectif minimum garanti (et complément automatique si délégué)
function directorFill(state) {
  if (!state.user) return;
  const club = state.clubs[state.user];
  const min = state.mgr.delegate?.fill && windowOpen(state) ? 20 : 16;
  if (club.squad.length >= min) return;
  const before = club.squad.length;
  const signed = [];
  aiFillFree(state, club, (t, d) => { if (t === 'transfer') signed.push(d.n); }, min);
  if (signed.length) addMsg(state, { from: L('Directeur sportif', 'Director of football'), kind: 'transfer', prio: 1, title: L('Effectif complété', 'Squad topped up'), body: L(`L'effectif était trop court (${before} joueurs). J'ai engagé des joueurs libres :\n${signed.map((n) => `• ${n}`).join('\n')}`, `The squad was too small (${before} players). I have signed some free agents:\n${signed.map((n) => `• ${n}`).join('\n')}`) });
}

export function advanceDay(state) {
  const nt = notify(state);
  progressCompetitions(state, nt);
  state.day++;
  const dt = toDate(state.day);
  dailyRecovery(state);
  if (dt.wd === 1) weekly(state);
  if (dt.d === 1) monthly(state);
  if (state.day === state.sd.youthDay) youthIntake(state);
  windowEvents(state);
  expireOffers(state);
  if (windowOpen(state)) {
    aiTransferDay(state, nt);
    aiInterestInListed(state, nt);
  }
  if (state.day === state.sd.summerClose || state.day === state.sd.winterClose) {
    for (const club of Object.values(state.clubs)) if (club.id !== state.user && club.squad.length < 22) aiFillFree(state, club, nt);
  }
}

// Avance jusqu'au prochain événement important
export function continueGame(state, maxDays = 60) {
  state.flags.stop = false;
  for (let i = 0; i < maxDays; i++) {
    playOtherMatchesToday(state);
    progressCompetitions(state, notify(state));
    const um = userMatchToday(state);
    if (um) return { stop: 'match', match: um };
    if (state.day >= state.sd.end) {
      const report = endSeason(state, notify(state));
      return { stop: 'season', report };
    }
    advanceDay(state);
    if (state.flags.stop) { state.flags.stop = false; return { stop: 'inbox' }; }
    if (userMatchToday(state)) return { stop: 'matchday', match: userMatchToday(state) };
  }
  return { stop: 'none' };
}

export function finishUserMatch(state, m, sim) {
  applyMatchResult(state, m, sim);
  playOtherMatchesToday(state);
  progressCompetitions(state, notify(state));
}

export { notify, computeObjective, positionOf, LEAGUE_COUNTRIES };
