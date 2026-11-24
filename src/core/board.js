// Président : objectifs, confiance, licenciements, offres d'emploi.
import { R, clamp } from './rng.js';
import { leagueTable, positionOf } from './competitions.js';
import { addMsg, addNews } from './messages.js';
import { makeName } from './player.js';
import { autoLineup, makeTactics, refreshClubStrength } from './team.js';
import { setBudgets } from './finance.js';
import { LEAGUE_COUNTRIES } from './constants.js';

export function computeObjective(state, club) {
  const comp = state.comps[club.league];
  const n = comp.clubs.length;
  const C = LEAGUE_COUNTRIES.find((c) => c.code === club.country) || {};
  const ranked = comp.clubs.slice().sort((a, b) => (state.clubs[b].str || 0) - (state.clubs[a].str || 0));
  const r = ranked.indexOf(club.id) + 1;
  const safe = n - (C.down || 3) - (C.po === 'barrage' ? 1 : 0);
  if (comp.level === 1) {
    const eu = C.conti || 3;
    if (r <= 1) return { key: 'title', label: 'Remporter le championnat', target: 1 };
    if (r <= eu) return { key: 'podium', label: `Finir dans le top ${eu} (qualification européenne)`, target: eu };
    const t6 = Math.round(n / 3);
    if (r <= t6) return { key: 'top6', label: `Finir dans le top ${t6}`, target: t6 };
    const half = Math.floor(n / 2);
    if (r <= half) return { key: 'top10', label: `Finir dans la première moitié (top ${half})`, target: half };
    if (r <= n - 6) return { key: 'top14', label: `Finir dans le top ${n - 4}`, target: n - 4 };
    return { key: 'stay', label: 'Assurer le maintien', target: safe };
  }
  const upN = (C.up || 3);
  const poN = C.po === 'playoff' ? 6 : C.po === 'barrage' ? upN + 1 : upN;
  if (r <= upN) return { key: 'promo', label: `Monter directement (top ${upN})`, target: upN };
  if (r <= poN + 1) return { key: 'top6', label: poN > upN ? `Jouer la montée (top ${poN})` : `Jouer la montée (top ${Math.round(n / 3)})`, target: poN > upN ? poN : Math.round(n / 3) };
  const half = Math.round(n * 2 / 3);
  if (r <= half) return { key: 'top12', label: `Finir dans le top ${half}`, target: half };
  return { key: 'stay', label: 'Assurer le maintien', target: n - 3 };
}

export function setObjectives(state) {
  for (const club of Object.values(state.clubs)) club.obj = computeObjective(state, club);
}

export function confLabel(c) {
  return c >= 80 ? 'Excellente' : c >= 60 ? 'Bonne' : c >= 40 ? 'Correcte' : c >= 25 ? 'Fragile' : 'Très faible';
}

function bumpConf(state, d) {
  if (!state.mgr || !state.user) return;
  state.mgr.conf = clamp(Math.round((state.mgr.conf + d) * 10) / 10, 0, 100);
}

export function boardAfterMatch(state, m, userSide, oppClub) {
  const my = state.clubs[state.user];
  const gf = userSide === 0 ? m.hg : m.ag, ga = userSide === 0 ? m.ag : m.hg;
  const stronger = (oppClub.str || 60) > (my.str || 60) + 2, weaker = (oppClub.str || 60) < (my.str || 60) - 2;
  let d = 0;
  const won = gf > ga || (gf === ga && m.pen && (userSide === 0 ? m.pen[0] > m.pen[1] : m.pen[1] > m.pen[0]));
  const comp = state.comps[m.c];
  if (comp.type === 'league') d = gf > ga ? 1.5 + (stronger ? 1 : 0) : gf === ga ? (stronger ? 0.8 : weaker ? -0.5 : 0.3) : weaker ? -3 : -2;
  else if (m.ko) {
    const lvlOpp = state.comps[oppClub.league].level, lvlMe = state.comps[my.league].level;
    d = won ? 1.5 : lvlOpp > lvlMe ? -5 : -1;
    if (won && m.rd === 'f') d += 15;
  } else d = gf > ga ? 1.2 : gf === ga ? 0.2 : -1;
  bumpConf(state, d);
}

