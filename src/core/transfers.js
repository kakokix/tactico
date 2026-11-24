// Mercato : prix, négociations, transferts IA, prêts, contrats.
import { R, clamp } from './rng.js';
import { POS_GROUP, FORMATIONS } from './constants.js';
import { baseWage, roundWage, playerValue, pname, ovrAt } from './player.js';
import { addFin, wageBill } from './finance.js';
import { windowOpen, dayOf } from './dates.js';
import { assignNumbers } from './worldgen.js';
import { refreshClubStrength, autoLineup } from './team.js';

export const fmtMoney = (v) => {
  const a = Math.abs(v), s = v < 0 ? '-' : '';
  if (a >= 1e6) return s + (a / 1e6).toFixed(a >= 1e8 ? 0 : 1).replace('.0', '') + ' M€';
  if (a >= 1e3) return s + Math.round(a / 1e3) + ' k€';
  return s + Math.round(a) + ' €';
};

// Rôle du joueur dans son club : titulaire, clé, remplaçant
export function squadRank(state, p) {
  const club = state.clubs[p.club];
  if (!club) return 99;
  const same = club.squad.map((id) => state.players[id]).filter((x) => x && POS_GROUP[x.pos] === POS_GROUP[p.pos]).sort((a, b) => b.ovr - a.ovr);
  return same.indexOf(p) + 1;
}

export function askingPrice(state, p) {
  const club = state.clubs[p.club];
  if (!club) return 0;
  let k = 1.15;
  const allBest = club.squad.map((id) => state.players[id]).sort((a, b) => b.ovr - a.ovr);
  const idx = allBest.indexOf(p);
  if (idx >= 0 && idx < 3) k = 1.6;
  else if (idx >= 0 && idx < 11) k = 1.35;
  if (p.listed) k *= 0.82;
  const yrs = p.until - state.season;
  if (yrs <= 0) k *= 0.55; else if (yrs === 1) k *= 0.8;
  if (club.balance < 0) k *= 0.85;
  if (p.age >= 31) k *= 0.85;
  return Math.max(25000, Math.round(p.value * k / 25000) * 25000);
}

export function evaluateBid(state, p, fee, buyer) {
  const ask = askingPrice(state, p);
  const club = state.clubs[p.club];
  if (club.squad.length <= 18) return { res: 'reject', reason: `${club.name} n'a pas assez de joueurs pour vendre.` };
  if (p.joined > state.day - 60 && !p.listed) return { res: 'reject', reason: `${club.name} vient de recruter ce joueur et ne veut pas le vendre.` };
  if (buyer && buyer.id === club.id) return { res: 'reject', reason: '' };
  if (fee >= ask) return { res: 'accept', ask };
  if (fee >= ask * 0.85) return { res: 'counter', counter: Math.round(ask / 25000) * 25000, ask };
  return { res: 'reject', ask, reason: `${club.name} juge l'offre insuffisante (prix demandé ≈ ${fmtMoney(ask)}).` };
}

export function wageDemand(state, p, club) {
  let w = baseWage(p.ovr, p.age) * (0.75 + club.rep / 160);
  if (p.club && p.club !== club.id) w = Math.max(w, p.wage * 1.1);
  if (p.club === club.id) w = Math.max(w, p.wage * (p.ovr >= 70 ? 1.08 : 1.0));
  if (!p.club) w *= 0.92;
  return roundWage(w);
}

// Le joueur accepte-t-il de rejoindre ce club ?
export function willJoin(state, p, club) {
  if (p.club === club.id) return { ok: true };
  const cur = p.club ? state.clubs[p.club] : null;
  const curRep = cur ? cur.rep : 30;
  if (club.rep < curRep - 22 && p.ovr >= 70) return { ok: false, reason: `${pname(p)} ne souhaite pas rejoindre un club moins prestigieux.` };
  const squad = club.squad.map((id) => state.players[id]).filter((x) => POS_GROUP[x.pos] === POS_GROUP[p.pos]);
  const better = squad.filter((x) => x.ovr >= p.ovr + 6).length;
  const need = POS_GROUP[p.pos] === 'GB' ? 1 : 3;
  if (better >= need && p.age >= 22 && p.ovr >= 65) return { ok: false, reason: `${pname(p)} craint de manquer de temps de jeu.` };
  return { ok: true };
}

export function contractResponse(state, p, club, wage, years) {
  const demand = wageDemand(state, p, club);
  if (years < 1 || years > 5) return { ok: false, reason: 'Durée invalide.' };
  if (p.age >= 32 && years > 2) return { ok: false, demand, reason: `À ${p.age} ans, ${p.fn} préfère un contrat de 1 ou 2 ans… mais accepte volontiers plus court.`, soft: true };
  if (wage >= demand) return { ok: true, demand };
  if (wage >= demand * 0.9 && R.chance(0.5)) return { ok: true, demand };
  return { ok: false, demand, reason: `${pname(p)} demande au moins ${fmtMoney(demand)} par semaine.` };
}

