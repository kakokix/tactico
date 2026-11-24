// Moteur de match : simulation minute par minute.
import { R, clamp, round1 } from './rng.js';
import { A, FORMATIONS, posFit, POS_GROUP } from './constants.js';
import { pshort } from './player.js';
import { condFactor } from './team.js';

const DW = { GB: 0, DC: 1.0, DD: 0.8, DG: 0.8, MDC: 0.6, MC: 0.3, MD: 0.3, MG: 0.3, MOC: 0.1, AD: 0.15, AG: 0.15, BU: 0.05 };
const MW = { GB: 0.05, DC: 0.2, DD: 0.35, DG: 0.35, MDC: 0.9, MC: 1.0, MD: 0.7, MG: 0.7, MOC: 0.8, AD: 0.35, AG: 0.35, BU: 0.2 };
const AW = { GB: 0, DC: 0.05, DD: 0.25, DG: 0.25, MDC: 0.15, MC: 0.35, MD: 0.6, MG: 0.6, MOC: 0.85, AD: 0.9, AG: 0.9, BU: 1.0 };
const K_DEF = 5.0, K_MID = 4.9, K_ATT = 4.3;
// Sommes de référence (4-3-3) : chaque formation est en grande partie ramenée à ce total,
// pour que le système change le profil de l'équipe sans la rendre beaucoup plus forte ou plus faible
const REF_W = { d: 5.15, m: 4.95, a: 4.25 }, NORM = 0.75;
const STYLE_SHARE = [0.05, 0, -0.04, -0.07];
const STYLE_PROG = [-0.02, 0, 0.05, 0.02];
const STYLE_CHANCE = [0.03, 0, -0.03, 0];
const PRESS_FOUL = [0.85, 1, 1.25];
const XG = { through: 0.26, cross: 0.08, cutback: 0.17, long: 0.035, dribble: 0.12, scramble: 0.28, header_sp: 0.07, fk: 0.06 };
const SHOOT_W = { GB: 0, DC: 0.3, DD: 0.35, DG: 0.35, MDC: 0.45, MC: 0.95, MD: 1.1, MG: 1.1, MOC: 1.7, AD: 1.65, AG: 1.65, BU: 2.9 };
const HEAD_W = { GB: 0, DC: 2.2, DD: 0.4, DG: 0.4, MDC: 0.9, MC: 0.7, MD: 0.5, MG: 0.5, MOC: 0.6, AD: 0.6, AG: 0.6, BU: 3 };
const WIDE = new Set(['DD', 'DG', 'MD', 'MG', 'AD', 'AG']);

const T_ = {
  ko: ["Coup d'envoi ! C'est parti entre {h} et {a}.", "L'arbitre siffle le coup d'envoi !"],
  through: ['{a} glisse un ballon en profondeur pour {s}…', 'Superbe ouverture de {a} vers {s} !', '{s} prend la profondeur sur une passe de {a}…'],
  cross: ['{a} centre depuis le côté…', 'Centre de {a} dans la surface !', '{a} déborde et adresse un centre…'],
  cutback: ['{a} remet en retrait pour {s}…', 'Centre en retrait de {a} vers {s} !'],
  long: ['{s} tente sa chance de loin…', 'Frappe lointaine de {s} !', '{s} arme une frappe à 25 mètres…'],
  dribble: ['{s} élimine son vis-à-vis et entre dans la surface…', 'Quel slalom de {s} !', '{s} provoque et frappe…'],
  scramble: ['Cafouillage dans la surface !', 'Le ballon traîne dans les six mètres…'],
  header_sp: ['Coup de pied arrêté de {a}, {s} s\'élève…', '{a} enroule le ballon, tête de {s}…'],
  fk: ['Coup franc bien placé pour {team}. {s} se présente…', '{s} tente le coup franc direct…'],
  counter: ['Contre-attaque éclair de {team} !', '{team} part en contre !', 'Récupération et contre rapide de {team} !'],
  pen: ['PENALTY pour {team} ! {s} se présente…', "L'arbitre désigne le point de penalty ! {s} va le tirer."],
  goal: ['BUT !!! {s} marque pour {team} !', 'BUT ! {s} trompe {gk} !', 'BUT !!! Quelle finition de {s} !', 'BUT ! {s} ne tremble pas !'],
  goalHead: ['BUT !!! De la tête, {s} !', 'BUT ! Coup de tête imparable de {s} !'],
  goalLong: ['BUT !!! Une frappe splendide de {s} !', 'BUT ! Missile de {s} en pleine lucarne !'],
  goalPen: ['BUT ! {s} transforme le penalty !', 'BUT ! Penalty parfaitement tiré par {s} !'],
  save: ['Arrêt de {gk} !', 'Belle parade de {gk} !', "{gk} s'interpose !", '{gk} capte le ballon sans trembler.'],
  bigsave: ['Arrêt réflexe exceptionnel de {gk} !!', 'Quelle parade de {gk} !!'],
  miss: ['La frappe de {s} passe à côté.', '{s} manque le cadre.', 'Au-dessus ! {s} a trop enlevé sa frappe.', 'Raté ! {s} vendange.'],
  post: ["SUR LE POTEAU ! {s} n'a pas de chance !", 'La barre transversale repousse la tentative de {s} !'],
  block: ['La frappe de {s} est contrée.', 'Contré par la défense !', 'Un défenseur se jette et contre {s}.'],
  penMiss: ['Penalty manqué par {s} !', '{gk} arrête le penalty de {s} !!'],
  offside: ['{s} est signalé hors-jeu.', 'Drapeau levé, hors-jeu de {s}.'],
  yellow: ['Carton jaune pour {p}.', '{p} est averti.'],
  red: ['CARTON ROUGE ! {p} est expulsé !', 'Expulsion de {p} ! {team} à dix.'],
  secondY: ["Deuxième jaune pour {p}, c'est l'expulsion !"],
  corner: ['Corner pour {team}.'],
  injury: ['{p} se blesse et ne peut pas continuer.', '{p} est touché et doit sortir.'],
  sub: ['Changement {team} : {in} remplace {out}.'],
  quiet: ['{team} fait tourner le ballon.', 'Phase de possession pour {team}.', '{team} cherche la faille.', 'Le jeu se déroule au milieu de terrain.', '{team} construit patiemment depuis l\'arrière.'],
};
// Les très gros écarts de niveau ont un effet amorti (pas de scores fleuves à répétition)
const soft = (x) => (Math.abs(x) <= 1.2 ? x : Math.sign(x) * (1.2 + (Math.abs(x) - 1.2) * 0.5));
const fill = (tpls, o) => (Array.isArray(tpls) ? R.pick(tpls) : tpls).replace(/\{(\w+)\}/g, (_, k) => (o[k] ?? ''));

