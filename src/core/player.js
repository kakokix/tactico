// Joueurs : création, note globale, valeur, salaire, progression.
import { R, clamp } from './rng.js';
import { ATTRS, A, WEIGHTS, POS, posFit } from './constants.js';
import { NATIONS } from '../data/names.js';

export function calcOvr(attr, pos) {
  const w = WEIGHTS[pos];
  let s = 0;
  for (let i = 0; i < w.length; i++) s += w[i] * attr[i];
  return Math.round(s * 5);
}

// Note d'un joueur à un poste donné (attributs + familiarité)
export function ovrAt(p, slotPos) {
  if (slotPos === p.pos) return p.ovr;
  return Math.round(calcOvr(p.attr, slotPos) * posFit(p, slotPos));
}

const PHYS = [A.vit, A.end, A.pui];

export function genAttrs(pos, ovr, age) {
  const w = WEIGHTS[pos];
  const maxW = Math.max(...w);
  const base = ovr / 5;
  const isGK = pos === 'GB';
  const a = new Array(ATTRS.length);
  for (let i = 0; i < a.length; i++) {
    const rel = w[i] / maxW;
    let v;
    if (isGK) {
      if (w[i] > 0) v = base + R.normal(0, 1.2);
      else v = base * 0.42 + R.normal(0, 1.5);
    } else if (i === A.arr || i === A.sor) {
      v = R.int(1, 4);
    } else if (rel > 0) {
      v = base * (0.8 + 0.2 * rel) + R.normal(0, 1.7);
    } else if (PHYS.includes(i)) {
      v = base * 0.82 + R.normal(0, 2);
    } else {
      v = base * 0.62 + R.normal(0, 2);
    }
    if (age <= 20) { if (i === A.vit) v += 1; if (i === A.sgf || i === A.pla) v -= 1; }
    if (age >= 31) {
      if (i === A.vit) v -= (age - 30) * 0.6;
      if (i === A.end) v -= (age - 30) * 0.4;
      if (i === A.sgf || i === A.pla || i === A.vis) v += 1;
    }
    a[i] = v;
  }
  const keys = [];
  for (let i = 0; i < w.length; i++) if (w[i] > 0) keys.push(i);
  for (let iter = 0; iter < 8; iter++) {
    let cur = 0;
    for (let i = 0; i < w.length; i++) cur += w[i] * a[i];
    const d = (ovr / 5 - cur);
    if (Math.abs(d) < 0.01) break;
    for (const i of keys) a[i] = clamp(a[i] + d, 1, 20);
  }
  for (let i = 0; i < a.length; i++) a[i] = clamp(Math.round(a[i]), 1, 20);
  for (let k = 0; k < 12; k++) {
    const diff = ovr - calcOvr(a, pos);
    if (diff === 0) break;
    const i = R.weighted(keys, (idx) => w[idx]);
    a[i] = clamp(a[i] + Math.sign(diff), 1, 20);
  }
  return a;
}

const ALT = {
  GB: [], DC: [['MDC', .3], ['DD', .08], ['DG', .08]], DD: [['DG', .15], ['MD', .25], ['DC', .1]], DG: [['DD', .15], ['MG', .25], ['DC', .1]],
  MDC: [['MC', .5], ['DC', .25]], MC: [['MDC', .4], ['MOC', .3], ['MD', .08], ['MG', .08]], MD: [['AD', .4], ['MG', .2], ['DD', .15], ['MC', .1]],
  MG: [['AG', .4], ['MD', .2], ['DG', .15], ['MC', .1]], MOC: [['MC', .4], ['AD', .15], ['AG', .15], ['BU', .15]],
  AD: [['AG', .35], ['MD', .3], ['BU', .15], ['MOC', .1]], AG: [['AD', .35], ['MG', .3], ['BU', .15], ['MOC', .1]], BU: [['AD', .12], ['AG', .12], ['MOC', .1]],
};

export function makeName(nat) {
  const n = NATIONS[nat] || NATIONS.FR;
  return { fn: R.pick(n.f), ln: R.pick(n.l) };
}

export function potentialFor(ovr, age) {
  if (age >= 28) return Math.min(99, ovr + R.int(0, 1));
  let gap = 0;
  if (age <= 23) gap = Math.max(0, R.normal((24 - age) * 1.9, 3.5));
  else gap = R.int(0, 2);
  if (age <= 21 && R.chance(0.045)) gap += R.int(5, 12);
  return clamp(Math.round(ovr + gap), ovr, 94);
}

export function createPlayer(state, { nat, pos, ovr, age, pot, club = null }) {
  const id = 'p' + (state.nextId++).toString(36);
  const { fn, ln } = makeName(nat);
  const attr = genAttrs(pos, ovr, age);
  const alt = [];
  for (const [p2, pr] of ALT[pos]) if (R.chance(pr) && alt.length < 2) alt.push(p2);
  const p = {
    id, fn, ln, nat, age, pos, alt,
    foot: pos === 'DG' || pos === 'MG' || pos === 'AG' ? (R.chance(0.75) ? 'G' : 'D') : R.chance(0.22) ? 'G' : R.chance(0.08) ? '2' : 'D',
    attr, ovr: calcOvr(attr, pos), pot: 0, club, num: 0,
    wage: 0, until: state.season + 1, value: 0,
    morale: R.int(60, 80), cond: 100, form: 6.5, inj: 0, injName: '', susp: 0, yc: 0,
    st: newSeasonStats(), car: { apps: 0, gls: 0, ast: 0 }, hist: [],
    listed: false, loan: null, youth: false, gp: 0, rm: 0.5, joined: state.day,
  };
  p.pot = pot != null ? Math.max(pot, p.ovr) : potentialFor(p.ovr, age);
  p.o0 = p.ovr;
  state.players[id] = p;
  return p;
}

