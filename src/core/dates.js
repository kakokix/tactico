// Dates : jours numérotés depuis 1970 (UTC).
export const dayOf = (y, m, d) => Math.floor(Date.UTC(y, m - 1, d) / 86400000);
export function toDate(day) {
  const dt = new Date(day * 86400000);
  return { y: dt.getUTCFullYear(), m: dt.getUTCMonth() + 1, d: dt.getUTCDate(), wd: dt.getUTCDay() };
}
const WD = ['dim.', 'lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.'];
const WDL = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
const MO = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
const MOL = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];

export function fmtDate(day, style = 'short') {
  const t = toDate(day);
  if (style === 'long') return `${WDL[t.wd]} ${t.d} ${MOL[t.m - 1]} ${t.y}`;
  if (style === 'dm') return `${t.d} ${MO[t.m - 1]}`;
  if (style === 'wdm') return `${WD[t.wd]} ${t.d} ${MO[t.m - 1]}`;
  return `${WD[t.wd]} ${t.d} ${MO[t.m - 1]} ${t.y}`;
}
export const monthName = (m) => MOL[m - 1];

// Premier jour >= day ayant le jour de semaine wd (0 = dimanche)
export function nextWeekday(day, wd) {
  const cur = toDate(day).wd;
  return day + ((wd - cur + 7) % 7);
}

export function seasonDates(Y) {
  const start = dayOf(Y, 7, 1);
  const secondSat = (y, m) => nextWeekday(dayOf(y, m, 1), 6) + 7;
  const skip = new Set([secondSat(Y, 9), secondSat(Y, 10), secondSat(Y, 11), secondSat(Y + 1, 3)]);
  const wA = dayOf(Y, 12, 22), wB = dayOf(Y + 1, 1, 6);
  const league = [];
  let d = nextWeekday(dayOf(Y, 8, 8), 6);
  while (league.length < 34) {
    if (!skip.has(d) && !(d >= wA && d <= wB)) league.push(d);
    d += 7;
  }
  const last = league[league.length - 1];
  const W = (y, m, dd, wd) => nextWeekday(dayOf(y, m, dd), wd);
  const cup = [
    { key: 'prelim', label: 'Tour préliminaire', day: W(Y, 9, 23, 3) },
    { key: 'r32', label: '16es de finale', day: W(Y, 10, 28, 3) },
    { key: 'r16', label: '8es de finale', day: W(Y, 12, 9, 3) },
    { key: 'qf', label: 'Quarts de finale', day: W(Y + 1, 1, 27, 3) },
    { key: 'sf', label: 'Demi-finales', day: W(Y + 1, 4, 7, 3) },
    { key: 'f', label: 'Finale', day: last + 7 },
  ];
  const conti = {
    groups: [W(Y, 9, 15, 2), W(Y, 9, 29, 2), W(Y, 10, 20, 2), W(Y, 11, 3, 2), W(Y, 11, 24, 2), W(Y, 12, 8, 2)],
    ko: [
      { key: 'qf', label: 'Quarts de finale', day: W(Y + 1, 3, 9, 2) },
      { key: 'sf', label: 'Demi-finales', day: W(Y + 1, 4, 13, 2) },
      { key: 'f', label: 'Finale', day: last + 14 },
    ],
  };
  return {
    start, league, cup, conti, end: last + 15,
    summerClose: dayOf(Y, 8, 31), winterOpen: dayOf(Y + 1, 1, 1), winterClose: dayOf(Y + 1, 1, 31),
    youthDay: dayOf(Y + 1, 3, 15),
  };
}

export function windowOpen(state) {
  const sd = state.sd;
  const d = state.day;
  return (d >= sd.start && d <= sd.summerClose) || (d >= sd.winterOpen && d <= sd.winterClose);
}