export class MatchSim {
  constructor(state, match, opts) {
    this.S = state;
    this.m = match;
    this.quiet = !!opts.quiet;
    this.neutral = !!match.neutral;
    this.ko = !!match.ko;
    const H = state.clubs[match.h], Aw = state.clubs[match.a];
    this.sides = [this.makeSide(H, opts.home), this.makeSide(Aw, opts.away)];
    this.minute = 0; this.extra = 0; this.period = 1; this.added = R.int(1, 4);
    this.done = false;
    this.events = [];
    this.goals = [];
    this.stats = { sh: [0, 0], on: [0, 0], xg: [0, 0], cor: [0, 0], fo: [0, 0], yc: [0, 0], rc: [0, 0], off: [0, 0], poss: [0, 0], pn: 0 };
    this.pens = null;
    this.injuries = {};
    this.recalc(0); this.recalc(1);
    this.ev({ type: 'ko', t: -1, text: fill(T_.ko, { h: H.name, a: Aw.name }) });
  }

  P(id) { return this.S.players[id]; }

  makeSide(club, o) {
    const tactics = { ...o.tactics };
    const slots = FORMATIONS[tactics.formation].map((s, i) => ({ pos: s.pos, x: s.x, y: s.y, pid: o.lineup[i] || null }));
    const side = {
      club, cid: club.id, tactics, slots, bench: (o.bench || []).slice(), subs: 0, maxSubs: 5,
      auto: o.auto !== false, goals: 0, rat: {}, posOf: {}, inMin: {}, outMin: {}, yel: {}, reds: new Set(), cond: {}, r: null, onPitch: 11,
    };
    for (const sl of slots) {
      if (!sl.pid) continue;
      side.rat[sl.pid] = (sl.pos === 'GB' ? 6.28 : 6.45) + R.normal(0, 0.12);
      side.posOf[sl.pid] = sl.pos;
      side.inMin[sl.pid] = 0;
    }
    for (const id of [...slots.map((s) => s.pid), ...side.bench]) {
      if (id && this.S.players[id]) side.cond[id] = this.S.players[id].cond;
    }
    return side;
  }

  name(t) { return this.sides[t].club.short || this.sides[t].club.name; }
  clock() { return this.extra > 0 ? `${this.minute}+${this.extra}` : `${this.minute}`; }
  ev(e) {
    e.min = this.clock();
    e.m = this.minute;
    if (this.cur) e.ph = this.cur.phases.length - 1;
    if (this.quiet && e.type !== 'goal' && e.type !== 'red' && e.type !== 'injury' && e.type !== 'sub') delete e.text;
    this.events.push(e);
    if (this.cur) this.cur.events.push(e);
  }
  addR(side, pid, v) { if (pid && side.rat[pid] != null) side.rat[pid] += v; }