export function boardMonthly(state) {
  if (!state.user) return;
  const club = state.clubs[state.user];
  const comp = state.comps[club.league];
  const row = comp.table[club.id];
  if (!row || row.p < 4) return;
  const pos = positionOf(state, club.id);
  const t = club.obj.target;
  let d = 0;
  if (pos <= t) d += 2;
  else if (pos > t + 8) d -= 8;
  else if (pos > t + 4) d -= 5;
  else if (pos > t) d -= 1.5;
  if (club.balance < -20e6) d -= 6; else if (club.balance < 0) d -= 3;
  bumpConf(state, d);
  const c = state.mgr.conf;
  const month = new Date(state.day * 86400000).getUTCMonth() + 1;
  if (c < 12 && month !== 8 && month !== 9) {
    sackUser(state, `Les résultats ne sont pas à la hauteur des attentes (${pos}e, objectif : ${club.obj.label.toLowerCase()}).`);
  } else if (c < 30 && !state.flags.warned) {
    state.flags.warned = true;
    addMsg(state, { from: 'Président', title: 'Le président s\'inquiète', body: `La direction de ${club.name} est très inquiète. Actuellement ${pos}e, l'équipe doit vite redresser la barre (objectif : ${club.obj.label.toLowerCase()}). Votre poste est menacé.`, prio: 2, kind: 'board' });
  } else if (c >= 45) state.flags.warned = false;
}

export function sackUser(state, reason) {
  const club = state.clubs[state.user];
  if (!club) return;
  const mgr = state.mgr;
  const cur = mgr.clubs[mgr.clubs.length - 1];
  if (cur) cur.to = state.season;
  mgr.career.sacked++;
  mgr.rep = clamp(mgr.rep - 8, 1, 100);
  addMsg(state, { from: 'Président', title: 'Vous êtes licencié', body: `${club.name} a décidé de mettre fin à votre contrat. ${reason}\n\nVotre carrière continue : consultez les offres d'emploi dans l'onglet Carrière.`, prio: 2, kind: 'sacked' });
  addNews(state, `${club.name} se sépare de son entraîneur ${mgr.name}.`, 'sack', { c: club.id });
  club.vacant = true;
  club.vacantSince = state.day;
  club.autoUser = false;
  state.user = null;
  mgr.club = null;
  mgr.conf = 50;
  mgr.unemployedSince = state.day;
}

function newAIManager(state, club) {
  const n = makeName(R.chance(0.7) ? club.country : R.pick(['FR', 'EN', 'ES', 'IT', 'DE', 'PT', 'NL', 'AR']));
  club.mgr = { fn: n.fn, ln: n.ln, nat: club.country, since: state.season };
  club.vacant = false;
  club.philo = R.pick(['balanced', 'possession', 'direct', 'counter', 'press', 'wing']);
  club.tactics = makeTactics(club.philo, club.pref || '4-3-3');
}

// Changements d'entraîneurs dans les clubs IA (chaque mois)
export function aiManagerChanges(state) {
  const month = new Date(state.day * 86400000).getUTCMonth() + 1;
  if (month >= 7 && month <= 9) return;
  for (const club of Object.values(state.clubs)) {
    if (club.id === state.user || club.vacant) continue;
    const row = state.comps[club.league].table[club.id];
    if (!row || row.p < 8) continue;
    const pos = positionOf(state, club.id);
    const gap = pos - club.obj.target;
    const p = gap > 8 ? 0.35 : gap > 5 ? 0.15 : 0;
    if (p && R.chance(p)) {
      addNews(state, `${club.name} limoge son entraîneur ${club.mgr.fn} ${club.mgr.ln} (${pos}e).`, 'sack', { c: club.id });
      club.vacant = true;
      club.vacantSince = state.day;
    }
  }
}

// Postes vacants pourvus par l'IA (chaque semaine)
export function fillVacancies(state) {
  for (const club of Object.values(state.clubs)) {
    if (!club.vacant || club.id === state.user) continue;
    const waited = state.day - (club.vacantSince || state.day);
    const pendingUser = (state.mgr?.apps || []).some((a) => a.club === club.id);
    if (waited > 12 && !pendingUser && R.chance(0.55)) {
      newAIManager(state, club);
      addNews(state, `${club.name} nomme ${club.mgr.fn} ${club.mgr.ln} au poste d'entraîneur.`, 'mgr', { c: club.id });
    }
  }
}

export function vacancies(state) {
  return Object.values(state.clubs).filter((c) => c.vacant && c.id !== state.user);
}

export function jobChance(state, club) {
  const rep = state.mgr.rep;
  return clamp(0.55 + (rep - club.rep * 0.85) / 35, 0.03, 0.95);
}

export function applyForJob(state, clubId) {
  const mgr = state.mgr;
  mgr.apps = mgr.apps || [];
  if (mgr.apps.some((a) => a.club === clubId)) return false;
  mgr.apps.push({ club: clubId, day: state.day + R.int(2, 5) });
  return true;
}

