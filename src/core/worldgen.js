// Génération du monde : pays, clubs, joueurs, saison 1.
import { R, clamp } from './rng.js';
import { VERSION, LEAGUE_COUNTRIES, CLUBS_PER_DIV, applyWorld } from './constants.js';
import { REAL_DATA, REAL_COUNTRIES, REAL_CONTI, parseClub } from '../data/real/index.js';
import { CITIES, CLUB_PATTERNS, STADIUM_PATTERNS, COLORS } from '../data/clubs.js';
import { NATIONS, FOREIGN_MIX, CORE_NATIONS } from '../data/names.js';
import { createPlayer, createRealPlayer, baseWage, playerValue, makeName, roundWage } from './player.js';
import { dayOf, seasonDates } from './dates.js';
import { projectRevenue, setBudgets, wageBill } from './finance.js';
import { scheduleLeague, scheduleCup, scheduleConti, contiQualifiers, rebuildIndexes, maxRoundsOf } from './competitions.js';
import { bestFormation, makeTactics, refreshClubStrength, autoLineup } from './team.js';
import { setObjectives } from './board.js';

const D1_REP = [92, 88, 85, 81, 78, 76, 74, 72, 70, 68, 66, 64, 63, 61, 60, 58, 57, 55];
const C_ADJ = { EN: 2, ES: 1, IT: 0, DE: 0, FR: -2 };
const TEMPLATE = ['GB', 'GB', 'GB', 'DD', 'DD', 'DC', 'DC', 'DC', 'DC', 'DG', 'DG', 'MDC', 'MDC', 'MC', 'MC', 'MC', 'MD', 'MG', 'MOC', 'MOC', 'AD', 'AG', 'BU', 'BU', 'BU'];
const STARTERS = new Set([0, 3, 5, 6, 9, 11, 13, 14, 18, 20, 21, 22]);

const strip = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z]/g, '').toUpperCase();

export function pickNat(country, level) {
  const domestic = level === 1 ? 0.62 : 0.78;
  if (R.chance(domestic)) return country;
  const mix = FOREIGN_MIX[country];
  const keys = Object.keys(mix).filter((k) => NATIONS[k] && mix[k] > 0);
  return R.weighted(keys, keys.map((k) => mix[k]));
}

export function clubLevelTarget(club, str) {
  return 45 + club.rep * 0.42 + (str - 0.97) * 20;
}

function makeClub(state, C, city, level, rep, usedNames, usedShort) {
  let name = '';
  for (let k = 0; k < 20; k++) {
    name = R.pick(CLUB_PATTERNS[C.code]).replace('{c}', city);
    if (!usedNames.has(name)) break;
  }
  usedNames.add(name);
  let base = strip(city);
  let short = base.slice(0, 3);
  for (let k = 3; usedShort.has(short) && k < base.length; k++) short = base.slice(0, 2) + base[k];
  while (usedShort.has(short)) short = base.slice(0, 2) + String.fromCharCode(65 + R.int(0, 25));
  usedShort.add(short);
  const id = 'c' + (state.nextId++).toString(36);
  const fac = () => clamp(Math.round(1 + (rep - 35) / 15 + R.range(-0.6, 0.6)), 1, 5);
  const mgr = makeName(C.code);
  const club = {
    id, name, short, city, country: C.code, league: C.code + level, rep,
    colors: R.pick(COLORS).slice(), crest: { shape: R.int(0, 3), pat: R.int(0, 7) },
    stadium: { name: R.pick(STADIUM_PATTERNS[C.code]).replace('{c}', city), cap: Math.round((5000 + Math.pow(rep / 100, 3) * 75000 * R.range(0.8, 1.2)) / 100) * 100 },
    fac: { train: fac(), youth: fac(), med: fac() },
    balance: 0, tBudget: 0, wBudget: 0,
    philo: R.pick(['balanced', 'balanced', 'possession', 'direct', 'counter', 'press', 'wing']),
    pref: null, tactics: null, lineup: [], bench: [],
    squad: [], youth: [], coh: R.int(50, 75),
    mgr: { fn: mgr.fn, ln: mgr.ln, nat: C.code, since: state.season }, vacant: false,
    fin: { in: {}, out: {} }, hist: [], trophies: [], obj: null, str: 0,
    training: { focus: 'eq', int: 1 }, penTaker: null,
  };
  state.clubs[id] = club;
  return club;
}