  recalc(t) {
    const side = this.sides[t];
    let def = 0, mid = 0, att = 0, gk = 4, cross = 0, cn = 0, pace = 0, pn = 0, dp = 0, dn = 0, n = 0;
    for (const sl of side.slots) {
      if (!sl.pid) continue;
      const p = this.P(sl.pid), a = p.attr;
      const f = posFit(p, sl.pos) * condFactor(side.cond[sl.pid] ?? 90) * (0.95 + 0.1 * (p.morale ?? 70) / 100);
      n++;
      if (sl.pos === 'GB') { gk = (0.5 * a[A.arr] + 0.3 * a[A.sor] + 0.2 * a[A.pla]) * f; continue; }
      def += DW[sl.pos] * (0.3 * a[A.tac] + 0.25 * a[A.mar] + 0.2 * a[A.pla] + 0.1 * a[A.tet] + 0.08 * a[A.vit] + 0.07 * a[A.pui]) * f;
      mid += MW[sl.pos] * (0.3 * a[A.pas] + 0.2 * a[A.vis] + 0.15 * a[A.tra] + 0.1 * a[A.end] + 0.1 * a[A.sgf] + 0.1 * a[A.dri] + 0.05 * a[A.tac]) * f;
      att += AW[sl.pos] * (0.25 * a[A.fin] + 0.2 * a[A.dri] + 0.15 * a[A.vit] + 0.12 * a[A.sgf] + 0.1 * a[A.pla] + 0.1 * a[A.tir] + 0.08 * a[A.cen]) * f;
      if (WIDE.has(sl.pos)) { cross += a[A.cen] * f; cn++; }
      if (sl.pos === 'BU' || sl.pos === 'AD' || sl.pos === 'AG' || sl.pos === 'MOC') { pace += a[A.vit] * f; pn++; }
      if (sl.pos === 'DC' || sl.pos === 'DD' || sl.pos === 'DG') { dp += a[A.vit] * f; dn++; }
    }
    let wd = 0, wm = 0, wa = 0;
    for (const sl of side.slots) if (sl.pos !== 'GB') { wd += DW[sl.pos]; wm += MW[sl.pos]; wa += AW[sl.pos]; }
    def *= (REF_W.d / (wd || REF_W.d)) ** NORM;
    mid *= (REF_W.m / (wm || REF_W.m)) ** NORM;
    att *= (REF_W.a / (wa || REF_W.a)) ** NORM;
    const coh = 0.97 + 0.06 * ((side.club.coh ?? 60) / 100);
    const home = !this.neutral && t === 0 ? 1.035 : 1;
    const tm = side.tactics;
    side.onPitch = n;
    side.r = {
      def: (def / K_DEF) * coh * home, mid: (mid / K_MID) * coh * home, att: (att / K_ATT) * coh * home, gk,
      cross: cn ? cross / cn : 8, pace: pn ? pace / pn : 10, dpace: dn ? dp / dn : 10,
      atkMod: 0.84 + 0.08 * tm.ment, defMod: 1.12 - 0.06 * tm.ment,
    };
  }

  share() {
    const h = this.sides[0], a = this.sides[1];
    const mh = h.r.mid ** 3, ma = a.r.mid ** 3;
    let s = mh / (mh + ma);
    s += STYLE_SHARE[h.tactics.style] - STYLE_SHARE[a.tactics.style];
    s += (h.tactics.press - a.tactics.press) * 0.015;
    if (!this.neutral) s += 0.02;
    s += (h.onPitch - a.onPitch) * 0.04;
    if (this.minute > 60) s -= clamp(h.goals - a.goals, -2, 2) * 0.02;
    return clamp(s, 0.22, 0.78);
  }

  // ---------- Déroulement ----------
  step() {
    if (this.done) return null;
    const out = { events: [], phases: [] };
    this.cur = out;
    const end = [45, 90, 105, 120][this.period - 1];
    if (this.minute < end) { this.minute++; this.extra = 0; } else this.extra++;
    this.aiManage(0); this.aiManage(1);
    if (this.minute % 5 === 0 && this.extra === 0) { this.recalc(0); this.recalc(1); }
    const sH = this.share();
    this.stats.poss[0] += sH; this.stats.poss[1] += 1 - sH;
    const n = R.chance(0.46) ? 2 : 1;
    for (let k = 0; k < n; k++) this.phase(R.f() < sH ? 0 : 1);
    this.fatigue();
    this.injuryCheck();
    if (!this.quiet && !out.events.length && R.chance(0.22)) {
      const t = R.f() < sH ? 0 : 1;
      this.ev({ type: 'info', t, text: fill(T_.quiet, { team: this.sides[t].club.name }) });
    }
    if (this.minute >= end && this.extra >= this.added) this.endPeriod();
    this.cur = null;
    return out;
  }

  endPeriod() {
    const g0 = this.sides[0].goals, g1 = this.sides[1].goals;
    if (this.period === 1) {
      this.ev({ type: 'ht', t: -1, text: `Mi-temps : ${this.sides[0].club.name} ${g0} - ${g1} ${this.sides[1].club.name}` });
      this.period = 2; this.minute = 45; this.extra = 0; this.added = R.int(2, 6);
      this.halftime = true;
    } else if (this.period === 2) {
      if (this.ko && g0 === g1) {
        this.ev({ type: 'et', t: -1, text: 'Égalité ! Place à la prolongation.' });
        this.period = 3; this.minute = 90; this.extra = 0; this.added = R.int(0, 2);
        for (const s of this.sides) s.maxSubs = 6;
      } else this.finish();
    } else if (this.period === 3) {
      this.ev({ type: 'info', t: -1, text: 'Fin de la première période de prolongation.' });
      this.period = 4; this.minute = 105; this.extra = 0; this.added = R.int(0, 3);
    } else {
      if (g0 === g1) this.shootout();
      this.finish();
    }
  }

  playToEnd() {
    let guard = 0;
    while (!this.done && guard++ < 400) this.step();
    return this;
  }

