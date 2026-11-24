// Compétitions : calendrier, classements, coupes, coupe continentale.
import { R } from './rng.js';
import { LEAGUE_COUNTRIES, contiName } from './constants.js';
import { leagueDays } from './dates.js';

export function newMatch(state, c, rd, day, h, a, opts = {}) {
  const id = 'm' + (state.nextMid++).toString(36);
  const m = { id, c, rd, d: day, h, a, hg: null, ag: null, done: false };
  if (opts.ko) m.ko = 1;
  if (opts.neutral) m.neutral = 1;
  if (opts.lb) m.lb = opts.lb;
  state.matches[id] = m;
  (state.byDay[day] ||= []).push(id);
  return m;
}

export function rebuildIndexes(state) {
  state.byDay = {};
  for (const m of Object.values(state.matches)) (state.byDay[m.d] ||= []).push(m.id);
}

// Calendrier aller (méthode du cercle), domicile/extérieur équilibrés au fil des journées
function roundRobin(ids) {
  const n = ids.length;
  const arr = ids.slice();
  const rounds = [];
  const home = {}, last = {};
  for (const c of ids) { home[c] = 0; last[c] = 0; }
  for (let r = 0; r < n - 1; r++) {
    const pairs = [];
    for (let i = 0; i < n / 2; i++) {
      const a = arr[i], b = arr[n - 1 - i];
      // Reçoit : celui qui a le moins joué à domicile, sinon celui qui sort d'un déplacement
      let hA = home[a] < home[b] || (home[a] === home[b] && (last[a] < last[b] || (last[a] === last[b] && (r + i) % 2 === 0)));
      const h = hA ? a : b, aw = hA ? b : a;
      home[h]++; last[h] = 1; last[aw] = -1;
      pairs.push([h, aw]);
    }
    rounds.push(pairs);
    arr.splice(1, 0, arr.pop());
  }
  return rounds;
}

export const newRow = (c) => ({ c, p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, pts: 0, f: '' });

export function scheduleLeague(state, comp) {
  const ids = R.shuffle(comp.clubs.slice());
  const first = roundRobin(ids);
  const rounds = [...first, ...first.map((r) => r.map(([h, a]) => [a, h]))];
  comp.rounds = rounds.length;
  comp.table = {};
  for (const c of comp.clubs) comp.table[c] = newRow(c);
  const days = leagueDays(state.sd, rounds.length);
  rounds.forEach((pairs, i) => {
    for (const [h, a] of pairs) newMatch(state, comp.id, i + 1, days[i], h, a);
  });
}

export function sortRows(rows, state) {
  return rows.sort((x, y) => y.pts - x.pts || (y.gf - y.ga) - (x.gf - x.ga) || y.gf - x.gf || (state ? state.clubs[x.c].name.localeCompare(state.clubs[y.c].name) : 0));
}
export function leagueTable(state, comp) {
  return sortRows(Object.values(comp.table), state);
}
export function positionOf(state, clubId) {
  const club = state.clubs[clubId];
  const comp = state.comps[club.league];
  const t = leagueTable(state, comp);
  return t.findIndex((r) => r.c === clubId) + 1;
}

function applyRow(row, gf, ga) {
  row.p++; row.gf += gf; row.ga += ga;
  if (gf > ga) { row.w++; row.pts += 3; row.f = (row.f + 'V').slice(-5); }
  else if (gf === ga) { row.d++; row.pts += 1; row.f = (row.f + 'N').slice(-5); }
  else { row.l++; row.f = (row.f + 'D').slice(-5); }
}

// ---------- Coupes nationales ----------
export function scheduleCup(state, cup) {
  const d1 = state.comps[cup.country + '1'].clubs, d2 = state.comps[cup.country + '2'].clubs;
  cup.clubs = [...d1, ...d2];
  // Tour préliminaire : les plus faibles jouent pour ramener le tableau à 32 clubs
  const nPre = Math.max(1, cup.clubs.length - 32);
  const weakest = d2.slice().sort((a, b) => state.clubs[a].rep - state.clubs[b].rep).slice(0, Math.min(d2.length, nPre * 2));
  cup.byes = cup.clubs.filter((c) => !weakest.includes(c));
  cup.stages = state.sd.cup.map((s) => ({ ...s, mids: [] }));
  cup.stage = 0;
  cup.winner = null;
  cup.out = {};
  drawCupRound(state, cup, weakest);
}

