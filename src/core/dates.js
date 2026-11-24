// Dates : jours numérotés depuis 1970 (UTC).
import { L } from './i18n.js';
export const dayOf = (y, m, d) => Math.floor(Date.UTC(y, m - 1, d) / 86400000);
export function toDate(day) {
  const dt = new Date(day * 86400000);
  return { y: dt.getUTCFullYear(), m: dt.getUTCMonth() + 1, d: dt.getUTCDate(), wd: dt.getUTCDay() };
}
const WD = ['dim.', 'lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.'];
const WDL = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
const MO = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
const MOL = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
const WD_EN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const WDL_EN = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MO_EN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MOL_EN = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export function fmtDate(day, style = 'short') {
  const t = toDate(day);
  const wd = L(WD, WD_EN), wdl = L(WDL, WDL_EN), mo = L(MO, MO_EN), mol = L(MOL, MOL_EN);
  if (style === 'long') return `${wdl[t.wd]} ${t.d} ${mol[t.m - 1]} ${t.y}`;
  if (style === 'dm') return `${t.d} ${mo[t.m - 1]}`;
  if (style === 'wdm') return `${wd[t.wd]} ${t.d} ${mo[t.m - 1]}`;
  return `${wd[t.wd]} ${t.d} ${mo[t.m - 1]} ${t.y}`;
}
export const monthName = (m) => L(MOL, MOL_EN)[m - 1];

// Premier jour >= day ayant le jour de semaine wd (0 = dimanche)
export function nextWeekday(day, wd) {
  const cur = toDate(day).wd;
  return day + ((wd - cur + 7) % 7);
}

// Calendrier d'une saison. maxRounds = nombre de journées du plus grand championnat (34 à 46).
export function seasonDates(Y, maxRounds = 34) {
  const start = dayOf(Y, 7, 1);
  const secondSat = (y, m) => nextWeekday(dayOf(y, m, 1), 6) + 7;
  const skip = new Set([secondSat(Y, 9), secondSat(Y, 10), secondSat(Y, 11), secondSat(Y + 1, 3)]);
  const wA = dayOf(Y, 12, 22), wB = dayOf(Y + 1, 1, 6);
  const W = (y, m, dd, wd) => nextWeekday(dayOf(y, m, dd), wd);
  // Samedis disponibles (hors trêves internationales et hivernale)
  const sat = [];
  const lastSat = W(Y + 1, 5, 22, 6);
  for (let d = nextWeekday(dayOf(Y, 8, 8), 6); d <= lastSat; d += 7) if (!skip.has(d) && !(d >= wA && d <= wB)) sat.push(d);
  const league = sat.slice(0, 34);
  const last = sat[Math.min(maxRounds, sat.length) - 1];
  const cup = [
    { key: 'prelim', label: L('Tour préliminaire', 'Preliminary round'), day: W(Y, 9, 23, 3) },
    { key: 'r32', label: L('16es de finale', 'Round of 32'), day: W(Y, 10, 28, 3) },
    { key: 'r16', label: L('8es de finale', 'Round of 16'), day: W(Y, 12, 9, 3) },
    { key: 'qf', label: L('Quarts de finale', 'Quarter-finals'), day: W(Y + 1, 1, 27, 3) },
    { key: 'sf', label: L('Demi-finales', 'Semi-finals'), day: W(Y + 1, 4, 7, 3) },
    { key: 'f', label: L('Finale', 'Final'), day: last + 7 },
  ];
  const conti = {
    groups: [W(Y, 9, 15, 2), W(Y, 9, 29, 2), W(Y, 10, 20, 2), W(Y, 11, 3, 2), W(Y, 11, 24, 2), W(Y, 12, 8, 2)],
    ko: [
      { key: 'qf', label: L('Quarts de finale', 'Quarter-finals'), day: W(Y + 1, 3, 9, 2) },
      { key: 'sf', label: L('Demi-finales', 'Semi-finals'), day: W(Y + 1, 4, 13, 2) },
      { key: 'f', label: L('Finale', 'Final'), day: last + 14 },
    ],
  };
  // Mercredis libres pour les journées en semaine (pas de coupe, pas au lendemain d'un match européen)
  const busy = new Set([...cup.map((c) => c.day), ...conti.groups.map((d) => d + 1), ...conti.ko.map((k) => k.day + 1)]);
  const mid = [];
  for (let d = W(Y, 8, 19, 3); d <= W(Y + 1, 5, 12, 3); d += 7) if (!busy.has(d) && !(d >= wA && d <= wB) && !skip.has(d - 4)) mid.push(d);
  return {
    start, league, sat, mid, cup, conti, end: last + 15,
    summerClose: dayOf(Y, 8, 31), winterOpen: dayOf(Y + 1, 1, 1), winterClose: dayOf(Y + 1, 1, 31),
    youthDay: dayOf(Y + 1, 3, 15),
  };
}

// Dates des n journées d'un championnat : samedis, puis mercredis répartis si besoin
export function leagueDays(sd, n) {
  const sat = sd.sat || sd.league;
  if (n <= sat.length) return sat.slice(0, n);
  const extra = n - sat.length;
  const mid = sd.mid || [];
  const picks = [];
  for (let i = 0; i < extra; i++) picks.push(mid[Math.min(mid.length - 1, Math.floor((i + 0.5) * mid.length / extra))]);
  return [...sat, ...new Set(picks)].sort((a, b) => a - b).slice(0, n);
}

export function windowOpen(state) {
  const sd = state.sd;
  const d = state.day;
  return (d >= sd.start && d <= sd.summerClose) || (d >= sd.winterOpen && d <= sd.winterClose);
}