  phase(t) {
    const T = this.sides[t], D = this.sides[1 - t];
    const tt = T.tactics, dt = D.tactics;
    const ph = { t, z: 1, k: 'build', ids: [] };
    this.cur.phases.push(ph);
    ph.ids = [this.pickBy(T, (pos) => MW[pos])];
    if (R.chance(0.095 * PRESS_FOUL[dt.press])) { this.foul(1 - t, t, false); return; }
    const prog = clamp(0.4 + 0.05 * soft(T.r.mid - D.r.mid) + STYLE_PROG[tt.style] - (dt.press - 1) * 0.025 + (tt.ment - 2) * 0.02, 0.18, 0.72);
    if (!R.chance(prog)) {
      ph.k = 'lost';
      if (R.chance(this.counterP(D, T) * 0.45)) this.counter(1 - t);
      return;
    }
    ph.z = 2; ph.k = 'final';
    ph.ids.push(this.pickBy(T, (pos) => AW[pos]));
    if (R.chance(0.08 * PRESS_FOUL[dt.press])) { this.foul(1 - t, t, true); return; }
    if (R.chance(dt.line === 2 ? 0.075 : dt.line === 0 ? 0.03 : 0.05)) {
      ph.k = 'offside'; this.stats.off[t]++;
      if (!this.quiet && R.chance(0.25)) { const s = this.pickShooter(T, 'through'); if (s) this.ev({ type: 'offside', t, pid: s, text: fill(T_.offside, { s: pshort(this.P(s)) }) }); }
      return;
    }
    const pc = clamp(0.37 + 0.05 * soft(T.r.att * T.r.atkMod - D.r.def * D.r.defMod) + STYLE_CHANCE[tt.style], 0.1, 0.7);
    if (R.chance(pc)) {
      if (R.chance(0.018)) this.penalty(t);
      else this.chance(t, this.chooseType(t), false);
    } else {
      ph.k = 'defended';
      this.addR(D, this.pickBy(D, (pos) => DW[pos]), 0.045);
      if (R.chance(0.2)) this.corner(t);
      else if (R.chance(this.counterP(D, T))) this.counter(1 - t);
    }
  }

  counterP(D, T) {
    let p = 0.05 + (D.tactics.style === 3 ? 0.08 : 0) + (T.tactics.ment >= 3 ? 0.03 * (T.tactics.ment - 2) : 0) + (T.tactics.line === 2 ? 0.03 : 0);
    return clamp(p, 0.02, 0.25);
  }

  counter(t) {
    const T = this.sides[t], D = this.sides[1 - t];
    const ph = { t, z: 2, k: 'counter', ids: [this.pickBy(T, (pos) => AW[pos])] };
    this.cur.phases.push(ph);
    const ps = 0.35 + 0.04 * (T.r.pace - D.r.dpace) + (D.tactics.line === 2 ? 0.08 : D.tactics.line === 0 ? -0.06 : 0) + (D.tactics.ment >= 3 ? 0.05 * (D.tactics.ment - 2) : 0);
    if (!R.chance(clamp(ps, 0.12, 0.7))) return;
    if (!this.quiet) this.ev({ type: 'counter', t, text: fill(T_.counter, { team: T.club.name }) });
    this.chance(t, R.chance(0.55) ? 'through' : R.chance(0.5) ? 'cutback' : 'dribble', true);
  }

  chooseType(t) {
    const T = this.sides[t], tt = T.tactics;
    const w = { through: 0.12, cross: 0.25, cutback: 0.12, long: 0.25, dribble: 0.18, scramble: 0.08 };
    if (tt.width === 2) w.cross *= 1.5;
    else if (tt.width === 0) { w.cross *= 0.6; w.through *= 1.2; w.dribble *= 1.1; }
    if (tt.style === 0) { w.through *= 1.2; w.cutback *= 1.3; w.long *= 0.8; }
    else if (tt.style === 2) { w.cross *= 1.2; w.scramble *= 1.3; w.long *= 1.1; w.through *= 0.85; }
    else if (tt.style === 3) w.through *= 1.3;
    w.cross *= 0.7 + T.r.cross / 30;
    const keys = Object.keys(w);
    return R.weighted(keys, keys.map((k) => w[k]));
  }

  pickBy(side, wfn) {
    const c = [];
    for (const sl of side.slots) if (sl.pid) c.push([sl.pid, wfn(sl.pos) || 0.01]);
    if (!c.length) return null;
    return R.weighted(c, (x) => x[1])[0];
  }

  pickShooter(side, type) {
    const c = [];
    for (const sl of side.slots) {
      if (!sl.pid || sl.pos === 'GB') continue;
      const a = this.P(sl.pid).attr;
      let w, sk;
      if (type === 'header_sp' || type === 'cross') {
        w = type === 'cross' ? SHOOT_W[sl.pos] * 0.5 + HEAD_W[sl.pos] * 0.5 : HEAD_W[sl.pos];
        sk = a[A.tet];
      } else if (type === 'long' || type === 'fk') {
        w = type === 'fk' ? 1 : SHOOT_W[sl.pos] * 0.6 + (POS_GROUP[sl.pos] === 'MIL' ? 1 : 0);
        sk = type === 'fk' ? a[A.cpa] * 1.5 : a[A.tir];
      } else if (type === 'dribble') { w = SHOOT_W[sl.pos]; sk = a[A.dri]; }
      else { w = SHOOT_W[sl.pos]; sk = a[A.fin]; }
      c.push([sl.pid, w * Math.pow(sk / 10, 0.75)]);
    }
    if (!c.length) return null;
    return R.weighted(c, (x) => x[1])[0];
  }

  pickAssister(side, type, shooter) {
    if (type === 'scramble' || type === 'fk') return null;
    if ((type === 'long' && R.chance(0.45)) || (type === 'dribble' && R.chance(0.4))) return null;
    const c = [];
    for (const sl of side.slots) {
      if (!sl.pid || sl.pid === shooter || sl.pos === 'GB') continue;
      const a = this.P(sl.pid).attr;
      let w = 0;
      if (type === 'cross' || type === 'cutback') w = (WIDE.has(sl.pos) ? 3 : sl.pos === 'MOC' || sl.pos === 'MC' ? 0.6 : 0.15) * Math.pow(a[A.cen] / 10, 2);
      else if (type === 'header_sp') w = Math.pow(a[A.cpa] / 10, 3) * (POS_GROUP[sl.pos] === 'DEF' ? 0.4 : 1);
      else w = (sl.pos === 'MOC' ? 3 : sl.pos === 'MC' ? 2.2 : sl.pos === 'MDC' ? 0.9 : sl.pos === 'BU' ? 1 : WIDE.has(sl.pos) ? 1.3 : 0.3) * Math.pow((a[A.vis] + a[A.pas]) / 20, 2);
      if (w > 0) c.push([sl.pid, w]);
    }
    if (!c.length) return null;
    return R.weighted(c, (x) => x[1])[0];
  }

