// Animation 2D du match en direct : les joueurs bougent, le ballon circule (passes, conduites,
// centres, tirs, arrêts du gardien), coups de pied arrêtés, célébrations et VAR.
// Les tirages au sort de l'animation utilisent Math.random : ils ne touchent jamais au résultat du match.
import { POS_GROUP } from '../core/constants.js';

const PW = 105, PH = 68;
const VX0 = -4.5, VY0 = -3, VW = 114, VH = 74;
const GOAL_Y0 = 30.34, GOAL_Y1 = 37.66;
const rnd = (a, b) => a + Math.random() * (b - a);
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, f) => a + (b - a) * f;
const easeIO = (f) => (f < 0.5 ? 2 * f * f : 1 - (-2 * f + 2) ** 2 / 2);
const fwd = (t) => (t === 0 ? 1 : -1);
// x à la fraction f du terrain dans le sens d'attaque de l'équipe t (0 = son but, 1 = but adverse)
const ax = (t, f) => (t === 0 ? f * PW : PW - f * PW);
const goalLine = (t) => (t === 0 ? PW : 0);
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

function inkOn(hex) {
  const n = parseInt(String(hex).slice(1), 16);
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  return r * 0.299 + g * 0.587 + b * 0.114 > 150 ? '#0b130e' : '#ffffff';
}