export function canAfford(state, club, fee, wage, oldWage = 0) {
  if (fee > club.tBudget) return { ok: false, reason: `Budget transferts insuffisant (${fmtMoney(club.tBudget)}).` };
  const bill = wageBill(state, club) - oldWage + wage;
  if (bill > club.wBudget) return { ok: false, reason: `Masse salariale dépassée (budget ${fmtMoney(club.wBudget)}/sem.).` };
  return { ok: true };
}

function removeFrom(arr, id) {
  const i = arr.indexOf(id);
  if (i >= 0) arr.splice(i, 1);
}

export function detachPlayer(state, p) {
  if (p.club) {
    const c = state.clubs[p.club];
    if (c) {
      removeFrom(c.squad, p.id);
      removeFrom(c.youth, p.id);
      removeFrom(c.bench, p.id);
      const li = c.lineup.indexOf(p.id);
      if (li >= 0) c.lineup[li] = null;
      if (c.penTaker === p.id) c.penTaker = null;
    }
  }
  removeFrom(state.free, p.id);
}

// Transfert définitif (ou prêt)
export function executeTransfer(state, p, to, fee, wage, years, opts = {}) {
  const from = p.club ? state.clubs[p.club] : null;
  if (from && from.lineup) {
    const li = from.lineup.indexOf(p.id);
    if (li >= 0) from.lineup[li] = null;
  }
  detachPlayer(state, p);
  if (opts.loan) {
    p.loan = { from: from.id, until: state.season + 1 };
  } else {
    if (from) { addFin(from, 'in', 'Transferts', Math.round(fee * 0.92)); }
    addFin(to, 'out', 'Transferts', fee);
    to.tBudget = Math.max(0, to.tBudget - fee);
    if (from) from.tBudget += Math.round(fee * 0.5);
    p.loan = null;
    p.until = state.season + years;
  }
  if (wage) p.wage = wage;
  p.club = to.id;
  p.youth = false;
  p.listed = false;
  p.joined = state.day;
  p.morale = clamp(p.morale + 8, 0, 100);
  p.num = 0;
  to.squad.push(p.id);
  to.coh = Math.max(20, (to.coh ?? 60) - 3);
  assignNumbers(state, to);
  p.value = playerValue(p, state.season);
  const rec = { d: state.day, s: state.season, p: p.id, n: pname(p), pos: p.pos, ovr: p.ovr, from: from ? from.id : null, to: to.id, fee, loan: !!opts.loan };
  state.transfers.unshift(rec);
  if (state.transfers.length > 400) state.transfers.length = 400;
  if (from) refreshClubStrength(state, from);
  refreshClubStrength(state, to);
  return rec;
}

export function releasePlayer(state, p) {
  const club = state.clubs[p.club];
  const cost = releaseCost(state, p);
  if (club) addFin(club, 'out', 'Indemnités', cost);
  detachPlayer(state, p);
  p.club = null; p.listed = false; p.loan = null; p.youth = false;
  p.until = state.season;
  state.free.push(p.id);
  return cost;
}
export function releaseCost(state, p) {
  const weeks = Math.max(0, (dayOf(p.until, 6, 30) - state.day) / 7);
  return Math.round(p.wage * weeks * 0.5 / 1000) * 1000;
}

// ---------- IA ----------
function clubNeeds(state, club) {
  const f = club.tactics?.formation || '4-3-3';
  const slots = FORMATIONS[f];
  const { lineup } = autoLineup(state, club, f, { rotate: false });
  const level = club.str || 65;
  const needs = [];
  slots.forEach((s, i) => {
    const p = state.players[lineup[i]];
    const v = p ? ovrAt(p, s.pos) : 0;
    needs.push({ pos: s.pos, cur: v, gap: level - v });
  });
  const groups = { GB: 0, DEF: 0, MIL: 0, ATT: 0 };
  for (const id of club.squad) groups[POS_GROUP[state.players[id].pos]]++;
  if (groups.GB < 2) needs.push({ pos: 'GB', cur: 0, gap: 20 });
  if (groups.DEF < 7) needs.push({ pos: R.pick(['DC', 'DD', 'DG']), cur: 0, gap: 12 });
  if (groups.MIL < 6) needs.push({ pos: R.pick(['MC', 'MDC', 'MOC']), cur: 0, gap: 12 });
  if (groups.ATT < 4) needs.push({ pos: R.pick(['BU', 'AD', 'AG']), cur: 0, gap: 12 });
  needs.sort((a, b) => b.gap - a.gap);
  return needs;
}