  keeper(side) {
    const sl = side.slots.find((s) => s.pos === 'GB' && s.pid);
    return sl ? sl.pid : null;
  }

  chance(t, type, fast) {
    const T = this.sides[t], D = this.sides[1 - t];
    const ph = { t, z: 3, k: 'shot', type, ids: [] };
    this.cur.phases.push(ph);
    if (type === 'through' && R.chance(D.tactics.line === 2 ? 0.24 : D.tactics.line === 0 ? 0.07 : 0.14)) {
      const s = this.pickShooter(T, 'through');
      this.stats.off[t]++;
      ph.k = 'offside'; ph.ids = [s];
      if (!this.quiet && R.chance(0.6)) this.ev({ type: 'offside', t, pid: s, text: fill(T_.offside, { s: pshort(this.P(s)) }) });
      return;
    }
    const s = this.pickShooter(T, type);
    if (!s) return;
    const a = this.pickAssister(T, type, s);
    ph.ids = a ? [a, s] : [s];
    const sp = this.P(s), ap = a ? this.P(a) : null;
    let xg = XG[type] * R.range(0.65, 1.35) * (fast ? 1.15 : 1);
    const at = sp.attr;
    let sk = type === 'header_sp' || type === 'cross' ? at[A.tet] * 0.75 + at[A.fin] * 0.25
      : type === 'long' ? at[A.tir] * 0.8 + at[A.sgf] * 0.2
      : type === 'fk' ? at[A.cpa] * 0.8 + at[A.tir] * 0.2
      : at[A.fin] * 0.7 + at[A.sgf] * 0.3;
    sk *= condFactor(T.cond[s] ?? 90);
    const gkId = this.keeper(D), gkp = gkId ? this.P(gkId) : null;
    const gs = gkp ? (0.6 * gkp.attr[A.arr] + 0.4 * gkp.attr[A.sor]) * condFactor(D.cond[gkId] ?? 90) * (gkp.pos === 'GB' ? 1 : 0.4) : 2;
    const pGoal = clamp(xg * (1 + 0.07 * (sk - 13)) * (1 - 0.05 * (gs - 13)), 0.01, 0.9);
    this.stats.sh[t]++; this.stats.xg[t] += xg;
    const names = { s: pshort(sp), a: ap ? pshort(ap) : '', gk: gkp ? pshort(gkp) : 'le gardien', team: T.club.name };
    if (!this.quiet && (xg > 0.1 || R.chance(0.5))) {
      const tpl = T_[type] || T_.dribble;
      this.ev({ type: 'chance', t, pid: s, text: fill(ap || !tpl.some((x) => x.includes('{a}')) ? tpl : T_.dribble, names) });
    }
    if (R.chance(pGoal)) {
      if (type !== 'pen' && R.chance(0.05)) {
        const why = R.pick(['hors-jeu', 'hors-jeu', 'faute préalable', 'main']);
        if (R.chance(0.25)) {
          ph.k = 'vargoal';
          this.stats.on[t]++;
          this.ev({ type: 'var', t, pid: s, text: `${pshort(sp)} pense avoir marqué… vérification VAR en cours.` });
          this.ev({ type: 'vardis', t, pid: s, text: `But refusé par la VAR (${why}) !` });
          return;
        }
        this.ev({ type: 'var', t, pid: s, text: `${pshort(sp)} marque… vérification VAR en cours.` });
        this.goal(t, s, a, type, ph);
        this.ev({ type: 'varok', t, text: 'La VAR valide le but !' });
        return;
      }
      this.goal(t, s, a, type, ph);
      return;
    }
    const pBlock = type === 'long' ? 0.3 : type === 'cross' || type === 'header_sp' ? 0.1 : 0.18;
    if (R.chance(pBlock)) {
      ph.k = 'block';
      this.addR(D, this.pickBy(D, (pos) => DW[pos]), 0.08);
      if (!this.quiet) this.ev({ type: 'block', t, pid: s, text: fill(T_.block, names) });
      if (R.chance(0.4)) this.corner(t, true);
      return;
    }
    const pOn = clamp(0.42 + 0.025 * (sk - 12), 0.22, 0.65);
    if (R.chance(pOn)) {
      this.stats.on[t]++; ph.k = 'save';
      this.addR(D, gkId, xg > 0.22 ? 0.32 : 0.16);
      this.addR(T, s, 0.06);
      if (a) this.addR(T, a, 0.08);
      if (!this.quiet) this.ev({ type: 'save', t, pid: s, pid2: gkId, text: fill(xg > 0.22 ? T_.bigsave : T_.save, names) });
      if (R.chance(0.25)) this.corner(t, true);
      else if (R.chance(0.07)) this.chance(t, 'scramble', false);
    } else if (R.chance(0.06)) {
      ph.k = 'post';
      this.addR(T, s, 0.05);
      if (!this.quiet) this.ev({ type: 'post', t, pid: s, text: fill(T_.post, names) });
    } else {
      ph.k = 'miss';
      this.addR(T, s, xg > 0.2 ? -0.2 : -0.06);
      if (!this.quiet) this.ev({ type: 'miss', t, pid: s, text: fill(T_.miss, names) });
    }
  }