function drawCupRound(state, cup, clubs) {
  const st = cup.stages[cup.stage];
  const list = R.shuffle(clubs.slice());
  const lvl = (c) => state.comps[state.clubs[c].league].level;
  const final = st.key === 'f';
  for (let i = 0; i + 1 < list.length; i += 2) {
    let h = list[i], a = list[i + 1];
    if (!final && lvl(a) > lvl(h)) [h, a] = [a, h];
    const m = newMatch(state, cup.id, st.key, st.day, h, a, { ko: true, neutral: final, lb: st.label });
    st.mids.push(m.id);
  }
}

export function matchWinner(m) {
  if (!m.done) return null;
  if (m.hg > m.ag) return m.h;
  if (m.ag > m.hg) return m.a;
  if (m.pen) return m.pen[0] > m.pen[1] ? m.h : m.a;
  return null;
}

function progressCup(state, cup, notify) {
  if (cup.winner) return;
  const st = cup.stages[cup.stage];
  if (!st.mids.length || !st.mids.every((id) => state.matches[id].done)) return;
  const winners = st.mids.map((id) => matchWinner(state.matches[id]));
  for (const id of st.mids) {
    const m = state.matches[id];
    const loser = matchWinner(m) === m.h ? m.a : m.h;
    cup.out[loser] = st.label;
  }
  if (st.key === 'f') {
    cup.winner = winners[0];
    notify && notify('cupWin', { cup, club: cup.winner, final: state.matches[st.mids[0]] });
    return;
  }
  cup.stage++;
  const next = cup.stage === 1 ? [...winners, ...cup.byes] : winners;
  drawCupRound(state, cup, next);
  notify && notify('cupDraw', { cup, stage: cup.stages[cup.stage] });
}

// ---------- Coupe continentale ----------
export function scheduleConti(state, qualified) {
  const conti = { id: 'CONT', type: 'conti', name: contiName(state), clubs: qualified.slice(), groups: [], ko: [], stage: 'groups', winner: null, out: {} };
  state.comps.CONT = conti;
  const sorted = qualified.slice().sort((a, b) => state.clubs[b].rep - state.clubs[a].rep);
  const pots = [0, 1, 2, 3].map((i) => R.shuffle(sorted.slice(i * 4, i * 4 + 4)));
  const groups = [[], [], [], []];
  for (const pot of pots) {
    for (const c of pot) {
      const country = state.clubs[c].country;
      let options = groups.map((g, i) => i).filter((i) => groups[i].length < pots.indexOf(pot) + 1);
      const ok = options.filter((i) => !groups[i].some((x) => state.clubs[x].country === country));
      const gi = (ok.length ? R.pick(ok) : R.pick(options));
      groups[gi].push(c);
    }
  }
  const names = ['A', 'B', 'C', 'D'];
  const PAT = [[[0, 1], [2, 3]], [[3, 0], [1, 2]], [[0, 2], [3, 1]], [[1, 0], [3, 2]], [[0, 3], [2, 1]], [[2, 0], [1, 3]]];
  groups.forEach((g, gi) => {
    const grp = { n: names[gi], clubs: g, table: {} };
    for (const c of g) grp.table[c] = newRow(c);
    conti.groups.push(grp);
    PAT.forEach((md, k) => {
      for (const [x, y] of md) newMatch(state, 'CONT', 'g' + (k + 1), state.sd.conti.groups[k], g[x], g[y], { lb: `Groupe ${grp.n} · J${k + 1}` });
    });
  });
  conti.ko = state.sd.conti.ko.map((s) => ({ ...s, mids: [] }));
  return conti;
}

