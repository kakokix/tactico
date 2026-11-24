// Générateur pseudo-aléatoire (sfc32) avec petites aides.
let a = 0x9e3779b9, b = 0x243f6a88, c = 0xb7e15162, d = 1;

function next() {
  a >>>= 0; b >>>= 0; c >>>= 0; d >>>= 0;
  let t = (a + b) | 0;
  a = b ^ (b >>> 9);
  b = (c + (c << 3)) | 0;
  c = (c << 21) | (c >>> 11);
  d = (d + 1) | 0;
  t = (t + d) | 0;
  c = (c + t) | 0;
  return (t >>> 0) / 4294967296;
}

export const R = {
  seed(s) {
    s = (s >>> 0) || 1;
    a = 0x9e3779b9 ^ s; b = 0x243f6a88 + s * 7; c = 0xb7e15162 ^ (s << 5); d = 1;
    for (let i = 0; i < 20; i++) next();
  },
  getState() { return [a >>> 0, b >>> 0, c >>> 0, d >>> 0]; },
  setState(st) { if (Array.isArray(st) && st.length === 4) [a, b, c, d] = st; },
  f: next,
  int(lo, hi) { return lo + Math.floor(next() * (hi - lo + 1)); },
  range(lo, hi) { return lo + next() * (hi - lo); },
  chance(p) { return next() < p; },
  pick(arr) { return arr[Math.floor(next() * arr.length)]; },
  normal(mean = 0, sd = 1) {
    let u = 0, v = 0;
    while (u === 0) u = next();
    while (v === 0) v = next();
    return mean + sd * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  },
  // Tirage pondéré : items + fonction de poids (ou tableau de poids)
  weighted(items, w) {
    let total = 0;
    const ws = new Array(items.length);
    for (let i = 0; i < items.length; i++) {
      const x = typeof w === 'function' ? w(items[i], i) : w[i];
      ws[i] = x > 0 ? x : 0;
      total += ws[i];
    }
    if (total <= 0) return items[Math.floor(next() * items.length)];
    let r = next() * total;
    for (let i = 0; i < items.length; i++) {
      r -= ws[i];
      if (r <= 0) return items[i];
    }
    return items[items.length - 1];
  },
  shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(next() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  },
  hex(n) {
    let s = '';
    for (let i = 0; i < n; i++) s += Math.floor(next() * 16).toString(16);
    return s;
  },
};

R.seed(Date.now() & 0xffffffff);

export const clamp = (x, lo, hi) => (x < lo ? lo : x > hi ? hi : x);
export const round1 = (x) => Math.round(x * 10) / 10;