  goal(t, s, a, type, ph) {
    const T = this.sides[t], D = this.sides[1 - t];
    T.goals++;
    if (ph) ph.k = 'goal';
    this.stats.on[t]++;
    this.addR(T, s, type === 'long' || type === 'fk' ? 1.2 : 1.0);
    if (a) this.addR(T, a, 0.6);
    const gk = this.keeper(D);
    this.addR(D, gk, -0.3);
    for (const sl of D.slots) if (sl.pid && POS_GROUP[sl.pos] === 'DEF') this.addR(D, sl.pid, -0.12);
    const sp = this.P(s), gkp = gk ? this.P(gk) : null;
    const names = { s: pshort(sp), gk: gkp ? pshort(gkp) : 'le gardien', team: T.club.name };
    const tpl = type === 'pen' ? T_.goalPen : type === 'header_sp' || (type === 'cross' && R.chance(0.7)) ? T_.goalHead : type === 'long' || type === 'fk' ? T_.goalLong : T_.goal;
    this.goals.push({ min: this.clock(), m: this.minute, t, s, a, type });
    this.ev({ type: 'goal', t, pid: s, pid2: a, text: fill(tpl, names) + (a ? ` (passe de ${pshort(this.P(a))})` : ''), score: [this.sides[0].goals, this.sides[1].goals] });
  }

  penalty(t) {
    const T = this.sides[t], D = this.sides[1 - t];
    const taker = this.penTaker(T);
    if (!taker) return;
    const ph = { t, z: 3, k: 'shot', type: 'pen', ids: [taker] };
    this.cur.phases.push(ph);
    this.stats.pn++;
    const fouler = this.pickBy(D, (pos) => DW[pos]);
    this.stats.fo[1 - t]++;
    this.ev({ type: 'pen', t, pid: taker, text: fill(T_.pen, { team: T.club.name, s: pshort(this.P(taker)) }) });
    if (fouler && R.chance(0.35)) this.card(1 - t, fouler, R.chance(0.08));
    const tp = this.P(taker), gk = this.keeper(D), gkp = gk ? this.P(gk) : null;
    const sk = (tp.attr[A.fin] + tp.attr[A.sgf] + tp.attr[A.cpa]) / 3;
    const gs = gkp ? gkp.attr[A.arr] : 5;
    this.stats.sh[t]++; this.stats.xg[t] += 0.76;
    if (R.chance(clamp(0.76 + 0.012 * (sk - 13) - 0.012 * (gs - 13), 0.55, 0.92))) this.goal(t, taker, null, 'pen', ph);
    else {
      ph.k = 'save';
      const saved = R.chance(0.6);
      if (saved) { this.stats.on[t]++; this.addR(D, gk, 0.8); }
      this.addR(T, taker, -0.6);
      this.ev({ type: 'penmiss', t, pid: taker, text: fill(T_.penMiss, { s: pshort(tp), gk: gkp ? pshort(gkp) : 'le gardien' }) });
    }
  }

  penTaker(side) {
    const tk = side.club.penTaker;
    if (tk && side.slots.some((s) => s.pid === tk)) return tk;
    let best = null, bs = -1;
    for (const sl of side.slots) {
      if (!sl.pid || sl.pos === 'GB') continue;
      const a = this.P(sl.pid).attr;
      const v = a[A.fin] + a[A.sgf] + a[A.cpa];
      if (v > bs) { bs = v; best = sl.pid; }
    }
    return best;
  }

  corner(t, fromShot) {
    this.stats.cor[t]++;
    if (this.cur) this.cur.phases.push({ t, z: 3, k: 'corner', ids: [] });
    if (R.chance(0.3)) this.chance(t, 'header_sp', false);
    else if (!this.quiet && R.chance(0.3)) this.ev({ type: 'corner', t, text: fill(T_.corner, { team: this.sides[t].club.name }) });
  }

  foul(dt, vt, dangerous) {
    this.stats.fo[dt]++;
    const D = this.sides[dt];
    const c = [];
    for (const sl of D.slots) if (sl.pid && sl.pos !== 'GB') c.push([sl.pid, (DW[sl.pos] + 0.6) * (0.6 + this.P(sl.pid).attr[A.pui] / 25)]);
    if (!c.length) return;
    const pid = R.weighted(c, (x) => x[1])[0];
    if (this.cur) this.cur.phases.push({ t: vt, z: dangerous ? 2 : 1, k: 'foul', ids: [pid] });
    const careful = D.yel[pid] ? 0.3 : 1;
    if (R.chance(0.0025)) this.card(dt, pid, true);
    else if (R.chance((0.165 + (dangerous ? 0.05 : 0)) * careful)) this.card(dt, pid, false);
    if (dangerous) {
      if (R.chance(0.22)) this.chance(vt, 'fk', false);
      else if (R.chance(0.3)) this.chance(vt, 'header_sp', false);
    }
  }

  card(dt, pid, red) {
    const D = this.sides[dt];
    if (!D.slots.some((s) => s.pid === pid)) return;
    const p = this.P(pid);
    if (!red) {
      D.yel[pid] = (D.yel[pid] || 0) + 1;
      if (D.yel[pid] >= 2) {
        this.stats.yc[dt]++;
        this.sendOff(dt, pid, true);
        return;
      }
      this.stats.yc[dt]++;
      this.addR(D, pid, -0.3);
      this.ev({ type: 'yellow', t: dt, pid, text: fill(T_.yellow, { p: pshort(p) }) });
    } else this.sendOff(dt, pid, false);
  }