function progressConti(state, conti, notify) {
  if (!conti || conti.winner) return;
  if (conti.stage === 'groups') {
    const gm = Object.values(state.matches).filter((m) => m.c === 'CONT' && m.rd[0] === 'g');
    if (!gm.length || !gm.every((m) => m.done)) return;
    const tops = conti.groups.map((g) => sortRows(Object.values(g.table), state).map((r) => r.c));
    for (const g of tops) { conti.out[g[2]] = 'Phase de groupes'; conti.out[g[3]] = 'Phase de groupes'; }
    const pairs = [[tops[0][0], tops[1][1]], [tops[1][0], tops[0][1]], [tops[2][0], tops[3][1]], [tops[3][0], tops[2][1]]];
    const st = conti.ko[0];
    for (const [h, a] of pairs) st.mids.push(newMatch(state, 'CONT', 'qf', st.day, h, a, { ko: true, lb: st.label }).id);
    conti.stage = 'qf';
    notify && notify('contiDraw', { stage: st });
    return;
  }
  const idx = conti.ko.findIndex((s) => s.key === conti.stage);
  const st = conti.ko[idx];
  if (!st.mids.every((id) => state.matches[id].done)) return;
  const winners = st.mids.map((id) => matchWinner(state.matches[id]));
  for (const id of st.mids) {
    const m = state.matches[id];
    conti.out[matchWinner(m) === m.h ? m.a : m.h] = st.label;
  }
  if (st.key === 'f') {
    conti.winner = winners[0];
    conti.stage = 'done';
    notify && notify('contiWin', { club: conti.winner });
    return;
  }
  const next = conti.ko[idx + 1];
  const list = R.shuffle(winners.slice());
  for (let i = 0; i < list.length; i += 2) next.mids.push(newMatch(state, 'CONT', next.key, next.day, list[i], list[i + 1], { ko: true, neutral: next.key === 'f', lb: next.label }).id);
  conti.stage = next.key;
  notify && notify('contiDraw', { stage: next });
}

// Enregistre le score d'un match dans sa compétition
export function recordResult(state, m) {
  const comp = state.comps[m.c];
  if (!comp) return;
  if (comp.type === 'league') {
    applyRow(comp.table[m.h], m.hg, m.ag);
    applyRow(comp.table[m.a], m.ag, m.hg);
  } else if (comp.type === 'conti' && m.rd[0] === 'g') {
    const g = comp.groups.find((x) => x.table[m.h]);
    if (g) { applyRow(g.table[m.h], m.hg, m.ag); applyRow(g.table[m.a], m.ag, m.hg); }
  }
}

export function progressCompetitions(state, notify) {
  for (const comp of Object.values(state.comps)) {
    if (comp.type === 'cup') progressCup(state, comp, notify);
    else if (comp.type === 'conti') progressConti(state, comp, notify);
  }
}

// Qualifiés pour la prochaine coupe continentale (16 clubs : places par pays, puis meilleurs suivants)
export function contiQualifiers(state, byRep = false) {
  const q = [];
  const next = [];
  for (const C of LEAGUE_COUNTRIES) {
    const comp = state.comps[C.code + '1'];
    let order;
    if (byRep) order = comp.clubs.slice().sort((a, b) => state.clubs[b].rep - state.clubs[a].rep).map((c) => ({ c, pts: state.clubs[c].rep, gd: 0 }));
    else order = leagueTable(state, comp).map((r) => ({ c: r.c, pts: r.pts * 34 / Math.max(1, r.p), gd: r.gf - r.ga }));
    const n = C.conti || 3;
    for (let i = 0; i < n; i++) q.push(order[i].c);
    next.push(...order.slice(n, n + 2));
  }
  next.sort((a, b) => b.pts - a.pts || b.gd - a.gd);
  for (let i = 0; q.length < 16 && i < next.length; i++) q.push(next[i].c);
  return q.slice(0, 16);
}

// Nombre de journées du plus grand championnat
export function maxRoundsOf(state) {
  let n = 0;
  for (const comp of Object.values(state.comps)) if (comp.type === 'league') n = Math.max(n, 2 * (comp.clubs.length - 1));
  return n || 34;
}

export function compName(state, id) {
  const c = state.comps[id];
  return c ? c.name : id;
}

export function clubComps(state, clubId) {
  const club = state.clubs[clubId];
  const res = [club.league, club.country + 'C'];
  if (state.comps.CONT && state.comps.CONT.clubs.includes(clubId)) res.push('CONT');
  return res;
}
