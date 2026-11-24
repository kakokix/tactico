// Finances des clubs : revenus, dépenses, budgets.
import { clamp, R } from './rng.js';
import { LEAGUE_COUNTRIES } from './constants.js';

export const countryOf = (code) => LEAGUE_COUNTRIES.find((c) => c.code === code);
export const clubLevel = (state, club) => state.comps[club.league]?.level || 1;

export function tvMoney(state, club) {
  const C = countryOf(club.country);
  const lvl = clubLevel(state, club);
  if (lvl === 1) return C.tv * 1e6 * (0.75 + 0.4 * (club.rep - 50) / 50);
  return C.tv * 1e6 * 0.12 * (0.8 + 0.4 * (club.rep - 35) / 20);
}
export const commercial = (club) => 80000 * Math.exp(club.rep / 15);
export const ticketPrice = (state, club) => Math.round((10 + club.rep * 0.4) * (clubLevel(state, club) === 1 ? 1 : 0.6));

export function attendance(state, club, opp, bigGame) {
  let fill = 0.5 + club.rep / 250 + (opp ? (opp.rep - 60) / 400 : 0) + (bigGame ? 0.12 : 0);
  const row = state.comps[club.league]?.table?.[club.id];
  if (row && row.p > 3) fill += (row.pts / (row.p * 3) - 0.45) * 0.25;
  fill = clamp(fill + R.range(-0.04, 0.04), 0.3, 1);
  return Math.round(club.stadium.cap * fill);
}

export function projectRevenue(state, club) {
  const gate = club.stadium.cap * clamp(0.5 + club.rep / 250, 0.4, 0.98) * ticketPrice(state, club) * 17;
  return tvMoney(state, club) + commercial(club) + gate;
}

export function wageBill(state, club) {
  let s = 0;
  for (const id of club.squad) s += state.players[id]?.wage || 0;
  for (const id of club.youth) s += state.players[id]?.wage || 0;
  return s;
}

export function addFin(club, kind, key, amount) {
  club.fin[kind][key] = (club.fin[kind][key] || 0) + amount;
  club.balance += kind === 'in' ? amount : -amount;
}

// Paiements hebdomadaires (chaque lundi)
export function weeklyFinances(state, club) {
  const wages = wageBill(state, club);
  addFin(club, 'out', 'Salaires', wages);
  const rev = projectRevenue(state, club);
  addFin(club, 'out', 'Fonctionnement', rev * 0.3 / 52);
  const lvlCost = (club.fac.train + club.fac.youth + club.fac.med) * 9000 * (clubLevel(state, club) === 1 ? 1 : 0.5);
  addFin(club, 'out', 'Infrastructures', lvlCost);
  addFin(club, 'in', 'Droits TV', tvMoney(state, club) / 52);
  addFin(club, 'in', 'Sponsors', commercial(club) / 52);
}

// Budgets fixés en début de saison (et à la création)
export function setBudgets(state, club) {
  const rev = projectRevenue(state, club);
  const bill = wageBill(state, club);
  club.wBudget = Math.max(Math.round(bill * 1.06), Math.round(rev * 0.58 / 52));
  const spare = club.balance > 0 ? club.balance * 0.55 : club.balance * 0.2;
  club.tBudget = Math.max(0, Math.round(spare / 50000) * 50000);
}

export const PRIZE = {
  league1: (pos, n = 18) => Math.round((n + 1 - pos) * 0.5e6),
  league2: (pos, n = 18) => Math.round((n + 1 - pos) * 0.12e6),
  cupRound: [0.1e6, 0.2e6, 0.4e6, 0.8e6, 1.5e6, 3e6],
  cupWin: 5e6,
  contiGroup: 12e6, contiWin: 2.5e6, contiDraw: 0.8e6, contiQF: 6e6, contiSF: 9e6, contiF: 14e6, contiChamp: 20e6,
};

export const FAC_NAMES = { train: "Centre d'entraînement", youth: 'Centre de formation', med: 'Centre médical' };
export const facUpgradeCost = (level) => [0, 2e6, 5e6, 11e6, 22e6, 0][level] || 0;
export const stadiumExpandCost = (seats) => seats * 2200;