  sendOff(dt, pid, second) {
    const D = this.sides[dt];
    const p = this.P(pid);
    this.stats.rc[dt]++;
    D.reds.add(pid);
    this.addR(D, pid, -1.5);
    D.outMin[pid] = this.minute;
    const sl = D.slots.find((s) => s.pid === pid);
    const wasGK = sl && sl.pos === 'GB';
    if (sl) sl.pid = null;
    this.ev({ type: 'red', t: dt, pid, text: fill(second ? T_.secondY : T_.red, { p: pshort(p), team: D.club.name }) });
    if (wasGK) {
      const gk = D.bench.find((id) => this.P(id).pos === 'GB');
      const victim = D.slots.filter((s) => s.pid && s.pos !== 'GB' && POS_GROUP[s.pos] === 'ATT')[0] || D.slots.find((s) => s.pid && s.pos !== 'GB');
      if (gk && D.subs < D.maxSubs && victim) {
        const out = victim.pid;
        victim.pid = null;
        sl.pid = out;
        this.substitute(dt, out, gk);
      } else if (victim) {
        sl.pid = victim.pid;
        D.posOf[victim.pid] = 'GB';
        victim.pid = null;
      }
    }
    this.recalc(dt);
  }

  substitute(t, outId, inId) {
    const T = this.sides[t];
    const sl = T.slots.find((s) => s.pid === outId);
    if (!sl || !T.bench.includes(inId) || T.subs >= T.maxSubs) return false;
    sl.pid = inId;
    T.bench = T.bench.filter((x) => x !== inId);
    T.subs++;
    T.outMin[outId] = this.minute;
    T.inMin[inId] = this.minute;
    T.posOf[inId] = sl.pos;
    T.rat[inId] = 6.45 + R.normal(0, 0.1);
    if (T.cond[inId] == null) T.cond[inId] = this.P(inId).cond;
    this.recalc(t);
    this.ev({ type: 'sub', t, pid: inId, pid2: outId, text: fill(T_.sub, { team: T.club.name, in: pshort(this.P(inId)), out: pshort(this.P(outId)) }) });
    return true;
  }

  // Changement de poste entre deux joueurs sur le terrain (ou permutation)
  swapSlots(t, i, j) {
    const T = this.sides[t];
    const a = T.slots[i], b = T.slots[j];
    if (!a || !b) return;
    [a.pid, b.pid] = [b.pid, a.pid];
    if (a.pid) T.posOf[a.pid] = a.pos;
    if (b.pid) T.posOf[b.pid] = b.pos;
    this.recalc(t);
  }

  setTactics(t, tac) {
    const T = this.sides[t];
    const changedFormation = tac.formation && tac.formation !== T.tactics.formation;
    Object.assign(T.tactics, tac);
    if (changedFormation) {
      const pids = T.slots.map((s) => s.pid);
      const F = FORMATIONS[T.tactics.formation];
      T.slots = F.map((s, i) => ({ pos: s.pos, x: s.x, y: s.y, pid: pids[i] || null }));
      // Le gardien reste dans les buts
      const gkIdx = T.slots.findIndex((s) => s.pid && this.P(s.pid).pos === 'GB');
      if (gkIdx > 0) [T.slots[0].pid, T.slots[gkIdx].pid] = [T.slots[gkIdx].pid, T.slots[0].pid];
      for (const s of T.slots) if (s.pid) T.posOf[s.pid] = s.pos;
    }
    this.recalc(t);
  }

  bestBenchFor(T, pos, attacking) {
    let best = null, bs = -1;
    for (const id of T.bench) {
      const p = this.P(id);
      if (p.pos === 'GB' && pos !== 'GB') continue;
      const fit = posFit(p, attacking ? 'BU' : pos);
      const v = p.ovr * Math.max(fit, attacking && POS_GROUP[p.pos] === 'ATT' ? 1 : 0) * condFactor(T.cond[id] ?? p.cond);
      if (v > bs) { bs = v; best = id; }
    }
    return best;
  }

  aiManage(t) {
    const T = this.sides[t];
    if (!T.auto || this.period === 1) return;
    const m = this.minute;
    const gd = T.goals - this.sides[1 - t].goals;
    if (m >= 65 && gd < 0 && T.tactics.ment < 4 && !T.pushed) { T.tactics.ment++; T.pushed = true; this.recalc(t); }
    if (m >= 78 && gd > 0 && T.tactics.ment > 1 && !T.parked) { T.tactics.ment--; T.parked = true; this.recalc(t); }
    if (T.subs >= T.maxSubs || !T.bench.length || m < 55) return;
    let cand = null, worst = 999;
    for (const sl of T.slots) {
      if (!sl.pid || sl.pos === 'GB') continue;
      const c = T.cond[sl.pid] ?? 90;
      const v = c + (T.rat[sl.pid] - 6.5) * 6;
      if (v < worst) { worst = v; cand = sl; }
    }
    if (!cand) return;
    const tired = (T.cond[cand.pid] ?? 90) < 62;
    const go = (tired && R.chance(0.35)) || (m >= 62 && m <= 86 && R.chance(m >= 70 ? 0.07 : 0.03));
    if (!go) return;
    const attacking = gd < 0 && m >= 70 && POS_GROUP[cand.pos] !== 'ATT' && R.chance(0.5);
    const inId = this.bestBenchFor(T, cand.pos, attacking);
    if (inId) this.substitute(t, cand.pid, inId);
  }