export function genSquad(state, club, str) {
  const level = clubLevelTarget(club, str);
  TEMPLATE.forEach((pos, i) => {
    const starter = STARTERS.has(i);
    let age, ovr;
    if (starter) { age = clamp(Math.round(R.normal(27, 3.3)), 19, 35); ovr = level + R.normal(0, 2.6); }
    else if (R.chance(0.4)) { age = R.int(17, 21); ovr = level - R.range(6, 14); }
    else { age = clamp(Math.round(R.normal(26, 4)), 19, 36); ovr = level - R.range(3, 9); }
    if (i === 2) ovr = level - R.range(10, 16);
    if (starter && club.rep >= 78 && R.chance(0.14)) ovr += R.range(3, 7);
    ovr = clamp(Math.round(ovr), 35, 94);
    const lvl = state.comps[club.league].level;
    const p = createPlayer(state, { nat: pickNat(club.country, lvl), pos, ovr, age, club: club.id });
    p.until = state.season + (age <= 22 ? R.int(2, 5) : age >= 32 ? R.int(1, 2) : R.int(1, 5));
    club.squad.push(p.id);
  });
  for (let k = 0; k < R.int(3, 5); k++) genYouth(state, club, R.int(15, 17));
  assignNumbers(state, club);
}

export function genYouth(state, club, age) {
  const lvl = club.fac.youth;
  const pot = clamp(Math.round(R.normal(35 + club.rep * 0.3 + lvl * 2.5, 9)), 42, 95);
  const ovr = clamp(Math.round(pot - R.range(18, 30) + (age - 16) * 3), 30, pot);
  const pos = R.pick(TEMPLATE);
  const nat = R.chance(0.85) ? club.country : pickNat(club.country, 1);
  const p = createPlayer(state, { nat, pos, ovr, age, pot, club: club.id });
  p.youth = true;
  p.until = state.season + 3;
  p.wage = roundWage(250 + ovr * 6);
  p.value = playerValue(p, state.season);
  club.youth.push(p.id);
  return p;
}

export function assignNumbers(state, club) {
  const used = new Set();
  const prefs = { GB: [1, 16, 30], DD: [2, 22], DC: [4, 5, 15, 24], DG: [3, 12], MDC: [6, 18], MC: [8, 14, 20], MD: [17, 27], MG: [21, 25], MOC: [10, 19], AD: [7, 23], AG: [11, 28], BU: [9, 26, 29] };
  const ps = club.squad.map((id) => state.players[id]).sort((a, b) => b.ovr - a.ovr);
  for (const p of ps) if (p.num && !used.has(p.num)) used.add(p.num); else p.num = 0;
  for (const p of ps) {
    if (p.num) continue;
    const n = (prefs[p.pos] || []).find((x) => !used.has(x));
    if (n) { p.num = n; used.add(n); }
  }
  let k = 31;
  for (const p of ps) {
    if (p.num) continue;
    while (used.has(k)) k++;
    p.num = k; used.add(k);
  }
}

// Salaires adaptés aux revenus du club
export function setInitialWages(state, club) {
  const ps = club.squad.map((id) => state.players[id]);
  let sum = 0;
  for (const p of ps) { p.wage = baseWage(p.ovr, p.age); sum += p.wage; }
  const target = projectRevenue(state, club) * 0.58 / 52;
  const k = clamp(target / Math.max(1, sum), 0.6, 2.2);
  for (const p of ps) {
    p.wage = roundWage(p.wage * k * R.range(0.85, 1.15));
    p.value = playerValue(p, state.season);
  }
}

export function genFreeAgent(state, ovrLo = 45, ovrHi = 70) {
  const age = R.int(20, 34);
  const pos = R.pick(TEMPLATE);
  const nat = R.pick(CORE_NATIONS);
  const p = createPlayer(state, { nat, pos, ovr: R.int(ovrLo, ovrHi), age });
  p.club = null;
  p.until = state.season;
  p.wage = baseWage(p.ovr, p.age);
  p.value = playerValue(p, state.season);
  state.free.push(p.id);
  return p;
}