// Une journée de mercato pour l'IA
export function aiTransferDay(state, notify) {
  if (!windowOpen(state)) return;
  const clubs = Object.values(state.clubs).filter((c) => c.id !== state.user);
  const all = Object.values(state.players);
  const nBuyers = Math.max(2, Math.round(clubs.length * 0.05));
  for (let k = 0; k < nBuyers; k++) {
    const club = R.pick(clubs);
    if (club.squad.length >= 30) { aiTrim(state, club); continue; }
    const needs = clubNeeds(state, club);
    const need = needs[0];
    if (!need || (need.gap < 1 && club.squad.length >= 23)) continue;
    const minOvr = Math.max(need.cur + 2, 40);
    const budget = club.tBudget;
    const cands = [];
    for (let i = 0; i < 60; i++) {
      const p = all[Math.floor(R.f() * all.length)];
      if (!p || p.youth || p.loan || p.club === club.id) continue;
      if (p.pos !== need.pos && !(p.alt || []).includes(need.pos)) continue;
      if (p.ovr < minOvr || p.ovr > (club.str || 70) + 9) continue;
      if (p.age > 32) continue;
      const free = !p.club;
      if (!free && p.joined > state.day - 90) continue;
      const fee = free ? 0 : askingPrice(state, p);
      if (fee > budget) continue;
      cands.push([p, fee]);
    }
    if (!cands.length) continue;
    cands.sort((a, b) => (b[0].ovr - a[0].ovr) - (b[1] - a[1]) / 2e7);
    const [p, fee] = cands[0];
    if (p.club === state.user) {
      if (!p.listed && R.chance(0.6)) continue;
      notify && notify('aiBid', { club, p, fee: Math.round(fee * R.range(0.85, 1.05) / 25000) * 25000 });
      continue;
    }
    if (!willJoin(state, p, club).ok && R.chance(0.7)) continue;
    const wage = wageDemand(state, p, club);
    if (wageBill(state, club) + wage > club.wBudget * 1.03) continue;
    const from = p.club ? state.clubs[p.club] : null;
    if (from && from.squad.length <= 20) continue;
    const rec = executeTransfer(state, p, club, fee, wage, R.int(2, 5));
    notify && notify('transfer', rec);
    if (from && from.squad.length < 22) aiFillFree(state, from, notify);
  }
}

// Le club se sépare de joueurs en trop
export function aiTrim(state, club) {
  const ps = club.squad.map((id) => state.players[id]).sort((a, b) => (a.ovr - a.age * 0.3) - (b.ovr - b.age * 0.3));
  while (club.squad.length > 27 && ps.length) {
    const p = ps.shift();
    if (p.age <= 21) { p.listed = true; continue; }
    releasePlayer(state, p);
  }
}

export function aiFillFree(state, club, notify, target = 22) {
  let guard = 0;
  while (club.squad.length < target && guard++ < 14) {
    const needs = clubNeeds(state, club);
    const pos = needs[0]?.pos || 'MC';
    const cands = state.free.map((id) => state.players[id]).filter((p) => p && (p.pos === pos || POS_GROUP[p.pos] === POS_GROUP[pos]) && p.age <= 33);
    if (!cands.length) break;
    cands.sort((a, b) => b.ovr - a.ovr);
    const p = cands.find((x) => x.ovr <= (club.str || 65) + 4) || cands[cands.length - 1];
    const wage = Math.min(wageDemand(state, p, club), Math.max(500, Math.round(club.wBudget * 0.03)));
    const rec = executeTransfer(state, p, club, 0, roundWage(wage), R.int(1, 2));
    notify && notify('transfer', rec);
  }
}

// Offre de l'IA pour un joueur de l'utilisateur (hors besoins) : joueurs transférables
export function aiInterestInListed(state, notify) {
  if (!windowOpen(state) || !state.user) return;
  const user = state.clubs[state.user];
  for (const id of user.squad) {
    const p = state.players[id];
    if (!p.listed && !(p.ovr >= 72 && R.chance(0.004))) continue;
    if (p.listed && !R.chance(0.12)) continue;
    const buyers = Object.values(state.clubs).filter((c) => c.id !== user.id && c.tBudget >= p.value * 0.8 && (c.str || 60) <= p.ovr + 8 && (c.str || 60) >= p.ovr - 10);
    if (!buyers.length) continue;
    const club = R.pick(buyers);
    const fee = Math.round(p.value * (p.listed ? R.range(0.75, 1.05) : R.range(1.1, 1.45)) / 25000) * 25000;
    if (fee > club.tBudget) continue;
    notify && notify('aiBid', { club, p, fee });
  }
}

// Fin de contrat : renouvellement IA ou départ
export function aiRenewal(state, p) {
  const club = state.clubs[p.club];
  if (!club) return false;
  const lvl = club.str || 65;
  const keep = p.age <= 30 && p.ovr >= lvl - 10 ? 0.88 : p.age <= 33 && p.ovr >= lvl - 4 ? 0.6 : p.age <= 26 ? 0.55 : 0.25;
  if (R.chance(keep)) {
    p.until = state.season + 1 + (p.age <= 28 ? R.int(1, 3) : R.int(0, 1));
    p.wage = roundWage(Math.max(p.wage, wageDemand(state, p, club) * 0.95));
    return true;
  }
  return false;
}

export function loanTargets(state, p) {
  const lvl = p.ovr;
  return Object.values(state.clubs).filter((c) => c.id !== p.club && Math.abs((c.str || 60) - lvl) <= 8 && c.squad.length < 28)
    .sort((a, b) => Math.abs((a.str || 60) - lvl - 2) - Math.abs((b.str || 60) - lvl - 2)).slice(0, 8);
}

export function loanFee(p) { return Math.round(p.value * 0.06 / 5000) * 5000; }