  fatigue() {
    for (const T of this.sides) {
      const press = [0.9, 1, 1.18][T.tactics.press] * (T.tactics.ment >= 3 ? 1.05 : 1);
      for (const sl of T.slots) {
        if (!sl.pid) continue;
        const p = this.P(sl.pid);
        const drain = sl.pos === 'GB' ? 0.04 : (0.13 + (20 - p.attr[A.end]) * 0.012) * press;
        T.cond[sl.pid] = Math.max(15, (T.cond[sl.pid] ?? 90) - drain);
      }
    }
  }

  injuryCheck() {
    for (let t = 0; t < 2; t++) {
      const T = this.sides[t];
      const press = this.sides[1 - t].tactics.press === 2 ? 1.2 : 1;
      for (const sl of T.slots) {
        if (!sl.pid) continue;
        const c = T.cond[sl.pid] ?? 90;
        if (!R.chance(0.00008 * (c < 65 ? 2.2 : 1) * press)) continue;
        const pid = sl.pid;
        this.injuries[pid] = true;
        this.ev({ type: 'injury', t, pid, text: fill(T_.injury, { p: pshort(this.P(pid)) }) });
        const inId = T.subs < T.maxSubs ? this.bestBenchFor(T, sl.pos, false) : null;
        if (inId) this.substitute(t, pid, inId);
        else { T.outMin[pid] = this.minute; sl.pid = null; this.recalc(t); }
      }
    }
  }

  shootout() {
    const order = (side) => {
      const ids = side.slots.filter((s) => s.pid).map((s) => s.pid);
      return ids.sort((x, y) => {
        const a = this.P(x).attr, b = this.P(y).attr;
        return (b[A.fin] + b[A.sgf] + b[A.cpa]) - (a[A.fin] + a[A.sgf] + a[A.cpa]);
      });
    };
    const ord = [order(this.sides[0]), order(this.sides[1])];
    const s = [0, 0], k = [0, 0];
    this.ev({ type: 'info', t: -1, text: 'Séance de tirs au but !' });
    let finished = false;
    for (let r = 0; r < 40 && !finished; r++) {
      for (const t of [0, 1]) {
        const T = this.sides[t], D = this.sides[1 - t];
        const tk = ord[t][r % ord[t].length];
        if (!tk) continue;
        const a = this.P(tk).attr;
        const gk = this.keeper(D), gs = gk ? this.P(gk).attr[A.arr] : 5;
        const ok = R.chance(clamp(0.74 + 0.012 * ((a[A.fin] + a[A.sgf] + a[A.cpa]) / 3 - 13) - 0.012 * (gs - 13), 0.5, 0.9));
        k[t]++;
        if (ok) s[t]++;
        this.ev({ type: 'pk', t, pid: tk, ok, text: `${T.club.short} : ${pshort(this.P(tk))} ${ok ? 'marque' : 'manque'} (${s[0]}-${s[1]})` });
        if (r < 5) {
          if (s[0] + (5 - k[0]) < s[1] || s[1] + (5 - k[1]) < s[0]) { finished = true; break; }
        }
      }
      if (!finished && r >= 4 && k[0] === k[1] && s[0] !== s[1]) finished = true;
    }
    this.pens = s;
  }

  finish() {
    if (this.done) return;
    this.done = true;
    const g = [this.sides[0].goals, this.sides[1].goals];
    let winner = g[0] > g[1] ? 0 : g[1] > g[0] ? 1 : -1;
    if (winner < 0 && this.pens) winner = this.pens[0] > this.pens[1] ? 0 : 1;
    this.winner = winner;
    const endMin = this.period >= 3 ? 120 : 90;
    this.endMin = endMin;
    for (let t = 0; t < 2; t++) {
      const T = this.sides[t];
      const conceded = g[1 - t];
      for (const pid of Object.keys(T.rat)) {
        let r = T.rat[pid];
        const mins = (T.outMin[pid] ?? endMin) - (T.inMin[pid] ?? 0);
        const pos = T.posOf[pid];
        if (winner === t) r += 0.3; else if (winner === 1 - t) r -= 0.2;
        if (conceded === 0 && mins >= 60 && (pos === 'GB' || POS_GROUP[pos] === 'DEF')) r += pos === 'GB' ? 0.45 : 0.4;
        r += R.normal(0, 0.22);
        if (mins < 20) r = 6.45 + (r - 6.45) * 0.6;
        T.rat[pid] = clamp(round1(r), 3, 10);
      }
    }
    let motm = null, best = -1;
    for (let t = 0; t < 2; t++) {
      for (const [pid, r] of Object.entries(this.sides[t].rat)) {
        const v = r + (winner === t ? 0.05 : 0);
        if (v > best) { best = v; motm = pid; }
      }
    }
    this.motm = motm;
    const ptxt = this.pens ? ` (${this.pens[0]}-${this.pens[1]} t.a.b.)` : '';
    this.ev({ type: 'ft', t: -1, text: `Fin du match : ${this.sides[0].club.name} ${g[0]} - ${g[1]} ${this.sides[1].club.name}${ptxt}` });
  }
}

export function minutesPlayed(side, pid, endMin) {
  if (side.inMin[pid] == null) return 0;
  return Math.max(0, (side.outMin[pid] ?? endMin) - side.inMin[pid]);
}
