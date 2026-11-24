// Équipe : composition automatique, force, tactiques de l'IA.
import { R, clamp } from './rng.js';
import { FORMATIONS, FORMATION_LIST, POS_GROUP } from './constants.js';
import { ovrAt, isAvailable } from './player.js';

export const condFactor = (c) => (c >= 90 ? 1 : c >= 75 ? 0.97 - (90 - c) * 0.004 : 0.91 - (75 - c) * 0.01);

export function squadPlayers(state, club) {
  return club.squad.map((id) => state.players[id]).filter(Boolean);
}

// Choisit le meilleur onze + remplaçants pour une formation
export function autoLineup(state, club, formation, { rotate = true, exclude = null } = {}) {
  const slots = FORMATIONS[formation] || FORMATIONS['4-3-3'];
  let avail = squadPlayers(state, club).filter((p) => isAvailable(p) && !(exclude && exclude.has(p.id)));
  const pairs = [];
  for (let s = 0; s < slots.length; s++) {
    for (const p of avail) {
      let sc = ovrAt(p, slots[s].pos);
      if (rotate) sc *= condFactor(p.cond);
      pairs.push([sc, s, p]);
    }
  }
  pairs.sort((a, b) => b[0] - a[0]);
  const lineup = new Array(slots.length).fill(null);
  const used = new Set();
  for (const [, s, p] of pairs) {
    if (lineup[s] || used.has(p.id)) continue;
    lineup[s] = p.id;
    used.add(p.id);
  }
  const bench = pickBench(avail.filter((p) => !used.has(p.id)), rotate);
  return { lineup, bench };
}

export function pickBench(rest, rotate = true) {
  const score = (p) => p.ovr * (rotate ? condFactor(p.cond) : 1);
  rest = rest.slice().sort((a, b) => score(b) - score(a));
  const bench = [];
  const gk = rest.find((p) => p.pos === 'GB');
  if (gk) bench.push(gk);
  for (const g of ['DEF', 'MIL', 'ATT']) {
    const p = rest.find((x) => POS_GROUP[x.pos] === g && !bench.includes(x));
    if (p) bench.push(p);
  }
  for (const p of rest) {
    if (bench.length >= 9) break;
    if (!bench.includes(p) && p.pos !== 'GB') bench.push(p);
  }
  return bench.map((p) => p.id);
}

export function lineupStrength(state, formation, lineup) {
  const slots = FORMATIONS[formation];
  let s = 0, n = 0;
  lineup.forEach((pid, i) => {
    const p = state.players[pid];
    if (p) { s += ovrAt(p, slots[i].pos); n++; }
  });
  return n ? s / 11 : 0;
}

// Force "théorique" d'un club (meilleur onze, sans fatigue)
export function clubStrength(state, club) {
  const f = club.tactics?.formation || '4-3-3';
  const { lineup } = autoLineup(state, club, f, { rotate: false });
  return lineupStrength(state, f, lineup);
}

// Formations courantes favorisées (les systèmes à cinq défenseurs restent des choix d'exception)
const COMMON = { '4-3-3': 0.5, '4-2-3-1': 0.5, '4-4-2': 0.2, '3-4-3': 0, '3-5-2': 0, '4-1-2-1-2': -0.2, '4-5-1': -0.2, '5-3-2': -0.4, '5-4-1': -0.6 };
export function bestFormation(state, club) {
  let best = null, bs = -1;
  for (const f of FORMATION_LIST) {
    const { lineup } = autoLineup(state, club, f, { rotate: false });
    const s = lineupStrength(state, f, lineup) + (club.pref === f ? 0.6 : 0) + (COMMON[f] || 0);
    if (s > bs) { bs = s; best = f; }
  }
  return best;
}

// Tactique de l'IA selon l'adversaire
export function aiTactics(state, club, opp, isHome) {
  const t = { ...club.tactics };
  const me = club.str || clubStrength(state, club);
  const them = opp.str || clubStrength(state, opp);
  const diff = me - them + (isHome ? 1.5 : -1);
  t.ment = diff > 5 ? 3 : diff > 1.5 ? (R.chance(0.6) ? 3 : 2) : diff > -2.5 ? 2 : diff > -6 ? 1 : (R.chance(0.5) ? 1 : 0);
  if (club.philo === 'press') t.press = 2;
  return t;
}

export function makeTactics(philo, formation) {
  const base = { formation, ment: 2, press: 1, style: 1, width: 1, line: 1 };
  if (philo === 'possession') Object.assign(base, { style: 0, press: 2, line: 2 });
  else if (philo === 'direct') Object.assign(base, { style: 2, width: 2 });
  else if (philo === 'counter') Object.assign(base, { style: 3, line: 0, press: 0 });
  else if (philo === 'press') Object.assign(base, { press: 2, line: 2 });
  else if (philo === 'wing') Object.assign(base, { width: 2 });
  return base;
}

export function refreshClubStrength(state, club) {
  club.str = Math.round(clubStrength(state, club) * 10) / 10;
  return club.str;
}

export { clamp };