export function processApplications(state) {
  const mgr = state.mgr;
  if (!mgr || !mgr.apps || !mgr.apps.length) return;
  const keep = [];
  for (const a of mgr.apps) {
    if (state.day < a.day) { keep.push(a); continue; }
    const club = state.clubs[a.club];
    if (!club.vacant) continue;
    if (R.chance(jobChance(state, club))) {
      addMsg(state, { from: club.name, title: `${club.name} vous propose le poste`, body: `Après étude de votre candidature, ${club.name} (${state.comps[club.league].name}) souhaite vous confier son équipe première.`, prio: 2, kind: 'job', act: { type: 'job', club: club.id }, cid: club.id });
    } else {
      addMsg(state, { from: club.name, title: 'Candidature refusée', body: `${club.name} a choisi un autre profil. Améliorez votre réputation pour viser plus haut.`, kind: 'job', cid: club.id });
    }
  }
  mgr.apps = keep;
}

// Offres spontanées (chômeur chaque semaine, ou en fin de saison)
export function spontaneousOffers(state, endOfSeason = false) {
  const mgr = state.mgr;
  if (!mgr) return;
  const open = vacancies(state);
  if (!state.user) {
    for (const c of open) {
      if (c.rep <= mgr.rep + 12 && R.chance(0.2) && !state.inbox.some((m) => m.act && m.act.type === 'job' && m.act.club === c.id && !m.done)) {
        addMsg(state, { from: c.name, title: `Offre d'emploi : ${c.name}`, body: `${c.name} (${state.comps[c.league].name}) vous propose de devenir son entraîneur.`, prio: 2, kind: 'job', act: { type: 'job', club: c.id }, cid: c.id });
      }
    }
  } else if (endOfSeason) {
    const my = state.clubs[state.user];
    const big = Object.values(state.clubs).filter((c) => c.id !== my.id && c.rep > my.rep + 4 && c.rep <= mgr.rep + 18);
    if (big.length && R.chance(0.55)) {
      const c = R.pick(big);
      c.vacant = true; c.vacantSince = state.day;
      addMsg(state, { from: c.name, title: `${c.name} veut vous recruter`, body: `${c.name} (${state.comps[c.league].name}, réputation ${c.rep}) souhaite faire de vous son nouvel entraîneur. Acceptez-vous ?`, prio: 2, kind: 'job', act: { type: 'job', club: c.id }, cid: c.id });
    }
  }
}

export function takeJob(state, clubId) {
  const club = state.clubs[clubId];
  const mgr = state.mgr;
  if (state.user && state.user !== clubId) {
    const old = state.clubs[state.user];
    const cur = mgr.clubs[mgr.clubs.length - 1];
    if (cur) cur.to = state.season;
    old.vacant = true; old.vacantSince = state.day;
    addNews(state, `${mgr.name} quitte ${old.name}.`, 'mgr', { c: old.id });
  }
  state.user = clubId;
  club.vacant = false;
  club.mgr = { fn: mgr.name, ln: '', nat: mgr.nat, since: state.season, user: true };
  mgr.club = clubId;
  mgr.conf = 58;
  mgr.apps = [];
  mgr.clubs.push({ club: clubId, name: club.name, from: state.season, to: null, w: 0, d: 0, l: 0 });
  state.flags.warned = false;
  refreshClubStrength(state, club);
  club.obj = computeObjective(state, club);
  setBudgets(state, club);
  const { lineup, bench } = autoLineup(state, club, club.tactics.formation, { rotate: false });
  club.lineup = lineup; club.bench = bench;
  for (const m of state.inbox) if (m.act && m.act.type === 'job') m.done = true;
  addNews(state, `${mgr.name} est nommé entraîneur de ${club.name}.`, 'mgr', { c: club.id });
  addMsg(state, { from: 'Président', title: `Bienvenue à ${club.name} !`, body: `Le président vous souhaite la bienvenue. Objectif de la saison : ${club.obj.label.toLowerCase()}.\nBudget transferts : ${Math.round(club.tBudget / 1e5) / 10} M€.`, kind: 'board', cid: club.id });
}

export function evaluateSeason(state, club, pos) {
  const t = club.obj.target;
  if (pos <= t) {
    const ex = pos <= Math.max(1, t - 3) || (club.obj.key !== 'title' && pos === 1);
    return { met: true, ex, label: ex ? 'Objectif largement dépassé' : 'Objectif atteint' };
  }
  return { met: false, ex: false, bad: pos > t + 4, label: pos > t + 4 ? 'Objectif complètement manqué' : 'Objectif manqué' };
}

export { leagueTable };