export function initClubTactics(state, club) {
  club.pref = club.pref || bestFormation(state, club);
  club.tactics = makeTactics(club.philo, club.pref);
  const { lineup, bench } = autoLineup(state, club, club.tactics.formation, { rotate: false });
  club.lineup = lineup; club.bench = bench;
  refreshClubStrength(state, club);
}

function baseState(seed, Y) {
  return {
    v: VERSION, seed, season: Y, day: dayOf(Y, 7, 1), nextId: 1, nextMid: 1,
    clubs: {}, players: {}, comps: {}, matches: {}, byDay: {},
    free: [], inbox: [], news: [], transfers: [], history: [], awards: [],
    user: null, mgr: null, flags: {},
  };
}

export function generateWorld(seed) {
  R.seed(seed);
  const Y = 2026;
  const state = baseState(seed, Y);
  applyWorld(state);
  state.sd = seasonDates(Y);
  const usedShort = new Set();
  for (const C of LEAGUE_COUNTRIES) {
    const cities = R.shuffle(CITIES[C.code].slice());
    const usedNames = new Set();
    for (const level of [1, 2]) {
      const comp = { id: C.code + level, type: 'league', country: C.code, level, name: level === 1 ? C.d1 : C.d2, clubs: [] };
      state.comps[comp.id] = comp;
      for (let i = 0; i < CLUBS_PER_DIV; i++) {
        const rep = level === 1 ? clamp(D1_REP[i] + C_ADJ[C.code] + R.int(-2, 2), 50, 96) : clamp(Math.round(54 - i * 0.95 + R.int(-2, 2)), 34, 56);
        const club = makeClub(state, C, cities.pop(), level, rep, usedNames, usedShort);
        comp.clubs.push(club.id);
      }
    }
    state.comps[C.code + 'C'] = { id: C.code + 'C', type: 'cup', country: C.code, name: C.cup, clubs: [] };
  }
  for (const club of Object.values(state.clubs)) {
    const C = LEAGUE_COUNTRIES.find((c) => c.code === club.country);
    genSquad(state, club, C.str);
    setInitialWages(state, club);
    initClubTactics(state, club);
    club.balance = Math.round(projectRevenue(state, club) * R.range(0.15, 0.5) / 100000) * 100000;
    setBudgets(state, club);
  }
  for (let i = 0; i < 140; i++) genFreeAgent(state);
  for (const C of LEAGUE_COUNTRIES) {
    scheduleLeague(state, state.comps[C.code + '1']);
    scheduleLeague(state, state.comps[C.code + '2']);
    scheduleCup(state, state.comps[C.code + 'C']);
  }
  scheduleConti(state, contiQualifiers(state, true));
  rebuildIndexes(state);
  setObjectives(state);
  return state;
}

export { wageBill };

// ---------- Monde réel 2026-27 ----------
const EQUIV = { MD: ['AD'], AD: ['MD'], MG: ['AG'], AG: ['MG'], MOC: ['MC'], MC: ['MOC', 'MDC'], MDC: ['MC'] };

function makeRealClub(state, C, level, d) {
  const id = 'c' + (state.nextId++).toString(36);
  const rep = d.rep;
  const fac = () => clamp(Math.round(1 + (rep - 35) / 15 + R.range(-0.6, 0.6)), 1, 5);
  const mgr = makeName(C.code);
  let h = 0;
  for (const ch of d.abbr + d.name) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const club = {
    id, name: d.name, short: d.short, abbr: d.abbr, city: d.city, country: C.code, league: C.code + level, rep,
    colors: d.colors.slice(), crest: { shape: h % 4, pat: (h >> 3) % 8 },
    stadium: { name: d.stadium, cap: d.cap },
    fac: { train: fac(), youth: fac(), med: fac() },
    balance: 0, tBudget: 0, wBudget: 0,
    philo: R.pick(['balanced', 'balanced', 'possession', 'direct', 'counter', 'press', 'wing']),
    pref: null, tactics: null, lineup: [], bench: [],
    squad: [], youth: [], coh: R.int(55, 80),
    mgr: { fn: mgr.fn, ln: mgr.ln, nat: C.code, since: state.season }, vacant: false,
    fin: { in: {}, out: {} }, hist: [], trophies: [], obj: null, str: 0,
    training: { focus: 'eq', int: 1 }, penTaker: null,
  };
  state.clubs[id] = club;
  return club;
}