export function newSeasonStats() {
  return { apps: 0, gls: 0, ast: 0, rat: 0, min: 0, cs: 0, yc: 0, rc: 0, motm: 0 };
}

export const pname = (p) => (p ? p.fn + ' ' + p.ln : '—');
export const pshort = (p) => (p ? (p.fn ? p.fn[0] + '. ' : '') + p.ln : '—');

function niceRound(v) {
  if (v < 10000) return Math.round(v / 500) * 500;
  if (v < 100000) return Math.round(v / 5000) * 5000;
  if (v < 1000000) return Math.round(v / 25000) * 25000;
  if (v < 10000000) return Math.round(v / 100000) * 100000;
  return Math.round(v / 500000) * 500000;
}

const valAt = (o) => 50000 * Math.pow(1.215, o - 50);

export function playerValue(p, season) {
  const o = p.ovr;
  let v = valAt(o);
  const age = p.age;
  const af = age <= 18 ? 1.25 : age <= 21 ? 1.35 : age <= 24 ? 1.25 : age <= 27 ? 1.1 : age <= 29 ? 0.9 : age <= 31 ? 0.62 : age <= 33 ? 0.38 : 0.18;
  v *= af;
  if (age <= 23 && p.pot > o) v = Math.max(v, valAt(p.pot) * (0.06 + 0.035 * (23 - age)));
  const yrs = p.until - season;
  if (!p.youth) v *= yrs <= 0 ? 0.55 : yrs === 1 ? 0.8 : 1;
  if (p.pos === 'GB') v *= 0.75;
  return Math.max(10000, niceRound(v));
}

export function baseWage(ovr, age) {
  let w = 600 * Math.pow(1.14, ovr - 50);
  if (age <= 19) w *= 0.45; else if (age <= 21) w *= 0.7;
  return roundWage(w);
}
export function roundWage(w) {
  if (w < 1000) return Math.max(250, Math.round(w / 50) * 50);
  if (w < 10000) return Math.round(w / 100) * 100;
  if (w < 100000) return Math.round(w / 500) * 500;
  return Math.round(w / 1000) * 1000;
}

// Progression hebdomadaire
const RATE = (age) => (age <= 17 ? 0.02 : age <= 19 ? 0.016 : age <= 21 ? 0.012 : age <= 23 ? 0.009 : age <= 25 ? 0.006 : age <= 27 ? 0.003 : 0);
const CAP = (age) => (age <= 17 ? 0.18 : age <= 19 ? 0.16 : age <= 21 ? 0.12 : age <= 23 ? 0.08 : age <= 25 ? 0.05 : 0.025);

export function weeklyDevelopment(p, ctx) {
  const w = WEIGHTS[p.pos];
  if (p.ovr < p.pot && p.age <= 27) {
    let g = Math.min((p.pot - p.ovr) * RATE(p.age), CAP(p.age));
    g *= 0.8 + 0.1 * (ctx.training || 2);
    g *= [0.85, 1, 1.15][ctx.intensity ?? 1];
    g *= 0.65 + 0.6 * clamp(p.rm, 0, 1);
    g *= 0.9 + 0.2 * (p.morale / 100);
    g *= R.range(0.4, 1.6);
    p.gp += g;
  }
  if (p.age >= 29) p.gp -= 0.012 * (p.age - 28) * R.range(0.4, 1.6);
  let guard = 0;
  while (p.gp >= 0.3 && guard++ < 10) {
    if (p.ovr >= p.pot) { p.gp = 0; break; }
    const cands = [];
    for (let i = 0; i < w.length; i++) {
      if (p.attr[i] >= 20) continue;
      let wt = w[i];
      if (ctx.focus && ctx.focus.includes(ATTRS[i])) wt = wt * 2 + 0.02;
      if (wt > 0) cands.push([i, wt]);
    }
    if (!cands.length) { p.gp = 0; break; }
    const [i] = R.weighted(cands, (c) => c[1]);
    p.attr[i]++;
    p.gp -= Math.max(0.15, 5 * w[i]);
    p.ovr = calcOvr(p.attr, p.pos);
  }
  guard = 0;
  while (p.gp <= -0.3 && guard++ < 10) {
    const cands = [];
    for (let i = 0; i < w.length; i++) {
      if (p.attr[i] <= 1) continue;
      let wt = w[i] + 0.01;
      if (i === A.vit) wt += 0.3; else if (i === A.end) wt += 0.22; else if (i === A.pui) wt += 0.1;
      if (p.pos === 'GB' && (i === A.arr || i === A.sor)) wt += 0.1;
      cands.push([i, wt]);
    }
    if (!cands.length) break;
    const [i] = R.weighted(cands, (c) => c[1]);
    p.attr[i]--;
    p.gp += Math.max(0.15, 5 * w[i]);
    p.ovr = calcOvr(p.attr, p.pos);
  }
}

export function isAvailable(p) {
  return p && p.inj <= 0 && p.susp <= 0;
}

export function avgRating(p) {
  return p.st.apps ? p.st.rat / p.st.apps : 0;
}

export const POS_LIST = POS;