export const anim = {
  // opts : { colors: [c0, c1], trims: [s0, s1], player(pid), onEvent(e), names: bool }
  init(sim, opts) {
    this.sim = sim;
    this.o = opts;
    this.pos = {};
    this.over = {};
    this.dive = {};
    this.ball = { x: 52.5, y: 34, h: 0 };
    this.carrier = null;
    this.owner = 0;
    this.flight = null;
    this.steps = [];
    this.banners = [];
    this.net = null;
    this.celeb = null;
    this.flag = null;
    this.ref = { x: 52.5, y: 40 };
    this.last = performance.now();
    this.speed = 1;
    this.running = true;
    this.kickoff(0, true);
    cancelAnimationFrame(this.raf);
    const loop = (ts) => { if (!this.running) return; this.frame(ts); this.raf = requestAnimationFrame(loop); };
    this.raf = requestAnimationFrame(loop);
  },
  stop() { this.running = false; cancelAnimationFrame(this.raf); },

  // ---------- Joueurs ----------
  slots(t) { return this.sim.sides[t].slots.filter((s) => s.pid); },
  slotOf(pid) {
    for (let t = 0; t < 2; t++) for (const s of this.sim.sides[t].slots) if (s.pid === pid) return [t, s];
    return [null, null];
  },
  teamOf(pid) { return this.slotOf(pid)[0]; },
  gk(t) { const s = this.sim.sides[t].slots.find((x) => x.pos === 'GB' && x.pid); return s ? s.pid : null; },
  outfield(t, groups) {
    return this.slots(t).filter((s) => s.pos !== 'GB' && (!groups || groups.includes(POS_GROUP[s.pos]))).map((s) => s.pid);
  },
  // Position « naturelle » d'un joueur selon le bloc de son équipe et la position du ballon
  home(t, sl) {
    let X = 4 + sl.y * 0.58, Y = 2 + sl.x * 0.64;
    const bx = this.ball.x, by = this.ball.y;
    const bxT = t === 0 ? bx : PW - bx;
    const poss = this.owner === t;
    let shift = clamp((bxT - 38) * 0.62 + (poss ? 7 : -3), -8, 44);
    if (sl.pos === 'GB') { X = 3.5; shift = clamp(shift * 0.18, 0, 12); }
    X += shift;
    const byT = t === 0 ? by : PH - by;
    Y += (byT - 34) * (poss ? 0.18 : 0.3);
    if (poss && (sl.pos === 'DD' || sl.pos === 'DG' || sl.pos === 'AD' || sl.pos === 'AG')) Y += (Y - 34) * 0.15;
    // petits déplacements individuels pour que le bloc vive
    const k = (sl.pid ? sl.pid.charCodeAt(sl.pid.length - 1) : 1) * 1.7;
    X += Math.sin(this.now / 1300 + k) * 1.1;
    Y += Math.cos(this.now / 1700 + k) * 1.1;
    if (t === 1) { X = PW - X; Y = PH - Y; }
    return { x: clamp(X, 0.8, PW - 0.8), y: clamp(Y, 0.8, PH - 0.8) };
  },
  target(pid) {
    const o = this.over[pid];
    if (o) return o;
    const [t, sl] = this.slotOf(pid);
    return sl ? this.home(t, sl) : { x: 52.5, y: 34 };
  },
  at(pid) { return this.pos[pid] || this.target(pid); },
  nearest(t, p, except) {
    let best = null, bd = 1e9;
    for (const s of this.slots(t)) {
      if (s.pid === except || (s.pos === 'GB' && this.slots(t).length > 1)) continue;
      const d = dist(this.at(s.pid), p);
      if (d < bd) { bd = d; best = s.pid; }
    }
    return best;
  },
  send(pid, x, y) { if (pid) this.over[pid] = { x: clamp(x, 0.5, PW - 0.5), y: clamp(y, 0.5, PH - 0.5) }; },
  free(pid) { delete this.over[pid]; },
  freeAll() { this.over = {}; },
  teleport(pid, x, y) { if (pid) { this.pos[pid] = { x, y }; this.send(pid, x, y); } },

  // ---------- Ballon ----------
  kick(to, { h = 0, ms = 500, onEnd = null, curve = 0 } = {}) {
    this.flight = { fx: this.ball.x, fy: this.ball.y, tx: to.x, ty: to.y, h, t0: this.now, t1: this.now + Math.max(80, ms), onEnd, curve };
    this.carrier = null;
  },
  give(pid) {
    this.carrier = pid;
    const t = this.teamOf(pid);
    if (t != null) this.owner = t;
  },

  // ---------- Mises en place ----------
  kickoff(t, instant) {
    this.freeAll();
    this.celeb = null;
    for (let s = 0; s < 2; s++) {
      for (const sl of this.slots(s)) {
        let X = 3 + sl.y * 0.56, Y = 2 + sl.x * 0.64;
        if (sl.pos === 'GB') X = 3.5;
        X = Math.min(X, 49);
        if (s === 1) { X = PW - X; Y = PH - Y; }
        if (instant) this.pos[sl.pid] = { x: X, y: Y };
        this.send(sl.pid, X, Y);
      }
    }
    const st = this.outfield(t, ['ATT']).concat(this.outfield(t, ['MIL']));
    const a = st[0], b = st[1] || st[0];
    this.ball = { x: 52.5, y: 34, h: 0 };
    this.flight = null;
    if (a) { this.teleportSoft(a, 52.5 - fwd(t) * 0.6, 34); this.give(a); }
    if (b && b !== a) this.teleportSoft(b, 52.5 - fwd(t) * 0.5, 37.5);
    this.owner = t;
  },
  teleportSoft(pid, x, y) { this.send(pid, x, y); if (!this.pos[pid]) this.pos[pid] = { x, y }; },
  setupCorner(t, side) {
    const gl = goalLine(t);
    const cy = side ? PH - 0.6 : 0.6;
    const atkP = this.outfield(t).sort(() => Math.random() - 0.5);
    const defP = this.outfield(1 - t);
    const taker = atkP.find((p) => ['AD', 'AG', 'MD', 'MG', 'MOC', 'MC'].includes(this.slotOf(p)[1].pos)) || atkP[0];
    this.freeAll();
    for (const p of atkP) {
      if (p === taker) continue;
      const inBox = atkP.indexOf(p) < 6;
      this.send(p, gl - fwd(t) * (inBox ? rnd(6, 13) : rnd(25, 38)), inBox ? rnd(25, 43) : rnd(14, 54));
    }
    for (const p of defP) this.send(p, gl - fwd(t) * rnd(2.5, 14), rnd(26, 42));
    const g = this.gk(1 - t);
    if (g) this.send(g, gl - fwd(t) * 1.2, 34 + (side ? 1.5 : -1.5));
    this.ball = { x: gl - fwd(t) * 0.6, y: cy, h: 0 };
    this.flight = null;
    this.teleportSoft(taker, gl - fwd(t) * 0.9, cy + (side ? 0.8 : -0.8));
    this.give(taker);
    return taker;
  },
  setupFK(t, x, y, taker) {
    const gl = goalLine(t);
    this.freeAll();
    const defP = this.outfield(1 - t);
    const wall = defP.slice(0, 4);
    const ang = Math.atan2(34 - y, gl - x);
    wall.forEach((p, i) => this.send(p, x + Math.cos(ang) * 9.15 - Math.sin(ang) * (i - 1.5) * 0.9, y + Math.sin(ang) * 9.15 + Math.cos(ang) * (i - 1.5) * 0.9));
    for (const p of defP.slice(4)) this.send(p, gl - fwd(t) * rnd(4, 15), rnd(24, 44));
    for (const p of this.outfield(t)) if (p !== taker) this.send(p, gl - fwd(t) * rnd(8, 16), rnd(22, 46));
    this.ball = { x, y, h: 0 };
    this.flight = null;
    this.teleportSoft(taker, x - fwd(t) * 1.2, y);
    this.give(taker);
  },
  setupPen(t, taker) {
    const gl = goalLine(t);
    this.freeAll();
    for (const p of [...this.outfield(t), ...this.outfield(1 - t)]) if (p !== taker) this.send(p, gl - fwd(t) * rnd(18, 24), rnd(14, 54));
    const g = this.gk(1 - t);
    if (g) this.send(g, gl - fwd(t) * 0.4, 34);
    this.ball = { x: gl - fwd(t) * 11, y: 34, h: 0 };
    this.flight = null;
    this.teleportSoft(taker, gl - fwd(t) * 12.5, 34.5);
    this.give(taker);
  },
  goalKick(t) {
    // t = équipe qui dégage (le gardien remet en jeu)
    const g = this.gk(t);
    const gl = goalLine(1 - t);
    this.freeAll();
    this.ball = { x: gl + fwd(t) * 5.5, y: rnd(28, 40), h: 0 };
    this.flight = null;
    if (g) { this.send(g, this.ball.x - fwd(t) * 0.8, this.ball.y); this.give(g); }
    this.owner = t;
  },

  // ---------- Bandeaux et effets ----------
  banner(text, color, ms = 1500, big = false) {
    const now = this.now || performance.now();
    // un grand bandeau remplace le précédent ; deux petits au maximum
    this.banners = this.banners.filter((b) => b.until > now && (!big || !b.big));
    if (!big) { const small = this.banners.filter((b) => !b.big); if (small.length >= 2) this.banners.splice(this.banners.indexOf(small[0]), 1); }
    this.banners.push({ text, color: color || '#e8f5ec', until: now + ms, t0: now, big });
  },

  // ---------- File d'actions ----------
  add(at, fn) { this.steps.push({ at, fn }); },
  run(st) { try { st.fn(); } catch (e) { /* une action ratée ne doit pas casser l'animation */ } },
  // Termine immédiatement les actions en attente (nouvelle minute, fin du match)
  flush() {
    this.steps.sort((a, b) => a.at - b.at);
    const list = this.steps;
    this.steps = [];
    for (const st of list) {
      this.run(st);
      if (this.flight) this.land();
    }
    if (this.flight) this.land();
  },
  land() {
    const f = this.flight;
    this.flight = null;
    this.ball = { x: f.tx, y: f.ty, h: 0 };
    if (f.onEnd) f.onEnd();
  },

  // Programme l'animation d'une minute de jeu ; onEv(e) est appelé au moment où l'action se produit à l'écran.
  queue(phases, events, D, speed, onEv) {
    this.now = performance.now();
    this.flush();
    this.speed = speed || 1;
    const evAt = new Array(events.length).fill(60);
    const weight = (ph) => (ph.k === 'goal' || ph.k === 'vargoal' ? 4 : ph.k === 'save' || ph.k === 'miss' || ph.k === 'post' || ph.k === 'block' ? 3 : ph.k === 'corner' || ph.k === 'foul' ? 1.6 : ph.k === 'counter' ? 1.4 : 1);
    const ws = phases.map(weight);
    const tot = ws.reduce((a, b) => a + b, 0) || 1;
    let t = this.now + 40;
    const marks = [];
    phases.forEach((ph, i) => {
      const d = Math.max(160, (D - 80) * ws[i] / tot);
      const next = phases[i + 1];
      let mark = t + d * 0.5;
      try { mark = this.build(ph, t, d, next, phases[i - 1]); } catch (e) { mark = t + d * 0.5; }
      marks[i] = { start: t, mark, end: t + d };
      t += d;
      // après un but, la suite de la minute attend la célébration et l'engagement
      if (ph.k === 'goal' || ph.k === 'vargoal') t = Math.max(t, mark + (ph.k === 'goal' ? 2500 : 3000) / this.speed);
    });
    if (!phases.length) {
      // minute calme : le porteur fait circuler
      const tm = this.owner;
      const ps = this.outfield(tm, ['DEF', 'MIL']);
      if (ps.length) this.add(this.now + D * 0.4, () => this.passTo(pick(ps), D * 0.4));
    }
    let stag = 0;
    events.forEach((e, k) => {
      const m = e.ph != null && e.ph >= 0 ? marks[e.ph] : null;
      let at = m ? m.mark : this.now + 30;
      if (e.type === 'varok' || e.type === 'vardis') at += 1400 / this.speed;
      if (e.type === 'yellow' || e.type === 'red') at += 250 / this.speed;
      if (k > 0 && events[k - 1].ph === e.ph && e.type !== 'varok' && e.type !== 'vardis') at += (stag += 60);
      evAt[k] = Math.max(0, at - this.now);
      if (onEv) this.add(this.now + evAt[k], () => onEv(e));
    });
    return evAt;
  },

  passTo(pid, ms, h = 0) {
    if (!pid) return;
    const tp = this.target(pid);
    const d = dist(this.ball, tp);
    this.kick(tp, { h: h || (d > 30 ? 2.2 : 0.15), ms: clamp(ms, 120, 1400), onEnd: () => this.give(pid) });
  },

  // Construit une phase de jeu, renvoie l'instant clé (tir, faute…) pour caler les événements
  build(ph, t0, d, next, prev) {
    const t = ph.t, T = this.sim.sides[t];
    void T;
    const sp = 1 / this.speed;
    const k = ph.k;
    const ensureBall = (at) => {
      if (this.owner !== t || !this.carrier) {
        this.add(at, () => {
          const p = this.nearest(t, this.ball);
          if (p) { this.send(p, this.ball.x, this.ball.y); this.give(p); }
        });
      }
    };
    if (k === 'build' || k === 'lost' || k === 'final' || k === 'offside' || k === 'defended') {
      ensureBall(t0);
      const n = d > 1500 ? 3 : d > 700 ? 2 : 1;
      const seg = d / (n + 2);
      const pool = this.outfield(t, k === 'build' || k === 'lost' ? ['DEF', 'MIL'] : ['MIL', 'ATT']);
      for (let i = 0; i < n; i++) {
        const rec = i === n - 1 && ph.ids && ph.ids[1] && (k !== 'build' && k !== 'lost') ? ph.ids[1] : pick(pool.length ? pool : this.outfield(t));
        this.add(t0 + seg * i, () => {
          if (k !== 'build' && k !== 'lost' && i === n - 1 && rec) this.send(rec, ax(t, rnd(0.68, 0.82)), rnd(12, 56));
          this.passTo(rec, seg * 0.85);
        });
      }
      const endT = t0 + seg * n;
      if (k === 'lost') {
        this.add(endT, () => {
          const def = this.nearest(1 - t, this.ball);
          if (def) { this.send(def, this.ball.x, this.ball.y); this.add(this.now + 220 * sp, () => { this.give(def); }); }
        });
      } else if (k === 'offside') {
        this.add(endT, () => {
          const att = (ph.ids && ph.ids[1]) || pick(this.outfield(t, ['ATT']));
          this.send(att, ax(t, 0.86), rnd(22, 46));
          this.kick({ x: ax(t, 0.85), y: rnd(24, 44) }, { h: 0.3, ms: seg * 0.9 });
        });
        this.add(endT + seg, () => {
          this.flag = { until: this.now + 1400 * sp, x: ax(t, 0.85), side: t };
          this.banner('HORS-JEU', '#f5c542', 1300 * sp);
          const g = this.gk(1 - t) || this.nearest(1 - t, this.ball);
          if (g) { this.give(g); this.ball = { ...this.at(g), h: 0 }; }
        });
        return endT + seg;
      } else if (k === 'defended') {
        this.add(endT, () => {
          const c = this.carrier;
          if (c) this.send(c, ax(t, rnd(0.8, 0.88)), clamp(this.ball.y + rnd(-6, 6), 10, 58));
          const def = this.nearest(1 - t, this.ball);
          if (def) this.send(def, ax(t, rnd(0.82, 0.9)), clamp(this.ball.y + rnd(-3, 3), 10, 58));
        });
        this.add(endT + seg * 0.9, () => {
          const def = this.nearest(1 - t, this.ball);
          if (next && next.k === 'corner') { this.kick({ x: goalLine(t) + fwd(t) * 2, y: this.ball.y < 34 ? rnd(4, 20) : rnd(48, 64) }, { h: 1, ms: 380 * sp }); return; }
          if (def) {
            this.give(def);
            const tgt = this.nearest(1 - t, { x: ax(t, 0.35), y: rnd(10, 58) }, def);
            if (tgt) this.add(this.now + 240 * sp, () => this.passTo(tgt, 650 * sp, 4));
          }
        });
      }
      return endT;
    }
    if (k === 'counter') {
      const runner = (ph.ids && ph.ids[0]) || pick(this.outfield(t, ['ATT', 'MIL']));
      this.add(t0, () => {
        const p = this.at(runner);
        this.send(runner, p.x, p.y);
        this.kick(this.at(runner), { h: 0.4, ms: 260 * sp, onEnd: () => { this.give(runner); this.send(runner, ax(t, rnd(0.62, 0.72)), clamp(p.y + rnd(-8, 8), 8, 60)); } });
        this.banner('CONTRE-ATTAQUE', '#7dd3fc', 900 * sp);
      });
      if (!next || next.t !== t || next.k === 'build') {
        this.add(t0 + d * 0.8, () => { const def = this.nearest(1 - t, this.ball); if (def) { this.send(def, this.ball.x, this.ball.y); this.give(def); } });
      }
      return t0 + d * 0.5;
    }
    if (k === 'foul') {
      const fouler = ph.ids && ph.ids[0];
      ensureBall(t0);
      this.add(t0 + d * 0.2, () => {
        if (fouler && this.carrier) { const c = this.at(this.carrier); this.send(fouler, c.x - fwd(t) * 0.8, c.y + 0.6); }
      });
      this.add(t0 + d * 0.5, () => {
        this.banner('FAUTE', '#ffb4a8', 900 * sp);
        this.flight = null;
      });
      return t0 + d * 0.5;
    }
    if (k === 'corner') {
      const side = this.ball.y > 34 ? 1 : 0;
      this.add(t0, () => { this.setupCorner(t, side); this.banner('CORNER', '#c6f43d', 900 * sp); });
      if (!next || next.k !== 'shot' && !['goal', 'save', 'miss', 'post', 'block', 'vargoal'].includes(next.k) || next.t !== t) {
        // centre dégagé
        this.add(t0 + d * 0.75, () => {
          const gl = goalLine(t);
          this.kick({ x: gl - fwd(t) * rnd(6, 10), y: rnd(28, 40) }, { h: 3.5, ms: 520 * sp, onEnd: () => {
            const def = this.nearest(1 - t, this.ball);
            if (def) { this.give(def); this.kick({ x: ax(t, rnd(0.45, 0.6)), y: rnd(10, 58) }, { h: 4, ms: 700 * sp, onEnd: () => { const p = this.nearest(Math.random() < 0.6 ? 1 - t : t, this.ball); if (p) this.give(p); } }); }
          } });
        });
      }
      return t0 + d * 0.3;
    }
    // ---------- Tirs ----------
    const outcome = k;
    const type = ph.type || 'dribble';
    const ids = ph.ids || [];
    const shooter = ids[ids.length - 1] || pick(this.outfield(t, ['ATT']));
    const assist = ids.length > 1 ? ids[0] : null;
    const gl = goalLine(t);
    const g = this.gk(1 - t);
    let shotAt;
    let from;
    if (type === 'pen') {
      this.add(t0, () => { this.setupPen(t, shooter); this.banner('PENALTY !', '#ff5f57', 1100 * sp, true); });
      shotAt = t0 + d * 0.55;
      from = { x: gl - fwd(t) * 11, y: 34 };
    } else if (type === 'fk') {
      const fx = gl - fwd(t) * rnd(19, 27), fy = rnd(22, 46);
      this.add(t0, () => { this.setupFK(t, fx, fy, shooter); this.banner('COUP FRANC', '#c6f43d', 900 * sp); });
      shotAt = t0 + d * 0.5;
      from = { x: fx, y: fy };
    } else if (type === 'header_sp') {
      // corner ou coup franc latéral déjà installé : centre puis tête
      const hx = gl - fwd(t) * rnd(6, 10), hy = rnd(29, 39);
      const fromCorner = prev && prev.k === 'corner';
      this.add(t0, () => {
        if (!fromCorner) this.setupFK(t, gl - fwd(t) * rnd(22, 32), Math.random() < 0.5 ? rnd(6, 14) : rnd(54, 62), assist || pick(this.outfield(t, ['MIL'])) || shooter);
        this.send(shooter, hx + fwd(t) * 2, hy + rnd(-2, 2));
      });
      this.add(t0 + d * 0.25, () => {
        this.send(shooter, hx, hy);
        this.kick({ x: hx, y: hy }, { h: 4.2, ms: d * 0.32, onEnd: () => this.give(shooter) });
      });
      shotAt = t0 + d * 0.6;
      from = { x: hx, y: hy };
    } else {
      // Action amenée par une passe
      ensureBall(t0);
      let rx, ry;
      if (type === 'cross') { rx = gl - fwd(t) * rnd(6, 11); ry = rnd(28, 40); }
      else if (type === 'cutback') { rx = gl - fwd(t) * rnd(10, 14); ry = rnd(29, 39); }
      else if (type === 'through') { rx = gl - fwd(t) * rnd(12, 17); ry = rnd(24, 44); }
      else if (type === 'long') { rx = gl - fwd(t) * rnd(22, 28); ry = rnd(20, 48); }
      else if (type === 'scramble') { rx = gl - fwd(t) * rnd(5, 9); ry = rnd(29, 39); }
      else { rx = gl - fwd(t) * rnd(14, 19); ry = rnd(22, 46); }
      const wideY = Math.random() < 0.5 ? rnd(4, 10) : rnd(58, 64);
      if (assist && (type === 'cross' || type === 'cutback')) {
        // le passeur file sur l'aile
        this.add(t0, () => { this.send(assist, ax(t, 0.7), wideY); this.passTo(assist, d * 0.2); });
        this.add(t0 + d * 0.22, () => {
          this.send(assist, gl - fwd(t) * (type === 'cutback' ? 3 : rnd(8, 14)), wideY < 34 ? rnd(3, 9) : rnd(59, 65));
          this.send(shooter, rx + fwd(t) * 3, ry + rnd(-3, 3));
        });
        this.add(t0 + d * 0.42, () => {
          this.send(shooter, rx, ry);
          this.kick({ x: rx, y: ry }, { h: type === 'cross' ? 4.5 : 0.1, ms: d * 0.18, onEnd: () => this.give(shooter) });
        });
        shotAt = t0 + d * 0.66;
      } else if (assist) {
        this.add(t0, () => { this.passTo(assist, d * 0.16); });
        this.add(t0 + d * 0.2, () => { this.send(shooter, rx, ry); });
        this.add(t0 + d * 0.32, () => {
          const tx = type === 'through' ? rx + fwd(t) * 2 : rx;
          this.kick({ x: tx, y: ry }, { h: type === 'through' ? 0.2 : 0.3, ms: d * 0.18, onEnd: () => this.give(shooter) });
        });
        shotAt = t0 + d * 0.62;
      } else {
        // percée individuelle
        this.add(t0, () => {
          const s0 = this.at(shooter);
          this.passTo(shooter, d * 0.16);
          this.send(shooter, s0.x, s0.y);
        });
        this.add(t0 + d * 0.2, () => {
          this.give(shooter);
          this.send(shooter, rx, ry);
          const def = this.nearest(1 - t, this.ball);
          if (def) this.send(def, lerp(this.ball.x, rx, 0.5), lerp(this.ball.y, ry, 0.5) + rnd(-2, 2));
        });
        shotAt = t0 + d * 0.6;
      }
      from = { x: rx, y: ry };
    }
    // Le tir
    const flyMs = clamp(dist(from, { x: gl, y: 34 }) * 22, 220, 750) * sp;
    const res = outcome;
    this.add(shotAt, () => {
      const b = this.ball;
      const sx = b.x, sy = b.y;
      let tx = gl, ty, h = type === 'long' || type === 'fk' ? 1.6 : type === 'header_sp' || type === 'cross' ? 1.2 : 0.8;
      if (res === 'goal' || res === 'vargoal') ty = Math.random() < 0.5 ? rnd(GOAL_Y0 + 0.4, 32.6) : rnd(35.4, GOAL_Y1 - 0.4);
      else if (res === 'save') ty = rnd(31.5, 36.5);
      else if (res === 'post') ty = Math.random() < 0.5 ? GOAL_Y0 : GOAL_Y1;
      else if (res === 'miss') { ty = Math.random() < 0.5 ? rnd(22, 29.6) : rnd(38.4, 46); if (Math.random() < 0.35) { ty = rnd(31, 37); h = 5.5; } }
      else ty = sy + (34 - sy) * 0.3;
      if (res === 'block') {
        const def = this.nearest(1 - t, b);
        const bx = lerp(sx, gl, 0.25), by = lerp(sy, 34, 0.25);
        if (def) this.send(def, bx, by);
        this.kick({ x: bx, y: by }, { h: 0.3, ms: flyMs * 0.4, onEnd: () => {
          if (next && next.k === 'corner') this.kick({ x: gl + fwd(t) * 1.5, y: by < 34 ? rnd(8, 22) : rnd(46, 60) }, { h: 1.2, ms: 400 * sp });
          else if (def) this.give(def);
        } });
        return;
      }
      // Le gardien plonge
      if (g) {
        const gp = this.at(g);
        const reach = res === 'save' ? ty : res === 'goal' ? (Math.random() < 0.6 ? lerp(gp.y, ty, 0.55) : 34 + (34 - ty) * 0.5) : gp.y;
        this.send(g, gl - fwd(t) * 0.9, clamp(reach, GOAL_Y0 - 1, GOAL_Y1 + 1));
        if (res === 'save' || res === 'goal') this.dive[g] = { until: this.now + 700 * sp, dir: Math.sign(reach - gp.y) || 1 };
      }
      const endX = res === 'goal' || res === 'vargoal' ? gl + fwd(t) * 1.4 : res === 'miss' ? gl + fwd(t) * 3 : res === 'save' ? gl - fwd(t) * 0.9 : gl;
      this.kick({ x: endX, y: ty }, { h, ms: flyMs, curve: type === 'fk' ? fwd(t) * (Math.random() < 0.5 ? 3 : -3) : 0, onEnd: () => {
        if (res === 'goal' || res === 'vargoal') {
          this.net = { t, y: ty, until: this.now + 900 };
          this.banner('BUT !', this.o.colors[t], (res === 'goal' ? 1700 : 1100) * sp, true);
          this.celebrate(t, shooter, (res === 'goal' ? 2200 : 1200) * sp);
        } else if (res === 'save') {
          this.banner(type === 'pen' ? 'PENALTY ARRÊTÉ !' : 'ARRÊT', '#9ee6ff', 1000 * sp);
          if (next && next.k === 'corner') this.kick({ x: gl + fwd(t) * 1.5, y: ty < 34 ? rnd(12, 24) : rnd(44, 56) }, { h: 1.5, ms: 380 * sp });
          else if (g) this.give(g);
        } else if (res === 'post') {
          this.banner('POTEAU !', '#ffd166', 1000 * sp);
          this.kick({ x: gl - fwd(t) * rnd(6, 12), y: ty + (ty < 34 ? rnd(2, 8) : -rnd(2, 8)) }, { h: 0.6, ms: 380 * sp, onEnd: () => { const p = this.nearest(Math.random() < 0.6 ? 1 - t : t, this.ball); if (p) this.give(p); } });
        } else {
          this.add(this.now + 500 * sp, () => this.goalKick(1 - t));
        }
      } });
    });
    if (outcome === 'goal') {
      this.add(shotAt + flyMs + 2300 * sp, () => this.kickoff(1 - t));
    } else if (outcome === 'vargoal') {
      this.add(shotAt + flyMs + 2900 * sp, () => { this.celeb = null; this.goalKick(1 - t); });
    }
    return shotAt + flyMs;
  },

  celebrate(t, scorer, ms) {
    const gl = goalLine(t);
    const corner = { x: gl - fwd(t) * 3, y: this.ball.y < 34 ? 4 : 64 };
    this.celeb = { t, until: this.now + ms, scorer };
    this.send(scorer, corner.x, corner.y);
    const mates = this.outfield(t).filter((p) => p !== scorer).sort((a, b) => dist(this.at(a), corner) - dist(this.at(b), corner)).slice(0, 5);
    mates.forEach((p, i) => this.send(p, corner.x - fwd(t) * (1.5 + i * 0.7), corner.y + (corner.y < 34 ? 1 : -1) * (1 + (i % 3) * 1.2)));
    for (const p of this.outfield(1 - t)) { const q = this.at(p); this.send(p, lerp(q.x, 52.5, 0.35), q.y); }
  },

  // ---------- Dessin ----------
  frame(ts) {
    const cv = document.getElementById('lv-canvas');
    if (!cv) { this.stop(); return; }
    const dt = Math.min(0.1, Math.max(0, (ts - this.last) / 1000));
    this.last = ts;
    this.now = ts;
    // actions dues
    if (this.steps.length) {
      this.steps.sort((a, b) => a.at - b.at);
      while (this.steps.length && this.steps[0].at <= ts) this.run(this.steps.shift());
    }
    // ballon en vol
    if (this.flight) {
      const f = this.flight;
      const p = clamp((ts - f.t0) / (f.t1 - f.t0), 0, 1);
      const e = f.h > 1 ? p : easeIO(p) * 0.35 + p * 0.65;
      const cx = f.curve ? Math.sin(p * Math.PI) * f.curve : 0;
      this.ball = { x: lerp(f.fx, f.tx, e), y: lerp(f.fy, f.ty, e) + cx, h: f.h * 4 * p * (1 - p) };
      if (p >= 1) this.land();
    } else if (this.carrier) {
      const c = this.at(this.carrier);
      const t = this.teamOf(this.carrier);
      if (t != null) this.ball = { x: c.x + fwd(t) * 0.75, y: c.y + 0.35, h: 0 };
    }
    // joueurs
    const speedK = this.speed >= 4 ? 7 : this.speed >= 2 ? 5 : 3.6;
    for (let t = 0; t < 2; t++) {
      for (const sl of this.slots(t)) {
        const tg = this.target(sl.pid);
        const cur = this.pos[sl.pid] || (this.pos[sl.pid] = { x: tg.x, y: tg.y });
        const kk = 1 - Math.exp(-dt * (this.carrier === sl.pid ? speedK * 1.2 : speedK));
        let mx = (tg.x - cur.x) * kk, my = (tg.y - cur.y) * kk;
        const maxStep = (this.carrier === sl.pid ? 26 : 30) * dt * Math.max(1, this.speed * 0.8);
        const m = Math.hypot(mx, my);
        if (m > maxStep) { mx *= maxStep / m; my *= maxStep / m; }
        cur.x += mx; cur.y += my;
        // une fois arrivé, le joueur reprend sa place dans le bloc
        const o = this.over[sl.pid];
        if (o && !this.celeb && this.carrier !== sl.pid && Math.hypot(tg.x - cur.x, tg.y - cur.y) < 0.6 && !o.hold) o.reached = (o.reached || ts);
        if (o && o.reached && ts - o.reached > 1600 / this.speed) delete this.over[sl.pid];
      }
    }
    if (this.celeb && ts > this.celeb.until) this.celeb = null;
    // arbitre
    this.ref.x += (clamp(this.ball.x - 6, 8, 97) - this.ref.x) * (1 - Math.exp(-dt * 1.6));
    this.ref.y += (clamp(this.ball.y + 9, 6, 62) - this.ref.y) * (1 - Math.exp(-dt * 1.6));
    this.draw(cv, ts);
  },

  draw(cv, ts) {
    const w = cv.clientWidth, h = cv.clientHeight;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(h * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); }
    const ctx = cv.getContext('2d');
    const k = cv.width / VW;
    ctx.setTransform(k, 0, 0, k, -VX0 * k, -VY0 * k);
    // pelouse
    ctx.fillStyle = '#16582f';
    ctx.fillRect(VX0, VY0, VW, VH);
    for (let i = 0; i < 14; i++) { ctx.fillStyle = i % 2 ? '#1b6a39' : '#1e7440'; ctx.fillRect(i * 7.5, 0, 7.5, PH); }
    const vg = ctx.createRadialGradient(52.5, 34, 10, 52.5, 34, 70);
    vg.addColorStop(0, 'rgba(255,255,255,0.05)'); vg.addColorStop(1, 'rgba(0,0,0,0.18)');
    ctx.fillStyle = vg; ctx.fillRect(0, 0, PW, PH);
    // lignes
    ctx.strokeStyle = 'rgba(255,255,255,.82)'; ctx.lineWidth = 0.28;
    ctx.strokeRect(0, 0, PW, PH);
    ctx.beginPath(); ctx.moveTo(52.5, 0); ctx.lineTo(52.5, PH); ctx.stroke();
    ctx.beginPath(); ctx.arc(52.5, 34, 9.15, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,.85)';
    for (const [x, y] of [[52.5, 34], [11, 34], [94, 34]]) { ctx.beginPath(); ctx.arc(x, y, 0.3, 0, Math.PI * 2); ctx.fill(); }
    ctx.strokeRect(0, 13.84, 16.5, 40.32); ctx.strokeRect(PW - 16.5, 13.84, 16.5, 40.32);
    ctx.strokeRect(0, 24.84, 5.5, 18.32); ctx.strokeRect(PW - 5.5, 24.84, 5.5, 18.32);
    ctx.beginPath(); ctx.arc(11, 34, 9.15, -0.93, 0.93); ctx.stroke();
    ctx.beginPath(); ctx.arc(94, 34, 9.15, Math.PI - 0.93, Math.PI + 0.93); ctx.stroke();
    for (const [x, y, a0] of [[0, 0, 0], [PW, 0, Math.PI / 2], [PW, PH, Math.PI], [0, PH, -Math.PI / 2]]) { ctx.beginPath(); ctx.arc(x, y, 1, a0, a0 + Math.PI / 2); ctx.stroke(); }
    // buts et filets
    for (const side of [0, 1]) {
      const x0 = side === 0 ? -2 : PW, wob = this.net && this.net.until > ts && (this.net.t === 0 ? side === 1 : side === 0) ? Math.sin(ts / 40) * 0.5 : 0;
      ctx.fillStyle = 'rgba(255,255,255,.12)'; ctx.fillRect(x0, GOAL_Y0, 2, GOAL_Y1 - GOAL_Y0);
      ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 0.08;
      for (let yy = GOAL_Y0; yy <= GOAL_Y1; yy += 0.9) { ctx.beginPath(); ctx.moveTo(x0, yy); ctx.lineTo(x0 + 2 + (side === 0 ? -wob : wob), yy); ctx.stroke(); }
      for (let xx = 0; xx <= 2; xx += 0.66) { ctx.beginPath(); ctx.moveTo(x0 + xx, GOAL_Y0); ctx.lineTo(x0 + xx, GOAL_Y1); ctx.stroke(); }
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 0.4;
      ctx.beginPath(); ctx.moveTo(side === 0 ? 0 : PW, GOAL_Y0); ctx.lineTo(x0 + (side === 0 ? 0 : 2), GOAL_Y0); ctx.lineTo(x0 + (side === 0 ? 0 : 2), GOAL_Y1); ctx.lineTo(side === 0 ? 0 : PW, GOAL_Y1); ctx.stroke();
    }
    // drapeau de l'arbitre assistant (hors-jeu)
    if (this.flag && this.flag.until > ts) {
      const fx = this.flag.x, fy = -1.2;
      ctx.fillStyle = '#111'; ctx.fillRect(fx - 0.5, fy - 0.6, 1, 1.4);
      ctx.fillStyle = (ts / 150) % 2 < 1 ? '#f5c542' : '#ff5f57'; ctx.fillRect(fx + 0.4, fy - 1.6, 1.6, 1.1);
    }
    // arbitre
    ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.beginPath(); ctx.ellipse(this.ref.x + 0.3, this.ref.y + 0.5, 1.1, 0.7, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#111827'; ctx.beginPath(); ctx.arc(this.ref.x, this.ref.y, 1.05, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#f5c542'; ctx.lineWidth = 0.25; ctx.stroke();
    // joueurs
    const colors = this.o.colors, trims = this.o.trims || ['#ffffff', '#ffffff'];
    const label = this.speed <= 2;
    for (let t = 0; t < 2; t++) {
      for (const sl of this.slots(t)) {
        const p = this.pos[sl.pid];
        if (!p) continue;
        const isGK = sl.pos === 'GB';
        const fill = isGK ? (t === 0 ? '#f5c542' : '#a78bfa') : colors[t];
        const dv = this.dive[sl.pid] && this.dive[sl.pid].until > ts ? this.dive[sl.pid] : null;
        ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.beginPath(); ctx.ellipse(p.x + 0.45, p.y + 0.6, dv ? 2.2 : 1.6, 1.05, 0, 0, Math.PI * 2); ctx.fill();
        ctx.save(); ctx.translate(p.x, p.y);
        if (dv) { ctx.rotate(dv.dir * Math.PI / 2.4); ctx.scale(1.45, 0.75); }
        ctx.fillStyle = fill; ctx.beginPath(); ctx.arc(0, 0, 1.5, 0, Math.PI * 2); ctx.fill();
        ctx.lineWidth = 0.34; ctx.strokeStyle = isGK ? '#111' : trims[t]; ctx.stroke();
        ctx.restore();
        if (this.carrier === sl.pid) { ctx.strokeStyle = 'rgba(255,255,255,.95)'; ctx.lineWidth = 0.22; ctx.beginPath(); ctx.arc(p.x, p.y, 2.25, 0, Math.PI * 2); ctx.stroke(); }
        const pl = this.o.player(sl.pid);
        ctx.fillStyle = isGK ? '#111' : inkOn(fill); ctx.font = '700 1.75px Barlow Condensed, Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(String(pl?.num ?? ''), p.x, p.y + 0.12);
        if (label && this.carrier === sl.pid && pl) {
          const nm = pl.ln;
          ctx.font = '600 1.9px Inter, Arial';
          const tw = ctx.measureText(nm).width + 1.4;
          ctx.fillStyle = 'rgba(8,16,12,.78)'; ctx.fillRect(p.x - tw / 2, p.y - 4.9, tw, 2.5);
          ctx.fillStyle = '#fff'; ctx.fillText(nm, p.x, p.y - 3.6);
        }
      }
    }
    // ballon (ombre au sol, ballon en hauteur)
    const b = this.ball;
    const hh = b.h || 0;
    ctx.fillStyle = `rgba(0,0,0,${0.35 - Math.min(0.2, hh * 0.03)})`; ctx.beginPath(); ctx.ellipse(b.x + 0.35, b.y + 0.45, 0.75, 0.5, 0, 0, Math.PI * 2); ctx.fill();
    const r = 0.62 * (1 + hh * 0.07);
    ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(b.x, b.y - hh * 0.55, r, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#1b1b1b'; ctx.lineWidth = 0.12; ctx.stroke();
    ctx.fillStyle = '#1b1b1b'; ctx.beginPath(); ctx.arc(b.x - r * 0.25, b.y - hh * 0.55 - r * 0.2, r * 0.3, 0, Math.PI * 2); ctx.fill();
    // bandeaux
    this.banners = this.banners.filter((x) => x.until > ts);
    let nBig = 0, nSmall = 0;
    this.banners.forEach((bn) => {
      const i = bn.big ? nBig++ : nSmall++;
      const life = clamp((ts - bn.t0) / 180, 0, 1) * clamp((bn.until - ts) / 220, 0, 1);
      ctx.globalAlpha = life;
      const size = bn.big ? 6 : 3.4;
      ctx.font = `800 ${size}px Barlow Condensed, Arial`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      const tw = ctx.measureText(bn.text).width + size * 1.4;
      const y = bn.big ? 30 + i * 9 : 7 + i * 5.4;
      ctx.fillStyle = 'rgba(6,14,10,.82)';
      const x0 = 52.5 - tw / 2;
      ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x0, y - size * 0.75, tw, size * 1.5, 1.2) : ctx.rect(x0, y - size * 0.75, tw, size * 1.5); ctx.fill();
      ctx.fillStyle = bn.color; ctx.fillRect(x0, y - size * 0.75, 0.7, size * 1.5);
      ctx.fillStyle = bn.big && inkOn(bn.color) === '#ffffff' ? '#ffffff' : bn.color;
      ctx.fillText(bn.text, 52.5, y + 0.2);
      ctx.globalAlpha = 1;
    });
  },
};

// Accès pour les tests navigateur
if (typeof window !== 'undefined') window.__anim = anim;