// Effectif : joueurs réels, puis joueurs générés pour compléter les postes manquants
function genRealSquad(state, club, d) {
  const lvlDiv = state.comps[club.league].level;
  for (const r of d.players) {
    const p = createRealPlayer(state, r, club.id);
    p.until = state.season + (r.age <= 22 ? R.int(3, 5) : r.age >= 32 ? R.int(1, 2) : R.int(2, 5));
    club.squad.push(p.id);
  }
  const used = new Array(TEMPLATE.length).fill(false);
  for (const r of d.players) {
    let i = TEMPLATE.findIndex((pos, k) => !used[k] && pos === r.pos);
    if (i < 0) i = TEMPLATE.findIndex((pos, k) => !used[k] && (EQUIV[r.pos] || []).includes(pos));
    if (i >= 0) used[i] = true;
  }
  const top = d.players.map((p) => p.ovr).sort((a, b) => b - a).slice(0, 11);
  const level = d.lvl || (top.length ? top.reduce((s, x) => s + x, 0) / top.length : 65);
  // Postes de titulaire sans joueur réel : remplis au niveau d'un titulaire si l'effectif réel est court
  const fewReal = d.players.length < 16;
  TEMPLATE.forEach((pos, i) => {
    if (used[i] || club.squad.length >= 25) return;
    const starter = fewReal && STARTERS.has(i);
    let age, ovr;
    if (starter) { age = clamp(Math.round(R.normal(27, 3.3)), 19, 35); ovr = level + R.normal(0, 2.4); }
    else if (R.chance(0.4)) { age = R.int(17, 21); ovr = level - R.range(7, 14); }
    else { age = clamp(Math.round(R.normal(26, 4)), 19, 36); ovr = level - (d.players.length >= 16 ? R.range(7, 12) : R.range(4, 9)); }
    if (i === 2) ovr = level - R.range(10, 16);
    ovr = clamp(Math.round(ovr), 40, 90);
    const p = createPlayer(state, { nat: pickNat(club.country, lvlDiv), pos, ovr, age, club: club.id });
    p.until = state.season + (age <= 22 ? R.int(2, 5) : age >= 32 ? R.int(1, 2) : R.int(1, 5));
    club.squad.push(p.id);
  });
  for (let k = 0; k < R.int(3, 5); k++) genYouth(state, club, R.int(15, 17));
  assignNumbers(state, club);
}

export function generateRealWorld(seed) {
  R.seed(seed);
  const Y = 2026;
  const state = baseState(seed, Y);
  state.mode = 'real';
  state.countries = REAL_COUNTRIES.map((c) => ({ ...c }));
  state.contiName = REAL_CONTI;
  applyWorld(state);
  const data = new Map();
  for (const C of LEAGUE_COUNTRIES) {
    const src = REAL_DATA[C.code];
    for (const level of [1, 2]) {
      const comp = { id: C.code + level, type: 'league', country: C.code, level, name: level === 1 ? C.d1 : C.d2, clubs: [] };
      state.comps[comp.id] = comp;
      for (const txt of src[level === 1 ? 'd1' : 'd2']) {
        const d = parseClub(txt);
        const club = makeRealClub(state, C, level, d);
        data.set(club.id, d);
        comp.clubs.push(club.id);
      }
    }
    state.comps[C.code + 'C'] = { id: C.code + 'C', type: 'cup', country: C.code, name: C.cup, clubs: [] };
  }
  state.sd = seasonDates(Y, maxRoundsOf(state));
  for (const club of Object.values(state.clubs)) {
    genRealSquad(state, club, data.get(club.id));
    setInitialWages(state, club);
    initClubTactics(state, club);
    club.balance = Math.round(projectRevenue(state, club) * R.range(0.15, 0.5) / 100000) * 100000;
    setBudgets(state, club);
  }
  for (let i = 0; i < 160; i++) genFreeAgent(state);
  for (const C of LEAGUE_COUNTRIES) {
    scheduleLeague(state, state.comps[C.code + '1']);
    scheduleLeague(state, state.comps[C.code + '2']);
    scheduleCup(state, state.comps[C.code + 'C']);
  }
  scheduleConti(state, contiQualifiers(state, true));
  rebuildIndexes(state);
  setObjectives(state);
  return state;
}
